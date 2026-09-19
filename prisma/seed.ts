/**
 * Jeu d'essai — remplit la base de développement d'un suivi, d'un journal et de listes crédibles.
 *
 * **À quoi ça sert.** La moitié des écrans du produit ne se voient pas sur une base vide, et
 * certains ne se voient pas non plus sur une base fraîche : « À reprendre » ne montre quelque chose
 * qu'avec des séries laissées de côté depuis des mois (docs/PRODUCT.md §8.4), et le journal ne se
 * regroupe par journée qu'avec des événements étalés dans le temps. Les fabriquer à la main
 * demandait une soirée de clics ; c'est le rôle de ce fichier.
 *
 * **Ce n'est pas du code applicatif**, et ça se voit à trois endroits :
 *
 * 1. il tourne sous `tsx`, hors de Next — d'où `dotenv/config`, que le framework fait d'habitude ;
 * 2. il instancie son propre `PrismaClient` : `@/lib/db/prisma` porte `server-only` et refuse
 *    d'être importé hors d'un rendu React ;
 * 3. il interroge AniList avec un `fetch` nu plutôt qu'`upfetch` — la réponse n'est pas validée par
 *    un schéma Zod parce qu'elle n'entre pas dans l'application par ce chemin. Elle est recopiée en
 *    base, où le schéma Prisma fait autorité.
 *
 * C'est aussi pourquoi il lit `process.env` — l'exception que CLAUDE.md accorde aux fichiers de
 * CLI, et que le hook `conventions-guard.mjs` liste nommément. `@/config/env` exige un `NODE_ENV`
 * que seul Next pose ; l'importer ici ferait échouer le script avant sa première requête.
 *
 * **Une seule requête AniList**, sur un quota de 30 par minute partagé (§4.1) : deux alias `Page`
 * dans le même document ramènent les soixante œuvres d'un coup.
 *
 * **Destructif sur demande seulement.** Le suivi et le journal appartiennent à quelqu'un ; le
 * script refuse d'écrire par-dessus et demande `--reset`, qui dit alors exactement ce qu'il
 * supprime. `Media` n'est jamais supprimé : c'est le catalogue partagé, et le seed ne fait que
 * l'alimenter.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { generateKeyBetween } from "fractional-indexing";

import {
  type EntryEventType,
  type EntryStatus,
  PrismaClient,
} from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL absent — vérifier le `.env` à la racine.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

/** Trente de chaque : de quoi composer vingt-six suivis et cinq listes sans se répéter. */
const MEDIA_PER_TYPE = 30;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Les colonnes du miroir, dans l'ordre de `toMirrorRow` (`features/media/server/media.mirror.ts`).
 * Le seed écrit la même forme que l'application : une ligne semée doit être indiscernable d'une
 * ligne créée par un vrai suivi, sans quoi le cron de fraîcheur ne les traiterait pas pareil.
 */
const MEDIA_FIELDS = /* GraphQL */ `
  id
  type
  format
  status
  countryOfOrigin
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  episodes
  chapters
  volumes
  season
  seasonYear
  genres
  meanScore
  isAdult
`;

const SEED_CATALOGUE_QUERY = /* GraphQL */ `
  query SeedCatalogue($perPage: Int!) {
    anime: Page(perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ${MEDIA_FIELDS} }
    }
    manga: Page(perPage: $perPage) {
      media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) { ${MEDIA_FIELDS} }
    }
  }
`;

type AniListMedia = {
  id: number;
  type: "ANIME" | "MANGA";
  format: string | null;
  status: string | null;
  countryOfOrigin: string | null;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    color: string | null;
  } | null;
  bannerImage: string | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  meanScore: number | null;
  isAdult: boolean;
};

// --- Hasard reproductible ----------------------------------------------------

/**
 * Générateur pseudo-aléatoire à graine fixe (mulberry32).
 *
 * `Math.random()` donnerait une base différente à chaque exécution, donc des captures d'écran et
 * des vérifications qui ne se comparent pas d'un jour à l'autre. Ici, deux `--reset` successifs
 * produisent exactement le même jeu de données pour un même catalogue.
 */
function makeRandom(seed: number) {
  let state = seed;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20260808);

/** Entier dans `[min, max]`, bornes comprises. */
function randomInt(min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(values: readonly T[]): T {
  return values[randomInt(0, values.length - 1)] as T;
}

/**
 * Mélange de Fisher-Yates.
 *
 * `sort(() => random() - 0.5)` tient en une ligne et **ne mélange pas** : le comparateur n'est pas
 * transitif, et le tri de V8 en tire un ordre très corrélé à l'entrée. Concrètement, trois listes
 * sur cinq s'ouvraient sur la même jaquette — ce qui ruine exactement ce que l'aperçu à quatre
 * cases est censé montrer.
 */
function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index--) {
    const swap = randomInt(0, index);
    [result[index], result[swap]] = [result[swap] as T, result[index] as T];
  }

  return result;
}

// --- Catalogue ---------------------------------------------------------------

async function fetchCatalogue() {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: SEED_CATALOGUE_QUERY,
      variables: { perPage: MEDIA_PER_TYPE },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `AniList a répondu ${response.status} — quota atteint, ou endpoint indisponible.`,
    );
  }

  const body = (await response.json()) as {
    data?: {
      anime: { media: AniListMedia[] };
      manga: { media: AniListMedia[] };
    };
    errors?: { message: string }[];
  };

  if (body.errors?.length || !body.data) {
    throw new Error(
      `AniList : ${body.errors?.map((error) => error.message).join(", ") ?? "réponse vide"}`,
    );
  }

  return { anime: body.data.anime.media, manga: body.data.manga.media };
}

/**
 * Recopie AniList dans `Media`, à l'identique de `toMirrorRow`.
 *
 * Un `upsert` par œuvre plutôt qu'un `createMany` : la table est partagée, et une ligne déjà là
 * — parce qu'un vrai suivi l'a créée — doit être rafraîchie, pas ignorée ni dupliquée.
 */
async function mirrorMedia(media: AniListMedia[], syncedAt: Date) {
  for (const item of media) {
    const data = {
      type: item.type,
      format: item.format,
      status: item.status,
      countryOfOrigin: item.countryOfOrigin?.slice(0, 2) ?? null,

      titleRomaji: item.title.romaji,
      titleEnglish: item.title.english,
      titleNative: item.title.native,

      coverImage: item.coverImage?.extraLarge ?? item.coverImage?.large ?? null,
      coverColor: item.coverImage?.color?.slice(0, 9) ?? null,
      bannerImage: item.bannerImage,

      episodes: item.episodes,
      chapters: item.chapters,
      volumes: item.volumes,

      season: item.season,
      seasonYear: item.seasonYear,

      genres: item.genres,
      meanScore: item.meanScore,
      isAdult: item.isAdult,

      syncedAt,
      // biome-ignore lint/suspicious/noExplicitAny: les énumérations AniList sont validées par Prisma à l'écriture.
    } as any;

    await prisma.media.upsert({
      where: { id: item.id },
      create: { id: item.id, ...data },
      update: data,
    });
  }
}

// --- Suivi -------------------------------------------------------------------

/**
 * La composition du suivi, statut par statut.
 *
 * Elle est écrite en clair plutôt que tirée au sort, parce qu'elle est le vrai sujet du fichier :
 * chaque ligne existe pour qu'un écran ait quelque chose à montrer. `stalledDays` en est l'exemple —
 * au-delà de trente jours sans geste, une série `CURRENT` bascule dans « À reprendre »
 * (`STALLED_AFTER_DAYS`), et sans ces trois-là la section resterait invisible.
 */
const TRACKING_PLAN: {
  status: EntryStatus;
  count: number;
  /** Ancienneté du dernier geste, en jours — c'est elle qui décide de la section d'accueil. */
  touchedDaysAgo: [number, number];
  /** Part du total déjà parcourue. `1` = terminé, `0` = pas commencé. */
  progressRatio: [number, number];
  scored: boolean;
}[] = [
  {
    status: "CURRENT",
    count: 6,
    touchedDaysAgo: [0, 12],
    progressRatio: [0.1, 0.8],
    scored: false,
  },
  {
    status: "CURRENT",
    count: 3,
    touchedDaysAgo: [45, 240],
    progressRatio: [0.15, 0.6],
    scored: false,
  },
  {
    status: "PAUSED",
    count: 2,
    touchedDaysAgo: [90, 320],
    progressRatio: [0.2, 0.5],
    scored: true,
  },
  {
    status: "COMPLETED",
    count: 7,
    touchedDaysAgo: [20, 500],
    progressRatio: [1, 1],
    scored: true,
  },
  {
    status: "PLANNING",
    count: 5,
    touchedDaysAgo: [1, 60],
    progressRatio: [0, 0],
    scored: false,
  },
  {
    status: "DROPPED",
    count: 2,
    touchedDaysAgo: [120, 400],
    progressRatio: [0.05, 0.25],
    scored: true,
  },
  {
    status: "REPEATING",
    count: 1,
    touchedDaysAgo: [2, 9],
    progressRatio: [0.2, 0.5],
    scored: true,
  },
];

const NOTES = [
  "La bascule du tome 4 change tout.",
  "À relire une fois la saison 2 sortie.",
  "Le rythme retombe au milieu, ça repart après.",
  "Vu avec Léa, à finir ensemble.",
  "Doublage à éviter, la VO porte tout.",
];

/**
 * Le libellé de l'édition créée en silence à la première saisie (§4.5).
 *
 * **Recopié** depuis `features/collection/server/collection.queries.ts` et non importé : ce script
 * tourne sous `tsx`, hors de Next, et importer un module marqué `server-only` le ferait échouer
 * avant sa première ligne utile. Un écart entre les deux créerait une seconde édition fantôme au
 * premier clic — c'est la même contrainte que pour les énumérations recopiées dans les schémas.
 */
const DEFAULT_EDITION_LABEL = "Édition standard";

type MirroredMedia = {
  id: number;
  type: "ANIME" | "MANGA";
  episodes: number | null;
  chapters: number | null;
};

/** Même règle que `mediaTotalUnits` : épisodes pour un anime, chapitres pour un manga. */
function totalUnits(media: MirroredMedia) {
  return (media.type === "ANIME" ? media.episodes : media.chapters) ?? null;
}

type PlannedEvent = {
  type: EntryEventType;
  progressFrom?: number;
  progressTo?: number;
  statusFrom?: EntryStatus;
  statusTo?: EntryStatus;
  score?: number;
  note?: string;
  createdAt: Date;
};

/**
 * Le journal d'une entrée, reconstruit à rebours de son état.
 *
 * C'est l'inverse du produit, où l'état se déduit du journal — mais c'est le seul ordre possible
 * ici : on veut une bibliothèque d'une forme donnée, et un passé qui l'explique.
 *
 * Un `PROGRESS` enregistre un **déplacement du curseur**, pas un épisode (§4.3) : une session qui
 * passe de 5 à 9 produit un seul événement, et « quatre épisodes ce soir-là » se lit dans la
 * soustraction.
 */
function planEvents({
  status,
  progress,
  score,
  startedAt,
  updatedAt,
}: {
  status: EntryStatus;
  progress: number;
  score: number | null;
  startedAt: Date | null;
  updatedAt: Date;
}): PlannedEvent[] {
  const events: PlannedEvent[] = [];
  const opened = startedAt ?? updatedAt;

  events.push({
    type: "STATUS_CHANGED",
    statusTo: status === "PLANNING" ? "PLANNING" : "CURRENT",
    createdAt: opened,
  });

  if (progress > 0) {
    // Trois à cinq sessions entre l'ouverture et le dernier geste, jamais moins d'une unité chacune.
    const sessions = Math.min(randomInt(3, 5), progress);
    const span = Math.max(updatedAt.getTime() - opened.getTime(), DAY);

    let cursor = 0;
    for (let index = 1; index <= sessions; index++) {
      const to = Math.round((progress * index) / sessions);
      if (to <= cursor) continue;

      events.push({
        type: "PROGRESS",
        progressFrom: cursor,
        progressTo: to,
        createdAt: new Date(opened.getTime() + (span * index) / sessions),
      });

      cursor = to;
    }
  }

  if (score !== null) {
    events.push({
      type: "SCORED",
      score,
      createdAt: new Date(updatedAt.getTime() - randomInt(0, 2) * DAY),
    });
  }

  // Une note sur trois entrées environ : un journal où chaque ligne commente serait faux.
  if (random() < 0.3) {
    events.push({
      type: "NOTE",
      note: pick(NOTES),
      createdAt: new Date(updatedAt.getTime() - randomInt(0, 5) * DAY),
    });
  }

  if (status !== "CURRENT" && status !== "PLANNING") {
    events.push({
      type: "STATUS_CHANGED",
      statusFrom: "CURRENT",
      statusTo: status,
      createdAt: updatedAt,
    });
  }

  if (status === "REPEATING") {
    events.push({
      type: "REPEAT_STARTED",
      createdAt: new Date(updatedAt.getTime() - randomInt(1, 4) * DAY),
    });
  }

  // Le journal est lu du plus récent au plus ancien, mais il s'écrit dans l'ordre du temps.
  return events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

async function seedTracking(userId: string, catalogue: MirroredMedia[]) {
  const now = Date.now();
  let cursor = 0;
  let entryCount = 0;
  let eventCount = 0;

  for (const slot of TRACKING_PLAN) {
    for (let index = 0; index < slot.count; index++) {
      const media = catalogue[cursor++];
      if (!media) break;

      const total = totalUnits(media);
      const ratio =
        slot.progressRatio[0] +
        random() * (slot.progressRatio[1] - slot.progressRatio[0]);

      /**
       * Sans total connu — une série en cours de diffusion —, on ne peut pas dériver la
       * progression d'une proportion. On pose alors un curseur plausible : l'application ne
       * plafonne pas non plus dans ce cas (`mediaTotalUnits` renvoie `null`).
       */
      const progress =
        ratio === 0
          ? 0
          : total
            ? Math.max(1, Math.round(total * ratio))
            : randomInt(3, 40);

      const updatedAt = new Date(
        now -
          randomInt(...slot.touchedDaysAgo) * DAY -
          randomInt(0, 20) * 3_600_000,
      );

      const startedAt =
        slot.status === "PLANNING"
          ? null
          : new Date(updatedAt.getTime() - randomInt(10, 180) * DAY);

      const finishedAt = slot.status === "COMPLETED" ? updatedAt : null;

      /** Note stockée sur 0–100 quelle que soit l'échelle affichée (§4.2) — par pas de 5. */
      const score = slot.scored ? randomInt(11, 20) * 5 : null;

      const entry = await prisma.entry.create({
        data: {
          userId,
          mediaId: media.id,
          status: slot.status,
          progress,
          score,
          repeatCount: slot.status === "REPEATING" ? 1 : 0,
          startedAt,
          finishedAt,
          favorite: random() < 0.2,
          createdAt: startedAt ?? updatedAt,
          /**
           * `updatedAt` porte `@updatedAt`, mais reste **fournissable à la création** — et il faut
           * le fournir : c'est cette colonne que l'accueil compare à trente jours pour séparer
           * « En cours » de « À reprendre ». Laisser Prisma la remplir donnerait vingt-six séries
           * touchées à l'instant, donc une section « À reprendre » définitivement vide.
           */
          updatedAt,
        },
        select: { id: true },
      });

      entryCount++;

      const events = planEvents({
        status: slot.status,
        progress,
        score,
        startedAt,
        updatedAt,
      });

      await prisma.entryEvent.createMany({
        data: events.map((event) => ({ ...event, entryId: entry.id, userId })),
      });

      eventCount += events.length;
    }
  }

  return { entryCount, eventCount };
}

// --- Listes ------------------------------------------------------------------

/**
 * Cinq listes, dont une de chaque forme qu'on veut pouvoir regarder : longue, courte, mono-type,
 * et une sans description — c'est le cas qui casse une mise en page si on ne l'a jamais sous les
 * yeux.
 */
const LIST_PLAN: {
  title: string;
  description: string | null;
  size: number;
  type?: "ANIME" | "MANGA";
}[] = [
  {
    title: "Top 2026",
    description: "Classement provisoire, réordonné à chaque nouvelle claque.",
    size: 8,
  },
  {
    title: "À faire découvrir",
    description:
      "Ce que je mets entre les mains de quelqu'un qui n'y connaît rien.",
    size: 6,
  },
  {
    title: "Shonen du dimanche",
    description: null,
    size: 5,
    type: "ANIME",
  },
  {
    title: "Côté papier",
    description: "Mangas et webtoons en cours de lecture ou en attente.",
    size: 6,
    type: "MANGA",
  },
  {
    title: "À regarder cet hiver",
    description: "La pile de la saison prochaine.",
    size: 4,
  },
];

async function seedLists(userId: string, catalogue: MirroredMedia[]) {
  let itemCount = 0;

  for (const plan of LIST_PLAN) {
    const pool = plan.type
      ? catalogue.filter((media) => media.type === plan.type)
      : catalogue;

    // Une œuvre n'apparaît qu'une fois dans une liste (`@@unique([listId, mediaId])`) : on pioche
    // dans un pool mélangé plutôt que de tirer au sort avec remise.
    const shuffled = shuffle(pool).slice(0, plan.size);

    const list = await prisma.list.create({
      data: {
        ownerId: userId,
        title: plan.title,
        description: plan.description,
      },
      select: { id: true },
    });

    /**
     * `rank` est un index fractionnaire, rempli comme l'application le fait : chaque ajout appelle
     * `generateKeyBetween(dernier, null)` et ne touche aucune ligne existante. Écrire `"a0"`,
     * `"a1"`, … à la main marcherait le premier jour et casserait au premier glisser-déposer.
     */
    let rank: string | null = null;

    for (const media of shuffled) {
      rank = generateKeyBetween(rank, null);

      await prisma.listItem.create({
        data: { listId: list.id, mediaId: media.id, rank },
      });

      itemCount++;
    }
  }

  return { listCount: LIST_PLAN.length, itemCount };
}

// --- Collection physique -----------------------------------------------------

/**
 * Combien de séries de l'étagère, et comment elles sont trouées.
 *
 * **Le jeu est choisi pour que l'écran ait quelque chose à dire.** Une étagère entièrement
 * complète ne montrerait jamais la phrase des manquants, qui est la raison d'être de
 * `/collection` (docs/PRODUCT.md §8 item 8) ; une étagère entièrement trouée ne montrerait jamais
 * la pastille « Complète » ni l'onglet qui les regroupe. On veut les deux, et le cas limite entre
 * les deux — une série où il ne manque qu'un tome au milieu.
 */
const SHELF_SERIES_COUNT = 9;

/** Une série sur trois est complète : assez pour remplir l'onglet sans vider l'autre. */
const COMPLETE_RATIO = 3;

/**
 * Le nombre de tomes saisi à la main, pour une série qu'AniList ne compte pas encore.
 *
 * Il ne compte que les séries **terminées**, et sans notion d'édition (§9). Le seed n'en saisit
 * donc **qu'une sur deux** parmi les séries en cours : l'autre moitié reste à `null`, et c'est
 * exprès — c'est l'état réel d'une série qu'on vient d'ajouter, celui où la grille se termine par
 * la case « tome suivant ». Tout remplir cacherait en développement le cas le plus fréquent en
 * production.
 */
function manualVolumesTotal() {
  return randomInt(12, 42);
}

/**
 * Les tomes possédés d'une série, avec des trous plausibles.
 *
 * Un rayon qui s'arrête quelque part, moins quelques tomes : c'est la forme d'une vraie étagère,
 * parce qu'on achète dans l'ordre et qu'on saute ce qu'on ne trouve pas. Un tirage uniforme sur
 * la série entière donnerait un damier, qui n'arrive jamais et qui rendrait la réglette
 * illisible.
 *
 * Les manques tombent n'importe où dans ce rayon, **le tome 1 compris** : c'est le cas qu'on veut
 * voir à l'écran au moins une fois, parce qu'il est le seul où la phrase des manquants commence
 * par un petit numéro et qu'il vérifie que le repli d'intervalle ne triche pas sur les bords.
 */
function ownedNumbersFor(total: number, complete: boolean): number[] {
  if (complete) return Array.from({ length: total }, (_, index) => index + 1);

  // Jusqu'où va le rayon : entre un cinquième et la totalité, jamais zéro.
  const reach = randomInt(Math.max(1, Math.ceil(total / 5)), total);
  const owned = Array.from({ length: reach }, (_, index) => index + 1);

  // Puis on retire quelques tomes au milieu — les trous qu'on part chercher en librairie.
  const holes = randomInt(0, Math.min(4, Math.max(0, reach - 1)));

  return shuffle(owned)
    .slice(holes)
    .sort((a, b) => a - b);
}

/**
 * L'étagère de démonstration.
 *
 * `Edition` est **partagée entre les comptes** (§4.5) : le seed l'`upsert` sur `(mediaId, label)`
 * plutôt que de la créer, pour retomber sur la ligne existante si un autre compte a déjà commencé
 * la même série. Seuls les `OwnedVolume` sont personnels.
 */
async function seedCollection(userId: string, manga: AniListMedia[]) {
  const chosen = shuffle(manga).slice(0, SHELF_SERIES_COUNT);
  let volumeCount = 0;

  for (const [index, media] of chosen.entries()) {
    const volumesTotal =
      media.volumes ?? (index % 2 === 0 ? manualVolumesTotal() : null);
    const complete = volumesTotal !== null && index % COMPLETE_RATIO === 0;

    const edition = await prisma.edition.upsert({
      where: {
        mediaId_label: { mediaId: media.id, label: DEFAULT_EDITION_LABEL },
      },
      create: {
        mediaId: media.id,
        label: DEFAULT_EDITION_LABEL,
        volumesTotal,
        isDefault: true,
      },
      update: { volumesTotal },
      select: { id: true },
    });

    /*
      Sans total, on ne peut pas tirer « une série complète » — il n'y a pas de fin connue. On
      pose alors un rayon de longueur plausible, comme une étagère de série en cours.
    */
    const numbers = ownedNumbersFor(volumesTotal ?? randomInt(3, 20), complete);

    await prisma.ownedVolume.createMany({
      data: numbers.map((number) => ({
        userId,
        editionId: edition.id,
        number,
      })),
      skipDuplicates: true,
    });

    volumeCount += numbers.length;
  }

  return { seriesCount: chosen.length, volumeCount };
}

// --- Orchestration -----------------------------------------------------------

async function main() {
  const reset = process.argv.includes("--reset");

  /**
   * Le compte le plus anciennement approuvé — sur un cercle de quatre comptes, c'est le mien.
   * Le seed ne crée **aucun** utilisateur : un compte sans `Account` GitHub ne peut pas se
   * connecter, il encombrerait la liste des membres sans rien pouvoir montrer.
   */
  const user = await prisma.user.findFirst({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true },
  });

  if (!user) {
    throw new Error(
      "Aucun compte approuvé en base. Se connecter une fois via GitHub, puis passer le compte en APPROVED (pnpm db:studio).",
    );
  }

  const [entries, lists, volumes] = await Promise.all([
    prisma.entry.count({ where: { userId: user.id } }),
    prisma.list.count({ where: { ownerId: user.id } }),
    prisma.ownedVolume.count({ where: { userId: user.id } }),
  ]);

  const existing = entries > 0 || lists > 0 || volumes > 0;

  if (existing && !reset) {
    throw new Error(
      `@${user.username} a déjà ${entries} suivi(s), ${lists} liste(s) et ${volumes} tome(s).\n` +
        "Relancer avec `pnpm db:seed --reset` pour les supprimer et repartir de zéro.",
    );
  }

  if (reset && existing) {
    console.log(
      `Suppression de ${entries} suivi(s) — journal compris —, ${lists} liste(s) et ${volumes} tome(s) de @${user.username}.`,
    );

    // `EntryEvent` et `ListItem` partent en cascade (`onDelete: Cascade`). `Media` ne bouge pas :
    // c'est le catalogue partagé, pas une donnée de compte.
    await prisma.entry.deleteMany({ where: { userId: user.id } });
    await prisma.list.deleteMany({ where: { ownerId: user.id } });
    await prisma.ownedVolume.deleteMany({ where: { userId: user.id } });

    /*
      `Edition` n'appartient à personne (§4.5) : la supprimer parce qu'un compte s'en va serait
      arracher l'étagère des trois autres. On ne retire donc que celles que **plus personne** ne
      garnit — sans quoi une relance du seed retomberait sur le `volumesTotal` de la veille.
    */
    await prisma.edition.deleteMany({ where: { volumes: { none: {} } } });
  }

  console.log("Lecture du catalogue AniList (une requête)…");
  const { anime, manga } = await fetchCatalogue();

  const syncedAt = new Date();
  await mirrorMedia([...anime, ...manga], syncedAt);
  console.log(`Miroir : ${anime.length + manga.length} œuvres écrites.`);

  /**
   * Les animes d'abord, les mangas ensuite : `TRACKING_PLAN` consomme le catalogue dans l'ordre,
   * et un plan qui commencerait par des mangas mettrait des chapitres partout sur un tableau de
   * bord qu'on veut mixte.
   */
  const catalogue: MirroredMedia[] = [...anime, ...manga].map((media) => ({
    id: media.id,
    type: media.type,
    episodes: media.episodes,
    chapters: media.chapters,
  }));

  const { entryCount, eventCount } = await seedTracking(user.id, catalogue);
  console.log(
    `Suivi : ${entryCount} entrées, ${eventCount} événements de journal.`,
  );

  const { listCount, itemCount } = await seedLists(user.id, catalogue);
  console.log(`Listes : ${listCount} listes, ${itemCount} œuvres rangées.`);

  const shelf = await seedCollection(user.id, manga);
  console.log(
    `Collection : ${shelf.seriesCount} séries sur l'étagère, ${shelf.volumeCount} tomes.`,
  );

  console.log(`\nTerminé pour @${user.username}.`);
}

main()
  .catch((error: unknown) => {
    console.error(
      `\n${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
