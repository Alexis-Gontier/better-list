import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.describe("visiteur sans compte", () => {
  test("voit la landing à la racine, sans changer d'adresse", async ({
    page,
  }) => {
    await page.goto(routes.home);
    await expect(page).toHaveURL(routes.home);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Suivez ce que vous regardez/,
      }),
    ).toBeVisible();
  });

  test("trouve les trois fournisseurs sur /login", async ({ page }) => {
    await page.goto(routes.auth.login);
    for (const name of ["GitHub", "Discord", "Google"]) {
      await expect(
        page.getByRole("button", { name: `Continuer avec ${name}` }),
      ).toBeVisible();
    }
  });

  test("est renvoyé de /signup vers /login", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(routes.auth.login);
  });
});

test.describe("membre", () => {
  test.use({ storageState: accounts.member.storageState });

  test("n'entre pas dans l'administration", async ({ page }) => {
    await page.goto(routes.admin.users);
    await expect(
      page.getByRole("heading", { level: 1, name: "Membres" }),
    ).toHaveCount(0);
  });
});

test.describe("membre qui s'en va", () => {
  test.use({ storageState: accounts.leaver.storageState });

  test("supprime son compte et retrouve la landing", async ({ page }) => {
    // Un seul compte à supprimer : le projet mobile le trouverait déjà parti.
    test.skip(test.info().project.name !== "desktop", "compte unique");
    await page.goto(routes.settings);
    await page.getByRole("button", { name: "Supprimer mon compte" }).click();
    const confirm = page.getByRole("button", {
      name: "Supprimer",
      exact: true,
    });
    await expect(confirm).toBeDisabled();
    await page.getByLabel(/Recopiez/).fill(accounts.leaver.username);
    await confirm.click();
    await expect(page).toHaveURL(routes.home);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Suivez ce que vous regardez/,
      }),
    ).toBeVisible();
  });
});

test.describe("administrateur", () => {
  test.use({ storageState: accounts.admin.storageState });

  test("approuve une demande, puis annule", async ({ page }) => {
    // Desktop et mobile tournent en parallèle sur la même demande : l'un la ferait disparaître à l'autre.
    test.skip(test.info().project.name !== "desktop", "demande unique");
    await page.goto(routes.admin.users);
    const row = page.getByRole("row", { name: /e2e-request/ });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Approuver", exact: true }).click();
    await expect(page.getByText("est maintenant membre")).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("row", { name: /e2e-request/ })).toBeVisible();
  });
});
