import "server-only";

import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import {
  compactFromMirror,
  MIRRORED_MEDIA_SELECT,
} from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import type { EntryUnit } from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import {
  LIBRARY_STATUS_ORDER,
  type LibraryFilterValues,
} from "@/features/tracking/lib/library-params";
import {
  libraryOrderBy,
  mediaConditions,
} from "@/features/tracking/lib/library-query";
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
 * `private` n'y est pas : il ne concerne que la visibilité auprès du cercle, qui n'a pas d'écran.
 * Les favoris ont leur propre table (`features/favorites/`).
 */
const ENTRY_STATE_SELECT = {
  status: true,
  progress: true,
  progressVolumes: true,
  score: true,
  notes: true,
  repeatCount: true,
  startedAt: true,
  finishedAt: true,
} as const;

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
  titleLanguage,
}: {
  filters: LibraryFilterValues;
  includeAdult: boolean;
  /** Décide du tri par titre : la grille se range dans l'ordre de ce qu'elle affiche. */
  titleLanguage: TitleLanguage;
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
    orderBy: libraryOrderBy(filters, titleLanguage),
    skip: (page - 1) * CATALOGUE_PAGE_SIZE,
    take: CATALOGUE_PAGE_SIZE,
    select: {
      ...ENTRY_STATE_SELECT,
      media: { select: MIRRORED_MEDIA_SELECT },
    },
  });

  return {
    items: rows.map(libraryItemFrom),
    total,
    page,
    pageCount,
  };
}

/**
 * Une ligne `Entry` et son œuvre → une `LibraryItem`.
 *
 * Écrite une fois pour les deux lectures qui rendent cette forme : `getLibrary` et
 * `getHomeTracking` sélectionnent exactement les mêmes colonnes.
 */
function libraryItemFrom({
  media,
  ...entry
}: EntryState & {
  media: Parameters<typeof compactFromMirror>[0] & {
    bannerImage: string | null;
    episodes: number | null;
    chapters: number | null;
  };
}): LibraryItem {
  return {
    media: compactFromMirror(media),
    /*
      L'entrée est reprise telle quelle : la sélection est déjà exactement un `EntryState`, donc la
      recopier champ par champ n'ajouterait qu'un endroit de plus où en oublier un le jour où le
      modèle en gagne un.
    */
    entry,
    banner: media.bannerImage,
    /*
      L'unité suit le type de l'œuvre, comme partout ailleurs dans le produit : un anime se compte
      en épisodes, tout le reste en chapitres. La même condition décide des deux — ce qu'on compte
      et jusqu'où —, donc elle s'écrit une fois.
    */
    unit: media.type === "ANIME" ? "episode" : "chapitre",
    total: media.type === "ANIME" ? media.episodes : media.chapters,
  };
}

/**
 * Combien de lignes l'accueil relit au plus.
 *
 * Large exprès : les deux rangées se servent dans les mêmes lignes, et une limite trop courte coupe
 * silencieusement la plus ancienne des deux — mesuré le 14 septembre 2026, soixante lignes pour
 * trente séries en cours et trente-huit en pause. Chaque rangée se plafonne ensuite elle-même.
 */
const HOME_TRACKING_TAKE = 200;

/**
 * Mon suivi pour l'accueil : **ce que je regarde ou relis**.
 *
 * **`CURRENT` et `REPEATING`, plus `PAUSED` jusqu'au 17 septembre 2026.** La lecture ramenait alors
 * les deux piles d'un coup et `partitionTracking` — un module à part, testé — les séparait par
 * statut pour les deux rangées de l'accueil. « À reprendre » retirée (décision d'Alexis), la pile
 * en pause n'avait plus de lecteur : la requête s'arrête aux statuts actifs, et le module de
 * répartition est parti avec sa dernière raison d'exister.
 *
 * `lastActivity` a suivi le même chemin : `updatedAt` ne voyageait en plus de l'`EntryState` que
 * pour l'ancienneté qu'affichait « à reprendre ». Il reste l'ordre de la lecture, du plus récemment
 * touché au plus ancien — ce que la rangée restante utilise pour départager ce qui n'a rien de neuf.
 */
export async function getHomeTracking({
  includeAdult,
}: {
  includeAdult: boolean;
}): Promise<LibraryItem[]> {
  const userId = await currentUserId();

  const rows = await prisma.entry.findMany({
    where: {
      userId,
      status: { in: ["CURRENT", "REPEATING"] },
      ...(includeAdult ? {} : { media: { isAdult: false } }),
    },
    orderBy: { updatedAt: "desc" },
    take: HOME_TRACKING_TAKE,
    select: {
      ...ENTRY_STATE_SELECT,
      media: { select: MIRRORED_MEDIA_SELECT },
    },
  });

  return rows.map((row) => libraryItemFrom(row));
}

/**
 * Les statuts qui donnent droit à une place au planning.
 *
 * **`CURRENT` et `REPEATING`, pas `PLANNING`** — et c'est une décision, pas un raccourci. Le
 * planning répond à « où j'en suis avec ce qui sort », et une série planifiée n'a pas de « où j'en
 * suis » : sa progression vaut zéro, donc chacun de ses épisodes s'afficherait en retard maximal.
 * Une saison entière de « 24 épisodes de retard » noierait les trois lignes qui comptent.
 *
 * Le cas « je veux savoir qu'elle sort » vaut pourtant pour toute la bibliothèque, et il a son
 * autre traitement : `/calendar` demande tous les statuts (`wholeLibrary`), et ses cases disent le
 * statut — « Prévu », « En pause », « Abandonné » — au lieu d'un retard. Les notifications, elles,
 * restent sur ces deux statuts.
 */
export const AIRING_ENTRY_STATUSES = [
  "CURRENT",
  "REPEATING",
] satisfies EntryStatus[];

/** Une série suivie susceptible d'avoir un épisode cette semaine. */
export type AiringWatchlistItem = {
  media: MediaCompact;
  /** Mon suivi en entier — la fenêtre d'édition rapide s'ouvre depuis cet écran aussi. */
  entry: EntryState;
  banner: string | null;
  /** Le nombre d'épisodes annoncé, `null` sur une série en cours dont AniList ignore le total. */
  total: number | null;
};

/**
 * Ce que je suis et qui peut encore diffuser — **la moitié « moi » du planning.**
 *
 * L'autre moitié vient d'AniList (`getAiringSchedule`), et les deux ne se rencontrent qu'à
 * l'affichage. La séparation n'est pas cosmétique : cette lecture-ci dépend du visiteur et ne doit
 * donc jamais être mémorisée, quand celle d'AniList doit l'être pour ne pas vider le quota. Les
 * mêler dans une seule fonction obligerait à choisir, et le mauvais choix des deux est celui qui
 * sert la bibliothèque d'un compte à un autre.
 *
 * **Restreint aux animes** : `AIRING_SCHEDULE_QUERY` interroge une grille de diffusion télévisée,
 * qui n'existe pas pour un manga. Envoyer les ids d'un webtoon reviendrait à demander à AniList de
 * confirmer qu'il n'a rien — au prix d'une clé de cache plus large et d'un `in` plus long.
 *
 * **Pas de pagination**, contrairement à `getLibrary` : ce qu'on suit en cours de diffusion se
 * compte en dizaines, pas en centaines, et la semaine se sert d'un coup. Une page de planning n'a
 * de toute façon pas de sens — on ne pagine pas sept jours.
 */
export async function getAiringWatchlist({
  includeAdult,
  wholeLibrary = false,
}: {
  includeAdult: boolean;
  /**
   * **Toute la bibliothèque**, quel que soit le statut — pour le planning seulement, qui sait
   * montrer une série sans retard. Une notification « épisode dispo » sur une série abandonnée
   * n'aurait pas de sens.
   */
  wholeLibrary?: boolean;
}): Promise<AiringWatchlistItem[]> {
  const userId = await currentUserId();

  const rows = await prisma.entry.findMany({
    where: {
      userId,
      ...(wholeLibrary ? {} : { status: { in: AIRING_ENTRY_STATUSES } }),
      /*
        Le filtre 18+ est posé **dans la requête**, comme partout ailleurs
        (docs/recherche-filtres.md §2.5) : une ligne écartée à l'affichage a quand même traversé le
        réseau, et elle aurait ici un second effet — son id serait parti chez AniList, donc dans une
        clé de cache que rien ne devrait porter.
      */
      media: {
        type: "ANIME",
        ...(includeAdult ? {} : { isAdult: false }),
        /*
          Toute la bibliothèque, c'est aussi des centaines de séries terminées depuis longtemps :
          leurs ids iraient chez AniList pour rien, et allongeraient la clé de cache. Le miroir
          sait lesquelles ne diffuseront plus. `null` est gardé : un statut inconnu n'exclut rien.
        */
        ...(wholeLibrary
          ? {
              OR: [
                { status: null },
                { status: { notIn: ["FINISHED", "CANCELLED"] } },
              ],
            }
          : {}),
      },
    },
    select: {
      ...ENTRY_STATE_SELECT,
      media: { select: MIRRORED_MEDIA_SELECT },
    },
  });

  return rows.map(({ media, ...entry }) => ({
    media: compactFromMirror(media),
    entry,
    banner: media.bannerImage,
    // Toujours des épisodes ici : la requête ne ramène que des animes.
    total: media.episodes,
  }));
}
