# Déployer Better-List

Production sur **Vercel** (plan Hobby), base **PostgreSQL sur Neon**. Chaque fusion dans `main`
déploie la production.

## Variables d'environnement

Validées au build par `src/config/env.ts`. Le modèle est dans `.env.example`.

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Neon, chaîne **poolée** (`-pooler` dans l'hôte), `sslmode=verify-full` |
| `BETTER_AUTH_SECRET` | signe les sessions et les URL des cartes d'épisode (HMAC). 32 octets au moins |
| `GITHUB_CLIENT_ID` · `GITHUB_CLIENT_SECRET` | l'application OAuth GitHub |
| `DISCORD_CLIENT_ID` · `DISCORD_CLIENT_SECRET` | **facultatives** (D62) : l'application OAuth Discord (Developer Portal), rappel `<APP_URL>/api/auth/callback/discord` |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` | **facultatives** (D62) : le client OAuth Google (Cloud Console), rappel `<APP_URL>/api/auth/callback/google` |
| `NEXT_PUBLIC_APP_URL` | URL publique : `baseURL` de Better Auth, origine de confiance, `Referer` envoyé à AniList |
| `CRON_SECRET` | jeton porteur de `api/cron/*`. 32 caractères au moins |

Une variable client se déclare deux fois dans `env.ts` : dans `client` et dans
`experimental__runtimeEnv`.

## Build et migrations

Vercel lance `pnpm vercel-build` : `prisma generate`, puis `prisma migrate deploy` **en production
seulement**, puis `next build`. Une migration est donc appliquée par le déploiement qui l'apporte.
Si elle n'est pas appliquée, toutes les fiches tombent (c'est arrivé le 1er octobre 2026).

En local : `pnpm db:migrate` crée et applique une migration sur la base de `DATABASE_URL`.

## Tâches planifiées

| Tâche | Déclencheur | Route |
| --- | --- | --- |
| Rafraîchir le miroir `Media` | Vercel Cron, `0 4 * * *` (`vercel.json`) | `api/cron/refresh-media` |
| Poster les épisodes sortis dans Discord | GitHub Actions, toutes les heures à la 7ᵉ minute (`.github/workflows/discord-notifications.yml`) | `api/cron/discord` |

Vercel envoie `CRON_SECRET` tout seul. Pour GitHub Actions, déclarer deux secrets de dépôt :
`APP_URL` (l'URL de production, sans barre finale) et `CRON_SECRET` (la même valeur que sur
Vercel).

## Comptes

L'inscription passe par GitHub, Discord ou Google et crée un compte `PENDING`. Un administrateur
l'approuve depuis `/admin/users` (D57). Le premier administrateur se pose **une fois**, après la
migration `admin_plugin`, avec `DATABASE_URL` pointée sur la production :
`pnpm tsx scripts/set-admin.ts <username>`. Les suivants se nomment depuis l'écran.

## CI

`.github/workflows/ci.yml`, sur chaque PR et sur `main` : lint → typecheck → tests → knip → build
(avec `SKIP_ENV_VALIDATION=1`). En parallèle, un job E2E sur une base Postgres jetable lance
`playwright test --grep-invert @anilist`.
