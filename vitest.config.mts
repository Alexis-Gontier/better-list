import { createRequire } from "node:module";

import { defineConfig } from "vitest/config";

/**
 * `server-only` lève dès l'import — c'est tout son intérêt — sauf sous la condition d'export
 * `react-server`, qui le résout vers un module vide. Cette condition est posée par le compilateur
 * RSC de Next, jamais par Vitest : sans alias, tout test d'un module marqué `server-only` échoue à
 * l'import avant sa première assertion.
 *
 * On vise le fichier vide du paquet, que son champ `exports` interdit d'atteindre par spécifieur —
 * d'où le `require.resolve` sur l'entrée principale puis la substitution du nom de fichier. Passer
 * par `resolve.conditions` ne marche pas : l'environnement `node` de Vitest ne les applique pas.
 */
const require = createRequire(import.meta.url);
const SERVER_ONLY_STUB = require
  .resolve("server-only")
  .replace(/index\.js$/, "empty.js");

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
    alias: { "server-only": SERVER_ONLY_STUB },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
