import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Configuration du CLI Prisma (v7).
 *
 * En v7, l'URL de connexion ne vit plus dans `schema.prisma` : le bloc `datasource` n'a plus
 * d'`url`, et c'est ce fichier qui la fournit aux commandes `migrate`, `db` et `studio`.
 *
 * `dotenv/config` est explicite parce que Prisma 7 ne charge plus `.env` tout seul. Il ne
 * s'exécute que côté CLI — l'application, elle, passe par `@/config/env` et n'a jamais accès à
 * `process.env` (CLAUDE.md).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    /**
     * Jeu d'essai de développement (`prisma/seed.ts`, ou `pnpm db:seed` directement).
     *
     * Il passe par `tsx` et non par Node seul : le script importe `@/config/env` et le client
     * généré, donc il lui faut l'alias `@/*` du tsconfig — que le résolveur ESM de Node ne connaît
     * pas.
     */
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
