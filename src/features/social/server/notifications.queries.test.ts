import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  notification: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

import { getActivity } from "@/features/social/server/notifications.queries";

function row(overrides: Record<string, unknown>) {
  return {
    id: "n1",
    type: "LIST_LIKED",
    listId: "l1",
    createdAt: new Date("2026-11-06T10:00:00Z"),
    readAt: null,
    list: { title: "Top 10" },
    actor: { name: "Sora", image: null, accounts: [{ providerId: "discord" }] },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.notification.count.mockResolvedValue(1);
});

describe("getActivity", () => {
  it("ne lit que mes notifications, les plus récentes d'abord", async () => {
    db.notification.findMany.mockResolvedValue([]);

    await getActivity("moi");

    expect(db.notification.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { recipientId: "moi" },
      orderBy: { createdAt: "desc" },
    });
    expect(db.notification.count).toHaveBeenCalledWith({
      where: { recipientId: "moi", readAt: null },
    });
  });

  it("ne nomme le fournisseur que pour une demande d'inscription", async () => {
    db.notification.findMany.mockResolvedValue([
      row({}),
      row({ id: "n2", type: "SIGNUP_PENDING", listId: null, list: null }),
    ]);

    const { unread, items } = await getActivity("moi");

    expect(unread).toBe(1);
    expect(items.map((i) => [i.id, i.provider, i.listTitle])).toEqual([
      ["n1", null, "Top 10"],
      ["n2", "discord", null],
    ]);
    expect(items[0]?.createdAt).toBe(
      Math.floor(Date.parse("2026-11-06T10:00:00Z") / 1000),
    );
  });
});
