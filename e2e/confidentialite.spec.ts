import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

/*
  Deux comptes à la fois, et des réglages qu'on écrit : desktop seul. Le projet mobile jouerait les
  mêmes bascules en parallèle sur les mêmes comptes, et les deux se marcheraient dessus.
*/
test.describe("confidentialité entre membres", () => {
  test("un profil caché ne montre que son encart et ses listes", async ({
    browser,
  }) => {
    test.skip(test.info().project.name !== "desktop", "comptes partagés");
    const member = await browser.newContext({
      storageState: accounts.member.storageState,
    });
    const admin = await browser.newContext({
      storageState: accounts.admin.storageState,
    });
    const memberPage = await member.newPage();
    const adminPage = await admin.newPage();
    const visible = memberPage.getByRole("switch", {
      name: "Profil visible des membres",
    });

    await memberPage.goto(routes.settings);
    await visible.click();
    await expect(visible).not.toBeChecked();

    try {
      await adminPage.goto(routes.profile(accounts.member.username));
      await expect(
        adminPage.getByText("garde son profil pour lui"),
      ).toBeVisible();
      await expect(
        adminPage.getByRole("heading", { name: "Historique" }),
      ).toHaveCount(0);
    } finally {
      await visible.click();
      await expect(visible).toBeChecked();
      await member.close();
      await admin.close();
    }
  });

  test("une liste privée reste introuvable pour un autre membre", async ({
    browser,
  }) => {
    test.skip(test.info().project.name !== "desktop", "comptes partagés");
    const member = await browser.newContext({
      storageState: accounts.member.storageState,
    });
    const admin = await browser.newContext({
      storageState: accounts.admin.storageState,
    });
    const memberPage = await member.newPage();
    const adminPage = await admin.newPage();

    await memberPage.goto(routes.lists.root);
    await memberPage.getByRole("button", { name: "Nouvelle liste" }).click();
    await memberPage.getByLabel("Nom").fill("Brouillon secret");
    await memberPage.getByRole("radio", { name: "Privée" }).click();
    await memberPage.getByRole("button", { name: "Créer et remplir" }).click();
    await expect(memberPage).toHaveURL(/\/lists\/[^/?]+/);
    const listPath = new URL(memberPage.url()).pathname;

    await adminPage.goto(listPath);
    await expect(adminPage.getByText("Liste introuvable")).toBeVisible();
    await adminPage.goto(routes.profile(accounts.member.username));
    await expect(adminPage.getByText("Brouillon secret")).toHaveCount(0);

    await member.close();
    await admin.close();
  });
});
