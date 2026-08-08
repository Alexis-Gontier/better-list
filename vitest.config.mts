import { defineConfig } from "vitest/config";

/**
 * Tests unitaires — schémas Zod, helpers purs, couche transport.
 *
 * Environnement `node` : ce qui a besoin d'un DOM (composants React) n'est pas encore couvert.
 * Le jour où ça le sera, ça se fera par un second projet Vitest plutôt qu'en basculant tout le
 * monde sous jsdom, plus lent et utile aux seuls composants.
 *
 * Extension `.mts` : Vite charge sinon ce fichier comme du CommonJS et avertit à chaque run.
 */
export default defineConfig({
  resolve: {
    // Reprend l'alias `@/*` de tsconfig.json — une seule source de vérité, et une dépendance de
    // moins depuis que Vite le fait nativement.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
