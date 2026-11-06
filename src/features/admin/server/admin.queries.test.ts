import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindMany } = vi.hoisted(() => ({ userFindMany: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findMany: userFindMany } },
}));
vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin-1", role: "admin" })),
}));

import { getAdminOverview } from "@/features/admin/server/admin.queries";

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    username: id,
    image: null,
    createdAt: new Date("2026-10-01"),
    status: "APPROVED",
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    accounts: [{ providerId: "github" }],
    ...overrides,
  };
}

describe("getAdminOverview", () => {
  beforeEach(() => userFindMany.mockReset());

  it("range chaque compte dans son onglet", async () => {
    userFindMany.mockResolvedValue([
      row("attente", { status: "PENDING" }),
      row("membre"),
      row("banni", { banned: true }),
      row("refuse", { status: "REJECTED" }),
    ]);

    const { pending, members, banned } = await getAdminOverview();

    expect(pending.map((u) => u.id)).toEqual(["attente"]);
    expect(members.map((u) => u.id)).toEqual(["membre"]);
    expect(banned.map((u) => u.id)).toEqual(["banni"]);
  });

  it("donne les fournisseurs liés de chaque compte", async () => {
    userFindMany.mockResolvedValue([
      row("multi", {
        accounts: [{ providerId: "github" }, { providerId: "discord" }],
      }),
    ]);

    const { members } = await getAdminOverview();

    expect(members[0]?.providers).toEqual(["github", "discord"]);
  });
});
