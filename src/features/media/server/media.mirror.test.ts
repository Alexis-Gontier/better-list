import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MIRROR_BATCH_SIZE,
  MIRROR_TTL_MS,
} from "@/features/media/lib/media-freshness";

/**
 * La **sélection des lots** du cron, et rien d'autre.
 *
 * `media-freshness.ts` est déjà couvert : les seuils, les classes de volatilité et les bornes y
 * sont testés. Ce qui n'est couvert nulle part, c'est la façon dont `refreshStaleMirror` s'en sert
 * — la question posée à PostgreSQL, le découpage en lots, le plafond, et le sort d'une œuvre
 * qu'AniList ne renvoie plus. C'est là que vivent les trois erreurs qui ne se verraient pas :
 *
 *   - un `status: null` qui échappe silencieusement aux deux conditions SQL ;
 *   - un `orderBy` oublié, qui ferait boucler la passe sur les mêmes cinquante lignes ;
 *   - une œuvre disparue qu'on redemande indéfiniment, faute d'horodater la tentative.
 *
 * Prisma et AniList sont doublés : la logique testée est celle du *choix*, et la brancher sur une
 * vraie base ne dirait rien de plus tout en exigeant mille lignes d'essai.
 */

const { findMany, update, updateMany, transaction, anilistQuery } = vi.hoisted(
  () => ({
    findMany: vi.fn(),
    // Les deux écritures rendent leurs arguments : `$transaction` reçoit ainsi des objets qu'on
    // peut lire, là où de vraies promesses Prisma ne diraient rien de ce qu'elles écrivent.
    update: vi.fn(
      (args: { where: { id: number }; data: Record<string, unknown> }) => ({
        op: "update",
        args,
      }),
    ),
    updateMany: vi.fn((args: { where: unknown; data: { syncedAt: Date } }) => ({
      op: "updateMany",
      args,
    })),
    transaction: vi.fn(async (operations: unknown[]) => operations),
    anilistQuery: vi.fn(),
  }),
);

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    media: {
      findMany,
      update,
      updateMany,
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/http/anilist", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http/anilist")>()),
  anilistQuery,
}));

const NOW = new Date("2026-09-07T04:00:00.000Z");

/** Une fiche AniList minimale : seules les colonnes que `toMirrorRow` recopie comptent ici. */
function anilistMedia(id: number) {
  return {
    id,
    type: "ANIME" as const,
    format: "TV" as const,
    status: "RELEASING" as const,
    countryOfOrigin: "JP",
    title: {
      romaji: `Titre ${id}`,
      english: null,
      native: null,
      userPreferred: null,
    },
    synonyms: [],
    coverImage: {
      extraLarge: `cover-${id}`,
      large: null,
      medium: null,
      color: "#abcdef",
    },
    bannerImage: null,
    episodes: 12,
    chapters: null,
    volumes: null,
    season: "SUMMER" as const,
    seasonYear: 2026,
    genres: ["Action"],
    meanScore: 80,
    isAdult: false,
  };
}

/** `n` lignes périmées, telles que le `select: { id: true }` de la requête les rend. */
function staleRows(n: number, from = 1) {
  return Array.from({ length: n }, (_, index) => ({ id: from + index }));
}

/** AniList rend tout ce qu'on lui demande. */
function respondWithAll() {
  anilistQuery.mockImplementation(
    async ({ variables }: { variables: { ids: number[] } }) => ({
      Page: { media: variables.ids.map(anilistMedia) },
    }),
  );
}

async function importMirror() {
  return import("@/features/media/server/media.mirror");
}

beforeEach(() => {
  // `clearAllMocks` efface les appels **sans** toucher aux implémentations : celles des doubles
  // Prisma, posées une fois pour toutes plus haut, survivent donc. Celle d'AniList, elle, change
  // d'un test à l'autre — on la retire explicitement, pour qu'un test qui oublie de la poser
  // échoue bruyamment au lieu d'hériter de la réponse du précédent.
  vi.clearAllMocks();
  anilistQuery.mockReset();
});

describe("refreshStaleMirror — la question posée à PostgreSQL", () => {
  it("filtre par bornes de `syncedAt`, jamais en mémoire", async () => {
    findMany.mockResolvedValue([]);
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.OR).toEqual([
      {
        status: { in: ["RELEASING", "NOT_YET_RELEASED", "HIATUS"] },
        syncedAt: { lt: new Date(NOW.getTime() - MIRROR_TTL_MS.volatile) },
      },
      {
        status: null,
        syncedAt: { lt: new Date(NOW.getTime() - MIRROR_TTL_MS.volatile) },
      },
      {
        status: { in: ["FINISHED", "CANCELLED"] },
        syncedAt: { lt: new Date(NOW.getTime() - MIRROR_TTL_MS.settled) },
      },
    ]);
  });

  /**
   * Le piège silencieux du SQL, et la raison d'être de la deuxième branche : `status IN (…)` comme
   * `status NOT IN (…)` sont **tous deux faux** quand la colonne vaut `NULL`. Sans branche dédiée,
   * une fiche sans statut ne serait jamais reprise — alors que `mirrorTtlMs` la range précisément
   * du côté volatile pour qu'on découvre son vrai statut.
   */
  it("reprend les lignes sans statut, que les deux `in` laisseraient passer", async () => {
    findMany.mockResolvedValue([]);
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    const branches = findMany.mock.calls[0]?.[0]?.where.OR;
    expect(branches).toContainEqual(expect.objectContaining({ status: null }));
  });

  /** Sans cet ordre, le reste d'une passe plafonnée pourrait n'être jamais repris. */
  it("prend les plus anciennes d'abord", async () => {
    findMany.mockResolvedValue([]);
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    expect(findMany.mock.calls[0]?.[0]?.orderBy).toEqual({ syncedAt: "asc" });
  });

  it("ne demande jamais plus que le plafond de la passe", async () => {
    findMany.mockResolvedValue([]);
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW, maxBatches: 3 });

    expect(findMany.mock.calls[0]?.[0]?.take).toBe(3 * MIRROR_BATCH_SIZE);
  });

  it("n'appelle pas AniList quand rien n'est périmé", async () => {
    findMany.mockResolvedValue([]);
    const { refreshStaleMirror } = await importMirror();

    const summary = await refreshStaleMirror({ now: NOW });

    expect(anilistQuery).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(summary).toEqual({
      stale: 0,
      refreshed: 0,
      vanished: 0,
      batches: 0,
    });
  });
});

describe("refreshStaleMirror — le découpage en lots", () => {
  /** C'est toute l'économie du cron : cinquante fiches par requête, pas une par œuvre. */
  it("découpe en lots de `MIRROR_BATCH_SIZE` et compte une requête par lot", async () => {
    findMany.mockResolvedValue(staleRows(120));
    respondWithAll();
    const { refreshStaleMirror } = await importMirror();

    const summary = await refreshStaleMirror({ now: NOW, maxBatches: 20 });

    expect(anilistQuery).toHaveBeenCalledTimes(3);
    expect(
      anilistQuery.mock.calls.map(([{ variables }]) => variables.ids.length),
    ).toEqual([50, 50, 20]);
    expect(summary).toEqual({
      stale: 120,
      refreshed: 120,
      vanished: 0,
      batches: 3,
    });
  });

  /** `perPage` suit la taille réelle du lot : le dernier n'en demande pas cinquante pour vingt. */
  it("demande exactement les ids du lot", async () => {
    findMany.mockResolvedValue(staleRows(60));
    respondWithAll();
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    const [first, second] = anilistQuery.mock.calls;
    expect(first?.[0].variables).toEqual({
      ids: staleRows(50).map((row) => row.id),
      perPage: 50,
    });
    expect(second?.[0].variables).toEqual({
      ids: staleRows(10, 51).map((row) => row.id),
      perPage: 10,
    });
  });

  /** Une transaction par lot, et non une par ligne : cinquante allers-retours dépasseraient le délai. */
  it("écrit un lot par transaction", async () => {
    findMany.mockResolvedValue(staleRows(120));
    respondWithAll();
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW, maxBatches: 20 });

    expect(transaction).toHaveBeenCalledTimes(3);
    expect(transaction.mock.calls[0]?.[0]).toHaveLength(50);
  });

  /**
   * Toute la passe porte **le même instant**, celui sur lequel les bornes ont été calculées. Un
   * `new Date()` pris ligne par ligne ferait dériver l'horodatage sur la durée de la passe.
   */
  it("horodate toute la passe du même instant", async () => {
    findMany.mockResolvedValue(staleRows(2));
    respondWithAll();
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    for (const call of update.mock.calls) {
      expect(call[0].data.syncedAt).toEqual(NOW);
    }
  });

  it("recopie les colonnes du miroir depuis la réponse AniList", async () => {
    findMany.mockResolvedValue(staleRows(1));
    respondWithAll();
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        titleRomaji: "Titre 1",
        coverImage: "cover-1",
        coverColor: "#abcdef",
        episodes: 12,
        status: "RELEASING",
        syncedAt: NOW,
      }),
    });
  });
});

describe("refreshStaleMirror — une œuvre qu'AniList ne renvoie plus", () => {
  /**
   * La décision de §4.1, et ses deux moitiés. La copie **reste** — la supprimer ferait tomber en
   * cascade les `Entry`, `ListItem` et `OwnedVolume` qui y pointent, c'est-à-dire effacer le
   * travail de quelqu'un parce qu'un tiers a réorganisé son catalogue.
   */
  it("garde la copie d'une œuvre disparue", async () => {
    findMany.mockResolvedValue(staleRows(3));
    anilistQuery.mockResolvedValue({ Page: { media: [anilistMedia(1)] } });
    const { refreshStaleMirror } = await importMirror();

    const summary = await refreshStaleMirror({ now: NOW });

    // Aucune suppression, sous aucune forme.
    expect(update).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({
      stale: 3,
      refreshed: 1,
      vanished: 2,
      batches: 1,
    });
  });

  /**
   * L'autre moitié, et la moins évidente : sans `syncedAt` qui avance, la ligne disparue remonte en
   * tête du tri « les plus anciennes d'abord » à **chaque** passe et occupe indéfiniment une place
   * de lot. Une poignée de fiches supprimées suffirait à monopoliser la passe.
   */
  it("horodate quand même la tentative, pour ne pas la redemander sans fin", async () => {
    findMany.mockResolvedValue(staleRows(3));
    anilistQuery.mockResolvedValue({ Page: { media: [anilistMedia(1)] } });
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: [2, 3] } },
      data: { syncedAt: NOW },
    });
  });

  it("n'écrit pas d'`updateMany` quand tout revient", async () => {
    findMany.mockResolvedValue(staleRows(3));
    respondWithAll();
    const { refreshStaleMirror } = await importMirror();

    await refreshStaleMirror({ now: NOW });

    expect(updateMany).not.toHaveBeenCalled();
  });

  /**
   * La panne ne se rattrape pas ici : il n'y a pas d'écran à tenir debout, et une passe qui échoue
   * doit apparaître en échec dans les journaux plutôt que de rendre un compte rendu vert et vide.
   */
  it("laisse remonter une panne AniList", async () => {
    findMany.mockResolvedValue(staleRows(1));
    anilistQuery.mockRejectedValue(
      Object.assign(new Error("API down"), { name: "AniListOutageError" }),
    );
    const { refreshStaleMirror } = await importMirror();

    await expect(refreshStaleMirror({ now: NOW })).rejects.toThrow("API down");
  });
});
