import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La **question posée à la base** par la Communauté et la fiche : ce qui peut se tromper, c'est le
 * `where` (une liste privée qui fuirait, la mienne dans la Communauté) et le rang, pas PostgreSQL.
 */

const db = vi.hoisted(() => ({
  list: { findMany: vi.fn(), count: vi.fn() },
  listItem: { findMany: vi.fn() },
  entry: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => ({ user: { id: "moi" } })),
}));

import {
  COMMUNITY_PAGE_SIZE,
  getCommunityLists,
  getListsWithMedia,
} from "@/features/lists/server/community.queries";

beforeEach(() => {
  vi.clearAllMocks();
  db.list.findMany.mockResolvedValue([]);
  db.listItem.findMany.mockResolvedValue([]);
  db.entry.findMany.mockResolvedValue([]);
});

function lastWhere() {
  return db.list.findMany.mock.calls[0]?.[0];
}

describe("getCommunityLists", () => {
  it("ne lit que les listes « Membres » non vides des autres", async () => {
    await getCommunityLists({ includeAdult: false, sort: "aimees", page: 1 });

    expect(lastWhere().where).toMatchObject({
      ownerId: { not: "moi" },
      visibility: "MEMBERS",
      items: { some: {} },
      OR: [
        { ownerId: "moi" },
        { visibility: "MEMBERS", owner: { status: "APPROVED", banned: false } },
      ],
    });
  });

  it("trie par likes puis par fraîcheur, ou par création", async () => {
    await getCommunityLists({ includeAdult: false, sort: "aimees", page: 1 });
    expect(lastWhere().orderBy).toEqual([
      { likes: { _count: "desc" } },
      { updatedAt: "desc" },
    ]);

    vi.clearAllMocks();
    db.list.findMany.mockResolvedValue([]);
    await getCommunityLists({ includeAdult: false, sort: "recentes", page: 1 });
    expect(lastWhere().orderBy).toEqual({ createdAt: "desc" });
  });

  it("recharge le cumul des pages, plus une ligne pour savoir s'il en reste", async () => {
    await getCommunityLists({ includeAdult: false, sort: "aimees", page: 2 });

    expect(lastWhere().take).toBe(2 * COMMUNITY_PAGE_SIZE + 1);
  });

  it("prend la taille de page demandée, celle de l'accueil", async () => {
    await getCommunityLists({
      includeAdult: false,
      sort: "aimees",
      page: 1,
      pageSize: 8,
    });

    expect(lastWhere().take).toBe(9);
  });
});

describe("getListsWithMedia", () => {
  function row(overrides: Record<string, unknown>) {
    return {
      id: "l",
      title: "Liste",
      kind: "SELECTION",
      ownerId: "sora",
      owner: { name: "Sora", username: "sora", image: null },
      tiers: null,
      items: [10, 42, 7].map((id) => ({
        tierIndex: id === 42 ? 1 : null,
        media: {
          id,
          isAdult: false,
          coverImage: `c${id}`,
          titleRomaji: `t${id}`,
          titleEnglish: null,
        },
      })),
      ...overrides,
    };
  }

  it("ne lit que les listes visibles qui contiennent l'œuvre", async () => {
    await getListsWithMedia(42, { includeAdult: false });

    expect(lastWhere().where).toMatchObject({
      items: { some: { mediaId: 42 } },
      OR: expect.any(Array),
    });
  });

  it("donne le rang dans un classement seulement, et met les miennes en tête", async () => {
    db.list.findMany.mockResolvedValue([
      row({ id: "a", kind: "RANKING" }),
      row({ id: "b", ownerId: "moi" }),
    ]);

    const refs = await getListsWithMedia(42, { includeAdult: false });

    expect(refs.map((r) => [r.id, r.rank, r.isMine])).toEqual([
      ["b", null, true],
      ["a", 2, false],
    ]);
    expect(refs[0]?.covers).toHaveLength(2);
  });

  it("donne le palier dans une tier list, à la place du rang", async () => {
    db.list.findMany.mockResolvedValue([
      row({ id: "t", kind: "TIER" }),
      row({ id: "s" }),
    ]);

    const refs = await getListsWithMedia(42, { includeAdult: false });

    expect(refs.map((r) => [r.id, r.rank, r.tier?.label ?? null])).toEqual([
      ["t", null, "A"],
      ["s", null, null],
    ]);
  });
});
