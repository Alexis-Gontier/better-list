# Refonte, lot 1 — Entrée et comptes : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ouvrir Better-List à une dizaine de comptes : landing à `/` pour l'anonyme, connexion
GitHub, Discord ou Google avec la pastille « Dernière », approbation et bannissement depuis
`/admin/users`, suppression de son compte.

**Architecture:** Better Auth gagne deux fournisseurs, la liaison de comptes et deux plugins
(`admin`, `lastLoginMethod`). Le proxy réécrit `/` vers une route publique `/welcome` quand il n'y a
pas de cookie de session, sans toucher à la garde du layout `(app)`. L'administration est une
feature `src/features/admin/` (requêtes Prisma, Server Actions minces qui délèguent à
`auth.api.*` pour le rôle et le bannissement), rendue sous `(app)/admin/users` derrière
`requireAdmin()`.

**Tech Stack:** Next 16.3 (App Router, `cacheComponents`), Better Auth 1.7.3, Prisma 7, Zod 4,
next-safe-action v8, shadcn (style `radix-vega`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-01-refonte-sociale-design.md` (§1 et §5.2). Maquettes
validées : `docs/design/better-list.fig`, page « Refonte — Lot 1 · Entrée et comptes ».

## Global Constraints

- Tout en français : interface, commentaires, commits. Commits `type(portée): sujet`.
- Branche `feat/refonte-lot1-entree`, PR vers `main`, **jamais de fusion sans l'accord d'Alexis**.
- Jamais `process.env.X` : `import { env } from "@/config/env"`. Aucune URL en dur : `routes`.
- `"use client"` sur la feuille interactive, jamais sur une `page.tsx` ou un `layout.tsx`.
- Server Actions par `authActionClient` (`@/lib/safe-action`), API v8
  (`.metadata({ actionName }).inputSchema(schema).action(...)`).
- Pas de `loading.tsx` : une `<Suspense>` par zone, squelette fidèle au pixel.
- On ne restyle pas les composants shadcn ; variants existants seulement (D35).
- Un seul bouton d'accent par écran (D33). Les logos de marque gardent leurs couleurs.
- La pastille « Dernière » : badge `default`, à cheval sur le bord supérieur droit du bouton
  (`-top-2.5 right-1.5`), texte « Dernière ».
- Une tâche n'est finie qu'avec `pnpm typecheck && pnpm test && pnpm lint && pnpm knip` vert, et
  l'écran vu au navigateur en 1440 et 390 px.
- Après tout changement de Server Actions : redémarrer `pnpm dev`.
- Après `pnpm dlx shadcn add` : relire `git diff package.json` (paquet parasite `cn` déjà vu deux fois).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `prisma/schema.prisma` + migration `admin_plugin` | champs du plugin `admin` |
| `src/config/env.ts`, `.env.example` | identifiants Discord et Google |
| `src/lib/auth/username.ts` (+ test) | dérivation et normalisation du `username` par fournisseur |
| `src/lib/auth/server.ts` | fournisseurs, liaison, plugins, `deleteUser` |
| `src/lib/auth/roles.ts` (+ test) | `isAdmin(user)` |
| `src/lib/auth/session.ts` | `requireAdmin()` |
| `src/lib/auth/last-login-method.ts` | lecture du cookie de dernière méthode côté serveur |
| `src/features/auth/components/provider-buttons.tsx` | les trois boutons, pastille « Dernière » |
| `src/features/auth/components/provider-logos.tsx` | logos GitHub, Discord, Google |
| `src/features/media/components/cover-wall.tsx` | mur de jaquettes, promu (2 appelants) |
| `src/app/(auth)/login/page.tsx` | connexion, mise en page `login-02` |
| `src/app/(welcome)/welcome/page.tsx` + `_components/` | la landing |
| `src/proxy.ts` (+ test), `src/config/navigation.ts`, `src/config/routes.ts` | réécriture de `/` |
| `next.config.ts` | redirection permanente `/signup` → `/login` |
| `src/app/robots.ts` | `/` seul indexable |
| `src/features/admin/**` | requêtes, actions, schémas, composants de l'administration |
| `src/app/(app)/admin/**` | la route `/admin/users` |
| `src/app/(app)/settings/_components/account-section.tsx`, `delete-account.tsx` | comptes liés, suppression |
| `scripts/set-admin.ts` | poser le premier administrateur |
| `e2e/**` | parcours d'entrée et d'administration |
| `docs/decisions.md`, `docs/conception.md`, `docs/deploiement.md`, `CLAUDE.md` | décisions révisées |

---

### Task 0: Branche

- [ ] **Step 1:** depuis `main` à jour, créer la branche et y reporter la spec et les maquettes.

```bash
git switch main && git pull
git switch -c feat/refonte-lot1-entree
git merge --no-ff docs/refonte-sociale-spec -m "docs: spec et maquettes de la refonte"
```

---

### Task 1: Schéma du plugin `admin`

**Files:**
- Modify: `prisma/schema.prisma` (modèles `User`, `Session`)
- Create: `prisma/migrations/<horodatage>_admin_plugin/migration.sql` (généré)

**Interfaces:**
- Produces: colonnes `user.role` (texte, nullable), `user.banned` (booléen, défaut `false`),
  `user.banReason`, `user.banExpires`, `session.impersonatedBy`.

- [ ] **Step 1: Ajouter les champs à `User`**, sous `status` :

```prisma
  /// Rôle Better Auth (plugin `admin`) : `"admin"` ou `null`. Distinct de `status` : le statut dit
  /// si l'on est entré, le rôle si l'on peut faire entrer les autres (spec refonte §1).
  role       String?
  /// Bannissement d'un membre déjà approuvé. C'est Better Auth qui refuse la connexion.
  banned     Boolean?  @default(false)
  banReason  String?
  /// `null` : définitif.
  banExpires DateTime?
```

- [ ] **Step 2: Ajouter à `Session`**, sous `userAgent` :

```prisma
  /// Exigé par le plugin `admin` ; l'usurpation est désactivée, la colonne reste vide.
  impersonatedBy String?
```

- [ ] **Step 3: Générer et appliquer la migration**

Run: `pnpm db:migrate --name admin_plugin`
Expected: une migration `..._admin_plugin` avec quatre `ALTER TABLE "user" ADD COLUMN` et un sur
`"session"`, appliquée sans perte.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(auth): champs du plugin admin de Better Auth"
```

---

### Task 2: Le `username` dérivé de chaque fournisseur

**Files:**
- Create: `src/lib/auth/username.ts`
- Test: `src/lib/auth/username.test.ts`

**Interfaces:**
- Produces: `normalizeUsername(candidate: string): string` et
  `MAX_USERNAME_LENGTH = 39`. Consommés par `server.ts` (Task 3).

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";

import { MAX_USERNAME_LENGTH, normalizeUsername } from "@/lib/auth/username";

describe("normalizeUsername", () => {
  it("garde un login GitHub tel quel, en minuscules", () => {
    expect(normalizeUsername("Alexis-Gontier")).toBe("alexis-gontier");
  });

  it("remplace ce qu'une URL de profil ne porte pas", () => {
    // Un nom Discord peut contenir des points et des tirets bas.
    expect(normalizeUsername("sora_.kun")).toBe("sora--kun");
  });

  it("prend la partie locale d'une adresse Google", () => {
    expect(normalizeUsername("lea.rousseau@gmail.com".split("@")[0])).toBe(
      "lea-rousseau",
    );
  });

  it("ne laisse pas de tiret au bord", () => {
    expect(normalizeUsername("__léo__")).toBe("l-o");
  });

  it("retombe sur « membre » quand il ne reste rien", () => {
    expect(normalizeUsername("___")).toBe("membre");
  });

  it("coupe à la longueur d'un login GitHub", () => {
    expect(normalizeUsername("a".repeat(60))).toHaveLength(MAX_USERNAME_LENGTH);
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `pnpm test src/lib/auth/username.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Écrire le module**

```ts
/** Longueur maximale d'un `login` GitHub, donc du `username` qu'on en dérive. */
export const MAX_USERNAME_LENGTH = 39;

/**
 * Ramène un nom proposé par un fournisseur à ce qu'une URL `/u/[username]` peut porter.
 *
 * Les trois fournisseurs n'ont pas le même alphabet : GitHub est déjà propre, Discord accepte `.`
 * et `_`, Google ne donne qu'une adresse. On garde `[a-z0-9-]` pour tous.
 */
export function normalizeUsername(candidate: string) {
  return (
    candidate
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_USERNAME_LENGTH) || "membre"
  );
}
```

- [ ] **Step 4: Lancer le test**

Run: `pnpm test src/lib/auth/username.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/username.ts src/lib/auth/username.test.ts
git commit -m "feat(auth): dériver le username de chaque fournisseur"
```

---

### Task 3: Discord, Google, liaison de comptes et plugins

**Files:**
- Modify: `src/config/env.ts`, `.env.example`, `src/lib/auth/server.ts`
- Create: `src/lib/auth/roles.ts`, `src/lib/auth/roles.test.ts`
- Modify: `src/lib/auth/session.ts`

**Interfaces:**
- Consumes: `normalizeUsername`, `MAX_USERNAME_LENGTH` (Task 2).
- Produces:
  - `isAdmin(user: { role?: string | null }): boolean` (`@/lib/auth/roles`) ;
  - `requireAdmin(): Promise<SessionUser>` (`@/lib/auth/session`) ;
  - `auth.api.setRole`, `auth.api.banUser`, `auth.api.unbanUser` disponibles ;
  - `SessionUser` porte désormais `role`, `banned`, `banReason`, `banExpires`.

- [ ] **Step 1: Variables d'environnement.** Dans `src/config/env.ts`, remplacer le commentaire de
  `GITHUB_CLIENT_ID` (« seul fournisseur ») par « Application OAuth GitHub » et ajouter sous
  `GITHUB_CLIENT_SECRET` :

```ts
    /** Application OAuth Discord (spec refonte §1). Rappel : `<APP_URL>/api/auth/callback/discord`. */
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),

    /** Client OAuth Google. Rappel : `<APP_URL>/api/auth/callback/google`. */
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
```

  Dans `.env.example`, sous `GITHUB_CLIENT_SECRET=""` : `DISCORD_CLIENT_ID=""`,
  `DISCORD_CLIENT_SECRET=""`, `GOOGLE_CLIENT_ID=""`, `GOOGLE_CLIENT_SECRET=""`. Créer les deux
  applications OAuth (Discord Developer Portal, Google Cloud Console) et remplir `.env` en local.

- [ ] **Step 2: Test de `isAdmin`**

```ts
import { describe, expect, it } from "vitest";

import { isAdmin } from "@/lib/auth/roles";

describe("isAdmin", () => {
  it("reconnaît le rôle admin", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it("refuse tout le reste, rôle absent compris", () => {
    expect(isAdmin({ role: "user" })).toBe(false);
    expect(isAdmin({ role: null })).toBe(false);
    expect(isAdmin({})).toBe(false);
  });
});
```

Run: `pnpm test src/lib/auth/roles.test.ts` → FAIL (module introuvable).

- [ ] **Step 3: `src/lib/auth/roles.ts`**

```ts
/**
 * Le rôle qui ouvre `/admin/users`. Une seule valeur : à dix comptes, il n'y a pas de modérateur
 * entre le membre et l'administrateur.
 */
export const ADMIN_ROLE = "admin";

export function isAdmin(user: { role?: string | null }) {
  return user.role === ADMIN_ROLE;
}
```

Run: `pnpm test src/lib/auth/roles.test.ts` → PASS.

- [ ] **Step 4: `server.ts`.** Retirer `MAX_USERNAME_LENGTH` local et la normalisation de
  `resolveUsername`, qui devient :

```ts
async function resolveUsername(candidate: string) {
  const base = normalizeUsername(candidate);

  for (let suffix = 0; suffix < 20; suffix++) {
    const username = suffix === 0 ? base : `${base}-${suffix}`;
    const taken = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!taken) return username;
  }

  // Filet de sécurité : on préfère un identifiant laid à un échec d'inscription.
  return `${base}-${Date.now().toString(36)}`.slice(0, MAX_USERNAME_LENGTH);
}
```

  Remplacer le commentaire d'en-tête (« GitHub OAuth uniquement… quatre comptes ») par : « **OAuth
  seulement, trois fournisseurs** (GitHub, Discord, Google ; spec refonte §1). Ni mot de passe ni
  e-mail : pas de vérification, de reset, ni de surface brute-force. » ; garder le paragraphe sur
  l'inscription ouverte et l'accès fermé.

  Ajouter les imports :

```ts
import { admin, lastLoginMethod } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { APIError } from "better-auth/api";

import { ADMIN_ROLE } from "@/lib/auth/roles";
import { MAX_USERNAME_LENGTH, normalizeUsername } from "@/lib/auth/username";
```

  Au-dessus de `export const auth`, les droits sans usurpation :

```ts
/**
 * Les droits du plugin `admin`, **sans l'usurpation**. Elle permettrait de se connecter en tant
 * qu'un autre membre, donc de lire son compte : entre amis, rien ne la justifie (spec refonte §1).
 */
const accessControl = createAccessControl(defaultStatements);
const roles = {
  [ADMIN_ROLE]: accessControl.newRole({
    user: ["list", "get", "set-role", "ban", "delete"],
    session: ["list", "revoke", "delete"],
  }),
  user: accessControl.newRole({ user: [], session: [] }),
};
```

  Dans `socialProviders`, à côté de `github` (garder son `mapProfileToUser`) :

```ts
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      /** `username` est le nom Discord moderne, sans le `#1234` d'autrefois. */
      mapProfileToUser: (profile) => ({ username: profile.username }),
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      /** Google n'a pas de pseudo : la partie locale de l'adresse en tient lieu. */
      mapProfileToUser: (profile) => ({
        username: profile.email.split("@")[0],
      }),
    },
```

  Sous `socialProviders`, la liaison et la suppression :

```ts
  /**
   * **Un compte par personne**, quel que soit le fournisseur : quelqu'un qui revient par Google après
   * être entré par GitHub, avec la même adresse vérifiée, retrouve son compte au lieu d'en créer un
   * second qui repasserait par la liste d'attente. Seuls ces trois fournisseurs vérifient l'adresse.
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "discord", "google"],
    },
  },
```

  Dans `user`, à côté de `additionalFields` :

```ts
    /**
     * Supprimer son compte, depuis `/settings`. Le schéma fait le reste en cascade. Le dernier
     * administrateur ne peut pas partir : personne ne pourrait plus approuver les demandes.
     */
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const self = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (self?.role !== ADMIN_ROLE) return;

        const admins = await prisma.user.count({ where: { role: ADMIN_ROLE } });
        if (admins <= 1) {
          throw new APIError("BAD_REQUEST", {
            message: "Vous êtes le dernier administrateur : nommez-en un autre avant de partir.",
          });
        }
      },
    },
```

  Dans le hook `user.update.before`, retirer aussi `role` et les champs de bannissement de ce qui
  passe par `update-user` (ils ne bougent que par le plugin) :

```ts
        before: async (user) => {
          const {
            username: _username,
            status: _status,
            role: _role,
            banned: _banned,
            banReason: _banReason,
            banExpires: _banExpires,
            ...allowed
          } = user;

          return { data: allowed };
        },
```

  Les plugins (`nextCookies` reste dernier) :

```ts
  plugins: [
    admin({
      ac: accessControl,
      roles,
      adminRoles: [ADMIN_ROLE],
      defaultRole: "user",
      bannedUserMessage: "Votre compte a été suspendu.",
    }),
    /**
     * Retient le dernier fournisseur dans un cookie (`better-auth.last_used_login_method`), lu par
     * `/login` pour la pastille « Dernière ». Rien en base : c'est une aide, pas une donnée.
     */
    lastLoginMethod({ storeInDatabase: false }),
    nextCookies(),
  ],
```

- [ ] **Step 5: `requireAdmin` dans `session.ts`**, sous `requireApprovedUser` :

```ts
/**
 * Exige un **administrateur** approuvé. Posée dans le layout de `(app)/admin`, une fois : le layout
 * `(app)` a déjà vérifié la session et le statut, celle-ci ne vérifie que le rôle.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireApprovedUser();

  if (!isAdmin(user)) forbidden();

  return user;
}
```

  avec `import { forbidden, redirect } from "next/navigation";` et
  `import { isAdmin } from "@/lib/auth/roles";`. Vérifier que `authInterrupts` est actif dans
  `next.config.ts` (`src/app/forbidden.tsx` existe déjà) ; sinon demander à l'agent `next-docs`.

- [ ] **Step 6: Vérifier**

Run: `pnpm typecheck && pnpm test`
Expected: vert. `SessionUser["role"]` existe (type inféré du plugin).

- [ ] **Step 7: Commit**

```bash
git add src/config/env.ts .env.example src/lib/auth
git commit -m "feat(auth): Discord, Google, liaison de comptes, plugins admin et dernière méthode"
```

---

### Task 4: Les boutons de fournisseur et la page `/login`

**Files:**
- Create: `src/features/auth/components/provider-logos.tsx`
- Create: `src/features/auth/components/provider-buttons.tsx`
- Create: `src/lib/auth/last-login-method.ts`
- Modify: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/layout.tsx`
- Delete: `src/app/(auth)/login/_components/github-sign-in-button.tsx`

Les boutons ont deux appelants dès ce lot (`/login` et la landing, Task 6) : ils naissent dans
`features/auth/` (règle de promotion).

**Interfaces:**
- Produces:
  - `type Provider = "github" | "discord" | "google"` et `PROVIDERS: readonly Provider[]` ;
  - `<ProviderButtons callbackUrl={string} lastUsed={Provider | null} />` (client) ;
  - `getLastLoginMethod(): Promise<Provider | null>` (serveur).

- [ ] **Step 1: `last-login-method.ts`**

```ts
import "server-only";

import { cookies } from "next/headers";

import { PROVIDERS, type Provider } from "@/features/auth/components/provider-logos";

/** Le cookie que pose le plugin `lastLoginMethod` (`src/lib/auth/server.ts`). */
const COOKIE = "better-auth.last_used_login_method";

/** Le dernier fournisseur utilisé sur cet appareil, ou `null` : une valeur inconnue ne s'affiche pas. */
export async function getLastLoginMethod(): Promise<Provider | null> {
  const value = (await cookies()).get(COOKIE)?.value;

  return PROVIDERS.find((provider) => provider === value) ?? null;
}
```

- [ ] **Step 2: `provider-logos.tsx`** (sans `"use client"` : du SVG pur). Reprendre le tracé
  GitHub de l'ancien `github-sign-in-button.tsx` (en `currentColor`) ; Discord en `#5865F2` ;
  Google en quatre couleurs. Chaque logo porte `aria-hidden` et `data-icon="inline-start"`.

```tsx
export const PROVIDERS = ["github", "discord", "google"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  github: "GitHub",
  discord: "Discord",
  google: "Google",
};

/**
 * Lucide n'a plus de logos de marque : ils sont en SVG direct. **Ce sont les seules couleurs hors
 * jaquettes de l'écran** (exception assumée à D33) : un logo de marque recoloré ne se reconnaît plus.
 */
export function ProviderLogo({ provider }: { provider: Provider }) {
  const shared = {
    "aria-hidden": true,
    "data-icon": "inline-start",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  if (provider === "github") {
    return (
      <svg {...shared} fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    );
  }

  if (provider === "discord") {
    return (
      <svg {...shared}>
        <path
          d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
          fill="#5865F2"
        />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-5.82-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
```

- [ ] **Step 3: `provider-buttons.tsx`**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  PROVIDER_LABELS,
  PROVIDERS,
  type Provider,
  ProviderLogo,
} from "@/features/auth/components/provider-logos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth/client";

/**
 * Les trois fournisseurs, **tous en contour** : aucun n'est l'action principale, c'est la personne
 * qui sait lequel est le sien. Celui de la dernière fois porte la pastille « Dernière », à cheval
 * sur le bord haut du bouton (maquette lot 1, d'après Neon).
 *
 * L'état de chargement ne revient pas à `false` en cas de succès : la page part chez le fournisseur.
 */
export function ProviderButtons({
  callbackUrl,
  lastUsed,
}: {
  callbackUrl: string;
  lastUsed: Provider | null;
}) {
  const [pending, setPending] = useState<Provider | null>(null);

  async function handleSignIn(provider: Provider) {
    setPending(provider);

    const { error } = await signIn.social({ provider, callbackURL: callbackUrl });

    if (error) {
      toast.error("La connexion a échoué.", {
        description: error.message ?? "Réessayez dans un instant.",
      });
      setPending(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3.5">
      {PROVIDERS.map((provider) => (
        <div className="relative" key={provider}>
          <Button
            className="w-full"
            disabled={pending !== null}
            onClick={() => handleSignIn(provider)}
            size="lg"
            type="button"
            variant="outline"
          >
            {pending === provider ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ProviderLogo provider={provider} />
            )}
            Continuer avec {PROVIDER_LABELS[provider]}
          </Button>
          {lastUsed === provider ? (
            <Badge className="pointer-events-none absolute -top-2.5 right-1.5">
              Dernière
            </Badge>
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `/login`, mise en page `login-02`.** Le mur de jaquettes quitte le layout `(auth)`
  pour cette page seule (la liste d'attente garde la mise en page actuelle). Promouvoir d'abord le
  mur : `git mv "src/app/(auth)/_components/cover-wall.tsx" src/features/media/components/cover-wall.tsx`,
  mettre à jour l'import du layout `(auth)`. Réécrire `login/page.tsx` :

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ProviderButtons } from "@/features/auth/components/provider-buttons";
import { CoverWall } from "@/features/media/components/cover-wall";
import { routes } from "@/config/routes";
import { getLastLoginMethod } from "@/lib/auth/last-login-method";
import { getSession } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/security/safe-redirect";

export const metadata: Metadata = { title: "Connexion" };

/** Bloquante : session et `searchParams` sont propres à la requête (voir l'ancien commentaire). */
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSession()) redirect(routes.home);

  const { callbackUrl } = await searchParams;
  const destination = safeRedirectPath(
    typeof callbackUrl === "string" ? callbackUrl : null,
    routes.home,
  );

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading font-semibold text-2xl tracking-tight">
          Connexion à Better-List
        </h1>
        <p className="text-muted-foreground text-sm">
          Avec le compte que vous utilisez déjà.
        </p>
      </div>
      <ProviderButtons
        callbackUrl={destination}
        lastUsed={await getLastLoginMethod()}
      />
      <p className="text-muted-foreground text-xs leading-relaxed">
        Première connexion ? Votre compte sera créé, puis validé par un membre.
      </p>
    </div>
  );
}
```

  Garder les commentaires de l'ancienne page sur la redirection d'un utilisateur connecté et sur
  `safeRedirectPath` (le pourquoi n'a pas changé). Adapter le layout `(auth)` en deux colonnes à
  `lg` : le formulaire centré dans la moitié gauche, `CoverWall` dans la moitié droite sur fond
  `bg-muted` ; sous `lg`, le mur disparaît. Comme le layout sert aussi `/waitlist`, garder le
  contenu centré dans la colonne gauche pour les deux pages et retirer de `/waitlist` ce qui
  supposait l'ancienne mise en page (le `Badge` reste). Supprimer
  `login/_components/github-sign-in-button.tsx`, et `auth-title.tsx` s'il n'a plus d'appelant
  (`pnpm knip` le dira).

- [ ] **Step 5: Vérifier au navigateur.** `pnpm dev`, ouvrir `/login` déconnecté en 1440 et
  390 px, comparer à la maquette. Se connecter par GitHub, se déconnecter, revenir : la pastille
  « Dernière » est sur GitHub.

- [ ] **Step 6: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test && pnpm lint && pnpm knip`

```bash
git add src/features/auth src/features/media/components/cover-wall.tsx src/lib/auth/last-login-method.ts "src/app/(auth)"
git commit -m "feat(auth): connexion par GitHub, Discord ou Google, pastille « Dernière »"
```

---

### Task 5: La porte d'entrée — proxy, `/welcome`, `/signup`, robots

**Files:**
- Modify: `src/config/routes.ts`, `src/config/navigation.ts`, `src/proxy.ts`, `src/proxy.test.ts`,
  `next.config.ts`, `src/app/robots.ts`
- Delete: `src/app/(auth)/signup/page.tsx`

**Interfaces:**
- Produces: `routes.welcome = "/welcome"` ; `routes.auth.signup` supprimé.

- [ ] **Step 1: Tests du proxy qui échouent.** Dans `src/proxy.test.ts`, retirer
  `routes.auth.signup` de la boucle des routes publiques, y ajouter `routes.welcome`, et ajouter :

```ts
  /**
   * `/` sert deux pages à la même adresse : la landing à qui n'a pas de cookie, l'accueil aux
   * autres (spec refonte §1). Une **réécriture**, pas une redirection : l'adresse reste `/`.
   */
  it("sert la landing à un visiteur sans session sur /", () => {
    const response = proxy(request("/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3000/welcome",
    );
  });

  it("laisse un porteur de cookie atteindre l'accueil", () => {
    const response = proxy(request("/", { signedIn: true }));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
```

Run: `pnpm test src/proxy.test.ts` → FAIL (`routes.welcome` absent, pas de réécriture).

- [ ] **Step 2: Routes.** Dans `routes.ts`, sous `home` :

```ts
  /**
   * La landing, **servie à l'adresse `/`** à qui n'a pas de session : `proxy.ts` y réécrit `/`.
   * Accessible aussi directement ; sa balise `canonical` renvoie à `/`.
   */
  welcome: "/welcome",
```

  Retirer `signup` de `auth`. Dans `navigation.ts`, `publicRoutes` devient
  `[routes.welcome, routes.auth.login, routes.auth.waitlist]`.

- [ ] **Step 3: Le proxy.** Avant le test `if (isAuthenticated || isPublic)` :

```ts
  // `/` : la landing pour qui n'a pas de cookie, l'accueil pour les autres. Une réécriture garde
  // l'adresse ; la garde du layout `(app)` n'est pas contournée, puisque `/welcome` n'en fait pas
  // partie. Un cookie expiré mène toujours à `/login` par cette garde — c'est voulu.
  if (!isAuthenticated && pathname === routes.home) {
    return NextResponse.rewrite(new URL(routes.welcome, request.url));
  }
```

- [ ] **Step 4: `/signup`.** Supprimer `src/app/(auth)/signup/page.tsx` ; dans `next.config.ts`,
  ajouter (ou compléter) :

```ts
  /** En OAuth seul, s'inscrire et se connecter sont le même geste : `/signup` n'est plus qu'un ancien lien. */
  async redirects() {
    return [{ source: "/signup", destination: "/login", permanent: true }];
  },
```

  Remplacer toute autre référence à `routes.auth.signup` (`grep -rn "auth.signup" src e2e`).

- [ ] **Step 5: `robots.ts`.** Garder le commentaire sur les jetons de partage, remplacer la fin :

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // `/$` : la racine seule, qui sert la landing aux robots (ils n'ont pas de cookie). Tout le
      // reste reste fermé, listes partagées comprises (révise D8).
      allow: "/$",
      disallow: "/",
    },
  };
}
```

- [ ] **Step 6: Vérifier et commiter**

Run: `pnpm test src/proxy.test.ts && pnpm typecheck`
Expected: PASS ; la page `/welcome` n'existe pas encore, une visite anonyme de `/` donne un 404
jusqu'à la Task 6 (ne pas déployer entre les deux).

```bash
git add src/config src/proxy.ts src/proxy.test.ts next.config.ts src/app/robots.ts "src/app/(auth)/signup"
git commit -m "feat(entree): / sert la landing aux visiteurs, /signup redirige vers /login"
```

---

### Task 6: La landing `/welcome`

**Files:**
- Create: `src/app/(welcome)/welcome/page.tsx`
- Create: `src/app/(welcome)/welcome/_components/landing-hero.tsx`
- Create: `src/app/(welcome)/welcome/_components/landing-trace.tsx`
- Create: `src/app/(welcome)/welcome/_components/landing-notebook.tsx`
- Create: `src/app/(welcome)/welcome/_components/landing-sign-in.tsx`
- Create: `src/app/(welcome)/welcome/_components/landing-footer.tsx`

**Interfaces:**
- Consumes: `CoverWall` (Task 4), `ProviderButtons`, `getLastLoginMethod` (Task 4).

La maquette est la référence (« Landing — 1440 » et « Landing — 390 ») ; la spec §5.2 en donne
l'ordre. La skill `design-taste-frontend` a fixé la direction « split stage » : ne pas la
réinventer, la reproduire.

- [ ] **Step 1: La page** (serveur, statique sauf le mur et la pastille, chacun dans sa frontière) :

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { LandingFooter } from "./_components/landing-footer";
import { LandingHero } from "./_components/landing-hero";
import { LandingNotebook } from "./_components/landing-notebook";
import { LandingSignIn } from "./_components/landing-sign-in";
import { LandingTrace } from "./_components/landing-trace";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: { absolute: "Better-List — le carnet privé de vos animes et mangas" },
  description:
    "Le carnet privé où une dizaine d'amis suivent leurs animes, mangas et webtoons, épisode par épisode.",
  alternates: { canonical: routes.home },
};

/**
 * La landing (spec refonte §5.2) : servie à `/` par `proxy.ts` à qui n'a pas de session.
 *
 * **Aucune donnée de membre** : les fragments d'interface sont écrits en dur, avec des titres réels.
 * Seul le mur de jaquettes lit AniList, à la requête (D52) et dans sa propre frontière.
 */
export default function WelcomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LandingHero />
      <LandingTrace />
      <LandingNotebook />
      <Suspense fallback={null}>
        <LandingSignIn />
      </Suspense>
      <LandingFooter />
    </div>
  );
}
```

  Vérifier l'ordre d'import attendu par Biome (`pnpm lint` le corrige) : alias `@/` d'abord.

- [ ] **Step 2: `landing-hero.tsx`** (serveur). Grille `lg:grid-cols-[47%_1fr]`. À gauche, un
  cadre `sticky top-5 h-[calc(100svh-2.5rem)]` arrondi (`rounded-lg`), fond `bg-card`, qui contient
  `<Suspense fallback={null}><CoverWall /></Suspense>`. À droite : la navigation (ancres `#suivi`,
  `#journal`, `#listes`, `#etagere` en `text-sm`, puis `Button variant="outline" size="sm" asChild`
  vers `routes.auth.login`), la phrase en `text-2xl` (`max-w-[26ch]`), puis le seul bouton
  d'accent `Button size="lg" asChild` → `routes.auth.login` « Se connecter », suivi de « GitHub,
  Discord ou Google » en `text-muted-foreground`. En bas, le `h1` « better-list » en minuscules,
  `font-heading font-medium tracking-[-0.04em] text-[clamp(56px,12vw,184px)] leading-none`, aligné
  à droite et qui déborde sur le mur (`lg:-ml-[10vw] relative z-10`). Sous `lg` : le mur en haut sur
  58 svh, le nom en dessous, puis la phrase et le bouton en pleine largeur ; la navigation se réduit
  au bouton « Se connecter » en contour.

- [ ] **Step 3: `landing-trace.tsx`** « Un épisode, une trace » : deux champs côte à côte à `lg`
  (`grid-cols-2`, hauteur `min-h-[90svh]`), `bg-background` à gauche et `bg-card` à droite. À gauche,
  le geste en `text-xl` : « Ce soir, 22 h 40 », « Les Carnets de l'apothicaire », « ép. 13 → 14 » et
  « Un clic sur « +1 », rien d'autre à remplir. ». À droite, le fragment de journal : un calendrier
  d'activité de 20 semaines × 7 jours en cases `size-3 rounded-[2px]`, teintes `bg-muted` et
  `bg-activity-1…4` (motif fixe écrit en dur), la dernière case en `bg-primary`, puis deux entrées
  datées (jaquette 28 × 42 en `next/image` depuis une URL AniList fixe ou un fond `bg-muted`). Le
  titre coupé en deux : « Un épisode » en bas à gauche, « une trace » en bas à droite,
  `text-[clamp(40px,5vw,64px)] font-heading font-bold`. Sous `lg`, les champs s'empilent.

- [ ] **Step 4: `landing-notebook.tsx`** « Le carnet complet » : fond `bg-secondary`, le titre
  `sticky top-8` à gauche (`text-[clamp(56px,6.6vw,88px)]`), quatre blocs à droite séparés de
  `gap-30`. Chaque bloc : un titre `text-[28px] font-heading font-bold` (`id` = l'ancre du hero) et
  une paire visuel + liste qui alterne de côté. Les visuels :
  1. **Le suivi** : fragment « En cours », trois lignes (jaquette, titre, « Ép. 14 · 2 de retard »,
     « Ép. 3 · sort jeudi », « Ch. 212 · à jour ») avec la pastille `bg-status-current`.
  2. **L'étagère** : une jaquette et la grille des tomes 1 à 14, les tomes 7 et 11 « manquants »
     (`bg-background text-muted-foreground`), les autres `bg-secondary`.
  3. **Les listes** : une mosaïque 2 × 2 de jaquettes.
  4. **Entre vous** : cinq avatars superposés, « 9 membres », et trois réglages avec un `Switch`
     désactivé (`disabled`, purement illustratif).
  Les listes : les lignes de la maquette, mot pour mot.

- [ ] **Step 5: `landing-sign-in.tsx`** « Entrez dans le cercle » (serveur, `async`) : à gauche en
  bas, le titre `text-[clamp(56px,7vw,88px)]` sur deux lignes et « Une connexion suffit. Votre
  compte attend ensuite qu'un membre le valide. ». À droite, une `Card` de 440 px avec
  `CardHeader` (« Se connecter à Better-List », « Choisissez le compte que vous utilisez déjà. »),
  `CardContent` avec `<ProviderButtons callbackUrl={routes.home} lastUsed={await getLastLoginMethod()} />`,
  et `CardFooter` (« Un premier passage crée votre compte. Il attend qu'un membre le valide. »).
  Ce composant lit un cookie : il est dans la `<Suspense>` de la page pour que le reste reste statique.

- [ ] **Step 6: `landing-footer.tsx`** : une ligne en grille `grid-cols-[1fr_auto_1fr]` : « Un
  carnet privé d'animes et de mangas » ; au centre « Se connecter » et « Données et jaquettes :
  AniList » (lien `site.attribution.url`) ; à droite « 2026 ». Sous `sm`, trois lignes.

- [ ] **Step 7: Vérifier au navigateur.** Déconnecté, ouvrir `/` en 1440 et 390 px : c'est la
  landing, l'adresse reste `/`. Connecté, `/` est l'accueil. Comparer chaque section à la maquette.
  Couper le réseau vers AniList (ou `ANILIST` en panne simulée) : la page tient, le mur est vide.

- [ ] **Step 8: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test && pnpm lint && pnpm knip`

```bash
git add "src/app/(welcome)"
git commit -m "feat(entree): la landing, servie à / aux visiteurs"
```

---

### Task 7: Les requêtes et actions de l'administration

**Files:**
- Create: `src/features/admin/schemas/admin.schema.ts`
- Create: `src/features/admin/server/admin.queries.ts`
- Create: `src/features/admin/server/admin.queries.test.ts`
- Create: `src/features/admin/server/admin.actions.ts`
- Create: `src/features/admin/lib/ban-duration.ts`, `src/features/admin/lib/ban-duration.test.ts`
- Modify: `src/lib/safe-action.ts`

**Interfaces:**
- Consumes: `isAdmin`, `requireAdmin` (Task 3), `auth.api.setRole/banUser/unbanUser`.
- Produces:
  - `adminActionClient` (`@/lib/safe-action`) : comme `authActionClient`, et refuse un non-admin ;
  - `type AdminMember = { id, name, username, image, createdAt, role, banned, banReason, banExpires, providers: string[] }` ;
  - `getAdminOverview(): Promise<{ pending: AdminMember[]; members: AdminMember[]; banned: AdminMember[] }>` ;
  - actions `setUsersStatus({ userIds: string[], status: "APPROVED" | "REJECTED" | "PENDING" })`,
    `banMember({ userId, reason?, duration: "7d" | "30d" | "forever" })`, `unbanMember({ userId })`,
    `setMemberRole({ userId, role: "admin" | "user" })` ;
  - `BAN_DURATIONS` et `banExpiresIn(duration): number | undefined` (secondes).

- [ ] **Step 1: Test de la durée de bannissement**

```ts
import { describe, expect, it } from "vitest";

import { banExpiresIn } from "@/features/admin/lib/ban-duration";

describe("banExpiresIn", () => {
  it("compte les jours en secondes, ce qu'attend Better Auth", () => {
    expect(banExpiresIn("7d")).toBe(7 * 24 * 60 * 60);
    expect(banExpiresIn("30d")).toBe(30 * 24 * 60 * 60);
  });

  it("ne pose pas d'échéance à un bannissement définitif", () => {
    expect(banExpiresIn("forever")).toBeUndefined();
  });
});
```

Run: `pnpm test src/features/admin/lib/ban-duration.test.ts` → FAIL.

- [ ] **Step 2: `ban-duration.ts`**

```ts
export const BAN_DURATIONS = ["7d", "30d", "forever"] as const;
export type BanDuration = (typeof BAN_DURATIONS)[number];

export const BAN_DURATION_LABELS: Record<BanDuration, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  forever: "Définitif",
};

const DAY = 24 * 60 * 60;

/** `banExpiresIn` du plugin `admin`, en secondes ; `undefined` pour un bannissement sans fin. */
export function banExpiresIn(duration: BanDuration) {
  if (duration === "forever") return undefined;
  return (duration === "7d" ? 7 : 30) * DAY;
}
```

Run: PASS.

- [ ] **Step 3: Schémas** `admin.schema.ts` :

```ts
import * as z from "zod";

import { BAN_DURATIONS } from "@/features/admin/lib/ban-duration";

export const setUsersStatusSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
});

export const banMemberSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(200).optional(),
  duration: z.enum(BAN_DURATIONS),
});

export const memberIdSchema = z.object({ userId: z.string().min(1) });

export const setMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user"]),
});
```

- [ ] **Step 4: `adminActionClient`** dans `src/lib/safe-action.ts`, sous `authActionClient` :

```ts
/**
 * Les actions de `/admin/users`. La page est déjà gardée par `requireAdmin()`, mais une action est
 * un point d'entrée HTTP à part entière : elle se garde elle-même.
 */
export const adminActionClient = authActionClient.use(async ({ next, ctx }) => {
  if (!isAdmin(ctx.user)) {
    throw new Error("Réservé aux administrateurs.");
  }

  return next({ ctx });
});
```

  (`import { isAdmin } from "@/lib/auth/roles";`)

- [ ] **Step 5: Test de la requête** (`admin.queries.test.ts`, Prisma doublé comme dans
  `lists.queries.test.ts`) :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindMany } = vi.hoisted(() => ({ userFindMany: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({ prisma: { user: { findMany: userFindMany } } }));
vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin-1", role: "admin" })),
}));

import { getAdminOverview } from "@/features/admin/server/admin.queries";

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    username: id,
    image: null,
    createdAt: new Date("2026-10-01"),
    status: "APPROVED",
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    accounts: [{ providerId: "github" }],
    ...overrides,
  };
}

describe("getAdminOverview", () => {
  beforeEach(() => userFindMany.mockReset());

  it("range chaque compte dans son onglet", async () => {
    userFindMany.mockResolvedValue([
      row("attente", { status: "PENDING" }),
      row("membre"),
      row("banni", { banned: true }),
      row("refuse", { status: "REJECTED" }),
    ]);

    const { pending, members, banned } = await getAdminOverview();

    expect(pending.map((u) => u.id)).toEqual(["attente"]);
    expect(members.map((u) => u.id)).toEqual(["membre"]);
    expect(banned.map((u) => u.id)).toEqual(["banni"]);
  });

  it("donne les fournisseurs liés de chaque compte", async () => {
    userFindMany.mockResolvedValue([
      row("multi", { accounts: [{ providerId: "github" }, { providerId: "discord" }] }),
    ]);

    const { members } = await getAdminOverview();

    expect(members[0].providers).toEqual(["github", "discord"]);
  });
});
```

Run: FAIL (module introuvable).

- [ ] **Step 6: `admin.queries.ts`**

```ts
import "server-only";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";

export type AdminMember = Awaited<ReturnType<typeof getAdminOverview>>["members"][number];

/**
 * Les trois onglets de `/admin/users` en une lecture : à dix comptes, trier en mémoire coûte moins
 * que trois requêtes. Les refusés n'ont pas d'onglet : ils ne reviennent que s'ils se reconnectent.
 */
export async function getAdminOverview() {
  await requireAdmin();

  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      createdAt: true,
      status: true,
      role: true,
      banned: true,
      banReason: true,
      banExpires: true,
      accounts: { select: { providerId: true } },
    },
  });

  const users = rows.map(({ accounts, ...user }) => ({
    ...user,
    providers: accounts.map((account) => account.providerId),
  }));

  return {
    pending: users.filter((u) => u.status === "PENDING"),
    members: users.filter((u) => u.status === "APPROVED" && !u.banned),
    banned: users.filter((u) => u.banned),
  };
}
```

Run: `pnpm test src/features/admin` → PASS.

- [ ] **Step 7: `admin.actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { routes } from "@/config/routes";
import { banExpiresIn } from "@/features/admin/lib/ban-duration";
import {
  banMemberSchema,
  memberIdSchema,
  setMemberRoleSchema,
  setUsersStatusSchema,
} from "@/features/admin/schemas/admin.schema";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { adminActionClient } from "@/lib/safe-action";

/**
 * Approuver, refuser, et **annuler** (retour à `PENDING`, le bouton du toast). Le statut n'est pas
 * un champ du plugin `admin` : il s'écrit directement, et jamais sur son propre compte.
 */
export const setUsersStatus = adminActionClient
  .metadata({ actionName: "setUsersStatus" })
  .inputSchema(setUsersStatusSchema)
  .action(async ({ parsedInput: { userIds, status }, ctx }) => {
    await prisma.user.updateMany({
      where: { id: { in: userIds.filter((id) => id !== ctx.user.id) } },
      data: { status },
    });
    revalidatePath(routes.admin.users);
  });

/** Bannir coupe aussi les sessions : c'est Better Auth qui s'en charge. */
export const banMember = adminActionClient
  .metadata({ actionName: "banMember" })
  .inputSchema(banMemberSchema)
  .action(async ({ parsedInput: { userId, reason, duration }, ctx }) => {
    if (userId === ctx.user.id) throw new Error("On ne se bannit pas soi-même.");

    await auth.api.banUser({
      headers: await headers(),
      body: { userId, banReason: reason || undefined, banExpiresIn: banExpiresIn(duration) },
    });
    revalidatePath(routes.admin.users);
  });

export const unbanMember = adminActionClient
  .metadata({ actionName: "unbanMember" })
  .inputSchema(memberIdSchema)
  .action(async ({ parsedInput: { userId } }) => {
    await auth.api.unbanUser({ headers: await headers(), body: { userId } });
    revalidatePath(routes.admin.users);
  });

export const setMemberRole = adminActionClient
  .metadata({ actionName: "setMemberRole" })
  .inputSchema(setMemberRoleSchema)
  .action(async ({ parsedInput: { userId, role }, ctx }) => {
    if (userId === ctx.user.id) throw new Error("On ne change pas son propre rôle.");

    await auth.api.setRole({ headers: await headers(), body: { userId, role } });
    revalidatePath(routes.admin.users);
  });
```

  Ajouter à `routes.ts` : `admin: { users: "/admin/users" },`.

- [ ] **Step 8: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test && pnpm lint`

```bash
git add src/features/admin src/lib/safe-action.ts src/config/routes.ts
git commit -m "feat(admin): approuver, refuser, bannir et nommer depuis l'application"
```

---

### Task 8: L'écran `/admin/users`

**Files:**
- Run: `pnpm dlx shadcn@latest add table` puis `git diff package.json`
- Create: `src/app/(app)/admin/layout.tsx`
- Create: `src/app/(app)/admin/users/page.tsx`
- Create: `src/features/admin/components/admin-tabs.tsx`
- Create: `src/features/admin/components/pending-table.tsx` (client)
- Create: `src/features/admin/components/members-table.tsx` (client)
- Create: `src/features/admin/components/ban-dialog.tsx` (client)
- Create: `src/features/admin/components/provider-icons.tsx`
- Modify: `src/components/layout/user-menu.tsx`

Ces composants sont dans `features/admin/components/` parce qu'ils parlent le métier de
l'administration ; s'ils n'ont qu'un appelant, le `convention-reviewer` peut demander de les
redescendre dans `(app)/admin/users/_components/` — le faire si c'est le cas.

**Interfaces:**
- Consumes: `getAdminOverview`, `AdminMember`, les quatre actions, `BAN_DURATIONS`,
  `BAN_DURATION_LABELS` (Task 7), `ProviderLogo` (Task 4).

- [ ] **Step 1: Le layout du segment**

```tsx
import { requireAdmin } from "@/lib/auth/session";

/** Seconde garde, par-dessus celle de `(app)` : le rôle. Une fois, ici (spec refonte §1). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return children;
}
```

  et `export const instant = false;` (dépend de l'identité).

- [ ] **Step 2: La page.** Le titre « Membres », la description « Qui entre dans le cercle, et qui en
  sort. Réservé aux administrateurs. » (`PageHeading`), puis une `<Suspense>` dont le squelette
  reprend les onglets et quatre lignes de 60 px. L'onglet vit dans l'URL (`?onglet=attente|membres|bannis`,
  défaut `attente`) ; la page passe la promesse `searchParams` à un composant serveur qui `await`
  `getAdminOverview()` et rend `AdminTabs` (des `Link` stylés comme `Tabs` `default`, chacun avec un
  `Badge variant="secondary"` du compte), puis la table de l'onglet. États vides avec `Empty` :
  « Aucune demande en attente », « Aucun membre banni ».

- [ ] **Step 3: `pending-table.tsx`.** `Table` avec colonnes : case à cocher (`Checkbox`), Demandeur
  (`UserAvatar` + nom + `@username`), Connexion via (logo + nom du premier fournisseur), Demandé
  (`formatDistanceToNow` en français via `config/locale.ts` ; réutiliser le formateur relatif du
  projet s'il existe — `grep -rn "RelativeTimeFormat" src`), et à droite `Button variant="ghost" size="sm"`
  « Refuser » et `Button variant="outline" size="sm"` « Approuver ». Au-dessus, quand au moins une
  case est cochée, une barre `bg-card rounded-lg` « N demande(s) sélectionnée(s) » avec « Refuser »
  (ghost) et « Approuver la sélection » (default, le seul accent de l'écran). Chaque action passe
  par `useAction(setUsersStatus)` ; au succès, `toast("Sora est maintenant membre.", { action: { label: "Annuler", onClick: () => execute({ userIds, status: "PENDING" }) } })`.
  Sous `md`, la table devient une pile de `Card` (nom, logo, « Demandé il y a 3 jours », boutons).

- [ ] **Step 4: `members-table.tsx`.** Colonnes : Membre, Connexion via (un logo par fournisseur
  lié, `size-4`), Rôle (`Badge variant="secondary"` « Admin » ou « Membre » en `text-muted-foreground`),
  Membre depuis (mois et année), et un `DropdownMenu` déclenché par un `Button variant="ghost" size="icon-sm"`
  (`MoreHorizontalIcon`, `aria-label="Actions pour Sora"`) : « Voir le profil » (`routes.profile`),
  « Nommer administrateur » ou « Retirer le rôle d'administrateur », séparateur, « Bannir… »
  (`variant="destructive"`). Aucune action sur sa propre ligne (« vous »). L'onglet Bannis réutilise
  la table avec la colonne « Banni » (« le 28 oct. · « motif » · jusqu'au 4 nov. » ou « définitif »)
  et l'action « Réintégrer ».

- [ ] **Step 5: `ban-dialog.tsx`.** `AlertDialog` : titre « Bannir Sora ? », description « Ses
  sessions sont coupées et il ne peut plus se connecter. Ses listes disparaissent de la communauté ;
  rien n'est supprimé. », un `ToggleGroup type="single"` sur `BAN_DURATIONS` (défaut `forever`),
  un `Textarea` « Motif » (`placeholder="Visible des seuls administrateurs"`), `AlertDialogCancel`
  « Annuler » et `AlertDialogAction` « Bannir » en `variant="destructive"` qui appelle `banMember`.

- [ ] **Step 6: Le menu du compte.** `Header` reçoit déjà `user` : passer `isAdmin(user)` à
  `UserMenu` et y ajouter, au-dessus de « Paramètres », un `DropdownMenuItem asChild` vers
  `routes.admin.users` « Administration », pour les administrateurs seulement.

- [ ] **Step 7: Le premier administrateur.** `scripts/set-admin.ts` :

```ts
/**
 * Pose le rôle d'administrateur sur un compte, par son `username`. À lancer une fois, à la main :
 * `pnpm tsx scripts/set-admin.ts alexis-gontier`. Les suivants se nomment depuis `/admin/users`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";

config({ quiet: true });

const username = process.argv[2];
if (!username) throw new Error("Usage : pnpm tsx scripts/set-admin.ts <username>");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const user = await prisma.user.update({
  where: { username },
  data: { role: "admin", status: "APPROVED" },
  select: { username: true },
});
console.log(`@${user.username} est administrateur.`);
await prisma.$disconnect();
```

  Vérifier l'import du client et de l'adaptateur contre `scripts/legacy-import.ts` et
  `src/lib/db/prisma.ts`, et l'ajouter aux exceptions `process.env` du hook si celui-ci le refuse
  (le hook tient la liste). Lancer le script sur la base de développement pour son propre compte.

- [ ] **Step 8: Vérifier au navigateur.** Avec un compte admin : `/admin/users` en 1440 et 390 px,
  les trois onglets, approuver une demande (toast et « Annuler »), bannir 7 jours, réintégrer,
  nommer puis retirer un administrateur. Avec un compte membre : `/admin/users` rend la page
  `forbidden`, et le menu n'a pas « Administration ».

- [ ] **Step 9: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test && pnpm lint && pnpm knip`

```bash
git add "src/app/(app)/admin" src/features/admin src/components/ui/table.tsx src/components/layout scripts/set-admin.ts package.json pnpm-lock.yaml
git commit -m "feat(admin): l'écran /admin/users"
```

---

### Task 9: Les paramètres — comptes liés et suppression

**Files:**
- Modify: `src/app/(app)/settings/_components/account-section.tsx`, `src/app/(app)/settings/page.tsx`
- Create: `src/app/(app)/settings/_components/delete-account.tsx` (client)

- [ ] **Step 1: Comptes liés.** Créer `src/app/(app)/settings/_lib/linked-providers.ts`
  (`import "server-only"`, un seul appelant donc colocalisé) :

```ts
import "server-only";

import { PROVIDERS, type Provider } from "@/features/auth/components/provider-logos";
import { prisma } from "@/lib/db/prisma";

/** Les fournisseurs par lesquels ce compte peut entrer, dans l'ordre des boutons de `/login`. */
export async function getLinkedProviders(userId: string): Promise<Provider[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { providerId: true },
  });
  const linked = new Set(accounts.map((account) => account.providerId));

  return PROVIDERS.filter((provider) => linked.has(provider));
}
```

  Dans `AccountSection`, l'appeler avec `session.user.id`. Remplacer « Connecté avec GitHub » par une ligne « Comptes liés : » suivie des logos et
  noms (« GitHub et Discord »), et la description par « Ce que vos fournisseurs nous disent de vous.
  Rien ne s'édite ici. ». Le `Badge` « Membre » devient « Admin » pour un administrateur.

- [ ] **Step 2: `delete-account.tsx`.** Une `SettingsSection` « Supprimer mon compte » (« Votre
  suivi, votre journal, vos listes, votre collection et vos favoris partent avec lui. On ne peut pas
  revenir en arrière. ») avec un `Button variant="destructive"` qui ouvre un `AlertDialog` :
  « Supprimer votre compte ? », un `Input` « Recopiez « alexis » pour confirmer » (le bouton reste
  désactivé tant que la saisie diffère du `username`, comme la suppression de liste, D40), puis
  `authClient.deleteUser({ callbackURL: routes.home })`. En cas d'erreur (dernier administrateur),
  `toast.error(error.message)`. Au succès, `window.location.assign(routes.home)` : le cookie est
  effacé, `/` sert la landing.

- [ ] **Step 3:** ajouter la section en dernier dans `settings/page.tsx`, précédée d'un
  `Separator`, et mettre à jour la description de la page (« Rien ici n'est partagé avec les autres
  membres. » reste vraie au lot 1).

- [ ] **Step 4: Vérifier au navigateur.** Créer un compte de test, le supprimer : retour sur la
  landing, plus de ligne en base. Avec le seul administrateur : le toast d'erreur s'affiche.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/settings"
git commit -m "feat(settings): comptes liés et suppression de son compte"
```

---

### Task 10: Les parcours E2E

**Files:**
- Modify: `e2e/support/accounts.ts`, `e2e/support/session.ts`
- Create: `e2e/entree.spec.ts`
- Modify: `e2e/access.spec.ts`

Lire la skill `e2e-test` avant d'écrire.

- [ ] **Step 1: Un compte administrateur.** Dans `accounts.ts`, ajouter
  `admin: { id: "e2e-admin", username: "e2e-admin", email: "e2e-admin@example.invalid", status: "APPROVED", role: "admin", storageState: "e2e/.auth/admin.json" }`
  et `role: null` aux deux autres ; dans `createSession`, insérer et mettre à jour `role` comme
  `status`.

- [ ] **Step 2: `entree.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.describe("visiteur sans compte", () => {
  test("voit la landing à la racine, sans changer d'adresse", async ({ page }) => {
    await page.goto(routes.home);
    await expect(page).toHaveURL(routes.home);
    await expect(page.getByRole("heading", { level: 1, name: "better-list" })).toBeVisible();
  });

  test("trouve les trois fournisseurs sur /login", async ({ page }) => {
    await page.goto(routes.auth.login);
    for (const name of ["GitHub", "Discord", "Google"]) {
      await expect(page.getByRole("button", { name: `Continuer avec ${name}` })).toBeVisible();
    }
  });

  test("est renvoyé de /signup vers /login", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(routes.auth.login);
  });
});

test.describe("membre", () => {
  test.use({ storageState: accounts.member.storageState });

  test("n'entre pas dans l'administration", async ({ page }) => {
    await page.goto(routes.admin.users);
    await expect(page.getByRole("heading", { level: 1, name: "Membres" })).toHaveCount(0);
  });
});

test.describe("administrateur", () => {
  test.use({ storageState: accounts.admin.storageState });

  test("voit la demande en attente et peut l'approuver", async ({ page }) => {
    await page.goto(routes.admin.users);
    const row = page.getByRole("row", { name: /e2e-pending/ });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Approuver" }).click();
    await expect(page.getByText("est maintenant membre")).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("row", { name: /e2e-pending/ })).toBeVisible();
  });
});
```

  Le dernier test remet `e2e-pending` en attente : il ne casse pas `access.spec.ts`. Si les specs
  tournent en parallèle sur la même base, le marquer `test.describe.configure({ mode: "serial" })`
  ou le déplacer après `access.spec.ts` selon ce que dit la skill `e2e-test`.

- [ ] **Step 3: Lancer**

Run: `pnpm test:e2e e2e/entree.spec.ts e2e/access.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test(e2e): landing, connexion et administration"
```

---

### Task 11: Documentation et décisions

**Files:**
- Modify: `docs/decisions.md`, `docs/conception.md`, `docs/deploiement.md`, `CLAUDE.md`,
  `docs/design/README.md`

- [ ] **Step 1: `decisions.md`.** Ajouter, à partir de **D55** :
  - **D55** — Révise D1 : une dizaine de comptes ; le social se limite aux likes, aux copies et aux
    notifications (lots 3 à 5). Rien n'est public hormis la landing et le lien de partage.
  - **D56** — Révise D23 : GitHub, Discord et Google, liaison des comptes par adresse vérifiée,
    pastille « Dernière » (plugin `lastLoginMethod`, cookie seul).
  - **D57** — Révise D24 : approbation, refus, bannissement (7 jours, 30 jours, définitif) et rôle
    depuis `/admin/users` (plugin `admin`, usurpation désactivée). `status` reste pour la liste
    d'attente. Premier administrateur par `scripts/set-admin.ts`.
  - **D58** — Révise D8 : `/` sert la landing à qui n'a pas de cookie (réécriture du proxy) et elle
    seule est indexable ; `/signup` redirige vers `/login`.
  - **D59** — Révise D54 : la maquette d'un écran nouveau ou modifié précède le code et est validée
    par Alexis ; elle se réaligne après livraison. `refonte.fig` prend le relais de `better-list.fig`,
    qui a atteint la limite de nœuds.
  - **D60** — Suppression de son compte depuis `/settings`, sauf pour le dernier administrateur.
  Ajouter « *(Révisée par D5x.)* » à la fin de D1, D8, D23, D24 et D54.

- [ ] **Step 2: `conception.md`.** §2 (une dizaine de comptes, trois fournisseurs), §5 (routes
  `/welcome`, `/admin/users`, `/signup` retirée, `/login` à trois fournisseurs, `/settings` avec la
  suppression), §7.1 (approbation dans l'app, bannissement, rôle). §6 : retirer ce qui est livré.

- [ ] **Step 3: `deploiement.md`.** Les quatre variables Discord et Google, les URL de rappel
  (`/api/auth/callback/discord` et `/google`), et la commande `pnpm tsx scripts/set-admin.ts`
  à lancer une fois en production après la migration.

- [ ] **Step 4: `CLAUDE.md`.** Première phrase : « **Cercle privé d'une dizaine de comptes**,
  connexion GitHub, Discord ou Google. » ; `pnpm db:studio` n'est plus le moyen d'approuver un
  compte (« `/admin/users` »).

- [ ] **Step 5: `docs/design/README.md`.** Mentionner `refonte.fig`, la page par lot, et D59.

- [ ] **Step 6: Commit**

```bash
git add docs CLAUDE.md
git commit -m "docs: décisions et conception du lot 1 de la refonte"
```

---

### Task 12: Revue et PR

- [ ] **Step 1:** `pnpm typecheck && pnpm test && pnpm lint && pnpm knip && pnpm test:e2e`, tout vert.
- [ ] **Step 2:** lancer l'agent `convention-reviewer` sur le diff ; corriger.
- [ ] **Step 3:** tour visuel final en 1440 et 390 px : `/` (anonyme et connecté), `/login`,
  `/waitlist`, `/admin/users` (trois onglets, fenêtre de bannissement), `/settings`.
- [ ] **Step 4:** pousser et ouvrir la PR « Refonte, lot 1 : entrée et comptes » vers `main`, avec
  la liste des variables d'environnement à créer sur Vercel avant la fusion. **S'arrêter là** : la
  fusion déploie la production, elle attend l'accord d'Alexis.
