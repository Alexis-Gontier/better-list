/**
 * Pose le rôle d'administrateur sur un compte, par son `username`. À lancer une fois, à la main :
 * `pnpm tsx scripts/set-admin.ts alexis-gontier`. Les suivants se nomment depuis `/admin/users`.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const username = process.argv[2];
if (!username) {
  throw new Error("Usage : pnpm tsx scripts/set-admin.ts <username>");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const user = await prisma.user.update({
  where: { username },
  data: { role: "admin", status: "APPROVED" },
  select: { username: true },
});
console.log(`@${user.username} est administrateur.`);
await prisma.$disconnect();
