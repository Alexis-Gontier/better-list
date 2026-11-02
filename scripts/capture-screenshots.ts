/**
 * Photographie quatre écrans de l'app, connectée, pour la landing et le README (D63) :
 * `pnpm tsx scripts/capture-screenshots.ts <username>` avec `pnpm dev` ouvert.
 *
 * Il ouvre une session **temporaire** sur ce compte (le cookie signé comme le fait Better Auth,
 * voir `e2e/support/session.ts`), prend les captures en thème sombre, puis supprime la session.
 * Les images vont dans `public/screenshots/` : choisir un compte dont le contenu peut se montrer.
 */
import "dotenv/config";

import { createHmac, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";
import pg from "pg";

import { routes } from "@/config/routes";

const BASE_URL = "http://localhost:3000";
const OUT = "public/screenshots";

/** L'œuvre de la fiche : Frieren, présente dans les tendances et riche en onglets. */
const MEDIA_ID = 154587;

const SHOTS = [
  { name: "accueil", path: routes.home },
  { name: "fiche", path: routes.media(MEDIA_ID) },
  { name: "bibliotheque", path: routes.library },
  { name: "profil", path: null },
] as const;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manque dans .env`);
  return value;
}

async function main() {
  const username = process.argv[2];
  if (!username) {
    throw new Error(
      "Usage : pnpm tsx scripts/capture-screenshots.ts <username>",
    );
  }

  const client = new pg.Client({ connectionString: required("DATABASE_URL") });
  await client.connect();
  const token = randomBytes(24).toString("base64url");
  const sessionId = `capture-${token.slice(0, 8)}`;

  try {
    const { rows } = await client.query<{ id: string }>(
      `select id from "user" where username = $1`,
      [username],
    );
    const userId = rows[0]?.id;
    if (!userId) throw new Error(`Aucun compte @${username}`);

    await client.query(
      `insert into session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
       values ($1, $2, $3, now() + interval '10 minutes', now(), now())`,
      [sessionId, token, userId],
    );

    const signature = createHmac("sha256", required("BETTER_AUTH_SECRET"))
      .update(token)
      .digest("base64");

    await mkdir(OUT, { recursive: true });
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
      deviceScaleFactor: 1,
    });
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: encodeURIComponent(`${token}.${signature}`),
        url: BASE_URL,
      },
    ]);
    const page = await context.newPage();

    for (const shot of SHOTS) {
      const path = shot.path ?? routes.profile(username);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
      // Laisse les frontières `<Suspense>` et les jaquettes arriver.
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${shot.name}.png` });
      console.log(`${OUT}/${shot.name}.png`);
    }

    await browser.close();
  } finally {
    await client.query("delete from session where id = $1", [sessionId]);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
