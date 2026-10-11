import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

test.describe("anonyme", () => {
  test("la page de connexion s'affiche", async ({ page }) => {
    await page.goto(routes.auth.login);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Suivez tout ce que vous regardez",
      }),
    ).toBeVisible();
  });

  test("une route protégée renvoie vers /login en gardant la destination", async ({
    page,
  }) => {
    await page.goto(routes.library);
    await expect(page).toHaveURL(
      `${routes.auth.login}?callbackUrl=${encodeURIComponent(routes.library)}`,
    );
  });
});
