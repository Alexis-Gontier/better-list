import { type Browser, expect, type Page, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

/*
  Deux comptes à la fois et des listes qu'on crée : desktop seul, comme `confidentialite.spec.ts`.
  Les listes restent vides : aimer et copier ne demandent pas d'œuvre, et en ajouter passerait par
  AniList. Pas de nettoyage ici : le teardown supprime les comptes de test, leurs listes avec.
  Que la Communauté écarte les listes privées est tenu par `community.queries.test.ts`.
*/

async function contexts(browser: Browser) {
  const member = await browser.newContext({
    storageState: accounts.member.storageState,
  });
  const admin = await browser.newContext({
    storageState: accounts.admin.storageState,
  });
  return {
    member,
    admin,
    memberPage: await member.newPage(),
    adminPage: await admin.newPage(),
  };
}

/** Une liste « Membres » de l'admin ; renvoie son chemin. */
async function createMembersList(page: Page, title: string) {
  await page.goto(routes.lists.root);
  await page.getByRole("button", { name: "Nouvelle liste" }).first().click();
  await page.getByLabel("Nom").fill(title);
  await page.getByRole("button", { name: "Créer et remplir" }).click();
  await expect(page).toHaveURL(new RegExp(`${routes.lists.root}/[^/?]+`));
  await page.keyboard.press("Escape");
  return new URL(page.url()).pathname;
}

test.describe("listes sociales", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop", "comptes partagés");
  });

  test("aimer la liste d'un autre l'annonce dans sa cloche", async ({
    browser,
  }) => {
    const { member, admin, memberPage, adminPage } = await contexts(browser);
    const path = await createMembersList(adminPage, "Liste à aimer");

    try {
      await memberPage.goto(path);
      const like = memberPage.getByRole("button", {
        name: "Aimer cette liste",
      });
      await expect(like).toHaveText("0");
      await like.click();
      const unlike = memberPage.getByRole("button", {
        name: "Ne plus aimer cette liste",
      });
      await expect(unlike).toHaveText("1");
      // Le compteur est optimiste : on attend que le serveur ait fini (le bouton se réarme).
      await expect(unlike).toBeEnabled();
      await memberPage.reload();
      await expect(unlike).toHaveText("1");

      await adminPage.goto(routes.lists.root);
      await adminPage.getByRole("button", { name: /Notifications \(/ }).click();
      await adminPage.getByRole("tab", { name: /Activité/ }).click();
      await expect(adminPage.getByText("Liste à aimer").first()).toBeVisible();
    } finally {
      await member.close();
      await admin.close();
    }
  });

  test("copier la liste d'un autre en fait une liste privée", async ({
    browser,
  }) => {
    const { member, admin, memberPage, adminPage } = await contexts(browser);
    const path = await createMembersList(adminPage, "Liste à copier");

    try {
      await memberPage.goto(path);
      await memberPage
        .getByRole("button", { name: "Copier dans mes listes" })
        .click();
      await expect(
        memberPage.getByText("Copiée dans vos listes, en privé."),
      ).toBeVisible();
      await memberPage
        .getByRole("button", { name: "Ouvrir", exact: true })
        .click();
      await expect(memberPage).not.toHaveURL(path);
      await expect(
        memberPage.getByText("Privée, visible de vous seul"),
      ).toBeVisible();
      await expect(memberPage.getByText("Copiée de")).toBeVisible();
    } finally {
      await member.close();
      await admin.close();
    }
  });
});
