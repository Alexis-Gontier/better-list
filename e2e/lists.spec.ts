import { expect, type Page, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.use({ storageState: accounts.member.storageState });

/**
 * Un texte **visible**, et lui seul. Next garde la page précédente cachée dans le DOM pour le retour
 * arrière : la carte de `/lists` qu'on vient de quitter y porte encore le même décompte.
 */
const visibleText = (page: Page, text: string) =>
  page.getByText(text, { exact: true }).filter({ visible: true });

/*
  Les listes créées ici partent avec le compte de test au teardown (`deleteAccounts`) : le titre
  horodaté ne sert qu'à retrouver la sienne parmi celles d'un run précédent interrompu.
*/
test("créer, remplir au clavier, puis retirer @anilist", async ({
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
  await page.getByRole("button", { name: "Créer et remplir" }).click();

  // La création mène à la liste neuve, fenêtre d'ajout déjà ouverte.
  const dialog = page.getByRole("dialog", { name: "Ajouter des œuvres" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Chercher une œuvre…").fill("frieren");
  const first = dialog.getByRole("option").first();
  await expect(first).toContainText(/Frieren/i);
  await page.keyboard.press("Enter");
  await expect(first).toContainText("Dans la liste");

  await page.keyboard.press("Escape");
  await expect(visibleText(page, "1 œuvre")).toBeVisible();
  await expect(page.getByRole("link", { name: /Frieren/i })).toBeVisible();

  await page.getByRole("link", { name: "Réorganiser" }).click();
  await page
    .getByRole("button", { name: /^Retirer .*Frieren.* de la liste$/i })
    .click();
  await expect(visibleText(page, "Aucune œuvre")).toBeVisible();
});

test("créer une liste « Quand c'est fini », puis en faire un Top 3", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "écrit en base avec le seul compte membre : un viewport suffit",
  );

  const title = `E2E genre ${Date.now()}`;

  await page.goto(routes.lists.root);
  await page.getByRole("button", { name: "Nouvelle liste" }).first().click();
  await page.getByLabel("Nom").fill(title);
  await page.getByRole("radio", { name: /Quand c'est fini/ }).check();
  await page.getByRole("button", { name: "Créer et remplir" }).click();
  await page.keyboard.press("Escape");
  await expect(
    visibleText(page, "Quand c'est fini · Aucune œuvre"),
  ).toBeVisible();

  await page.goto(routes.lists.root);
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card.getByText("Quand c'est fini · Aucune œuvre")).toBeVisible();
  await card.click();

  await page
    .getByRole("button", { name: `Actions sur la liste ${title}` })
    .click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await page.getByRole("radio", { name: /Classement/ }).check();
  await page.getByLabel("Top", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(visibleText(page, "Classement · Aucune œuvre")).toBeVisible();
});
