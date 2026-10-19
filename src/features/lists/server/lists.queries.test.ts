import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La **question posée à la base** par les suggestions, et la forme de ce qui en revient.
 *
 * Prisma est doublé : ce qui peut se tromper ici, c'est le `where` — une œuvre déjà rangée qui
 * reviendrait en suggestion, ou une préférence 18+ ignorée —, pas PostgreSQL.
 */

const { entryFindMany } = vi.hoisted(() => ({ entryFindMany: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { entry: { findMany: entryFindMany } },
}));
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => ({ user: { id: "membre-1" } })),
}));

import { getListSuggestions } from "@/features/lists/server/lists.queries";

/** Une ligne du miroir, avec tout ce que `MIRRORED_MEDIA_SELECT` demande. */
function mirrorRow(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: "ANIME",
    format: "TV",
    status: "FINISHED",
    titleRomaji: `Romaji ${id}`,
    titleEnglish: `English ${id}`,
    titleNative: null,
    coverImage: `https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/${id}.jpg`,
    meanScore: null,
    isAdult: false,
    episodes: 12,
    chapters: null,
    bannerImage: null,
    season: "SPRING",
    seasonYear: 2020,
    genres: [],
    countryOfOrigin: "JP",
    coverColor: null,
    ...overrides,
  };
}

beforeEach(() => {
  entryFindMany.mockReset();
  entryFindMany.mockResolvedValue([]);
});

describe("getListSuggestions", () => {
  it("suggère tous mes suivis absents d'une sélection, sans filtre de statut", async () => {
    await getListSuggestions("liste-1", "SELECTION", {
      includeAdult: true,
      titleLanguage: "ROMAJI",
    });

    expect(entryFindMany.mock.calls[0]?.[0].where).toEqual({
      userId: "membre-1",
      media: { listItems: { none: { listId: "liste-1" } } },
    });
  });

  it("suggère mes œuvres en parution mises de côté pour une attente de fin", async () => {
    await getListSuggestions("liste-1", "WAIT_FOR_END", {
      includeAdult: true,
      titleLanguage: "ROMAJI",
    });

    const where = entryFindMany.mock.calls[0]?.[0].where;
    expect(where?.status).toEqual({ in: ["PAUSED", "DROPPED", "PLANNING"] });
    expect(where?.media.status).toEqual({
      in: ["RELEASING", "HIATUS", "NOT_YET_RELEASED"],
    });
  });

  it("suggère mes œuvres prévues absentes d'une file, les plus récentes d'abord", async () => {
    await getListSuggestions("liste-1", "WATCHLIST", {
      includeAdult: true,
      titleLanguage: "ROMAJI",
    });

    expect(entryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "membre-1",
          status: { in: ["PLANNING"] },
          media: { listItems: { none: { listId: "liste-1" } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    );
  });

  it("écarte les œuvres adultes quand la préférence les masque", async () => {
    await getListSuggestions("liste-1", "WATCHLIST", {
      includeAdult: false,
      titleLanguage: "ROMAJI",
    });

    expect(entryFindMany.mock.calls[0]?.[0].where.media).toEqual({
      listItems: { none: { listId: "liste-1" } },
      isAdult: false,
    });
  });

  it("rend des lignes prêtes à afficher, dans la langue du compte", async () => {
    entryFindMany.mockResolvedValue([
      { status: "PLANNING", media: mirrorRow(7) },
    ]);

    const [item] = await getListSuggestions("liste-1", "WATCHLIST", {
      includeAdult: true,
      titleLanguage: "ENGLISH",
    });

    expect(item).toMatchObject({
      id: 7,
      title: "English 7",
      format: "Série TV",
      year: 2020,
      status: "PLANNING",
      cover:
        "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/7.jpg",
    });
  });
});
