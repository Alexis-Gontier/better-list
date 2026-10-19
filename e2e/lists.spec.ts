import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.use({ storageState: accounts.member.storageState });

/*
  Les listes créées ici partent avec le compte de test au teardown (`deleteAccounts`) : le titre
  horodaté ne sert qu'à retrouver la sienne parmi celles d'un run précédent interrompu.
*/
test("remplir une liste depuis elle-même, au clavier @anilist", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "écrit en base avec le seul compte membre : un viewport suffit",
  );

  const title = `E2E ajout ${Date.now()}`;

  await page.goto(routes.lists.root);
  await page.getByRole("button", { name: "Nouvelle liste" }).first().click();
  await page.getByLabel("Nom").fill(title);
  await page.getByRole("button", { name: "Créer" }).click();
  await page.getByRole("link", { name: new RegExp(title) }).click();

  await page.getByRole("button", { name: "Ajouter des œuvres" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Chercher une œuvre…").fill("frieren");
  await expect(dialog.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(dialog.getByText("Dans la liste").first()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText("1 œuvre", { exact: true })).toBeVisible();
});
