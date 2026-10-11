import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.use({ storageState: accounts.member.storageState });

/** One Piece : en cours depuis 1999, présente dans le seed, et la fiche la plus chargée du catalogue. */
const ONE_PIECE = 21;

test("ajouter One Piece à sa bibliothèque, puis l'en retirer @anilist", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "écrit en base avec le seul compte membre : un viewport suffit",
  );

  await page.goto(routes.media(ONE_PIECE));
  await page
    .getByRole("button", { name: /^Ajouter ONE PIECE à ma bibliothèque$/i })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ajouter", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.goto(routes.library);
  await expect(page.getByRole("link", { name: /ONE PIECE/i })).not.toHaveCount(
    0,
  );

  await page.goto(routes.media(ONE_PIECE));
  await page
    .getByRole("button", { name: /^Modifier le suivi de ONE PIECE$/i })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Retirer de ma bibliothèque" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Retirer", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();

  await page.goto(routes.library);
  await expect(page.getByRole("link", { name: /ONE PIECE/i })).toHaveCount(0);
});
