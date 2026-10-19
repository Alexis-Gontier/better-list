import "server-only";

import { cache } from "react";

import type { CommandSearchItem } from "@/features/command/schemas/command-search.schema";
import { listCountsLine } from "@/features/lists/lib/list-labels";
import {
  listSections,
  sectionCounts,
} from "@/features/lists/lib/list-sections";
import type { ListKind } from "@/features/lists/schemas/lists.schema";
import {
  compactFromMirror,
  formatMediaFormat,
  MIRRORED_MEDIA_SELECT,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type {
  MediaCompact,
  MediaStatus,
} from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import type { EntryUnit } from "@/features/tracking/lib/entry-format";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Les lectures de mes listes (docs/conception.md §4.4).
 *
 * **Jamais de `"use cache"`**, pour la raison de `library.queries.ts` : ces lectures dépendent du
 * visiteur, elles n'ont donc rien à mémoriser entre deux visiteurs.
 *
 * **`cache` de React sur `getList` seule**, depuis le 7 septembre 2026. Les autres n'en ont pas
 * besoin — elles ne sont appelées qu'une fois par rendu, et dédupliquer un appel unique ne
 * dépliquerait rien. `getList`, elle, en a deux depuis que `generateMetadata` nomme l'onglet
 * d'après la liste : sans déduplication, chaque affichage compterait deux fois la même requête.
 */

/**
 * Le compte courant, pour un écran qui vit **sous la garde du layout**.
 *
 * `requireApprovedUser()` est appelée une fois et une seule, dans `app/(app)/layout.tsx`
 * (CLAUDE.md) : la redemander ici serait une deuxième garde, c'est-à-dire deux endroits
 * où l'on peut se tromper. Arriver sans session est donc un défaut de câblage — une route sortie du
 * groupe `(app)` —, pas un cas d'usage à traiter en silence. Renvoyer une page sans liste le
 * masquerait précisément le jour où il compte.
 */
async function currentUserId(): Promise<string> {
  const session = await getSession();

  if (!session) {
    throw new Error(
      "Lecture de listes hors de la garde de `app/(app)/layout.tsx`.",
    );
  }

  return session.user.id;
}

/** Une jaquette de la mosaïque. Le titre ne sert qu'à l'`alt` — la carte n'affiche pas les œuvres. */
export type ListCover = {
  mediaId: number;
  cover: string | null;
  title: string;
};

export type ListSummary = {
  id: string;
  title: string;
  description: string | null;
  itemCount: number;
  /** La ligne de décompte propre au genre : « Top 10 · 18 œuvres », « 8 prêtes sur 17 ». */
  countsLine: string;
  /** Au plus quatre, dans l'ordre `rank` de la liste. Vide quand la liste n'a rien. */
  covers: ListCover[];
};

/**
 * Mes listes, avec de quoi dessiner leur carte : le décompte et les quatre premières jaquettes.
 *
 * **`List` n'a ni `cover` ni compteur d'items** — `conception.md` §4.4 mentionne la première, elle
 * n'existe pas au schéma. Les deux se dérivent donc des `ListItem`, et c'était le seul vrai
 * problème de lecture de cet écran : quatre jaquettes par carte, sur une page de listes, sans faire
 * une requête par liste.
 *
 * **Ce qui est mesuré, et non supposé** (6 septembre 2026, journal `query` de Prisma, cinq listes).
 * Ce `findMany` émet **trois** requêtes (cinq avec les décomptes par genre, plus bas), et ce nombre
 * ne bouge pas avec le nombre de listes — donc
 * **pas de N+1**, qui était la crainte :
 *
 * 1. les listes, le `_count` porté par un `LEFT JOIN` sur un `GROUP BY` de `list_items` ;
 * 2. `list_items WHERE "listId" IN (…) ORDER BY rank` — **sans `LIMIT`** ;
 * 3. `media WHERE id IN (…)`, pour les seules jaquettes retenues.
 *
 * **Le `take: 4` n'est pas poussé en SQL** : Prisma rapatrie tous les items de toutes mes listes,
 * puis tranche en mémoire. C'est le fait que la spec demandait d'établir, et il n'est pas celui
 * qu'on attendait — le coût n'est pas un aller-retour de trop, c'est une sur-lecture de la requête
 * 2. Elle reste **bornée et étroite** : trois colonnes (`id`, `mediaId`, `listId`), et surtout la
 * table large n'y passe pas — la requête 3 ne lit que les jaquettes réellement affichées. Sur un
 * cercle de quatre comptes aux listes de quelques dizaines d'œuvres, c'est sans conséquence ; ça
 * cesserait de l'être vers le millier d'items, et il faudrait alors une fenêtre
 * (`ROW_NUMBER() OVER (PARTITION BY "listId" ORDER BY rank)`) écrite à la main.
 *
 * **`relationLoadStrategy: "join"` n'est pas une issue : il n'existe pas ici.** Essayé le même
 * jour, Prisma 7.9.1 rejette l'argument avec le générateur `prisma-client` et le driver adapter —
 * `Unknown argument relationLoadStrategy`. Le repli que la spec envisageait n'est donc pas
 * disponible, et c'est pour ça qu'on garde celui-ci en le documentant plutôt qu'en le contournant.
 *
 * `_count` plutôt que compter `items` en mémoire : la carte annonce « 8 œuvres » alors qu'on n'en
 * rapatrie que quatre, et compter en base est la seule façon d'avoir les deux.
 *
 * **Les jaquettes se rangent par `rank`, jamais par `addedAt`.** C'est l'ordre que la liste a, et
 * celui que `/lists/[id]` montrera : deux ordres pour une même liste donneraient une carte qui ment
 * sur ce qu'elle ouvre.
 *
 * L'ordre des cartes suit `updatedAt` — l'index `@@index([ownerId, updatedAt])` est posé pour ça,
 * et c'est le seul ordre possible : `List` ne porte aucune colonne de rang, donc les listes ne se
 * réarrangent pas entre elles.
 *
 * **`includeAdult` filtre les jaquettes, pas le décompte** — décision d'Alexis du 6 septembre 2026,
 * prise en regardant l'écran. Le filtre est dans la requête et non en masque d'affichage, comme
 * partout ailleurs (.claude/skills/anilist-read/references/recherche-filtres.md §2.5) ; mais il ne porte que sur les quatre vignettes,
 * parce que le décompte parle de la liste et non de ce qu'on en montre. Une liste que j'ai composée
 * moi-même annonce donc toujours ce qu'elle contient, même quand sa préférence en cache l'aperçu.
 *
 * La conséquence à connaître : une liste **entièrement** 18+ montre quatre cases vides sur un
 * décompte non nul. C'est le seul cas où la mosaïque et le décompte ne parlent pas de la même
 * chose, et c'est précisément le décompte qui la distingue d'une liste réellement vide.
 */
export async function getLists({
  includeAdult,
}: {
  includeAdult: boolean;
}): Promise<ListSummary[]> {
  const ownerId = await currentUserId();

  const rows = await prisma.list.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      kind: true,
      cutoff: true,
      _count: { select: { items: true } },
      items: {
        take: 4,
        orderBy: { rank: "asc" },
        ...(includeAdult ? {} : { where: { media: { isAdult: false } } }),
        select: {
          media: {
            select: {
              id: true,
              coverImage: true,
              titleRomaji: true,
              titleEnglish: true,
            },
          },
        },
      },
    },
  });

  /*
    Les décomptes « prêtes » et « vues » portent sur la liste entière, pas sur ses quatre jaquettes :
    deux lectures étroites de plus (statut de parution, mon suivi), quel que soit le nombre de listes.
  */
  const statuses = await prisma.listItem.findMany({
    where: { list: { ownerId } },
    orderBy: { rank: "asc" },
    select: {
      listId: true,
      mediaId: true,
      media: { select: { status: true } },
    },
  });
  const entries = await prisma.entry.findMany({
    where: {
      userId: ownerId,
      mediaId: { in: [...new Set(statuses.map(({ mediaId }) => mediaId))] },
    },
    select: { mediaId: true, status: true },
  });
  const entryStatus = new Map(entries.map((e) => [e.mediaId, e.status]));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    itemCount: row._count.items,
    countsLine: listCountsLine(row.kind, row.cutoff, {
      total: row._count.items,
      ...sectionCounts(
        listSections(
          row.kind,
          row.cutoff,
          statuses
            .filter(({ listId }) => listId === row.id)
            .map(({ mediaId, media }) => ({
              item: mediaId,
              mediaStatus: media.status,
              entryStatus: entryStatus.get(mediaId) ?? null,
            })),
        ),
      ),
    }),
    /*
      Le titre sert d'`alt`, donc il doit dire quelque chose : le romaji d'abord, l'anglais en
      repli. Ce n'est pas `mediaTitle` — celle-ci honore la préférence `titleLanguage` du membre, ce
      qui a du sens sur une carte d'œuvre, pas sur une vignette de 40 px qu'on ne lit pas. La chaîne
      vide reste possible sur une ligne de miroir sans aucun titre, et c'est le bon `alt` : une
      jaquette décorative dans une mosaïque qui porte déjà le nom de la liste.
    */
    covers: row.items.map((item) => ({
      mediaId: item.media.id,
      cover: item.media.coverImage,
      title: item.media.titleRomaji ?? item.media.titleEnglish ?? "",
    })),
  }));
}

/** Une œuvre d'une liste, dans la forme que `MediaCard` et la fenêtre d'édition rapide attendent. */
export type ListDetailItem = {
  media: MediaCompact;
  /** La bannière du miroir — l'en-tête de la fenêtre d'édition rapide. `null` sur la plupart des mangas. */
  banner: string | null;
  unit: EntryUnit;
  /** Le plafond de progression. `null` quand AniList ignore le total — une série en cours. */
  total: number | null;
};

export type ListDetail = {
  id: string;
  title: string;
  description: string | null;
  kind: ListKind;
  /** La ligne de coupe d'un classement ; conservée hors classement, et ignorée. */
  cutoff: number | null;
  /** Le nombre d'œuvres **réel**, avant le filtre 18+ : c'est ce que la suppression emporterait. */
  itemCount: number;
  /**
   * Le jeton de partage, ou `null` si la liste n'est pas partagée — **la seule source de vérité du
   * partage** (§4.4).
   *
   * Il descend jusqu'au navigateur, et c'est nécessaire : le propriétaire doit pouvoir **copier son
   * propre lien**. Ce n'est pas une fuite — cette lecture est gardée par `ownerId`, donc le jeton
   * n'atteint que celui qui l'a fait fabriquer.
   */
  shareToken: string | null;
  items: ListDetailItem[];
};

/**
 * Une liste et son contenu, **dans son ordre**.
 *
 * `null` quand la liste n'existe pas **ou n'est pas la mienne**, et les deux cas se confondent
 * volontairement : distinguer « elle n'existe pas » de « elle ne t'appartient pas » dirait à qui
 * essaie des identifiants au hasard lesquels ont trouvé quelque chose. L'appelant rend un 404 dans
 * les deux cas.
 *
 * **Pas de pagination.** Une liste tient dans les dizaines d'œuvres, pas dans les milliers ; la
 * paginer coûterait un compte de plus par affichage pour un cran qu'on n'atteindrait jamais. C'est
 * la différence avec `/library`, qui pagine parce qu'elle peut porter des centaines de lignes et
 * qu'on y arrive par un filtre, pas par une intention.
 *
 * **`includeAdult` filtre les œuvres, pas `itemCount`** — la règle de `getLists`, pour la même
 * raison : le décompte parle de la liste, la grille de ce qu'on en montre. C'est aussi ce qui rend
 * la confirmation de suppression honnête, puisqu'elle annonce ce qui partirait vraiment.
 *
 * Le suivi ne vient **pas** d'ici : `getLibraryEntriesFor` le rapporte en une requête pour toute la
 * page, et son docstring prévoyait déjà de servir les listes. Le mêler à cette lecture aurait
 * dupliqué une jointure que le catalogue fait déjà.
 */
export const getList = cache(async function getList(
  listId: string,
  { includeAdult }: { includeAdult: boolean },
): Promise<ListDetail | null> {
  const ownerId = await currentUserId();

  const list = await prisma.list.findFirst({
    where: { id: listId, ownerId },
    select: {
      id: true,
      title: true,
      description: true,
      kind: true,
      cutoff: true,
      shareToken: true,
      _count: { select: { items: true } },
      items: {
        orderBy: { rank: "asc" },
        ...(includeAdult ? {} : { where: { media: { isAdult: false } } }),
        select: { media: { select: MIRRORED_MEDIA_SELECT } },
      },
    },
  });

  if (!list) return null;

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    kind: list.kind,
    cutoff: list.cutoff,
    itemCount: list._count.items,
    shareToken: list.shareToken,
    items: list.items.map(({ media }) => ({
      media: compactFromMirror(media),
      banner: media.bannerImage,
      /*
        L'unité suit le type de l'œuvre, comme partout ailleurs : un anime se compte en épisodes,
        tout le reste en chapitres. La même condition décide de ce qu'on compte et de jusqu'où.
      */
      unit: media.type === "ANIME" ? "episode" : "chapitre",
      total: media.type === "ANIME" ? media.episodes : media.chapters,
    })),
  };
});

/** Une de mes listes, et si cette œuvre y est déjà. */
export type ListMembership = {
  id: string;
  title: string;
  kind: ListKind;
  itemCount: number;
  contains: boolean;
};

/**
 * Mes listes, vues depuis **une** œuvre : lesquelles la contiennent déjà.
 *
 * C'est ce que lit la fenêtre « Ajouter à une liste » de la fiche, et c'est pour ça qu'elle affiche
 * des **bascules** plutôt qu'un simple ajout — on voit où l'œuvre est rangée avant de choisir, et on
 * peut l'en retirer.
 *
 * **Une requête, pas deux.** Le `items` est filtré sur ce `mediaId` seul, donc chaque liste rapporte
 * zéro ou une ligne et `contains` s'en déduit. Lire toutes mes listes puis toutes leurs
 * appartenances séparément aurait coûté un aller-retour de plus pour la même information — et un
 * `take: 1` suffit puisque `@@unique([listId, mediaId])` garantit qu'il n'y en a jamais deux.
 *
 * **Aucun filtre 18+ ici**, contrairement à `getLists`. La préférence masque des *jaquettes* ; elle
 * n'a pas à masquer des *listes*, sans quoi on ne pourrait plus ranger une œuvre dans une liste qui
 * ne contient que des œuvres adultes — ni l'en retirer.
 *
 * L'ordre est celui de `/lists` : la dernière modifiée en tête, donc celle qu'on vient de créer.
 */
export async function getListMembership(
  mediaId: number,
): Promise<ListMembership[]> {
  const ownerId = await currentUserId();

  const rows = await prisma.list.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      kind: true,
      _count: { select: { items: true } },
      items: { where: { mediaId }, select: { id: true }, take: 1 },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    itemCount: row._count.items,
    contains: row.items.length > 0,
  }));
}

export type SharedList = {
  title: string;
  description: string | null;
  /** Le nom du membre qui partage. Décision d'Alexis du 6 septembre 2026 : la page dit d'où elle vient. */
  ownerName: string;
  items: ListDetailItem[];
};

/**
 * Une liste ouverte **par son jeton**, sans session (docs/conception.md §4.4).
 *
 * **C'est la seule lecture du dépôt qui ne demande à personne qui il est**, et c'est délibéré :
 * `/l/[token]` vit hors du groupe `(app)`, donc `requireApprovedUser()` ne la couvre pas. La garde,
 * ici, **est le jeton** — 144 bits tirés du générateur cryptographique de Node
 * (`share-token.ts`), qu'aucune énumération n'atteint.
 *
 * D'où trois conséquences qu'il ne faut pas défaire :
 *
 * 1. **`shareToken` est cherché tel quel**, jamais combiné à un `ownerId` : on ne sait pas qui
 *    regarde, et c'est le principe même d'un lien non listé.
 * 2. **`null` quand le jeton ne correspond à rien** — jeton faux, ou lien révoqué depuis. Les deux
 *    se confondent, et l'appelant rend un 404 : distinguer « ce jeton n'existe pas » de « ce jeton
 *    a été révoqué » confirmerait à qui essaie qu'un lien a existé.
 * 3. **Révoquer, c'est mettre la colonne à `null`**, donc ce `findFirst` ne trouve plus rien. Le
 *    lien meurt de lui-même, sans purge de cache à faire — la page n'a aucun `"use cache"`, et elle
 *    ne doit jamais en avoir : une page mémorisée par jeton survivrait à sa révocation.
 *
 * **Aucun filtre 18+**, contrairement à `getLists` et `getList` — décision d'Alexis du 6 septembre
 * 2026. La préférence appartient à un compte, et il n'y en a pas ici ; surtout, la page doit montrer
 * la liste **telle qu'elle a été partagée**. Masquer ferait diverger ce que voit le destinataire de
 * ce que croit envoyer celui qui partage, et le décompte mentirait.
 */
export async function getSharedList(token: string): Promise<SharedList | null> {
  const list = await prisma.list.findFirst({
    where: { shareToken: token },
    select: {
      title: true,
      description: true,
      owner: { select: { name: true, username: true } },
      items: {
        orderBy: { rank: "asc" },
        select: { media: { select: MIRRORED_MEDIA_SELECT } },
      },
    },
  });

  if (!list) return null;

  return {
    title: list.title,
    description: list.description,
    // Le nom d'affichage d'abord, l'identifiant en repli : un compte sans nom reste nommable.
    ownerName: list.owner.name || list.owner.username || "un membre",
    items: list.items.map(({ media }) => ({
      media: compactFromMirror(media),
      banner: media.bannerImage,
      unit: media.type === "ANIME" ? "episode" : "chapitre",
      total: media.type === "ANIME" ? media.episodes : media.chapters,
    })),
  };
}

/**
 * Ce que chaque genre suggère avant qu'on tape. Une attente de fin propose ce que j'ai mis de côté
 * pendant sa parution — en production, c'est exactement le contenu de « A lire une fois fini ».
 */
const SUGGESTION_FILTERS: Record<
  ListKind,
  { entry?: EntryStatus[]; media?: MediaStatus[] }
> = {
  SELECTION: {},
  RANKING: {},
  WATCHLIST: { entry: ["PLANNING"] },
  WAIT_FOR_END: {
    entry: ["PAUSED", "DROPPED", "PLANNING"],
    media: ["RELEASING", "HIATUS", "NOT_YET_RELEASED"],
  },
};

/** Huit : ce que la fenêtre d'ajout montre sans défiler, sous le champ. */
const SUGGESTION_COUNT = 8;

/**
 * Ce que la fenêtre « Ajouter des œuvres » propose avant qu'on tape : mes œuvres qui ne sont pas
 * encore dans cette liste, filtrées selon son genre (`SUGGESTION_FILTERS`), les dernières touchées
 * d'abord.
 *
 * **Aucune lecture AniList** : tout vient du miroir et de mon suivi. La forme est celle d'une ligne
 * de la palette (`CommandSearchItem`), pour que la fenêtre dessine suggestions et résultats d'un
 * même composant.
 */
export async function getListSuggestions(
  listId: string,
  kind: ListKind,
  {
    includeAdult,
    titleLanguage,
  }: { includeAdult: boolean; titleLanguage: TitleLanguage },
): Promise<CommandSearchItem[]> {
  const userId = await currentUserId();
  const filter = SUGGESTION_FILTERS[kind];

  const rows = await prisma.entry.findMany({
    where: {
      userId,
      ...(filter.entry ? { status: { in: filter.entry } } : {}),
      media: {
        listItems: { none: { listId } },
        ...(filter.media ? { status: { in: filter.media } } : {}),
        ...(includeAdult ? {} : { isAdult: false }),
      },
    },
    orderBy: { updatedAt: "desc" },
    take: SUGGESTION_COUNT,
    select: { status: true, media: { select: MIRRORED_MEDIA_SELECT } },
  });

  return rows.map(({ status, media }) => {
    const compact = compactFromMirror(media);

    return {
      id: compact.id,
      title: mediaTitle(compact.title, titleLanguage),
      format: formatMediaFormat(compact.format),
      year: media.seasonYear,
      cover: compact.coverImage?.medium ?? null,
      status,
    };
  });
}
