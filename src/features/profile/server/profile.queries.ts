import "server-only";

import { mirroredTitle } from "@/features/media/lib/media-format";
import {
  ACTIVITY_WINDOW_DAYS,
  type ActivityCalendar,
  buildActivityCalendar,
  dayRange,
} from "@/features/profile/lib/profile-activity";
import {
  type GenreBar,
  type ScoreBar,
  type StatusSlice,
  scoreBars,
  topGenres,
  watchedHours,
} from "@/features/profile/lib/profile-stats";
import type { EntryEventView } from "@/features/tracking/lib/entry-format";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Les lectures du profil — **toutes en base, aucune ne touche AniList.**
 *
 * C'est ce qui rend cet écran bon marché : les statistiques se calculent sur nos propres lignes, et
 * les jaquettes du journal viennent du miroir (docs/conception.md §4.1), qui existe précisément pour
 * qu'afficher plusieurs centaines de titres ne coûte pas trente requêtes par minute.
 *
 * **Aucun `"use cache"` dans ce fichier, et ce n'est pas un oubli.** Deux raisons, et chacune
 * suffirait : ce qu'on lit dépend du profil *regardé*, et ce qu'on a le droit d'en lire dépend du
 * compte qui *regarde* — mémoriser servirait les entrées privées de l'un à l'autre, ou le
 * filtre 18+ éteint de l'un à celui qui l'a allumé.
 *
 * ## Deux visibilités, et elles ne viennent pas du même endroit
 *
 * **`Entry.private` dépend du profil regardé.** Une entrée marquée privée appartient à son
 * propriétaire : il la voit sur son propre profil, personne d'autre ne la voit sur le sien. Elle
 * disparaît alors de *tout* — des compteurs, des graphes et du journal —, sinon un total qui ne
 * correspond pas à la somme des parts trahirait son existence.
 *
 * **`includeAdult` dépend du compte qui regarde.** C'est une préférence d'affichage, pas une
 * propriété de la bibliothèque visitée : quelqu'un qui a éteint le filtre ne doit pas voir ces
 * titres surgir parce qu'il consulte le profil d'un autre. C'est la même règle que `/library` et
 * `/calendar`, appliquée dans le `where` et jamais par un masque d'affichage.
 */

/** Ce qu'on affiche d'un membre en haut de son profil. */
export type ProfileIdentity = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  memberSince: Date;
  /** Le profil est-il celui du visiteur ? Décide de la visibilité des entrées privées. */
  isOwner: boolean;
};

/** Les quatre chiffres de l'en-tête, plus les deux qui commentent un graphe. */
export type ProfileTiles = {
  entries: number;
  episodes: number;
  chapters: number;
  hoursWatched: number;
  meanScore: number | null;
};

export type ProfileStats = {
  tiles: ProfileTiles;
  statuses: StatusSlice[];
  scores: ScoreBar[];
  genres: GenreBar[];
};

/** Une ligne du journal, jointe à l'œuvre qu'elle concerne. */
export type ProfileEvent = EntryEventView & {
  mediaId: number;
  title: string;
  cover: string | null;
  /** Ce qui décide entre « Épisode 12 » et « Chapitre 12 » (`describeEntryEvent`). */
  unit: "episode" | "chapitre";
};

export type ProfileJournal = {
  events: ProfileEvent[];
  total: number;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Le filtre de visibilité, **construit une fois et appliqué partout**.
 *
 * Quatre lectures s'en servent, et c'est exactement le genre de condition qu'on oublie sur la
 * cinquième. La regrouper ici fait que l'oubli devient impossible : il n'y a qu'un endroit où elle
 * peut manquer.
 */
function entryVisibility({
  isOwner,
  includeAdult,
}: {
  isOwner: boolean;
  includeAdult: boolean;
}) {
  return {
    ...(isOwner ? {} : { private: false }),
    ...(includeAdult ? {} : { media: { isAdult: false } }),
  };
}

/**
 * L'identité d'un membre, par son pseudonyme public.
 *
 * Rend `null` plutôt que de lever : c'est à la page de décider qu'un pseudonyme inconnu vaut un
 * `notFound()`, comme le font `/lists/[id]` et `/media/[id]`.
 *
 * **La comparaison avec la session se fait ici**, et pas dans chaque appelant : `isOwner` gouverne
 * la visibilité de toutes les lectures suivantes, et le recalculer ailleurs serait un deuxième
 * endroit où se tromper.
 */
export async function getProfileIdentity(
  username: string,
): Promise<ProfileIdentity | null> {
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        createdAt: true,
        status: true,
      },
    }),
    getSession(),
  ]);

  if (!user) return null;

  /*
    Un compte en liste d'attente ou refusé n'a **pas** de profil public, et se comporte comme un
    pseudonyme inconnu plutôt que comme un profil vide. La nuance compte : un profil vide confirme
    que le compte existe, ce qui n'a pas à être confirmé pour quelqu'un qui n'est pas dans le
    cercle (docs/conception.md §7.1).
  */
  if (user.status !== "APPROVED") return null;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    memberSince: user.createdAt,
    isOwner: session?.user.id === user.id,
  };
}

/**
 * Les statistiques de la bibliothèque : les compteurs, les statuts, les notes, les genres.
 *
 * **Cinq lectures menées de front.** Elles sont indépendantes et tapent toutes la même table par
 * ses index ; les enchaîner sérialiserait cinq allers-retours réseau pour rien. `Promise.all` les
 * paye au prix de la plus lente.
 *
 * Les épisodes et les chapitres demandent **deux agrégats distincts** plutôt qu'un `groupBy` :
 * Prisma ne sait pas grouper par une colonne de la relation (`media.type`), et le seul moyen de
 * n'en faire qu'une serait du SQL brut — beaucoup de complexité pour économiser un aller-retour
 * déjà parallélisé.
 */
export async function getProfileStats({
  userId,
  isOwner,
  includeAdult,
}: {
  userId: string;
  isOwner: boolean;
  includeAdult: boolean;
}): Promise<ProfileStats> {
  const where = { userId, ...entryVisibility({ isOwner, includeAdult }) };

  const [byStatus, byScore, episodes, chapters, genreRows, meanScore] =
    await Promise.all([
      prisma.entry.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),

      prisma.entry.groupBy({
        by: ["score"],
        where: { ...where, score: { not: null } },
        _count: { _all: true },
      }),

      prisma.entry.aggregate({
        where: { ...where, media: { ...where.media, type: "ANIME" } },
        _sum: { progress: true },
      }),

      prisma.entry.aggregate({
        where: { ...where, media: { ...where.media, type: "MANGA" } },
        _sum: { progress: true },
      }),

      /*
        Les genres sont ramenés bruts et comptés en mémoire : `Media.genres` est un `String[]`
        PostgreSQL, que Prisma ne sait pas dénombrer sans SQL brut. Le raisonnement, et la limite à
        partir de laquelle il faudrait en changer, sont dans `topGenres`.
      */
      prisma.entry.findMany({
        where,
        select: { media: { select: { genres: true } } },
      }),

      prisma.entry.aggregate({
        where: { ...where, score: { not: null } },
        _avg: { score: true },
      }),
    ]);

  const episodesSeen = episodes._sum.progress ?? 0;

  return {
    tiles: {
      // La somme des statuts, plutôt qu'un `count` de plus : c'est le même nombre, lu une fois.
      entries: byStatus.reduce((sum, row) => sum + row._count._all, 0),
      episodes: episodesSeen,
      chapters: chapters._sum.progress ?? 0,
      hoursWatched: watchedHours(episodesSeen),
      /*
        `_avg` rend un décimal ; la note est stockée entière sur 0–100 et s'affiche en étoiles.
        Arrondir ici garde le contrat « `score` est un entier sur cent » valable partout, y compris
        pour `scoreToStars` qui le suppose.
      */
      meanScore:
        meanScore._avg.score === null ? null : Math.round(meanScore._avg.score),
    },
    statuses: byStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
    scores: scoreBars(
      byScore.map((row) => ({ score: row.score, count: row._count._all })),
    ),
    genres: topGenres(genreRows.map((row) => row.media.genres)),
  };
}

/**
 * Le calendrier d'activité : une année d'événements, rangée en cases.
 *
 * **Une seule lecture, et elle ne ramène qu'une colonne.** Un an de journal pour un compte actif,
 * c'est quelques milliers de lignes ; n'en demander que `createdAt` évite de traîner les titres,
 * les notes et les statuts dont la grille n'a que faire. L'index `[userId, createdAt]` du schéma
 * sert exactement à ça.
 *
 * **Le regroupement par jour se fait en JS et non en `date_trunc`**, à dessein : la journée du
 * produit est une journée *parisienne* (`config/locale.ts`), et `buildActivityCalendar` passe par
 * la même fonction `dayKey` que le journal juste en dessous. Deux définitions de « un jour » dans
 * un même écran finiraient par se contredire une nuit de changement d'heure.
 */
export async function getProfileActivity({
  userId,
  isOwner,
  includeAdult,
  now,
}: {
  userId: string;
  isOwner: boolean;
  includeAdult: boolean;
  now: Date;
}): Promise<ActivityCalendar> {
  const events = await prisma.entryEvent.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(
          now.getTime() - (ACTIVITY_WINDOW_DAYS - 1) * MILLISECONDS_PER_DAY,
        ),
      },
      entry: entryVisibility({ isOwner, includeAdult }),
    },
    select: { createdAt: true },
  });

  return buildActivityCalendar(
    events.map((event) => event.createdAt),
    now,
  );
}

/**
 * Le journal, une page à la fois.
 *
 * **La pagination est faite en base**, `skip`/`take` sur l'index `[userId, createdAt]`, et non en
 * ramenant tout pour découper ensuite : le journal est la seule table du produit qui grandit sans
 * limite, et c'est celle qu'il ne faut surtout pas lire en entier.
 *
 * Le `count` accompagne la page dans la même transaction implicite du `Promise.all` : sans lui, on
 * ne saurait pas combien de crans afficher, et un « page suivante » qui mène au vide est pire que
 * pas de pagination du tout.
 *
 * `day` resserre le journal sur une case du calendrier. L'intervalle vient de `dayRange`, l'inverse
 * exact de la `dayKey` qui a rempli la case : le journal montre donc ce que la case compte, ni plus
 * ni moins, même un jour de changement d'heure.
 */
export async function getProfileJournal({
  userId,
  isOwner,
  includeAdult,
  titleLanguage,
  skip,
  take,
  day = null,
}: {
  userId: string;
  isOwner: boolean;
  includeAdult: boolean;
  titleLanguage: "ROMAJI" | "ENGLISH" | "NATIVE";
  skip: number;
  take: number;
  /** Une clé `AAAA-MM-JJ` déjà validée (`profile-params.ts`), ou `null` pour tout le journal. */
  day?: string | null;
}): Promise<ProfileJournal> {
  const where = {
    userId,
    entry: entryVisibility({ isOwner, includeAdult }),
    ...(day ? { createdAt: dayRange(day) } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.entryEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        type: true,
        progressFrom: true,
        progressTo: true,
        statusFrom: true,
        statusTo: true,
        score: true,
        note: true,
        createdAt: true,
        entry: {
          select: {
            media: {
              select: {
                id: true,
                type: true,
                titleRomaji: true,
                titleEnglish: true,
                titleNative: true,
                coverImage: true,
              },
            },
          },
        },
      },
    }),
    prisma.entryEvent.count({ where }),
  ]);

  return {
    total,
    events: rows.map((row) => ({
      id: row.id,
      type: row.type,
      progressFrom: row.progressFrom,
      progressTo: row.progressTo,
      statusFrom: row.statusFrom,
      statusTo: row.statusTo,
      score: row.score,
      note: row.note,
      createdAt: row.createdAt,
      mediaId: row.entry.media.id,
      /*
        Le titre est résolu **ici, côté serveur**, selon la préférence du visiteur : la timeline est
        un composant serveur qui n'a pas à connaître `titleLanguage`, et lui passer les trois
        colonnes l'obligerait à refaire la règle de repli que `mirroredTitle` tient déjà en un seul
        endroit.
      */
      title: mirroredTitle(row.entry.media, titleLanguage),
      cover: row.entry.media.coverImage,
      /*
        L'unité vient du **type de l'œuvre**, pas de l'événement — un manga se lit en chapitres, un
        anime se regarde en épisodes, et un média ne change pas de type entre deux lignes. C'est ce
        que `describeEntryEvent` attend pour écrire « Épisode 12 » plutôt que « Chapitre 12 ».
      */
      unit: row.entry.media.type === "ANIME" ? "episode" : "chapitre",
    })),
  };
}
