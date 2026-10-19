---
paths:
  - "e2e/**"
  - "playwright.config.ts"
  - "prisma/**"
  - "scripts/**"
---

# Fichiers qui tournent hors de Next

`e2e/` (runner Playwright), `prisma/seed.ts` et `scripts/` (sous `tsx` ou `node`) n'ont pas le
runtime Next :

- `process.env`, un `PrismaClient` instancié et un `fetch` nu y sont permis. `@/config/env` et
  `@/lib/db/prisma` n'y fonctionnent pas.
- `@/config/routes` y reste obligatoire : une URL en dur casse un test aussi silencieusement qu'un
  écran.
- Un test E2E passe par la skill `e2e-test` (comptes de test, tag `@anilist`, lancement). Un test
  qui interroge AniList pour de vrai est tagué `@anilist` et ne tourne pas en CI.
- Une migration Prisma : `pnpm db:migrate`. En production, `vercel-build` lance lui-même
  `prisma migrate deploy`, et une migration oubliée fait planter les fiches.
