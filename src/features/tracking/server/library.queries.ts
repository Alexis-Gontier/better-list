import "server-only";

import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import {
  compactFromMirror,
  MIRRORED_MEDIA_SELECT,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import type { EntryUnit } from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import {
  LIBRARY_STATUS_ORDER,
  type LibraryFilterValues,
  type TierFilterValues,
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

/**
 * Les colonnes qui composent un `EntryState` — **exactement**, ni plus ni moins.
 *
 * La forme est celle d'`entry-transition.ts`, et c'est ce qui permet à `entryDraftFrom` de partir
 * de cette ligne sans adaptateur, puis à `entryDraftChanges` de n'envoyer que ce qui a bougé
 * (docs/PRODUCT.md §4.2). Ramener moins obligerait la fenêtre à inventer les champs manquants — et
 * un champ inventé qu'on renvoie au serveur est une modification qu'on n'a pas demandée.
 *
 * `private` et `favorite` : seul le second est dans `EntryState`. Le premier ne concerne que la
 * visibilité auprès du cercle, qui n'a pas d'écran.
 */
const ENTRY_STATE_SELECT = {
  status: true,
  progress: true,
  progressVolumes: true,
  score: true,
  favorite: true,
  notes: true,
  repeatCount: true,
  startedAt: true,
  finishedAt: true,
} as const;

/**
 * Les conditions qui portent sur l'**œuvre** plutôt que sur le suivi.
 *
 * Elles sont rassemblées en un seul objet et pas empilées au fur et à mesure : `media` est une
 * clé unique du `where`, et deux `media: {…}` écrits à la suite dans un littéral se remplacent
 * silencieusement. C'est exactement comme ça qu'on perd le filtre 18+ en ajoutant une facette de
 * plus — sans erreur de compilation, et sans que rien ne se voie à la relecture.
 *
 * **`includeAdult` est appliqué dans la requête**, jamais par un masque d'affichage : la règle vaut
 * ici comme sur la fiche et sur la recherche (docs/recherche-filtres.md §2.5). Une ligne écartée à
 * l'affichage a quand même traversé le réseau, fausse les décomptes et compte dans la pagination.
 */
function mediaConditions({
  filters,
  includeAdult,
}: {
  /*
    La forme minimale plutôt que `LibraryFilterValues` : la tier list applique les mêmes conditions
    d'œuvre sans avoir ni page, ni tri, ni terme. Exiger les filtres complets l'obligerait à en
    inventer, et un filtre inventé finit par être lu.

    Les champs sont **dérivés** et non retapés : l'union des types vient de `LIBRARY_TYPE_OPTIONS`,
    et une copie à la main cesserait de suivre le jour où un troisième type apparaît.
  */
  filters: {
    q?: LibraryFilterValues["q"];
    type?: LibraryFilterValues["type"];
  };
  includeAdult: boolean;
}) {
  const media: Record<string, unknown> = {};

  if (!includeAdult) media.isAdult = false;
  if (filters.type) media.type = filters.type;

  /*
    Le terme cherche dans les **trois** colonnes de titre du miroir, pas seulement le romaji : on
    tape « Attack on Titan » aussi souvent que « Shingeki ». `insensitive` parce qu'on ne capitalise
    pas une recherche, et `contains` parce qu'on tape un morceau du titre — jamais son début.

    Il ne part jamais chez AniList : c'est ce qui rend la saisie à la volée acceptable ici alors
    qu'elle est anti-rebondie sur le catalogue.
  */
  const term = filters.q?.trim() ?? "";
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
 * **Les compteurs honorent le terme et le type, mais pas le statut** — c'est ce qui les
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
 * Mon suivi d'**une** œuvre — `null` quand je ne la suis pas encore.
 *
 * C'est ce que la fiche demande, et elle n'a pas besoin du `in` de sa voisine : `findUnique` tape
 * droit dans la contrainte d'unicité `(userId, mediaId)`. Passer par `getLibraryEntriesFor([id])`
 * aurait marché, mais aurait fait lire « parmi ces œuvres » là où la question est « celle-ci ».
 *
 * **Le `null` est une réponse, pas une absence de réponse** : c'est lui qui distingue l'œuvre
 * jamais suivie de l'œuvre suivie à zéro — la case que docs/fiche-media.md §2.7 laisse ouverte —,
 * et c'est lui qui fait dire « Ajouter » plutôt que « Enregistrer ».
 */
export async function getEntryFor(mediaId: number): Promise<EntryState | null> {
  const userId = await currentUserId();

  return prisma.entry.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
    select: ENTRY_STATE_SELECT,
  });
}

/**
 * Parmi ces œuvres, lesquelles sont déjà dans ma bibliothèque — et **où j'en suis avec chacune**.
 *
 * **C'est l'issue 1 de docs/recherche-filtres.md §2, « annoter plutôt que filtrer ».** Le document
 * la recommande comme « la seule qui ne coûte rien et ne mente jamais » : filtrer `/search` sur nos
 * propres lignes trouerait une page qu'AniList a déjà découpée, et le compteur mentirait. Une
 * pastille sur la carte répond à la même question — « est-ce que je l'ai déjà ? » — sans toucher à
 * la pagination.
 *
 * **Elle rend l'état complet et pas le seul statut**, parce que la pastille n'est pas le seul
 * consommateur : la fenêtre d'édition rapide s'ouvre depuis le catalogue comme depuis la
 * bibliothèque, et elle a besoin de tout `EntryState` pour que `entryDraftFrom` n'ait rien à
 * inventer. Deux lectures pour la même ligne — une pour la pastille, une pour la fenêtre —
 * auraient été deux allers-retours et deux occasions de diverger.
 *
 * **Une requête pour toute la page, pas une par carte.** Les vingt et un ids partent en un seul
 * `in`, sur l'index `[userId, mediaId]` que porte la contrainte d'unicité. Interroger carte par
 * carte ferait vingt et un allers-retours pour une grille.
 *
 * Elle ne connaît **aucun filtre** et ne pagine rien : l'appelant lui donne les ids qu'il affiche,
 * d'où qu'ils viennent. C'est ce qui lui permettra de servir la fiche, les listes ou les
 * recommandations sans rien changer.
 *
 * Un `Map` plutôt qu'un tableau : l'appelant interroge par id, une carte à la fois, et une
 * recherche linéaire dans un tableau à chaque vignette serait la mauvaise forme pour le seul usage
 * qui existe. **Une clé absente veut dire « pas encore suivie »** — c'est une information, pas un
 * trou : c'est elle qui décide qu'aucune pastille ne s'affiche.
 */
export async function getLibraryEntriesFor(
  mediaIds: number[],
): Promise<Map<number, EntryState>> {
  // Une page vide ne pose pas la question : `in: []` partirait quand même en base pour rapporter
  // ce qu'on sait déjà.
  if (mediaIds.length === 0) return new Map();

  const userId = await currentUserId();

  const rows = await prisma.entry.findMany({
    where: { userId, mediaId: { in: mediaIds } },
    select: { mediaId: true, ...ENTRY_STATE_SELECT },
  });

  return new Map(rows.map(({ mediaId, ...entry }) => [mediaId, entry]));
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
  /**
   * Mon suivi **en entier**, dans la forme d'`entry-transition.ts`.
   *
   * Il voyage à côté du média plutôt que dedans : `MediaCompact` décrit une œuvre, la même pour les
   * quatre comptes, et y greffer des champs propres au visiteur ferait mentir sa forme partout
   * ailleurs — sur la fiche, dans les recommandations, dans les relations.
   *
   * **L'état complet et pas trois champs choisis** : c'est ce qui laisse `entryDraftFrom` ouvrir la
   * fenêtre d'édition sans rien inventer, et `entryDraftChanges` n'envoyer ensuite que ce qui a
   * bougé. Une fenêtre qui devrait deviner les dates qu'on ne lui a pas données finirait par les
   * réécrire.
   */
  entry: EntryState;
  /**
   * La bannière du miroir — l'en-tête de la fenêtre d'édition rapide.
   *
   * `null` sur la plupart des mangas et des webtoons : AniList n'en a pas, et c'est le cas courant,
   * pas l'exception (docs/fiche-media.md §1.1).
   */
  banner: string | null;
  /**
   * Ce qu'on compte, et son plafond : des **épisodes** sur un anime, des **chapitres** sur tout le
   * reste.
   *
   * Les deux voyagent ensemble parce qu'ils répondent à la même question, et ils sont décidés ici
   * plutôt qu'à l'affichage pour que la page n'ait pas à reconnaître le type de l'œuvre une
   * seconde fois.
   *
   * `total` est `null` sur une œuvre en cours de diffusion, dont AniList ignore le nombre
   * d'épisodes — un cas courant, pas une exception. Le pas de progression l'affiche alors en « ? ».
   */
  unit: EntryUnit;
  total: number | null;
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
    select: {
      ...ENTRY_STATE_SELECT,
      media: { select: MIRRORED_MEDIA_SELECT },
    },
  });

  return {
    items: rows.map(({ media, ...entry }) => ({
      media: compactFromMirror(media),
      /*
        L'entrée est reprise telle quelle : la sélection ci-dessus est déjà exactement un
        `EntryState`, donc la recopier champ par champ n'ajouterait qu'un endroit de plus où en
        oublier un le jour où le modèle en gagne un.
      */
      entry,
      banner: media.bannerImage,
      /*
        L'unité suit le type de l'œuvre, comme partout ailleurs dans le produit : un anime se
        compte en épisodes, tout le reste en chapitres. La même condition décide des deux — ce
        qu'on compte et jusqu'où —, donc elle s'écrit une fois.
      */
      unit: media.type === "ANIME" ? "episode" : "chapitre",
      total: media.type === "ANIME" ? media.episodes : media.chapters,
    })),
    total,
    page,
    pageCount,
  };
}

/** Une œuvre telle que le plateau la manipule — une jaquette, un titre, une note. */
export type TierEntry = {
  mediaId: number;
  title: string;
  cover: string | null;
  /** `null` : dans la réserve, pas encore jugée. */
  score: number | null;
};

/**
 * Tout ce que la tier list a le droit de montrer, **en une fois et sans pagination**.
 *
 * Le plateau n'a pas de pages, et c'est le sujet : on recale des notes les unes par rapport aux
 * autres, donc masquer la moitié des œuvres derrière un cran de pagination reviendrait à comparer
 * ce qu'on ne voit pas. La bibliothèque d'un cercle de quatre comptes tient dans une lecture ; le
 * jour où elle n'y tiendra plus, c'est le filtre par type qui la coupera, pas une page 2.
 *
 * **Les œuvres `PLANNING` n'y sont pas du tout** — décision d'Alexis, 7 septembre 2026. On ne juge
 * pas ce qu'on n'a pas ouvert, et sans cette exclusion la réserve se remplissait de la liste
 * d'envies, c'est-à-dire de tout sauf de ce qu'on venait noter.
 *
 * L'exclusion est **franche** : une œuvre prévue et malgré tout notée disparaît elle aussi du
 * plateau. C'est la conséquence assumée d'une règle simple plutôt que d'un « prévu sauf si noté »
 * qui aurait fait réapparaître, au milieu du plateau, exactement ce qu'on venait d'en sortir. Cette
 * note-là reste modifiable depuis la fiche de l'œuvre, qui ne filtre rien.
 *
 * Le titre est résolu ici, dans la langue préférée du compte : le plateau est un composant client,
 * et lui envoyer trois colonnes de titre plus la préférence pour qu'il refasse le calcul ferait
 * traverser la frontière à une règle qui vit très bien côté serveur.
 */
export async function getScoredLibrary({
  filters,
  includeAdult,
  titleLanguage,
}: {
  filters: TierFilterValues;
  includeAdult: boolean;
  titleLanguage: TitleLanguage;
}): Promise<TierEntry[]> {
  const userId = await currentUserId();

  const rows = await prisma.entry.findMany({
    where: {
      userId,
      status: { not: "PLANNING" },
      ...mediaConditions({ filters, includeAdult }),
    },
    select: {
      score: true,
      media: {
        select: {
          id: true,
          titleRomaji: true,
          titleEnglish: true,
          titleNative: true,
          coverImage: true,
        },
      },
    },
  });

  return rows.map(({ score, media }) => ({
    mediaId: media.id,
    title: mediaTitle(
      {
        romaji: media.titleRomaji,
        english: media.titleEnglish,
        native: media.titleNative,
        userPreferred: null,
      },
      titleLanguage,
    ),
    cover: media.coverImage,
    score,
  }));
}
