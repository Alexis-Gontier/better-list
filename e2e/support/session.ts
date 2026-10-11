import { createHmac, randomBytes } from "node:crypto";

import { config } from "dotenv";
import pg from "pg";

import { accounts, type TestAccount } from "./accounts";

/**
 * Fabrique une session Better Auth sans passer par GitHub, seul fournisseur du projet.
 *
 * Même mécanique que `scripts/dev-session-cookie.mjs` (JOURNAL.md, 26 septembre 2026), à une
 * différence près : on **crée** le compte et sa session au lieu d'emprunter ceux d'un membre.
 *
 * `.env` est lu par `dotenv` : on tourne sous le runner Playwright, où `@/config/env` exigerait un
 * `NODE_ENV` que seul Next pose. En CI, les variables viennent du job et `.env` n'existe pas.
 */
config({ quiet: true });

function required(name: "DATABASE_URL" | "BETTER_AUTH_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} est requis pour les tests E2E.`);
  return value;
}

async function withClient<T>(
  run: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({
    connectionString: required("DATABASE_URL"),
  });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/** Cookie signé comme le fait better-call : `token.signature`, HMAC-SHA256 en base64. */
export async function createSession(account: TestAccount) {
  const token = randomBytes(24).toString("base64url");
  const signature = createHmac("sha256", required("BETTER_AUTH_SECRET"))
    .update(token)
    .digest("base64");

  await withClient(async (client) => {
    // `updatedAt` est un `@updatedAt` Prisma : aucun défaut SQL, il faut le poser.
    await client.query(
      `insert into "user" (id, name, email, "emailVerified", username, status, "createdAt", "updatedAt")
       values ($1, $2, $3, true, $2, $4, now(), now())
       on conflict (id) do update set status = excluded.status, "updatedAt" = now()`,
      [account.id, account.username, account.email, account.status],
    );
    await client.query(
      `insert into session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
       values ($1, $2, $3, now() + interval '1 day', now(), now())`,
      [`${account.id}-${token.slice(0, 8)}`, token, account.id],
    );
  });

  return {
    name: "better-auth.session_token",
    value: encodeURIComponent(`${token}.${signature}`),
  };
}

/** Supprime les comptes de test ; sessions, suivi, listes et collection partent en cascade. */
export async function deleteAccounts() {
  await withClient((client) =>
    client.query(`delete from "user" where id = any($1)`, [
      Object.values(accounts).map((account) => account.id),
    ]),
  );
}
