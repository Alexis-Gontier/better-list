---
name: e2e-test
description: Écrire ou corriger un test Playwright de bout en bout dans ce projet — où poser le fichier, quels comptes de test, quand taguer @anilist, comment lancer. Use when adding an E2E test, a "parcours critique", touching e2e/ or playwright.config.ts, or when asked "teste ce parcours", "ajoute un test Playwright", "le test E2E casse".
---

# Écrire un test E2E

Pour la technique Playwright (locators, attentes, fixtures, flakiness), la skill
`playwright-best-practices`. Pour regarder un écran avant d'écrire le test, `playwright-cli`. Ici,
seulement ce qui est propre au dépôt.

## Où et comment

- Un fichier `e2e/<parcours>.spec.ts` par parcours. Pas de Page Object tant qu'un écran n'est pas
  utilisé par trois fichiers.
- Les chemins viennent de `@/config/routes` — jamais une URL en dur, ici non plus.
- `e2e/` est du code de CLI, hors de Next, comme `prisma/` : `process.env` et `pg` y sont permis,
  `@/config/env` et `@/lib/db/prisma` n'y fonctionnent pas (`server-only`, `NODE_ENV`).
- Sélecteurs : `getByRole` + nom accessible, puis `getByPlaceholder` / `getByLabel`. Jamais de
  classe CSS. Un bouton sans nom accessible est un défaut du composant : on le corrige là-bas, on
  n'ajoute pas de `data-testid`.
- Les titres affichés suivent `titleLanguage`, qui vaut `ROMAJI` pour les comptes de test :
  « ONE PIECE », pas « One Piece ». Viser avec une regex insensible à la casse.

## Comptes

La connexion est GitHub seul : la session est fabriquée en base par le projet `setup`
(`e2e/support/session.ts`). Deux comptes, et seulement eux (`e2e/support/accounts.ts`) :

```ts
test.use({ storageState: accounts.member.storageState });  // membre approuvé
test.use({ storageState: accounts.pending.storageState }); // compte en liste d'attente
```

Sans `storageState`, le test est anonyme. Les comptes sont supprimés en fin de run (cascade : suivi,
listes, collection partent avec). Un test qui **écrit** ne tourne que sur le projet `desktop` —
les deux viewports partagent le même compte —, et défait ce qu'il a fait :

```ts
test.skip(testInfo.project.name !== "desktop", "écrit en base : un viewport suffit");
```

## AniList

Tout test qui affiche une donnée AniList (fiche, recherche, accueil, calendrier, palette) porte
`@anilist` dans son titre. La CI les écarte : la base y est vierge, et le quota (30 req/min) est
partagé. Œuvre de référence : id 21, One Piece.

Ce qui ne lit que la base (garde d'accès, bibliothèque, collection, listes, réglages) ne porte pas
le tag et tourne en CI, sur un Postgres jetable migré par `prisma migrate deploy`.

## Lancer

```bash
pnpm test:e2e                          # tout, en réutilisant le `pnpm dev` ouvert
pnpm test:e2e --grep-invert @anilist   # ce que lance la CI
pnpm test:e2e access                   # un fichier
pnpm test:e2e:ui                       # mode interactif
pnpm exec playwright show-report       # rapport HTML (en CI : l'artefact `playwright-report`)
```

Les journaux `NEXT_REDIRECT` du serveur de dev pendant un test de garde sont attendus : c'est la
redirection qu'on teste.
