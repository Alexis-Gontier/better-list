# Better-List

Un catalogue d'œuvres japonaises et asiatiques — animes, mangas, webtoons, light novels — adossé à
l'[API AniList](https://docs.anilist.co/), sur lequel se greffent le **suivi du visionnage**, un
**journal daté** de ce qu'on a vu et quand, le **recensement de la collection physique**, et des
**listes** réarrangeables en classements ou en tier lists.

> **Cercle privé, ~4 comptes.** Inscription sur invitation, pas d'ouverture publique. Ce n'est pas
> un détail de dimensionnement : ça retire du périmètre la découverte sociale, la modération, les
> commentaires et l'administration des comptes. Le partage d'une liste passe par un **lien non
> listé**, pas par un graphe social. Le raisonnement complet est dans
> [docs/PRODUCT.md](docs/PRODUCT.md).

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, React Compiler) · React 19 |
| Base de données | PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg` |
| Authentification | Better Auth — OAuth GitHub uniquement |
| Données externes | API GraphQL AniList, lue via `up-fetch` et miroitée en base |
| UI | Tailwind CSS 4 · shadcn/ui (Radix) · `next-themes` |
| Validation | Zod 4 — les types se dérivent, il n'y a pas de `src/types/` |
| Actions serveur | `next-safe-action` v8 |
| Qualité | Biome · TypeScript · Vitest · Knip · Lefthook |
| Hébergement | Vercel (crons déclarés dans `vercel.json`) |

## Démarrer en local

Node **24.18.1** (voir `.nvmrc`) et **pnpm** — la version exacte vient du champ `packageManager`
de `package.json`, `corepack enable` suffit à l'aligner.

```bash
pnpm install          # installe, génère le client Prisma et pose les hooks Git
cp .env.example .env  # puis remplir les cinq variables, chacune commentée sur place
pnpm db:migrate       # applique les migrations sur la base
pnpm db:seed          # jeu d'essai ; refuse d'écraser des données, `--reset` pour repartir de zéro
pnpm dev              # http://localhost:3000
```

Il faut une base PostgreSQL (une branche [Neon](https://neon.tech) gratuite fait l'affaire) et une
**OAuth App GitHub** — *Settings → Developer settings → OAuth Apps* — dont l'URL de callback est
`http://localhost:3000/api/auth/callback/github`.

Un compte fraîchement inscrit arrive **en liste d'attente** : l'approbation se fait à la main dans
`pnpm db:studio`, il n'y a pas d'interface d'administration.

## Scripts

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
pnpm db:seed      # jeu d'essai
```

`pnpm install` installe les hooks Git : `pre-commit` formate les fichiers indexés, `pre-push`
enchaîne `typecheck` + `test` + `knip`. La [CI GitHub](.github/workflows/ci.yml) rejoue le tout et
y ajoute le `build`, sur chaque push de `main` et chaque pull request.

## Où lire quoi

| La question que tu te poses | Le fichier à ouvrir |
| --- | --- |
| Où on en est, ce qui existe, quoi faire ensuite | [docs/STATE.md](docs/STATE.md) |
| Quoi et pourquoi : périmètre, modèle de domaine, roadmap | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Comment : où poser un fichier, frontière server/client | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Ce qu'on a appris en chemin | [docs/JOURNAL.md](docs/JOURNAL.md) |
| Ce qu'on peut afficher sur la fiche d'une œuvre | [docs/fiche-media.md](docs/fiche-media.md) |
| Ce par quoi on peut filtrer le catalogue | [docs/recherche-filtres.md](docs/recherche-filtres.md) |
| Les conventions non négociables, en une page | [CLAUDE.md](CLAUDE.md) |

**STATE.md dit ce qui est construit, PRODUCT.md ce qu'on veut construire.** Quand les deux se
contredisent, STATE.md a raison sur le présent et PRODUCT.md sur l'intention.

## Contribuer

Dépôt privé à un seul contributeur : pas de pull requests, pas d'issues. Le travail part d'une
branche thématique (`refonte/…`, `feat/…`) fusionnée dans `main` en `--no-ff` avec un message
`merge: …`. `main` est protégée contre le force-push et la suppression.
