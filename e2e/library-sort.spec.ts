import { expect, type Page, test } from "@playwright/test";
import { config } from "dotenv";
import pg from "pg";

import { routes } from "@/config/routes";
import { serializeLibraryFilters } from "@/features/tracking/lib/library-params";

import { accounts } from "./support/accounts";

/**
 * Le tri et les filtres de `/library` — **sur des lignes posées en base, sans AniList.**
 *
 * Trois œuvres fictives, aux ids hors de portée d'AniList pour qu'aucun nettoyage ne touche une
 * vraie fiche du miroir. Leurs titres commencent tous par « E2E » : le terme les isole de ce que
 * le compte membre pourrait suivre par ailleurs.
 */
config({ quiet: true });

test.use({ storageState: accounts.member.storageState });
test.describe.configure({ mode: "serial" });

const MEMBER = accounts.member.id;

const FIXTURES = [
  { id: 990_001, title: "E2E Alpha", synonyms: "", isAdult: false },
  {
    id: 990_002,
    title: "E2E Omega",
    synonyms: "E2E Synonyme Caché",
    isAdult: false,
  },
  { id: 990_003, title: "E2E Adulte", synonyms: "", isAdult: true },
];
const FIXTURE_IDS = FIXTURES.map((media) => media.id);

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

async function setIncludeAdult(includeAdult: boolean) {
  await withClient((client) =>
    client.query(
      `insert into user_preferences ("userId", "includeAdult", "updatedAt")
       values ($1, $2, now())
       on conflict ("userId") do update set "includeAdult" = excluded."includeAdult"`,
      [MEMBER, includeAdult],
    ),
  );
}

/** Les titres de la grille, dans l'ordre de l'écran. */
function cardTitles(page: Page) {
  return page.getByRole("link", { name: /E2E (Alpha|Omega|Adulte)/ });
}

/*
  Écarté dans les crochets et pas seulement dans les tests : `beforeAll` et `afterAll` écrivent en
  base eux aussi, et un `test.skip` conditionnel posé au niveau du fichier ne les arrête pas — le
  projet mobile effaçait les fixtures pendant que le desktop les lisait.
*/
const DESKTOP_ONLY =
  "écrit en base avec le seul compte membre : un viewport suffit";

test.beforeAll(async ({ browserName: _ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", DESKTOP_ONLY);

  await withClient(async (client) => {
    for (const media of FIXTURES) {
      await client.query(
        `insert into media (id, type, "titleRomaji", synonyms, genres, "isAdult", "syncedAt")
         values ($1, 'ANIME', $2, $3, '{}', $4, now())
         on conflict (id) do nothing`,
        [media.id, media.title, media.synonyms, media.isAdult],
      );
      await client.query(
        `insert into entries (id, "userId", "mediaId", status, "updatedAt")
         values ($1, $2, $3, 'CURRENT', now())
         on conflict ("userId", "mediaId") do nothing`,
        [`e2e-entry-${media.id}`, MEMBER, media.id],
      );
    }
  });
});

test.afterAll(async ({ browserName: _ }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;

  // Les entrées partent en cascade avec leur œuvre.
  await withClient((client) =>
    client.query(`delete from media where id = any($1)`, [FIXTURE_IDS]),
  );
  await setIncludeAdult(false);
});

test("le bouton de sens renverse le tri par titre", async ({ page }) => {
  await page.goto(
    serializeLibraryFilters(routes.library, { q: "E2E", sort: "title" }),
  );

  await expect(cardTitles(page).first()).toHaveAccessibleName(/E2E Alpha/);

  await page
    .getByRole("button", { name: "Trier par ordre décroissant" })
    .click();

  await expect(page).toHaveURL(/dir=DESC/);
  await expect(cardTitles(page).first()).toHaveAccessibleName(/E2E Omega/);
});

test("la recherche trouve une œuvre par son synonyme", async ({ page }) => {
  await page.goto(routes.library);
  await page
    .getByPlaceholder("Un titre que je suis déjà…")
    .fill("synonyme caché");

  await expect(cardTitles(page)).toHaveCount(1);
  await expect(cardTitles(page).first()).toHaveAccessibleName(/E2E Omega/);
});

test("le filtre 18+ n'existe que pour qui l'a ouvert", async ({ page }) => {
  await setIncludeAdult(false);
  await page.goto(serializeLibraryFilters(routes.library, { q: "E2E" }));

  await expect(page.getByRole("combobox", { name: "Contenu 18+" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: /E2E Adulte/ })).toHaveCount(0);

  await setIncludeAdult(true);
  await page.reload();

  await page.getByRole("combobox", { name: "Contenu 18+" }).click();
  await page.getByRole("option", { name: "Seulement 18+" }).click();

  await expect(page).toHaveURL(/adult=only/);
  await expect(cardTitles(page)).toHaveCount(1);
  await expect(cardTitles(page).first()).toHaveAccessibleName(/E2E Adulte/);
});
