import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Client Prisma unique de l'application.
 *
 * Deux contraintes dictent ce fichier :
 *
 * 1. **Prisma 7 exige un driver adapter.** Le compilateur de requêtes est passé par défaut en v7 ;
 *    il n'y a plus de moteur binaire qui ouvre la connexion. C'est `@prisma/adapter-pg` qui parle
 *    à PostgreSQL, et la connexion se déclare ici, pas dans `schema.prisma`.
 * 2. **Le rechargement à chaud recrée les modules.** Sans mémorisation sur `globalThis`, chaque
 *    édition de fichier en développement ouvrirait un nouveau pool et finirait par épuiser les
 *    connexions de la base. En production le module n'est évalué qu'une fois, donc la branche ne
 *    sert à rien — d'où la garde sur `NODE_ENV`.
 *
 * `server-only` : une fuite de ce fichier dans un bundle client devient une erreur de build, pas
 * une chaîne de connexion publiée.
 */

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
