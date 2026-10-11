import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import pg from "pg";

import { serializeProfileFilters } from "@/app/(app)/u/[username]/_lib/profile-params";
import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

/**
 * Une case du calendrier d'activité mène au journal de ce jour — **sur des lignes posées en base,
 * sans AniList.**
 *
 * Une œuvre fictive, à l'id hors de portée d'AniList, et trois événements datés pour piéger le
 * fuseau : 23 h 30 UTC tombe le lendemain à Paris (0 h 30 l'hiver, 1 h 30 l'été). Le journal filtré
 * doit compter comme la case.
 */
config({ quiet: true });

test.use({ storageState: accounts.member.storageState });
test.describe.configure({ mode: "serial" });

const MEMBER = accounts.member;
const MEDIA_ID = 990_101;
const ENTRY_ID = "e2e-journal-entry";

/** Le jour visé : assez proche pour tenir dans la fenêtre glissante de douze mois du calendrier. */
const DAY = new Date(Date.now() - 20 * 24 * 3_600_000)
  .toISOString()
  .slice(0, 10);
const NEXT_DAY = new Date(Date.parse(`${DAY}T12:00:00Z`) + 24 * 3_600_000)
  .toISOString()
  .slice(0, 10);

async function withClient(run: (client: pg.Client) => Promise<unknown>) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.end();
  }
}

/*
  Écarté dans les crochets et pas seulement dans les tests : ils écrivent en base, et le projet
  mobile effacerait les fixtures pendant que le desktop les lit (voir library-sort.spec.ts).
*/
const DESKTOP_ONLY =
  "écrit en base avec le seul compte membre : un viewport suffit";

test.beforeAll(async ({ browserName: _ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", DESKTOP_ONLY);

  await withClient(async (client) => {
    await client.query(
      `insert into media (id, type, "titleRomaji", genres, "syncedAt")
       values ($1, 'ANIME', 'E2E Journal', '{}', now())
       on conflict (id) do nothing`,
      [MEDIA_ID],
    );
    await client.query(
      `insert into entries (id, "userId", "mediaId", status, progress, "updatedAt")
       values ($1, $2, $3, 'CURRENT', 3, now())
       on conflict ("userId", "mediaId") do nothing`,
      [ENTRY_ID, MEMBER.id, MEDIA_ID],
    );
    // Deux le jour visé à Paris quelle que soit la saison, le troisième déjà le lendemain.
    const stamps = [`${DAY}T08:00:00Z`, `${DAY}T19:30:00Z`, `${DAY}T23:30:00Z`];
    for (const [index, at] of stamps.entries()) {
      await client.query(
        `insert into entry_events (id, "entryId", "userId", type, "progressFrom", "progressTo", "createdAt")
         values ($1, $2, $3, 'PROGRESS', $4, $5, $6)`,
        [`e2e-journal-${index}`, ENTRY_ID, MEMBER.id, index, index + 1, at],
      );
    }
  });
});

test.afterAll(async ({ browserName: _ }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;

  // L'entrée et ses événements partent en cascade avec l'œuvre.
  await withClient((client) =>
    client.query(`delete from media where id = $1`, [MEDIA_ID]),
  );
});

test("une case du calendrier mène au journal de ce jour", async ({ page }) => {
  await page.goto(routes.profile(MEMBER.username));

  /*
    Le nom accessible de la case est l'intitulé de son survol : « 2 événements · <date> ». On vise
    la case par sa clé dans l'URL du lien plutôt que par la date en toutes lettres, qui dépend du
    jour où le test tourne.
  */
  const cell = page.locator(`svg a[href*="jour=${DAY}"]`);
  await expect(cell).toHaveAccessibleName(/^2 événements · /);
  await cell.click();

  await expect(page).toHaveURL(new RegExp(`jour=${DAY}#journal$`));

  const journal = page.locator("#journal");
  await expect(journal.getByText(/Épisode \d/)).toHaveCount(2);
  await expect(
    journal.getByRole("link", { name: "Tout le journal" }),
  ).toBeVisible();
});

test("l'événement de 0 h 30 appartient au lendemain", async ({ page }) => {
  await page.goto(
    `${serializeProfileFilters(routes.profile(MEMBER.username), { jour: NEXT_DAY })}#journal`,
  );

  const journal = page.locator("#journal");
  await expect(journal.getByText(/Épisode \d/)).toHaveCount(1);
  // 0 h 30 l'hiver, 1 h 30 l'été : Paris est à UTC+1 ou UTC+2 selon la date du jour visé.
  await expect(journal.getByText(/^0[01]:30$/)).toHaveCount(1);
});

test("« Tout le journal » retire le jour", async ({ page }) => {
  await page.goto(
    `${serializeProfileFilters(routes.profile(MEMBER.username), { jour: DAY })}#journal`,
  );
  await page.getByRole("link", { name: "Tout le journal" }).click();

  await expect(page).not.toHaveURL(/jour=/);
  await expect(page.locator("#journal").getByText(/Épisode \d/)).toHaveCount(3);
});
