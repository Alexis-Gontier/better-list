import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import pg from "pg";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

/**
 * Ranger une œuvre d'une tier list **au clavier** (lot 5, §6) — sur une œuvre fictive posée en
 * base, sans AniList, pour que le test tourne en CI.
 */
config({ quiet: true });

test.use({ storageState: accounts.member.storageState });

const MEDIA_ID = 990_201;
const TITLE = "E2E Tier";

async function withClient(run: (client: pg.Client) => Promise<unknown>) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.end();
  }
}

const DESKTOP_ONLY =
  "écrit en base avec le seul compte membre : un viewport suffit";

test.beforeAll(async ({ browserName: _ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", DESKTOP_ONLY);
  await withClient((client) =>
    client.query(
      `insert into media (id, type, "titleRomaji", genres, "syncedAt")
       values ($1, 'ANIME', $2, '{}', now())
       on conflict (id) do nothing`,
      [MEDIA_ID, TITLE],
    ),
  );
});

test.afterAll(async ({ browserName: _ }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  // La ligne de liste part en cascade avec l'œuvre ; la liste, avec le compte au teardown.
  await withClient((client) =>
    client.query(`delete from media where id = $1`, [MEDIA_ID]),
  );
});

test("ranger une œuvre dans un palier au clavier", async ({ page }) => {
  const title = `E2E tier ${Date.now()}`;

  await page.goto(routes.lists.root);
  await page.getByRole("button", { name: "Nouvelle liste" }).first().click();
  await page.getByLabel("Nom").fill(title);
  await page.getByRole("radio", { name: /Tier list/ }).check();
  await page.getByRole("button", { name: "Créer et remplir" }).click();
  // La création mène à la liste neuve, fenêtre d'ajout ouverte : on la referme.
  await expect(
    page.getByRole("dialog", { name: "Ajouter des œuvres" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Palier S" })).toBeVisible();

  // L'œuvre arrive dans la réserve, comme toute œuvre ajoutée.
  const listId = new URL(page.url()).pathname.split("/").at(-1);
  await withClient((client) =>
    client.query(
      `insert into list_items (id, "listId", "mediaId", rank, "addedAt")
       values ($1, $2, $3, 'a0', now())`,
      [`e2e-tier-${Date.now()}`, listId, MEDIA_ID],
    ),
  );
  // L'adresse propre, pas un rechargement : celle de la création porte `?ajouter=1`, qui rouvrirait
  // la fenêtre d'ajout si la fermeture n'a pas encore réécrit l'URL.
  await page.goto(routes.lists.detail(listId ?? ""));

  const reserve = page.getByRole("region", { name: /Pas encore classées/ });
  const cover = reserve.getByRole("button", { name: TITLE });
  await expect(cover).toBeVisible();

  /*
    Espace saisit, la flèche monte d'une rangée (le dernier palier), Espace pose. Deux attentes que
    rien n'annonce : l'hydratation (avant elle, Espace ne saisit rien) et la mesure des rangées par
    dnd-kit (avant elle, la flèche ne mène nulle part). D'où la boucle : Échap annule une saisie à
    moitié faite, et chaque tentative repart de la réserve.
  */
  await expect(async () => {
    await page.keyboard.press("Escape");
    await cover.focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: TITLE, pressed: true }),
    ).toBeVisible({ timeout: 1_000 });
    await page.keyboard.press("ArrowUp");
    await expect(
      page.getByRole("status").filter({ hasText: "palier D" }),
    ).toBeAttached({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await page.keyboard.press("Space");

  const lastTier = page.getByRole("region", { name: "Palier D" });
  await expect(lastTier.getByRole("button", { name: TITLE })).toBeVisible();

  // Et c'est enregistré : la page relue la montre au même endroit.
  await expect(async () => {
    await page.reload();
    await expect(lastTier.getByRole("button", { name: TITLE })).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 15_000 });
});
