# Better-List

Catalogue d'œuvres (anime, manga, webtoon, light novel) adossé à l'API AniList : suivi, journal
daté, collection physique, listes. **Cercle privé d'environ quatre comptes**, connexion GitHub
seule. **Tout est en français** : interface, commentaires, commits, docs, réponses.

- Conception et état présent : `docs/conception.md`. Le code cite ses sections (« conception.md
  §4.1 ») : garder la numérotation.
- Décisions en vigueur : `docs/decisions.md` (« D18 »). Une décision qui gêne se révise par une
  nouvelle, écrite dans ce registre dans la même PR.
- Déploiement : `docs/deploiement.md`.
- Consignes par zone, chargées avec leurs fichiers : `.claude/rules/` (`app-routing`,
  `components`, `server`, `anilist`, `outside-next`).

## Commandes

```bash
pnpm dev            # next dev — le redémarrer après un refactor de Server Actions
pnpm lint           # biome check (un hook formate déjà chaque fichier écrit)
pnpm typecheck      # next typegen && tsc --noEmit
pnpm test           # vitest run ; un seul fichier : pnpm test src/chemin/fichier.test.ts
pnpm test:e2e       # playwright test (réutilise le pnpm dev ouvert)
pnpm knip           # code et dépendances morts
pnpm db:migrate     # prisma migrate dev
pnpm db:studio      # approuver un compte : status → APPROVED
pnpm db:seed        # refuse d'écraser des données ; --reset pour repartir de zéro
```

Une tâche n'est finie qu'avec `pnpm typecheck && pnpm test && pnpm lint && pnpm knip` vert, **et**
l'écran vu tournant au navigateur, en 1440 et en 390 px.

## Architecture

Next 16.3 (App Router, `cacheComponents`, React Compiler) · React 19 · Prisma 7 sur Neon ·
Better Auth · Zod 4 · Tailwind 4 + shadcn · Vercel Hobby.

- `src/app/` ne fait que du routing. Le code métier vit dans `src/features/<domaine>/` :
  `components/`, `server/` (`*.queries.ts`, `*.actions.ts`), `schemas/`, `lib/`, `hooks/`.
- **Règle de promotion** : un composant ou un helper démarre dans le `_components/` / `_lib/` de sa
  route, et ne monte dans `features/` qu'au deuxième appelant réel.
- **Server-first** : `"use client"` sur la feuille interactive, jamais sur une page ou un layout.
- `src/components/` : `ui/` (shadcn), `layout/` (le chrome), `shared/` (composites sans métier).
  `src/lib/` est rangé par sujet (`auth/`, `db/`, `http/`, `security/`). `utils.ts` ne bouge pas,
  parce que `components.json` y pointe.
- `src/config/` : `routes.ts` (**aucune URL en dur**), `navigation.ts`, `locale.ts` (tout `Intl.*`
  reçoit sa langue et son fuseau), `env.ts`, `site.ts`.
- Jamais `process.env.X` : `import { env } from "@/config/env"`. Le hook tient la liste des
  exceptions.
- Base : `import { prisma } from "@/lib/db/prisma"`. HTTP sortant : `upfetch` (`@/lib/http/fetch`)
  avec un `schema`, jamais `fetch` nu.
- Validation Zod, types par `z.infer`, pas de `src/types/`. Fichiers en `kebab-case`, alias unique
  `@/*`, pas de barrel `index.ts` dans `features/`.
- `src/generated/` est le client Prisma, généré et gitignoré : on n'y touche jamais. `scripts/`
  contient des exécutables lancés à la main, jamais importés.
- Commentaires : le **pourquoi** (l'invariant, le piège, la raison d'un chiffre), en une à trois
  lignes. Le récit d'une séance va dans le message de commit, pas dans le code.

`.claude/hooks/conventions-guard.mjs` refuse les écritures qui violent celles de ces règles qu'une
machine sait vérifier. S'il bloque, c'est le code qu'il faut corriger. `src/architecture.test.ts`
tient celles qui portent sur l'arbre entier.

## Git et PR

- Une branche par sujet (`feat/…`, `fix/…`, `chore/…`, `docs/…`), puis une PR GitHub vers `main`.
  Ne jamais pousser directement sur `main`.
- **Fusionner sur `main` déploie la production**, migrations comprises (`vercel-build`). Jamais sans
  l'accord explicite de l'utilisateur : s'arrêter à la PR ouverte et verte.
- Commits en français, au format `type(portée): sujet` (ex. `feat(library): sens du tri`).
- Lefthook : `pre-commit` formate, `pre-push` lance typecheck + test + knip. La CI ajoute le build
  et les E2E sans `@anilist`.
- N'ajouter que ses propres fichiers (`git add <fichier>`).

## Specs et plans

Les skills superpowers écrivent leurs specs et plans dans `docs/superpowers/` : ce sont des
documents de chantier. **Une fois le chantier fusionné**, reporter ses décisions dans
`docs/decisions.md` (et ce qui change dans `docs/conception.md` ou `.claude/rules/`), puis supprimer
la spec et le plan. Mettre à jour `conception.md` §5 et §6 dans la PR qui livre un écran.

## Environnement

- Windows : PowerShell et Git Bash.
- Pour une API Next incertaine, demander à l'agent `next-docs`, qui lit
  `node_modules/next/dist/docs/`. Pour une autre bibliothèque, Context7 plutôt que la mémoire.
- Avant une PR, l'agent `convention-reviewer` relit le diff contre ces conventions.
- Skills du projet : `new-feature`, `anilist-read` (ses `references/` inventorient ce qu'AniList
  fournit), `e2e-test`. Provenance des skills recopiées : `.claude/SKILLS.md`.

## Pièges déjà payés

- **`next dev` qui a tourné pendant toute une séance** fait des choses inexplicables : des Server
  Actions qui visent la mauvaise ligne, des routes qui ne répondent plus. Le redémarrer avant de
  chercher un bug.
- **`pnpm dlx shadcn add`** a ajouté deux fois un paquet parasite `cn` : relire
  `git diff package.json` après chaque ajout.
- **AniList répond 403 sans en-tête `Referer`**, avec un message qui fait croire à une panne.
- **Une migration non appliquée fait tomber toutes les fiches** : le déploiement l'applique, mais
  une base de développement doit passer `pnpm db:migrate`.
- **Vitest aliase `server-only`** vers un module vide : sans cet alias, le test d'un helper
  `server-only` échoue avant sa première assertion.

<!-- Bloc géré par `next dev` (node_modules/next/dist/server/lib/generate-agent-files.js) : le
laisser tel quel, il est réécrit s'il diverge. Les commentaires HTML ne sont pas injectés dans le
contexte, seul le texte entre les marqueurs l'est. -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
