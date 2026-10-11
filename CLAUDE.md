<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Better-List

Catalogue d'œuvres (anime, manga, webtoon, light novel) adossé à l'API AniList : suivi de
visionnage, journal daté, collection physique, listes réarrangeables. **Cercle privé d'environ
quatre comptes** — pas de découverte sociale, pas de modération, pas d'ouverture publique.

## Où lire quoi

| La question que tu te poses | Le fichier à ouvrir |
| --- | --- |
| Où on en est, ce qui existe, quoi faire ensuite | [docs/STATE.md](docs/STATE.md) |
| Quoi et pourquoi : périmètre, modèle de domaine, roadmap | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Comment : où poser un fichier, frontière server/client | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Ce qu'on a appris en chemin | [docs/JOURNAL.md](docs/JOURNAL.md) |
| Ce qu'on peut afficher sur la fiche d'une œuvre, et ce qui y est déjà | [docs/fiche-media.md](docs/fiche-media.md) |
| Ce par quoi on peut filtrer le catalogue, et ce qui est branché | [docs/recherche-filtres.md](docs/recherche-filtres.md) |

**Lire STATE.md avant de proposer quoi faire ensuite. Le mettre à jour dans le commit qui le
périme**, et compléter JOURNAL.md en fin de séance — quelques lignes suffisent.

## Les règles non négociables

Elles sont justifiées dans ARCHITECTURE.md ; ici, seulement leur énoncé.

- `src/app/` ne contient **que** du routing : conventions Next et dossiers privés `_components` /
  `_lib` colocalisés. Le code métier vit dans `src/features/<domaine>/`.
- Un composant démarre dans le `_components/` de sa route, et n'est promu dans `features/` que
  lorsqu'une deuxième route en a besoin.
- Quatre maisons pour un composant : `components/ui/` (shadcn), `components/layout/` (chrome),
  `components/shared/` (composites sans métier), `features/<domaine>/components/` (dès que ça
  connaît une entité métier).
- **Server-first** : `"use client"` se pose sur la feuille interactive, jamais sur la page parente.
  Passer les Server Components en `children` plutôt que convertir le sous-arbre.
- `src/features/*/server/` est server-only : `import "server-only";` pour les lectures, `"use
  server"` pour les actions. Jamais d'export server et client depuis le même fichier.
- Toute Server Action passe par `actionClient` — ou `authActionClient` si elle exige un membre
  connecté (`@/lib/safe-action`, next-safe-action v8 : `.metadata()` puis `.inputSchema()`, jamais
  `.schema()` qui est l'API v7).
- **Une lecture demandée par un composant client passe par un route handler, pas par une action.**
  Un route handler sous `src/app/api/` porte lui-même sa garde.
- Aucune URL en dur : tout chemin passe par `src/config/routes.ts`.
- Jamais de `process.env.X` : `import { env } from "@/config/env"`. Liste close d'exceptions, tenue
  par le hook : `src/config/env.ts`, `next.config.ts`, `postcss.config.mjs`, `prisma/seed.ts`,
  `playwright.config.ts` et `e2e/**` (fichiers de CLI, hors de Next).
- Accès base via `import { prisma } from "@/lib/db/prisma"`, jamais un `PrismaClient` instancié
  ailleurs. Appels HTTP sortants via `upfetch` (`@/lib/http/fetch`) avec un `schema`, jamais `fetch`
  nu. Ces deux règles valent pour `src/` ; les scripts de `prisma/`, qui tournent hors de Next, y
  échappent.
- Validation avec **Zod**. Pas de `src/types/` : les types se dérivent avec `z.infer`.
- La garde d'accès est `requireApprovedUser()` dans `app/(app)/layout.tsx`, **une seule fois**.
  Toute destination de redirection venue de l'URL passe par `safeRedirectPath`, à la consommation.
- `src/lib/` est rangé par sujet (`auth/`, `db/`, `http/`, `security/`). `utils.ts` ne bouge pas :
  `components.json` y pointe.
- Fichiers et dossiers en `kebab-case`. Pas de barrel `index.ts` dans `features/`. Un seul alias
  d'import : `@/*` → `src/*`.
- Une panne d'API externe se rattrape **hors** du `"use cache"`, jamais dedans — et une erreur ne
  traverse pas `"use cache"` intacte : seuls `name` et `message` survivent.

Un hook `PreToolUse` (`.claude/hooks/conventions-guard.mjs`) refuse les écritures qui violent
celles de ces règles qu'une machine sait voir. S'il bloque, c'est le code qu'il faut corriger.

## Outillage

```bash
pnpm dev          # next dev
pnpm lint         # biome check
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm knip         # dépendances, fichiers et exports morts
pnpm build        # next build

pnpm db:migrate   # prisma migrate dev
pnpm db:studio    # prisma studio
pnpm db:generate  # régénère le client (lancé aussi par le postinstall)
pnpm db:seed      # jeu d'essai ; refuse d'écraser des données, `--reset` pour repartir de zéro
```

Lefthook installe les hooks Git au `pnpm install` : `pre-commit` formate, `pre-push` lance
`typecheck` + `test` + `knip`. La CI GitHub enchaîne lint → typecheck → tests → knip → build.

Pour créer une feature, la skill `new-feature`. Pour toucher à l'API AniList, `anilist-read`.
Deux agents dédiés : `convention-reviewer` (relit un diff contre les conventions) et `next-docs`
(répond sur Next 16 en lisant `node_modules/next/dist/docs/`).
