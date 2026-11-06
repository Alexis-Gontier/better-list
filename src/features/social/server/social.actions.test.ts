import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les gestes sociaux, Prisma doublé : ce qui peut se tromper ici, ce sont les règles (pas de like
 * sur sa liste, pas de doublon non lu, l'annonce effacée au retrait), pas PostgreSQL.
 */

const db = vi.hoisted(() => {
  const double = {
    list: { findFirst: vi.fn(), create: vi.fn() },
    listItem: { createMany: vi.fn() },
    listLike: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    notification: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  double.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(double),
  );
  return double;
});

vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => ({
    user: { id: "moi", status: "APPROVED", role: null },
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  forkList,
  toggleListLike,
} from "@/features/social/server/social.actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toggleListLike", () => {
  it("like la liste d'un autre et l'annonce à son propriétaire", async () => {
    db.list.findFirst.mockResolvedValue({ ownerId: "sora" });
    db.listLike.findUnique.mockResolvedValue(null);
    db.notification.findFirst.mockResolvedValue(null);

    const result = await toggleListLike({ listId: "l1" });

    expect(result?.data).toEqual({ status: "ok", liked: true });
    expect(db.listLike.create).toHaveBeenCalledWith({
      data: { userId: "moi", listId: "l1" },
    });
    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        type: "LIST_LIKED",
        actorId: "moi",
        listId: "l1",
        readAt: null,
        recipientId: "sora",
      },
    });
  });

  it("ne cherche que la liste visible d'un autre", async () => {
    db.list.findFirst.mockResolvedValue(null);

    const result = await toggleListLike({ listId: "l1" });

    expect(result?.data).toEqual({ status: "unavailable" });
    expect(db.list.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      id: "l1",
      ownerId: { not: "moi" },
    });
    expect(db.listLike.create).not.toHaveBeenCalled();
  });

  it("retirer un like efface l'annonce non lue", async () => {
    db.list.findFirst.mockResolvedValue({ ownerId: "sora" });
    db.listLike.findUnique.mockResolvedValue({ userId: "moi" });

    const result = await toggleListLike({ listId: "l1" });

    expect(result?.data).toEqual({ status: "ok", liked: false });
    expect(db.notification.deleteMany).toHaveBeenCalledWith({
      where: { type: "LIST_LIKED", actorId: "moi", listId: "l1", readAt: null },
    });
  });

  it("un like remis ne double pas une annonce non lue", async () => {
    db.list.findFirst.mockResolvedValue({ ownerId: "sora" });
    db.listLike.findUnique.mockResolvedValue(null);
    db.notification.findFirst.mockResolvedValue({ id: "n1" });

    await toggleListLike({ listId: "l1" });

    expect(db.notification.create).not.toHaveBeenCalled();
  });
});

describe("forkList", () => {
  it("copie en privé, items compris, et l'annonce", async () => {
    db.list.findFirst.mockResolvedValue({
      id: "l1",
      ownerId: "sora",
      title: "Top",
      description: null,
      kind: "RANKING",
      cutoff: 10,
      items: [{ mediaId: 7, rank: "a0", media: { status: "RELEASING" } }],
    });
    db.list.create.mockResolvedValue({ id: "copie" });

    const result = await forkList({ listId: "l1" });

    expect(result?.data).toEqual({ status: "ok", id: "copie" });
    expect(db.list.create.mock.calls[0]?.[0].data).toMatchObject({
      ownerId: "moi",
      visibility: "PRIVATE",
      forkedFromId: "l1",
    });
    expect(db.listItem.createMany).toHaveBeenCalledWith({
      data: [
        { mediaId: 7, rank: "a0", listId: "copie", readyNotifiedAt: null },
      ],
    });
    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        type: "LIST_FORKED",
        actorId: "moi",
        recipientId: "sora",
        listId: "l1",
      },
    });
  });

  it("refuse une liste introuvable ou la sienne", async () => {
    db.list.findFirst.mockResolvedValue(null);

    const result = await forkList({ listId: "l1" });

    expect(result?.data).toEqual({ status: "unavailable" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
