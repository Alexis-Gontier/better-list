import "server-only";

import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import { compactFromMirror } from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import {
  LIBRARY_STATUS_ORDER,
  type LibraryFilterValues,
} from "@/features/tracking/lib/library-params";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Les lectures de ma bibliothèque — **mes lignes `Entry`, jamais AniList.**
 *
 * C'est toute la différence avec `/search` : là-bas les filtres partent chez un tiers avec un quota
 * de trente requêtes par minute, ici ils deviennent un `where` Prisma sur des lignes qu'on possède.
 * Une frappe au clavier ne coûte donc rien, et **la pagination se fait en base** plutôt qu'en
 * sur-demandant puis en filtrant après coup — c'est l'issue 3 de docs/recherche-filtres.md §2, et
 * la raison pour laquelle ces facettes sont chez elles ici et pas sur le catalogue.
 *
 * **Aucun `"use cache"` dans ce fichier, et ce n'est pas un oubli** : tout y dépend du visiteur.
 * Mémoriser un décompte ou une page servirait la bibliothèque d'un compte à un autre — et, pire, la
 * préférence `includeAdult` de l'un à l'autre.
 *
 * **Aucun `cache` de React non plus, et pour une raison différente** : il compare ses arguments par
 * identité, et ces trois fonctions reçoivent des objets construits à l'appel. Une seconde demande
 * ne retomberait donc jamais sur la première — le `cache` aurait l'air de dédupliquer sans rien
 * dédupliquer, ce qui est pire que son absence. Chacune est appelée une fois par rendu ; c'est
 * `getPreferences`, sans argument, qui porte la déduplication utile.
 */

/**
 * Le compte courant, pour un écran qui vit **sous la garde du layout**.
 *
 * `requireApprovedUser()` est appelée une fois et une seule, dans `app/(app)/layout.tsx`
 * (docs/ARCHITECTURE.md) : la redemander ici serait une deuxième garde, c'est-à-dire deux endroits
 * où l'on peut se tromper. Arriver sans session est donc un défaut de câblage — une route sortie du
 * groupe `(app)` —, pas un cas d'usage à traiter en silence. Renvoyer une bibliothèque vide le
 * masquerait précisément le jour où il compte.
 */
async function currentUserId(): Promise<string> {
  const session = await getSession();

  if (!session) {
    throw new Error(
      "Lecture de bibliothèque hors de la garde de `app/(app)/layout.tsx`.",
    );
  }

  return session.user.id;
}

/** Les colonnes du miroir dont la carte a besoin — la sélection de `compactFromMirror`. */
const MIRRORED_MEDIA_SELECT = {
  id: true,
  type: true,
  format: true,
  status: true,
  titleRomaji: true,
  titleEnglish: true,
  titleNative: true,
  coverImage: true,
  meanScore: true,
  isAdult: true,
} as const;

/**
 * Les conditions qui portent sur l'**œuvre** plutôt que sur le suivi.
 *
 * Elles sont rassemblées en un seul objet et pas empilées au fur et à mesure : `media` est une
 * clé unique du `where`, et deux `media: {…}` écrits à la suite dans un littéral se remplacent
 * silencieusement. C'est exactement comme ça qu'on perd le filtre 18+ en ajoutant un filtre de
 * genre — sans erreur de compilation, et sans que rien ne se voie à la relecture.
 *
 * **`includeAdult` est appliqué dans la requête**, jamais par un masque d'affichage : la règle vaut
 * ici comme sur la fiche et sur la recherche (docs/recherche-filtres.md §2.5). Une ligne écartée à
 * l'affichage a quand même traversé le réseau, fausse les décomptes et compte dans la pagination.
 */
function mediaConditions({
  filters,
  includeAdult,
}: {
  filters: LibraryFilterValues;
  includeAdult: boolean;
}) {
  const media: Record<string, unknown> = {};

  if (!includeAdult) media.isAdult = false;
  if (filters.type) media.type = filters.type;

  /*
    `has` sur une colonne de tableau : un genre inventé dans l'URL ne rend rien plutôt que d'élargir
    le périmètre. C'est ce qui autorise `genre` à être le seul parseur ouvert du contrat.
  */
  if (filters.genre) media.genres = { has: filters.genre };

  /*
    Le terme cherche dans les **trois** colonnes de titre du miroir, pas seulement le romaji : on
    tape « Attack on Titan » aussi souvent que « Shingeki ». `insensitive` parce qu'on ne capitalise
    pas une recherche, et `contains` parce qu'on tape un morceau du titre — jamais son début.

    Il ne part jamais chez AniList : c'est ce qui rend la saisie à la volée acceptable ici alors
    qu'elle est anti-rebondie sur le catalogue.
  */
  const term = filters.q.trim();
  if (term) {
    media.OR = [
      { titleRomaji: { contains: term, mode: "insensitive" } },
      { titleEnglish: { contains: term, mode: "insensitive" } },
      { titleNative: { contains: term, mode: "insensitive" } },
    ];
  }

  return Object.keys(media).length > 0 ? { media } : {};
}

/**
 * Le `where` complet d'une page de bibliothèque.
 *
 * `withStatus` existe pour la rangée de compteurs, qui pose la même question **six fois moins le
 * statut** : c'est le seul appelant qui veut les autres facettes sans celle-là.
 */
function libraryWhere({
  userId,
  filters,
  includeAdult,
  withStatus,
}: {
  userId: string;
  filters: LibraryFilterValues;
  includeAdult: boolean;
  withStatus: boolean;
}) {
  return {
    userId,
    ...(withStatus && filters.status ? { status: filters.status } : {}),
    ...mediaConditions({ filters, includeAdult }),
  };
}

/**
 * Le tri, traduit en `orderBy`.
 *
 * Trois des quatre se départagent ensuite par l'activité récente : sans ce second critère, deux
 * œuvres de même note ou de même progression changeraient d'ordre d'une page à l'autre, et un
 * résultat pourrait apparaître deux fois — ou jamais. **Une pagination sans ordre total est une
 * pagination qui perd des lignes.**
 *
 * `nulls: "last"` sur la note : « pas encore noté » n'est pas zéro (docs/PRODUCT.md §4.2), et
 * remonter les non-notées en tête d'un tri par note serait le contraire de la question posée.
 *
 * Le tri par titre suit le romaji et **pas encore `titleLanguage`** : c'est le manque relevé au
 * §1.10 de docs/recherche-filtres.md, et il vaut ici aussi — on trie en romaji un écran qui peut
 * afficher l'anglais.
 */
function libraryOrderBy(sort: LibraryFilterValues["sort"]) {
  switch (sort) {
    case "title":
      return [{ media: { titleRomaji: "asc" as const } }];
    case "score":
      return [
        { score: { sort: "desc" as const, nulls: "last" as const } },
        { updatedAt: "desc" as const },
      ];
    case "progress":
      return [{ progress: "desc" as const }, { updatedAt: "desc" as const }];
    default:
      // L'index `[userId, updatedAt]` existe pour celui-ci : c'est la question que la bibliothèque
      // pose d'abord — « où j'en étais déjà ? ».
      return [{ updatedAt: "desc" as const }];
  }
}

export type LibraryStatusCounts = {
  /** Toutes mes entrées qui passent les **autres** facettes, tous statuts confondus. */
  total: number;
  byStatus: Record<EntryStatus, number>;
};

/**
 * Combien d'œuvres par statut de suivi — **la tête de l'écran**.
 *
 * Un `groupBy` plutôt que six `count` : une passe sur l'index `[userId, status]` au lieu de six
 * allers-retours pour la même information.
 *
 * **Les compteurs honorent le terme, le type et le genre, mais pas le statut** — c'est ce qui les
 * rend vrais. Un onglet « Terminé · 159 » posé au-dessus de trois résultats parce qu'on cherche
 * « frieren » est exactement le compteur qui ment dont docs/recherche-filtres.md §3 veut se
 * débarrasser. Ici chaque onglet annonce ce qu'il donnera si on le clique.
 *
 * La table renvoyée est **complète**, zéros compris. Prisma n'émet pas de ligne pour un statut sans
 * entrée, et laisser le trou obligerait chaque appelant à retomber sur zéro — ou à ne rien afficher
 * du tout, ce qui ferait disparaître un onglet de la rangée selon l'état de la base. Un « Relecture
 * · 0 » se lit ; un onglet qui manque se cherche.
 */
export async function getLibraryStatusCounts({
  filters,
  includeAdult,
}: {
  filters: LibraryFilterValues;
  includeAdult: boolean;
}): Promise<LibraryStatusCounts> {
  const userId = await currentUserId();

  const rows = await prisma.entry.groupBy({
    by: ["status"],
    where: libraryWhere({
      userId,
      filters,
      includeAdult,
      withStatus: false,
    }),
    _count: { _all: true },
  });

  const byStatus = Object.fromEntries(
    LIBRARY_STATUS_ORDER.map((status) => [status, 0]),
  ) as Record<EntryStatus, number>;

  let total = 0;
  for (const row of rows) {
    byStatus[row.status] = row._count._all;
    total += row._count._all;
  }

  return { total, byStatus };
}

/**
 * Les genres présents **dans ma bibliothèque**, et eux seuls.
 *
 * C'est la différence avec la liste de `/search`, qui propose les dix-huit genres d'AniList : ici,
 * offrir un genre dont aucune de mes lignes ne porte la marque, c'est promettre un écran vide. La
 * liste se dérive donc des données, ce qui la fait aussi maigrir toute seule sur une bibliothèque
 * neuve.
 *
 * **Elle ignore volontairement les filtres courants.** Restreindre le vocabulaire à ce que la page
 * affiche ferait disparaître de la liste le genre qu'on vient de choisir — on ne pourrait plus en
 * changer sans d'abord l'effacer. Un sélecteur qui se vide en étant utilisé n'est pas un filtre.
 *
 * **Le dédoublonnage se fait en mémoire, pas en SQL.** `genres` est une colonne de tableau : la
 * distinguer en base demande un `unnest`, donc du SQL brut, donc une requête que le typage ne garde
 * plus. Quelques centaines de lignes de trois mots ne valent pas ce prix — et `includeAdult` reste
 * appliqué dans la requête, là où il compte.
 */
export async function getLibraryGenres({
  includeAdult,
}: {
  includeAdult: boolean;
}): Promise<string[]> {
  const userId = await currentUserId();

  const rows = await prisma.media.findMany({
    where: {
      entries: { some: { userId } },
      ...(includeAdult ? {} : { isAdult: false }),
    },
    select: { genres: true },
  });

  return [...new Set(rows.flatMap((row) => row.genres))].sort();
}

/**
 * Une ligne de bibliothèque : l'œuvre, et **où j'en suis avec elle**.
 *
 * Le statut voyage à côté du média plutôt que dedans : `MediaCompact` décrit une œuvre, la même
 * pour les quatre comptes, et y greffer un champ propre au visiteur ferait mentir sa forme partout
 * ailleurs — sur la fiche, dans les recommandations, dans les relations.
 */
export type LibraryItem = {
  media: MediaCompact;
  status: EntryStatus;
};

export type LibraryPage = {
  items: LibraryItem[];
  /** Le nombre de lignes qui passent **tous** les filtres, pagination comprise. */
  total: number;
  /** La page réellement servie — pas celle demandée, si l'URL en réclamait une qui n'existe pas. */
  page: number;
  pageCount: number;
};

/**
 * Une page de ma bibliothèque : les filtres de l'URL, le tri, et la tranche demandée.
 *
 * **Le compte et la tranche partent ensemble**, dans une seule aller-retour logique : sans le
 * total, la pagination ne saurait pas combien de crans afficher, et un « page 2 sur ? » n'est pas
 * une pagination. C'est aussi la raison pour laquelle cette requête existe au lieu d'un simple
 * échantillon — une pagination posée sur un extrait annoncerait des pages qui ne correspondent à
 * rien de ce que les onglets promettent.
 *
 * **La page demandée est ramenée dans les bornes plutôt que rejetée.** Une adresse forgée, ou un
 * lien envoyé avant qu'on abandonne quinze séries, doit rendre la dernière page réelle et non une
 * grille vide qu'on lit comme une panne. La page servie est renvoyée à l'appelant pour que la
 * pagination souligne le bon cran — et non celui de l'URL.
 */
export async function getLibrary({
  filters,
  includeAdult,
}: {
  filters: LibraryFilterValues;
  includeAdult: boolean;
}): Promise<LibraryPage> {
  const userId = await currentUserId();
  const where = libraryWhere({
    userId,
    filters,
    includeAdult,
    withStatus: true,
  });

  const total = await prisma.entry.count({ where });

  /*
    Une bibliothèque vide compte **une** page, pas zéro : la grille doit pouvoir dire « rien ici »
    quelque part, et « page 1 sur 0 » n'existe pas.
  */
  const pageCount = Math.max(1, Math.ceil(total / CATALOGUE_PAGE_SIZE));
  const page = Math.min(Math.max(filters.page, 1), pageCount);

  const rows = await prisma.entry.findMany({
    where,
    orderBy: libraryOrderBy(filters.sort),
    skip: (page - 1) * CATALOGUE_PAGE_SIZE,
    take: CATALOGUE_PAGE_SIZE,
    select: { status: true, media: { select: MIRRORED_MEDIA_SELECT } },
  });

  return {
    items: rows.map((row) => ({
      media: compactFromMirror(row.media),
      status: row.status,
    })),
    total,
    page,
    pageCount,
  };
}
