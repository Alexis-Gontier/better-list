import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.describe("membre approuvé", () => {
  test.use({ storageState: accounts.member.storageState });

  test("entre dans sa bibliothèque", async ({ page }) => {
    await page.goto(routes.library);
    await expect(
      page.getByRole("heading", { level: 1, name: "Ma bibliothèque" }),
    ).toBeVisible();
  });
});

test.describe("compte en liste d'attente", () => {
  test.use({ storageState: accounts.pending.storageState });

  test("est renvoyé vers la liste d'attente", async ({ page }) => {
    await page.goto(routes.library);
    await expect(page).toHaveURL(routes.auth.waitlist);
    await expect(
      page.getByRole("heading", { level: 1, name: "Vous y êtes presque" }),
    ).toBeVisible();
  });
});
