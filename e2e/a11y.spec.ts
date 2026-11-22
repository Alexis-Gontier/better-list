import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

// WCAG 2.1 niveaux A et AA : ce que vise le projet, pas les règles « best-practice » d'axe.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Un message par violation : la règle, son impact et les sélecteurs fautifs, lisibles en CI. */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}) : ${v.help}\n${v.nodes
        .map(
          (n) =>
            `  ${n.html.slice(0, 160)}\n    ${n.failureSummary?.split("\n").slice(1).join(" ")}`,
        )
        .join("\n")}`,
  );
  expect(summary).toEqual([]);
}

async function scan(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expectNoViolations(page);
}

// Le thème suit le système (`defaultTheme="system"`) : sans émulation, seul le clair serait scanné,
// alors que le sombre est le canon (D34).
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });

    test.describe("anonyme", () => {
      test("landing @anilist", async ({ page }) => {
        await scan(page, routes.welcome);
      });

      test("connexion", async ({ page }) => {
        await scan(page, routes.auth.login);
      });
    });

    test.describe("membre", () => {
      test.use({ storageState: accounts.member.storageState });

      test("accueil @anilist", async ({ page }) => {
        await scan(page, routes.home);
      });

      test("bibliothèque", async ({ page }) => {
        await scan(page, routes.library);
      });

      test("listes", async ({ page }) => {
        await scan(page, routes.lists.root);
      });

      test("fiche One Piece @anilist", async ({ page }) => {
        await scan(page, routes.media(21));
      });

      test("réglages", async ({ page }) => {
        await scan(page, routes.settings);
      });

      test("profil", async ({ page }) => {
        await scan(page, routes.profile(accounts.member.username));
      });
    });
  });
}
