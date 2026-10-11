import { test as teardown } from "@playwright/test";

import { deleteAccounts } from "./support/session";

teardown("supprime les comptes de test", async () => {
  await deleteAccounts();
});
