import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout — les parcours critiques (docs/PRODUCT.md §7).
 *
 * En local, on réutilise le `pnpm dev` déjà lancé s'il y en a un. En CI, on sert le build de
 * production : c'est ce que la doc Next recommande, et c'est ce qui tourne chez Vercel.
 *
 * Les tests marqués `@anilist` interrogent l'API pour de vrai (quota de 30 req/min partagé) :
 * la CI les écarte avec `--grep-invert @anilist`.
 */
const isCI = !!process.env.CI;
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Fabrique en base les comptes de test et leur session (e2e/support/session.ts), puis les
    // supprime une fois tous les projets passés.
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "teardown" },
    { name: "teardown", testMatch: /auth\.teardown\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: isCI ? "pnpm start" : "pnpm dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
