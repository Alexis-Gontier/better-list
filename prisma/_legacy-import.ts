/**
 * Import ponctuel — recopie les données réelles de l'ancienne app (Neon "better-list-app",
 * schéma media_cache/media_entries/lists/list_items) dans le nouveau modèle.
 *
 * Script jetable, à supprimer une fois l'import validé et rejoué sur la branche cible.
 *
 * Usage : `tsx prisma/_legacy-import.ts <newDatabaseUrl> <oldDatabaseUrl>` — les URLs passent en
 * argument plutôt qu'en variable d'environnement, pour ne pas dépendre du `.env` local (la cible
 * est une branche Neon de test, pas forcément celle de `DATABASE_URL`).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { generateKeyBetween } from "fractional-indexing";
import { Client as PgClient } from "pg";

import {
  type EntryEventType,
  type EntryStatus,
  PrismaClient,
} from "@/generated/prisma/client";

const [NEW_DATABASE_URL, OLD_DATABASE_URL] = process.argv.slice(2);

if (!NEW_DATABASE_URL)
  throw new Error("Argument manquant : URL de la base cible.");
if (!OLD_DATABASE_URL)
  throw new Error("Argument manquant : URL de l'ancienne base.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: NEW_DATABASE_URL }),
});
const legacy = new PgClient({ connectionString: OLD_DATABASE_URL });

/** Le compte cible dans la nouvelle base — apparié par email avec l'ancien compte unique. */
const NEW_USER_ID = "3fsLJhA3p5p9WNbksPuOs168gPcK1DUo";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

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

const BATCH_QUERY = /* GraphQL */ `
  query LegacyMedia($ids: [Int], $perPage: Int!) {
    Page(perPage: $perPage) {
      media(id_in: $ids) { ${MEDIA_FIELDS} }
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

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function fetchMediaBatch(ids: number[]): Promise<AniListMedia[]> {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: BATCH_QUERY,
      variables: { ids, perPage: ids.length },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `AniList a répondu ${response.status} pour le lot [${ids.join(",")}]`,
    );
  }

  const body = (await response.json()) as {
    data?: { Page: { media: AniListMedia[] } };
    errors?: { message: string }[];
  };

  if (body.errors?.length || !body.data) {
    throw new Error(
      `AniList : ${body.errors?.map((e) => e.message).join(", ") ?? "réponse vide"}`,
    );
  }

  return body.data.Page.media;
}

/** Recopie AniList dans `Media`, à l'identique de `mirrorMedia` dans prisma/seed.ts. */
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

const STATUS_MAP: Record<string, EntryStatus> = {
  WATCHING: "CURRENT",
  ON_HOLD: "PAUSED",
  DROPPED: "DROPPED",
  COMPLETED: "COMPLETED",
  PLANNING: "PLANNING",
};

type LegacyEntry = {
  id: string;
  userId: string;
  anilistId: number;
  mediaType: "ANIME" | "MANGA";
  status: string;
  progress: number;
  score: number | null;
  notes: string | null;
  private: boolean;
  startDate: Date | null;
  finishDate: Date | null;
  rewatchCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type LegacyList = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LegacyListItem = {
  id: string;
  listId: string;
  anilistId: number;
  position: number;
  note: string | null;
  createdAt: Date;
};

async function main() {
  await legacy.connect();

  const { rows: entries } = await legacy.query<LegacyEntry>(
    `SELECT * FROM media_entries`,
  );
  const { rows: lists } = await legacy.query<LegacyList>(
    `SELECT * FROM lists ORDER BY "createdAt" ASC`,
  );
  const { rows: items } = await legacy.query<LegacyListItem>(
    `SELECT * FROM list_items ORDER BY "listId" ASC, "position" ASC`,
  );

  console.log(
    `Ancienne base : ${entries.length} suivis, ${lists.length} listes, ${items.length} items.`,
  );

  const idSet = new Set<number>();
  for (const entry of entries) idSet.add(entry.anilistId);
  for (const item of items) idSet.add(item.anilistId);
  const ids = [...idSet];

  console.log(
    `Récupération de ${ids.length} fiches AniList (par lots de 50, ~1 req/2s)…`,
  );
  const mediaById = new Map<number, AniListMedia>();

  for (const batch of chunk(ids, 50)) {
    const media = await fetchMediaBatch(batch);
    for (const item of media) mediaById.set(item.id, item);
    console.log(`  lot de ${batch.length} → ${media.length} fiches reçues`);
    await new Promise((resolve) => setTimeout(resolve, 2100));
  }

  const missing = ids.filter((id) => !mediaById.has(id));
  if (missing.length > 0) {
    console.warn(`Introuvables sur AniList, ignorés : ${missing.join(", ")}`);
  }

  console.log("Purge des données existantes du compte cible…");
  await prisma.entry.deleteMany({ where: { userId: NEW_USER_ID } });
  await prisma.list.deleteMany({ where: { ownerId: NEW_USER_ID } });

  console.log("Écriture du miroir Media…");
  const syncedAt = new Date();
  await mirrorMedia([...mediaById.values()], syncedAt);

  console.log("Import des suivis…");
  let entryCount = 0;
  let eventCount = 0;
  let skippedEntries = 0;

  for (const legacyEntry of entries) {
    if (!mediaById.has(legacyEntry.anilistId)) {
      skippedEntries++;
      continue;
    }

    const status = STATUS_MAP[legacyEntry.status];
    if (!status) {
      throw new Error(
        `Statut inconnu : ${legacyEntry.status} (entrée ${legacyEntry.id})`,
      );
    }

    const score =
      legacyEntry.score == null
        ? null
        : Math.min(100, Math.round(legacyEntry.score * 20));
    const createdAt = new Date(legacyEntry.createdAt);
    const updatedAt = new Date(legacyEntry.updatedAt);

    const entry = await prisma.entry.create({
      data: {
        userId: NEW_USER_ID,
        mediaId: legacyEntry.anilistId,
        status,
        progress: legacyEntry.progress,
        score,
        repeatCount: legacyEntry.rewatchCount,
        startedAt: legacyEntry.startDate,
        finishedAt: legacyEntry.finishDate,
        notes: legacyEntry.notes,
        private: legacyEntry.private,
        createdAt,
        updatedAt,
      },
      select: { id: true },
    });
    entryCount++;

    const plannedEvents: {
      type: EntryEventType;
      progressFrom?: number;
      progressTo?: number;
      statusTo?: EntryStatus;
      score?: number;
      createdAt: Date;
    }[] = [{ type: "STATUS_CHANGED", statusTo: status, createdAt }];

    if (legacyEntry.progress > 0) {
      plannedEvents.push({
        type: "PROGRESS",
        progressFrom: 0,
        progressTo: legacyEntry.progress,
        createdAt: updatedAt,
      });
    }

    if (score !== null) {
      plannedEvents.push({ type: "SCORED", score, createdAt: updatedAt });
    }

    await prisma.entryEvent.createMany({
      data: plannedEvents.map((event) => ({
        ...event,
        entryId: entry.id,
        userId: NEW_USER_ID,
      })),
    });
    eventCount += plannedEvents.length;
  }

  console.log("Import des listes…");
  let listCount = 0;
  let itemCount = 0;
  let skippedItems = 0;

  for (const legacyList of lists) {
    const newList = await prisma.list.create({
      data: {
        ownerId: NEW_USER_ID,
        title: legacyList.name,
        description: legacyList.description,
        createdAt: new Date(legacyList.createdAt),
        updatedAt: new Date(legacyList.updatedAt),
      },
      select: { id: true },
    });
    listCount++;

    const listItems = items
      .filter((item) => item.listId === legacyList.id)
      .sort((a, b) => a.position - b.position);

    let rank: string | null = null;
    for (const legacyItem of listItems) {
      if (!mediaById.has(legacyItem.anilistId)) {
        skippedItems++;
        continue;
      }

      rank = generateKeyBetween(rank, null);
      await prisma.listItem.create({
        data: {
          listId: newList.id,
          mediaId: legacyItem.anilistId,
          rank,
          note: legacyItem.note,
          addedAt: new Date(legacyItem.createdAt),
        },
      });
      itemCount++;
    }
  }

  console.log(
    `\nTerminé : ${entryCount} suivis (${eventCount} événements de journal), ${listCount} listes, ${itemCount} items.\n` +
      `Ignorés — média introuvable sur AniList : ${skippedEntries} suivi(s), ${skippedItems} item(s).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      `\n${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await legacy.end();
  });
