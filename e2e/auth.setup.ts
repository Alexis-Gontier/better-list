import { test as setup } from "@playwright/test";

import { accounts } from "./support/accounts";
import { createSession } from "./support/session";

for (const account of Object.values(accounts)) {
  setup(`session ${account.username}`, async ({ context }) => {
    const cookie = await createSession(account);
    await context.addCookies([
      {
        ...cookie,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    await context.storageState({ path: account.storageState });
  });
}
