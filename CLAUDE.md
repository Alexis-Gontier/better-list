<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Le produit

Better-List : catalogue d'œuvres (anime, manga, webtoon, light novel) adossé à l'API AniList,
avec suivi de visionnage, journal daté, collection physique et listes réarrangeables. **Cercle
privé d'environ quatre comptes** — pas de découverte sociale, pas de modération, pas d'ouverture
publique.

Le périmètre, le modèle de domaine et la roadmap sont dans
[docs/PRODUCT.md](docs/PRODUCT.md) — le lire avant de proposer une fonctionnalité. Trois
décisions y sont structurantes :

- Les données AniList sont **recopiées en base** (table `Media`, miroir local) : le quota AniList
  est de 30 requêtes/minute pour une IP serveur partagée par tous les visiteurs.
- Le suivi sépare l'**état** (`Entry`, écrasé) de la **mémoire** (`EntryEvent`, append-only).
- Une liste sépare la **collection** (`List` / `ListItem`) de son **arrangement** (`ListView` :
  classement, tier list, grille).
- **Posséder ≠ avoir lu** : la collection physique est un axe indépendant du suivi, à la
  granularité du tome (`Edition` partagée, `OwnedVolume` personnelle).

**Où on en est** : [docs/JOURNAL.md](docs/JOURNAL.md) — état d'avancement, prochain pas et dettes
connues. **À lire avant de proposer quoi faire ensuite, et à compléter en fin de séance** : une
entrée datée en haut du fichier, disant ce qui a été fait, ce qui a été tranché en chemin et ce
qui reste ouvert. Quelques lignes suffisent. Ce qui relève du produit va dans PRODUCT.md, ce qui
relève des conventions dans ARCHITECTURE.md — le journal renvoie vers eux, il ne les recopie pas.

# Structure du projet

La convention complète est dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — la lire avant de
créer un fichier. Les règles non négociables :

- `src/app/` ne contient **que** du routing : conventions Next (`page`, `layout`, `route`, …) et
  dossiers privés `_components` / `_lib` colocalisés. Jamais de logique métier réutilisable.
- Le code métier vit dans `src/features/<domaine>/` (`components/`, `server/`, `hooks/`,
  `schemas/`, `lib/`, `types.ts`).
- Un composant démarre dans le `_components/` de sa route ; il est promu dans `features/` dès
  qu'une deuxième route en a besoin. On ne crée pas un dossier `features/` par anticipation.
- Quatre maisons distinctes pour un composant : `components/ui/` (primitives shadcn),
  `components/layout/` (chrome de l'app), `components/shared/` (composites sans notion de
  métier), `features/<domaine>/components/` (dès que ça connaît une entité métier).
- Aucune URL en dur : tout chemin passe par `src/config/routes.ts`.
- Server-first : `"use client"` est une exception posée sur la feuille interactive, jamais sur la
  page parente. Passer les Server Components en `children` plutôt que convertir le sous-arbre.
- `src/features/*/server/` est server-only : `import "server-only";` pour les lectures,
  `"use server"` pour les actions. Jamais d'export server et client depuis le même fichier.
- Fichiers et dossiers en `kebab-case`. Pas de barrel `index.ts` dans `features/`.
- Un seul alias d'import : `@/*` → `src/*`.
- Validation avec **Zod**. Il n'y a pas de `src/types/` : les types se dérivent avec `z.infer`,
  jamais déclarés en double à côté du schéma.
- Toute Server Action passe par `actionClient` (`@/lib/safe-action`, next-safe-action v8 —
  `.metadata()` puis `.inputSchema()`, jamais `.schema()` qui est l'API v7).
- Jamais de `process.env.X` : `import { env } from "@/config/env"` (t3-env, validé au build).
  Seule exception : `prisma.config.ts`, qui est un fichier de CLI et non du code applicatif.
- `src/lib/` est rangé par sujet, pas à plat : `auth/`, `db/`, `http/`, `security/`. Un fichier n'y
  reste à la racine que s'il n'a pas de famille (`utils.ts`, `safe-action.ts`). `utils.ts` ne bouge
  pas : `components.json` y pointe (`aliases.utils`), et tout ce que shadcn génère l'importe.
- Accès base via `import { prisma } from "@/lib/db/prisma"`. Ne jamais instancier `PrismaClient`
  ailleurs : le client est mémorisé sur `globalThis` pour survivre au rechargement à chaud.
  Le schéma est `prisma/schema.prisma` ; le modèle et ses justifications, `docs/PRODUCT.md` §4.
- Appels HTTP sortants via `upfetch` (`@/lib/http/fetch`) avec un `schema`, pas `fetch` nu.
- Auth **OAuth GitHub uniquement**, avec liste d'attente (docs/PRODUCT.md §7.1) :
  - config serveur dans `@/lib/auth/server`, session serveur dans `@/lib/auth/session`, client dans
    `@/lib/auth/client`. Trois fichiers séparés : jamais de server et de client dans le même. Le
    nom de fichier porte la frontière — c'est ce qui rend l'erreur visible à l'import.
  - la garde d'accès est `requireApprovedUser()` dans `app/(app)/layout.tsx`, **une seule fois**.
    Ne pas la répéter page par page — une route oubliée ouvrirait tout le reste.
  - `src/proxy.ts` ne fait qu'une redirection optimiste sur présence de cookie. Il n'autorise
    rien, et n'appelle jamais `auth.api.getSession()` : ce serait un aller-retour base par requête.
  - **Le proxy ne renvoie jamais un porteur de cookie hors des routes publiques.** Un cookie
    périmé provoquerait une boucle infinie avec la garde du layout. Verrouillé par `src/proxy.test.ts`.
- Toute destination de redirection venue de l'URL passe par `safeRedirectPath`
  (`@/lib/security/safe-redirect`), **à la consommation** et pas seulement à la fabrication : un
  `?callbackUrl=` peut arriver dans une URL forgée sans passer par le proxy.
- Un route handler sous `src/app/api/` porte **lui-même** sa garde : le `matcher` du proxy exclut
  `api/` en entier et le layout `(app)` ne le couvre pas. Session (`@/lib/auth/session`), jeton
  porteur pour un cron, et plafond de débit via `@/lib/security/rate-limit` s'il déclenche un appel
  sortant.
- `export const instant = false` sur un segment qui dépend de l'identité du visiteur (le layout
  `(app)`, les pages d'auth). Ailleurs, on garde la validation : elle signale ce qui bloque une
  navigation instantanée.

Pour créer une nouvelle feature, utiliser la skill `new-feature`. Pour toucher à l'API AniList,
la skill `anilist-read` (`.claude/skills/`).

# Outillage

```bash
pnpm dev          # next dev
pnpm lint         # biome check
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm knip         # dépendances, fichiers et exports morts
pnpm build        # next build

pnpm db:migrate   # prisma migrate dev — crée et applique une migration
pnpm db:studio    # prisma studio
pnpm db:generate  # régénère le client (lancé aussi par le postinstall)
```

- **Lefthook** installe les hooks Git au `pnpm install` : `pre-commit` formate les fichiers
  indexés avec Biome, `pre-push` lance `typecheck` + `test` + `knip`. Config : `lefthook.yml`.
- **CI GitHub** (`.github/workflows/ci.yml`) : lint → typecheck → tests → knip → build, sur PR et
  sur `main`. Le build y passe `SKIP_ENV_VALIDATION=1`, faute de secrets.
- **Vitest** (`vitest.config.mts`) : environnement `node`, fichiers `src/**/*.test.ts` colocalisés
  avec leur sujet. Les composants React ne sont pas encore couverts.
- La provenance des skills et des agents est dans [.claude/SKILLS.md](.claude/SKILLS.md) — à
  mettre à jour à chaque ajout.
- **Knip** : `src/components/ui/**` est ignoré (généré par shadcn). Les règles `files`,
  `dependencies` et `exports` sont temporairement en `warn` — voir le commentaire dans
  `knip.jsonc`, à repasser en `error` une fois les routes V0 câblées.
- Un hook `PreToolUse` (`.claude/hooks/conventions-guard.mjs`) refuse les écritures qui violent
  une règle non négociable ci-dessus. S'il bloque, c'est le code qu'il faut corriger, pas le hook.
- Deux agents dédiés dans `.claude/agents/` : `convention-reviewer` (relit un diff contre
  ARCHITECTURE.md et PRODUCT.md) et `next-docs` (répond sur Next 16 en lisant
  `node_modules/next/dist/docs/` plutôt que de mémoire).
