import "server-only";

import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type AdminMember = Awaited<
  ReturnType<typeof getAdminOverview>
>["members"][number];

/**
 * Les trois onglets de `/admin/users` en une lecture : à dix comptes, trier en mémoire coûte moins
 * que trois requêtes. Les refusés n'ont pas d'onglet : ils ne reviennent que s'ils se reconnectent.
 */
export async function getAdminOverview() {
  await requireAdmin();

  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      createdAt: true,
      status: true,
      role: true,
      banned: true,
      banReason: true,
      banExpires: true,
      accounts: { select: { providerId: true } },
    },
  });

  const users = rows.map(({ accounts, ...user }) => ({
    ...user,
    providers: accounts.map((account) => account.providerId),
  }));

  return {
    pending: users.filter((u) => u.status === "PENDING"),
    members: users.filter((u) => u.status === "APPROVED" && !u.banned),
    banned: users.filter((u) => u.banned),
  };
}
