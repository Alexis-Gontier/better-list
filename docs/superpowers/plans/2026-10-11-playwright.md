# Playwright — tests de bout en bout et skills agent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** poser Playwright sur les parcours critiques (PRODUCT.md §7, ligne « Tests »), le faire
tourner en CI sur une base Postgres jetable, et donner à l'agent les skills qui vont avec.

**Architecture :** un dossier `e2e/` à la racine, hors de `src/` — ce n'est pas du code applicatif,
comme `prisma/seed.ts`. Un projet Playwright `setup` fabrique en base deux comptes de test
(`APPROVED` et `PENDING`) et leur session, signe le cookie comme better-call, et écrit un *storage
state* par compte. Les tests qui dépendent d'AniList portent le tag `@anilist` et ne tournent qu'en
local ; la CI ne lance que ce qui ne parle qu'à la base.

**Tech Stack :** `@playwright/test` 1.64, Chromium seul, `pg` (déjà en dépendance), Next 16
(`next dev` en local, `next start` en CI), GitHub Actions avec un service `postgres:17`.

**Spec :** pas de spec séparée — la décision est déjà écrite : PRODUCT.md §7 (« Playwright plus tard,
sur les parcours critiques »), STATE.md (« Playwright est prévu et toujours pas posé »), et le
précédent de `scripts/dev-session-cookie.mjs` (JOURNAL.md, 26 septembre) pour l'authentification.

## Global Constraints

- Connexion **GitHub OAuth seule** (`emailAndPassword: { enabled: false }`) : aucun test ne passe par
  l'écran de connexion GitHub. La session se fabrique en base.
- Cookie de session : `better-auth.session_token`, valeur `encodeURIComponent(`${token}.${hmacSha256Base64(token, BETTER_AUTH_SECRET)}`)`.
- Comptes de test **namespacés** : ids `e2e-member` / `e2e-pending`, emails en `@example.invalid`.
  Rien d'autre en base n'est lu, écrit ni supprimé par la suite.
- Les colonnes `@updatedAt` de Prisma n'ont **pas** de défaut SQL : toute insertion brute les pose.
- Aucune URL en dur dans `e2e/` non plus : les chemins viennent de `@/config/routes` (Playwright
  honore les `paths` de `tsconfig.json`).
- `process.env` est permis dans `playwright.config.ts` et `e2e/**` — fichiers de CLI hors de Next,
  même famille que `prisma/seed.ts`. Le hook et CLAUDE.md sont mis à jour en conséquence (Task 1).
- Fichiers de test en `*.spec.ts` dans `e2e/` ; Vitest garde `src/**/*.test.ts`. Les deux ne se
  croisent pas.
- Un seul navigateur (Chromium), deux viewports : **1440** et **390** — ceux où chaque écran est
  vérifié à la main depuis le 6 septembre (STATE.md).
- Pas dans `pre-push` : trop lent. CI seulement, en job séparé.

### Ce que le plan ne fait pas, exprès

- **Pas d'interception des `fetch` serveur vers AniList.** `next/experimental/testmode/playwright`
  existe dans `node_modules`, mais il est expérimental, absent de la doc embarquée, et se heurte au
  `"use cache"`. Le tag `@anilist` suffit tant que la CI ne lance pas ces tests.
- **Pas de plugin `testUtils` de Better Auth.** Il exige d'instancier `betterAuth()` hors de Next,
  or `src/lib/auth/server.ts` importe `server-only` et `@/config/env`. Le SQL brut + HMAC du script
  existant a déjà fait ses preuves sur ce projet.
- **Pas de `npx playwright init-agents --loop=claude`** (agents planner/generator/healer). Il
  ajoute trois agents et un `.mcp.json` qui doublonnent le plugin Playwright MCP déjà actif, et
  impose une régénération à chaque montée de version. À reconsidérer quand la suite dépassera une
  poignée de fichiers.

---

## File Structure

| Fichier | Rôle |
| --- | --- |
| `playwright.config.ts` | Projets `setup` / `desktop` / `mobile`, `webServer`, reporter |
| `e2e/support/accounts.ts` | Les deux comptes de test : ids, chemins de *storage state* |
| `e2e/support/session.ts` | Upsert user + session en base, signature du cookie, nettoyage |
| `e2e/auth.setup.ts` | Projet `setup` : écrit `e2e/.auth/<compte>.json` |
| `e2e/auth.teardown.ts` | Supprime les deux comptes (cascade) |
| `e2e/smoke.spec.ts` | Public : `/login`, redirection d'un anonyme |
| `e2e/access.spec.ts` | Garde : membre → `/library`, compte `PENDING` → `/waitlist` |
| `e2e/palette.spec.ts` | `@anilist` — ⌘K, saisie, Entrée → `/search?q=…` |
| `e2e/tracking.spec.ts` | `@anilist` — ajouter une œuvre depuis sa fiche, puis la retirer |
| `.github/workflows/ci.yml` | Nouveau job `e2e` |
| `.claude/skills/playwright-cli/` | Skill officielle Microsoft (piloter le navigateur en CLI) |
| `.claude/skills/playwright-best-practices/` | Skill currents.dev, copie **complète** |
| `.claude/skills/e2e-test/SKILL.md` | Skill du projet : écrire un test E2E ici |

---

### Task 1 : socle Playwright et premier test public

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (scripts + devDependency), `.gitignore`, `.claude/hooks/conventions-guard.mjs:25-30`, `CLAUDE.md` (liste d'exceptions `process.env` + Outillage), `knip.jsonc` (si knip signale quoi que ce soit)

**Interfaces:**
- Produces : scripts `pnpm test:e2e`, `pnpm test:e2e:ui` ; projets Playwright `desktop` et `mobile`.

- [ ] **Step 1 : installer**

```bash
pnpm add -D @playwright/test@1.64.0
pnpm exec playwright install chromium
```

- [ ] **Step 2 : autoriser `process.env` aux fichiers de CLI Playwright**

Dans `.claude/hooks/conventions-guard.mjs`, étendre la condition plutôt que la liste (les fichiers de
`e2e/` sont nombreux) :

```js
const ENV_ALLOWLIST = [
  "src/config/env.ts",
  "next.config.ts",
  "postcss.config.mjs",
  "prisma/seed.ts",
  "playwright.config.ts",
];

/** Les tests de bout en bout tournent sous le runner Playwright, hors de Next — même famille que le seed. */
const ENV_ALLOWED_PREFIXES = [".claude/", "e2e/"];
```

et remplacer `!path.startsWith(".claude/")` par
`!ENV_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))`.

Dans `CLAUDE.md`, la liste close devient : `src/config/env.ts`, `next.config.ts`,
`postcss.config.mjs`, `prisma/seed.ts`, `playwright.config.ts`, `e2e/**`.

- [ ] **Step 3 : écrire le test qui échoue**

`e2e/smoke.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

test.describe("anonyme", () => {
  test("la page de connexion s'affiche", async ({ page }) => {
    await page.goto(routes.auth.login);
    await expect(
      page.getByRole("heading", { level: 1, name: "Suivez tout ce que vous regardez" }),
    ).toBeVisible();
  });

  test("une route protégée renvoie vers /login en gardant la destination", async ({ page }) => {
    await page.goto(routes.library);
    await expect(page).toHaveURL(
      `${routes.auth.login}?callbackUrl=${encodeURIComponent(routes.library)}`,
    );
  });
});
```

- [ ] **Step 4 : la config**

`playwright.config.ts` :

```ts
import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout — les parcours critiques (docs/PRODUCT.md §7).
 *
 * En local, on réutilise le `pnpm dev` déjà lancé s'il y en a un. En CI, on sert le build de
 * production : c'est ce que la doc Next recommande, et c'est ce qui tourne chez Vercel.
 *
 * Les tests marqués `@anilist` interrogent l'API pour de vrai (quota de 30 req/min partagé) :
 * la CI les écarte avec `--grep-invert @anilist`.
 */
const isCI = !!process.env.CI;
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: {
    command: isCI ? "pnpm start" : "pnpm dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5 : scripts et `.gitignore`**

`package.json` :

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
```

`.gitignore`, sous `# testing` :

```
/playwright-report
/test-results
/e2e/.auth
```

- [ ] **Step 6 : lancer**

Run : `pnpm test:e2e`
Expected : 4 tests (2 × 2 projets) PASS. Si la redirection échoue, lire `src/proxy.ts` : le
paramètre est `callbackUrl`, posé par `searchParams.set` — donc encodé.

- [ ] **Step 7 : les garde-fous du dépôt**

Run : `pnpm lint && pnpm typecheck && pnpm knip`
Expected : vert. knip a un plugin Playwright et détecte `playwright.config.ts` et `e2e/**/*.spec.ts`
seul ; s'il signale `@playwright/test` ou les specs, ajouter `"playwright": { "entry": ["e2e/**/*.{spec,setup,teardown}.ts"] }` à `knip.jsonc` avec un commentaire.

- [ ] **Step 8 : commit**

```bash
git add playwright.config.ts e2e/smoke.spec.ts package.json pnpm-lock.yaml .gitignore .claude/hooks/conventions-guard.mjs CLAUDE.md knip.jsonc
git commit -m "test(e2e): pose Playwright et un premier parcours anonyme"
```

---

### Task 2 : comptes de test et garde d'accès

**Files:**
- Create: `e2e/support/accounts.ts`, `e2e/support/session.ts`, `e2e/auth.setup.ts`, `e2e/auth.teardown.ts`, `e2e/access.spec.ts`
- Modify: `playwright.config.ts` (projets `setup` / `teardown`, dépendances)

**Interfaces:**
- Consumes : `playwright.config.ts` (Task 1).
- Produces :
  - `accounts.member` / `accounts.pending` : `{ id: string; username: string; email: string; status: "APPROVED" | "PENDING"; storageState: string }`
  - `createSession(account): Promise<{ name: string; value: string }>` — le cookie prêt à poser
  - `deleteAccounts(): Promise<void>`
  - fichiers `e2e/.auth/member.json`, `e2e/.auth/pending.json`

- [ ] **Step 1 : écrire le test qui échoue**

`e2e/access.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.describe("membre approuvé", () => {
  test.use({ storageState: accounts.member.storageState });

  test("entre dans sa bibliothèque", async ({ page }) => {
    await page.goto(routes.library);
    await expect(page.getByRole("heading", { level: 1, name: "Ma bibliothèque" })).toBeVisible();
  });
});

test.describe("compte en liste d'attente", () => {
  test.use({ storageState: accounts.pending.storageState });

  test("est renvoyé vers la liste d'attente", async ({ page }) => {
    await page.goto(routes.library);
    await expect(page).toHaveURL(routes.auth.waitlist);
    await expect(page.getByRole("heading", { level: 1, name: "Vous y êtes presque" })).toBeVisible();
  });
});
```

Run : `pnpm test:e2e access` — Expected : FAIL, `./support/accounts` introuvable.

- [ ] **Step 2 : les comptes**

`e2e/support/accounts.ts` :

```ts
/**
 * Les deux seuls comptes que la suite E2E touche. Ids et emails sont namespacés pour qu'aucune
 * requête de nettoyage ne puisse atteindre un vrai membre : `.invalid` est réservé (RFC 2606).
 */
export const accounts = {
  member: {
    id: "e2e-member",
    username: "e2e-member",
    email: "e2e-member@example.invalid",
    status: "APPROVED",
    storageState: "e2e/.auth/member.json",
  },
  pending: {
    id: "e2e-pending",
    username: "e2e-pending",
    email: "e2e-pending@example.invalid",
    status: "PENDING",
    storageState: "e2e/.auth/pending.json",
  },
} as const;

export type TestAccount = (typeof accounts)[keyof typeof accounts];
```

- [ ] **Step 3 : la session en base**

`e2e/support/session.ts` :

```ts
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

const DATABASE_URL = process.env.DATABASE_URL;
const SECRET = process.env.BETTER_AUTH_SECRET;
if (!DATABASE_URL || !SECRET) {
  throw new Error("DATABASE_URL et BETTER_AUTH_SECRET sont requis pour les tests E2E.");
}

async function withClient<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
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
  const signature = createHmac("sha256", SECRET as string).update(token).digest("base64");

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

  return { name: "better-auth.session_token", value: encodeURIComponent(`${token}.${signature}`) };
}

/** Supprime les comptes de test ; sessions, suivi, listes et collection partent en cascade. */
export async function deleteAccounts() {
  await withClient((client) =>
    client.query(`delete from "user" where id = any($1)`, [
      Object.values(accounts).map((account) => account.id),
    ]),
  );
}
```

- [ ] **Step 4 : setup et teardown**

`e2e/auth.setup.ts` :

```ts
import { test as setup } from "@playwright/test";

import { accounts } from "./support/accounts";
import { createSession } from "./support/session";

for (const account of Object.values(accounts)) {
  setup(`session ${account.username}`, async ({ context }) => {
    const cookie = await createSession(account);
    await context.addCookies([
      { ...cookie, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
    ]);
    await context.storageState({ path: account.storageState });
  });
}
```

`e2e/auth.teardown.ts` :

```ts
import { test as teardown } from "@playwright/test";

import { deleteAccounts } from "./support/session";

teardown("supprime les comptes de test", async () => {
  await deleteAccounts();
});
```

- [ ] **Step 5 : brancher les projets**

Dans `playwright.config.ts`, `projects` devient :

```ts
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "teardown" },
    { name: "teardown", testMatch: /auth\.teardown\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
```

- [ ] **Step 6 : lancer**

Run : `pnpm test:e2e`
Expected : setup (2) + smoke (4) + access (4) + teardown (1) PASS. Puis vérifier en base qu'il ne
reste aucune ligne `user` d'id `e2e-%` (`pnpm db:studio`).

Si `access` « membre » tombe sur `/waitlist` : le `status` n'a pas été écrit — vérifier le type
`UserStatus` (un `$4::"UserStatus"` peut être nécessaire). S'il tombe sur `/login` : la signature
est fausse — comparer avec `scripts/dev-session-cookie.mjs`.

- [ ] **Step 7 : commit**

```bash
git add e2e playwright.config.ts
git commit -m "test(e2e): comptes de test en base et garde d'accès"
```

---

### Task 3 : deux parcours critiques, tagués `@anilist`

**Files:**
- Create: `e2e/palette.spec.ts`, `e2e/tracking.spec.ts`

**Interfaces:**
- Consumes : `accounts.member.storageState` (Task 2), `routes` (`@/config/routes`).

Œuvre de référence : **id 21, One Piece** — en cours depuis 1999, présente dans le seed, et la fiche
la plus chargée du catalogue (deux postes pour une même personne : le bug des clés du 26 septembre).

- [ ] **Step 1 : la palette**

`e2e/palette.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.use({ storageState: accounts.member.storageState });

test("⌘K puis Entrée ouvre la recherche sur le terme tapé @anilist", async ({ page }) => {
  await page.goto(routes.home);
  await page.keyboard.press("ControlOrMeta+k");

  const input = page.getByPlaceholder("Rechercher un titre…");
  await expect(input).toBeFocused();
  await input.fill("one piece");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/search\?.*q=one(\+|%20)piece/);
});
```

- [ ] **Step 2 : le suivi depuis la fiche**

`e2e/tracking.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.use({ storageState: accounts.member.storageState });

// Un seul compte, une seule œuvre : les deux viewports ne doivent pas écrire en même temps.
test.describe.configure({ mode: "serial" });

test("ajouter One Piece à sa bibliothèque, puis le retirer @anilist", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "écrit en base : un seul viewport");

  await page.goto(routes.media(21));
  await page.getByRole("button", { name: /Ajouter .* à ma bibliothèque/ }).click();
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  await page.goto(routes.library);
  await expect(page.getByRole("link", { name: /One Piece/ }).first()).toBeVisible();

  await page.goto(routes.media(21));
  await page.getByRole("button", { name: /Modifier le suivi|à ma bibliothèque/ }).click();
  await page.getByRole("button", { name: "Retirer de ma bibliothèque" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /Retirer/ }).click();

  await page.goto(routes.library);
  await expect(page.getByRole("link", { name: /One Piece/ })).toHaveCount(0);
});
```

- [ ] **Step 3 : lancer et ajuster les sélecteurs à l'écran**

Run : `pnpm test:e2e --grep @anilist --headed`
Les libellés ci-dessus viennent de `entry-quick-edit.tsx:255-276`, `entry-remove-button.tsx:75` et
`command-search.tsx:230`. Si un sélecteur rate, ouvrir l'écran avec
`pnpm exec playwright codegen localhost:3000 --load-storage=e2e/.auth/member.json` (après un
`pnpm test:e2e --project=setup`) et **remplacer le sélecteur par un rôle + nom accessible**, jamais
par une classe CSS. Si un bouton n'a pas de nom accessible, c'est un défaut d'accessibilité : le
corriger dans le composant plutôt que d'ajouter un `data-testid`.

Expected : PASS sur `desktop` ; le test de suivi est `skipped` sur `mobile`.

- [ ] **Step 4 : commit**

```bash
git add e2e
git commit -m "test(e2e): palette et suivi depuis la fiche"
```

---

### Task 4 : job CI sur une base Postgres jetable

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes : `pnpm test:e2e` (Task 1), le setup en base (Task 2).

Pourquoi un service Postgres et pas une branche Neon : aucun secret à déclarer, une base vierge à
chaque run, et `prisma migrate deploy` vérifie au passage que les migrations s'appliquent sur une
base vide — ce que rien ne contrôle aujourd'hui.

- [ ] **Step 1 : ajouter le job**

À la suite du job `quality`, dans `.github/workflows/ci.yml` :

```yaml
  e2e:
    name: E2E (Playwright)
    runs-on: ubuntu-latest
    timeout-minutes: 20

    # Une vraie base cette fois, mais jetable : le service vit le temps du job. Les autres variables
    # restent factices — les tests `@anilist` sont écartés, et GitHub n'est jamais appelé.
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: ci
          POSTGRES_PASSWORD: ci
          POSTGRES_DB: ci
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U ci" --health-interval 5s --health-timeout 5s --health-retries 10

    env:
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci?sslmode=disable
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      BETTER_AUTH_SECRET: ci-placeholder-not-a-real-secret-000000
      CRON_SECRET: ci-placeholder-not-a-real-secret-111111
      GITHUB_CLIENT_ID: ci-placeholder
      GITHUB_CLIENT_SECRET: ci-placeholder

    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Migrations
        run: pnpm db:deploy

      - name: Navigateur
        run: pnpm exec playwright install --with-deps chromium

      - name: Build
        run: pnpm build

      - name: E2E
        run: pnpm test:e2e --grep-invert @anilist

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 2 : vérifier**

Pousser la branche, ouvrir la PR, puis `gh run list --limit 1` et `gh run view <id>`.
Expected : les deux jobs verts ; le job `e2e` liste setup + smoke + access + teardown, aucun
`@anilist`. Si `Migrations` échoue, une migration dépend d'une extension ou d'un réglage propre à
Neon : c'est une découverte à écrire dans JOURNAL.md avant de la contourner.

- [ ] **Step 3 : commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: job E2E sur une base Postgres jetable"
```

---

### Task 5 : les skills et la documentation

**Files:**
- Create: `.claude/skills/playwright-cli/**`, `.claude/skills/playwright-best-practices/**`, `.claude/skills/e2e-test/SKILL.md`
- Modify: `.claude/SKILLS.md`, `CLAUDE.md` (Outillage), `docs/ARCHITECTURE.md` (où vit `e2e/`), `docs/PRODUCT.md` (ligne « Tests »), `docs/STATE.md`, `docs/JOURNAL.md`

Trois skills, trois rôles qui ne se recouvrent pas :

| Skill | Sert à | Source |
| --- | --- | --- |
| `playwright-cli` | **piloter** un navigateur depuis l'agent (vérifier un écran, rejouer un storage state) — moins coûteux en jetons que le MCP | officielle, Microsoft |
| `playwright-best-practices` | **écrire** un test Playwright correct (locators, attentes, fixtures, CI) | currents.dev, MIT |
| `e2e-test` | les règles **de ce dépôt** : où poser le fichier, quels comptes, quel tag | propre au projet |

- [ ] **Step 1 : `playwright-cli`, la skill officielle**

```bash
pnpm dlx @playwright/cli@0.1.22 install --skills
```

Expected : `.claude/skills/playwright-cli/SKILL.md` et ses guides de référence. **Lire le
`SKILL.md` en entier avant de committer** (règle du projet pour toute copie externe). Ne pas
installer `@playwright/cli` en dépendance : la skill l'invoque par `npx`/`pnpm dlx`, et knip la
signalerait comme inutilisée.

- [ ] **Step 2 : `playwright-best-practices`, copie complète**

La copie personnelle (`~/.claude/skills/playwright-best-practices/`) est **cassée** : elle ne
contient que `SKILL.md`, alors que celui-ci renvoie à une quarantaine de fichiers (`core/locators.md`,
`core/fixtures-hooks.md`…). On repart de la source :

```bash
git clone --depth 1 https://github.com/currents-dev/playwright-best-practices-skill "$TMP/pbp"
git -C "$TMP/pbp" rev-parse HEAD   # à recopier dans SKILLS.md
rm -rf "$TMP/pbp/.git" "$TMP/pbp/.github"
cp -r "$TMP/pbp" .claude/skills/playwright-best-practices
```

Puis vérifier qu'aucun lien relatif du `SKILL.md` ne pointe dans le vide :

```bash
grep -oE '\]\(([a-z-]+/[a-z0-9-]+\.md)\)' .claude/skills/playwright-best-practices/SKILL.md \
  | sed -E 's/.*\((.*)\)/\1/' | sort -u \
  | while read f; do [ -f ".claude/skills/playwright-best-practices/$f" ] || echo "MANQUE $f"; done
```

Expected : aucune ligne `MANQUE`. Retirer de la copie ce qui ne concerne pas ce projet (Electron,
extensions de navigateur) seulement si le `SKILL.md` ne les référence plus — sinon tout garder.

- [ ] **Step 3 : `e2e-test`, la skill du projet**

`.claude/skills/e2e-test/SKILL.md` :

```markdown
---
name: e2e-test
description: Écrire ou corriger un test Playwright de bout en bout dans ce projet — où poser le fichier, quels comptes de test, quand taguer @anilist, comment lancer. Use when adding an E2E test, a "parcours critique", touching e2e/ or playwright.config.ts, or when asked "teste ce parcours", "ajoute un test Playwright", "le test E2E casse".
---

# Écrire un test E2E

Pour la technique Playwright (locators, attentes, fixtures), la skill `playwright-best-practices`.
Pour regarder un écran avant d'écrire le test, `playwright-cli`. Ici, seulement ce qui est propre au dépôt.

## Où et comment

- Un fichier `e2e/<parcours>.spec.ts` par parcours. Pas de Page Object tant qu'un écran n'est pas
  utilisé par trois fichiers.
- Les chemins viennent de `@/config/routes` — jamais une URL en dur, ici non plus.
- Sélecteurs : `getByRole` + nom accessible, puis `getByPlaceholder` / `getByLabel`. Jamais de classe
  CSS. Un bouton sans nom accessible est un défaut du composant : on le corrige là-bas, on n'ajoute
  pas de `data-testid`.

## Comptes

La connexion est GitHub seul : la session est fabriquée en base par le projet `setup`
(`e2e/support/session.ts`). Deux comptes, et seulement eux :

- `test.use({ storageState: accounts.member.storageState })` — membre approuvé ;
- `test.use({ storageState: accounts.pending.storageState })` — compte en liste d'attente.

Ils sont supprimés en fin de run (cascade). Un test qui **écrit** ne tourne que sur le projet
`desktop` (`test.skip(testInfo.project.name !== "desktop", …)`) et défait ce qu'il a fait.

## AniList

Tout test qui affiche une donnée AniList (fiche, recherche, accueil, calendrier) porte `@anilist`
dans son titre. La CI les écarte : la base y est vierge et le quota (30 req/min) est partagé.
Œuvre de référence : id 21, One Piece. Ce qui ne lit que la base (bibliothèque vide, collection,
listes, réglages, garde d'accès) ne porte pas le tag et tourne en CI.

## Lancer

    pnpm test:e2e                       # tout, en réutilisant le `pnpm dev` ouvert
    pnpm test:e2e --grep-invert @anilist   # ce que lance la CI
    pnpm test:e2e:ui                    # mode interactif
    pnpm exec playwright show-report    # après un échec en CI : télécharger l'artefact d'abord
```

- [ ] **Step 4 : `SKILLS.md`**

Ajouter `e2e-test` au tableau « Propres au projet », et une section datée :

```markdown
Copiées le **11 octobre 2026**, pour les tests de bout en bout.

| Skill | Origine |
| --- | --- |
| `playwright-cli` | Microsoft — `pnpm dlx @playwright/cli@0.1.22 install --skills` |
| `playwright-best-practices` | currents.dev — github.com/currents-dev/playwright-best-practices-skill @ `<sha>` |

`playwright-best-practices` existe aussi en version personnelle, **mais incomplète** (le seul
`SKILL.md`, sans ses références) : la copie du dépôt fait foi. `playwright-cli` se rafraîchit en
relançant la commande à chaque montée de version de `@playwright/test`.
```

- [ ] **Step 5 : le reste de la doc**

- `CLAUDE.md`, bloc Outillage : `pnpm test:e2e   # playwright test (réutilise le pnpm dev ouvert)` ;
  et la phrase des skills : « Pour un test de bout en bout, `e2e-test`. »
- `docs/ARCHITECTURE.md` : `e2e/` à la racine, hors de `src/`, fichiers de CLI comme `prisma/` —
  `process.env` et `pg` y sont permis, `@/config/routes` y reste obligatoire.
- `docs/PRODUCT.md` §7, ligne Tests : « Vitest (unitaire) ; Playwright sur les parcours critiques ».
- `docs/STATE.md` : retirer « Playwright est prévu et toujours pas posé » et l'entrée de « Ensuite,
  peut-être » ; dire ce qui est couvert, et que les tests `@anilist` ne tournent qu'en local.
- `docs/JOURNAL.md` : quelques lignes — la copie personnelle de la skill cassée, le choix du service
  Postgres, ce que la première exécution CI des migrations sur base vide a révélé.

- [ ] **Step 6 : vérifier et committer**

Run : `pnpm lint && pnpm typecheck && pnpm knip && pnpm test && pnpm test:e2e`
Expected : tout vert.

```bash
git add .claude docs CLAUDE.md
git commit -m "docs: skills Playwright et état des tests E2E"
```

Puis lancer l'agent `convention-reviewer` sur le diff de la branche avant la PR.
