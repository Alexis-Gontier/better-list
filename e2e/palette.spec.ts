import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.use({ storageState: accounts.member.storageState });

test("⌘K puis Entrée ouvre la recherche sur le terme tapé @anilist", async ({
  page,
}) => {
  await page.goto(routes.home);
  await page.keyboard.press("ControlOrMeta+k");

  const input = page.getByPlaceholder("Rechercher un titre…");
  await expect(input).toBeFocused();
  await input.fill("one piece");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/search\?.*q=one(\+|%20)piece/);
});
