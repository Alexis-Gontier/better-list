import "server-only";

import { cache } from "react";

import type { CommandSearchItem } from "@/features/command/schemas/command-search.schema";
import { listCountsLine } from "@/features/lists/lib/list-labels";
import {
  listSections,
  sectionCounts,
} from "@/features/lists/lib/list-sections";
import type {
  ListKind,
  ListMembership,
} from "@/features/lists/schemas/lists.schema";
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
  kind: ListKind;
  cutoff: number | null;
  /** La liste porte un lien de partage : la carte le signale, sans exposer le jeton. */
  shared: boolean;
  itemCount: number;
  /** La ligne de décompte propre au genre : « Top 10 · 18 œuvres », « 8 prêtes sur 17 ». */
  countsLine: string;
  /** Au plus quatre, dans l'ordre des sections du genre. Vide quand la liste n'a rien. */
  covers: ListCover[];
};

/** Quatre jaquettes par carte : c'est la largeur d'une carte, et ce que la mosaïque dessine. */
const COVERS_PER_CARD = 4;

/**
 * Mes listes, avec de quoi dessiner leur carte : le genre, le décompte, et quatre jaquettes.
 *
 * **`List` n'a ni `cover` ni compteur d'items** : les deux se dérivent des `ListItem`. Trois
 * requêtes, quel que soit le nombre de listes — **pas de N+1** :
 *
 * 1. les listes, le `_count` porté par un `LEFT JOIN` sur un `GROUP BY` de `list_items` ;
 * 2. **tous** les items de mes listes, avec le statut de parution et la jaquette de chaque œuvre ;
 * 3. mon suivi sur ces œuvres.
 *
 * La requête 2 lit tout, exprès : les décomptes « prêtes » et « vues » portent sur la liste
 * entière, et la mosaïque d'une liste « Quand c'est fini » montre **ses prêtes d'abord**, donc elle
 * a besoin de connaître toutes les œuvres pour choisir ses quatre. Sur un cercle de quatre comptes
 * aux listes de quelques dizaines d'œuvres, c'est sans conséquence ; vers le millier d'items, il
 * faudrait une fenêtre (`ROW_NUMBER() OVER (PARTITION BY "listId" …)`) écrite à la main.
 * `relationLoadStrategy: "join"` n'est pas une issue : Prisma 7 le refuse avec le driver adapter.
 *
 * **Les jaquettes suivent l'ordre des sections du genre** (`listSections`) : le rang pour une
 * sélection ou un classement, les prêtes avant les en-parution, ce qui reste à voir avant le déjà vu.
 * C'est l'ordre que `/lists/[id]` montrera, donc la carte ne ment pas sur ce qu'elle ouvre.
 *
 * L'ordre des cartes suit `updatedAt` — l'index `@@index([ownerId, updatedAt])` est posé pour ça.
 *
 * **`includeAdult` filtre les jaquettes, pas le décompte** — décision d'Alexis du 6 septembre 2026 :
 * le décompte parle de la liste, la mosaïque de ce qu'on en montre. Une liste **entièrement** 18+
 * montre donc des cases vides sur un décompte non nul, et c'est le décompte qui la distingue d'une
 * liste réellement vide.
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
      shareToken: true,
      _count: { select: { items: true } },
    },
  });

  const items = await prisma.listItem.findMany({
    where: { list: { ownerId } },
    orderBy: { rank: "asc" },
    select: {
      listId: true,
      media: {
        select: {
          id: true,
          status: true,
          isAdult: true,
          coverImage: true,
          titleRomaji: true,
          titleEnglish: true,
        },
      },
    },
  });
  const entries = await prisma.entry.findMany({
    where: {
      userId: ownerId,
      mediaId: { in: [...new Set(items.map(({ media }) => media.id))] },
    },
    select: { mediaId: true, status: true },
  });
  const entryStatus = new Map(entries.map((e) => [e.mediaId, e.status]));

  return rows.map((row) => {
    const sections = listSections(
      row.kind,
      row.cutoff,
      items
        .filter(({ listId }) => listId === row.id)
        .map(({ media }) => ({
          item: media,
          mediaStatus: media.status,
          entryStatus: entryStatus.get(media.id) ?? null,
        })),
    );

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      kind: row.kind,
      cutoff: row.cutoff,
      shared: row.shareToken !== null,
      itemCount: row._count.items,
      countsLine: listCountsLine(row.kind, row.cutoff, {
        total: row._count.items,
        ...sectionCounts(sections),
      }),
      /*
        Le titre sert d'`alt` : le romaji d'abord, l'anglais en repli. Ce n'est pas `mediaTitle`,
        qui honore la préférence de langue — sans objet sur une vignette de 40 px qu'on ne lit pas.
      */
      covers: sections
        .flatMap(({ items: sectionItems }) => sectionItems)
        .map(({ item }) => item)
        .filter((media) => includeAdult || !media.isAdult)
        .slice(0, COVERS_PER_CARD)
        .map((media) => ({
          mediaId: media.id,
          cover: media.coverImage,
          title: media.titleRomaji ?? media.titleEnglish ?? "",
        })),
    };
  });
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

/**
 * Mes listes, vues depuis **une** œuvre : lesquelles la contiennent déjà, et à quelle place.
 *
 * C'est ce que lit la fenêtre « Ajouter à une liste » de la fiche — et, par `api/lists/membership`,
 * celle d'édition rapide d'une vignette. C'est pour ça qu'elles affichent
 * des **bascules** plutôt qu'un simple ajout — on voit où l'œuvre est rangée avant de choisir, et on
 * peut l'en retirer.
 *
 * **Une requête** : chaque liste rapporte ses items dans l'ordre, réduits à l'id de l'œuvre et à sa
 * jaquette. C'est ce qui donne d'un coup l'appartenance, le rang (« n° 3 ») et la jaquette de tête ;
 * des listes de quelques dizaines d'œuvres rendent cette lecture négligeable.
 *
 * **Aucun filtre 18+ sur les listes**, contrairement à `getLists` : la préférence masque des
 * *jaquettes*, pas des *listes*, sans quoi on ne pourrait plus ranger une œuvre dans une liste qui
 * n'en contient que d'adultes.
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
      items: {
        orderBy: { rank: "asc" },
        select: { mediaId: true },
      },
    },
  });

  return rows.map((row) => {
    const index = row.items.findIndex((item) => item.mediaId === mediaId);

    return {
      id: row.id,
      title: row.title,
      kind: row.kind,
      itemCount: row.items.length,
      contains: index !== -1,
      position: index === -1 ? null : index + 1,
    };
  });
}

export type SharedList = {
  title: string;
  description: string | null;
  kind: ListKind;
  cutoff: number | null;
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
      kind: true,
      cutoff: true,
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
    kind: list.kind,
    cutoff: list.cutoff,
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
 * pendant sa parution : en pause, abandonné ou prévu, et toujours en cours de publication.
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
