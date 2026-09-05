# Où on en est

> **Ce document se met à jour dans le commit qui le périme, jamais après.**
> Un état des lieux tenu après coup est un journal — et on sait ce que devient un journal qu'on ne
> relit pas ([docs/journal/](./journal/)).

[PRODUCT.md](./PRODUCT.md) dit ce qu'on veut construire. Ce fichier dit ce qui **est** construit.
Quand les deux se contredisent, c'est ce fichier qui a raison sur le présent, et PRODUCT.md sur
l'intention.

Relevé le **5 septembre 2026**.

---

## La carte

Chaque route, ce qu'elle consomme et où elle en est. La clé entre parenthèses est celle de
[`src/config/routes.ts`](../src/config/routes.ts) — aucun chemin ne s'écrit en dur.

| Route | Rôle | Features consommées | Modèles | État |
| --- | --- | --- | --- | --- |
| `/` (`home`) | Bandeau de reprise, chiffres, rangée « En cours », listes, quatre rangées de découverte | `tracking`, `media`, `lists`, `preferences` | `Entry`, `EntryEvent`, `Media`, `List` | **livré** |
| `/search` (`search`) | Recherche du catalogue, filtres en URL | `media`, `tracking`, `preferences` | `Media`, `Entry` | **livré** |
| `/media/[id]` (`media`) | Fiche d'une œuvre, suivi, journal, ajout aux listes | `media`, `tracking`, `lists`, `preferences` | `Media`, `Entry`, `EntryEvent`, `ListItem` | **livré** |
| `/library` (`library`) | Ma bibliothèque, filtrée par statut, type et genre | `tracking`, `media` | `Entry`, `Media` | **livré** |
| `/lists` (`lists.root`) | Mes listes | `lists`, `media`, `preferences` | `List`, `ListItem` | **livré** |
| `/lists/[id]` (`lists.detail`) | Une liste, réordonnable | `lists`, `media`, `command` | `List`, `ListItem`, `Media` | **livré** |
| `/lists/[id]/[viewId]` (`lists.view`) | Une vue posée sur une liste | — | `ListView`, `ListViewItem` | **déclaré, non construit** — reporté (PRODUCT.md §6) |
| `/l/[token]` (`share.detail`) | Une liste partagée, **hors app authentifiée** | `lists` | `List`, `ListItem` | **livré** |
| `/u/[username]` (`profile`) | Profil d'un membre : statistiques, journal | `profile` | `User`, `Entry`, `EntryEvent` | **livré** |
| `/calendar` (`calendar`) | Planning de diffusion, filtré sur ce qu'on suit | `media`, `tracking`, `preferences` | `Media`, `Entry` | **livré** |
| `/settings` (`settings`) | Préférences d'affichage | `preferences` | `UserPreferences` | **livré** |
| `/collection` (`collection.root`) | Mon étagère : séries possédées, tomes manquants | — | `Edition`, `OwnedVolume` | **déclaré, non construit** |
| `/collection/[mediaId]` (`collection.detail`) | Une série : tomes, plages, prêts | — | `Edition`, `OwnedVolume` | **déclaré, non construit** |
| `/login` · `/signup` · `/waitlist` (`auth.*`) | Connexion GitHub, liste d'attente | — | `User`, `Session`, `Account` | **livré** |

Les tables `ListView`, `ListViewItem`, `Edition` et `OwnedVolume` existent au schéma depuis la
migration initiale et ne sont employées par aucun écran. C'est voulu, pas un oubli — PRODUCT.md §6
dit pourquoi.

### Les trois route handlers

Ils ne vivent pas sous le layout `(app)` et le `matcher` du proxy exclut `api/` : chacun porte donc
sa propre garde.

| Handler | Rôle | Sa garde |
| --- | --- | --- |
| `api/auth/[...all]` | Better Auth | celle de Better Auth |
| `api/command` | Palette `⌘K` — lecture client, donc `GET` annulable et non Server Action | session **et** statut `APPROVED`, plus `rate-limit` ; répond `401`, jamais un `redirect()` |
| `api/cron/refresh-media` | Rafraîchissement du miroir `Media` | `Authorization: Bearer $CRON_SECRET` — pas de session, c'est un appel machine |

### Et trois conventions de fichier, posées le 5 septembre 2026

| Fichier | Rôle |
| --- | --- |
| `app/robots.ts` | `disallow: "/"` **total**. `/l/<jeton>` s'ouvre sans session : un lien secret indexé n'est plus un secret, il est cherchable. |
| `app/icon.tsx` | L'icône d'onglet, dessinée par `ImageResponse` — aucun binaire à relire dans `public/`. |
| `instrumentation.ts` | `onRequestError` : relie le `digest` qu'`error.tsx` affiche au visiteur à une ligne de journal cherchable. |

---

## Les six features

`profile` et `command` composent plusieurs domaines sans appartenir à aucun — la raison est dans
[ARCHITECTURE.md](./ARCHITECTURE.md#anatomie-dune-feature).

**`media`** — le catalogue AniList et son miroir local.
Expose `searchMedia`, `getMediaById`, `getBrowseCatalogue`, `getAiringSchedule`,
`getFilterVocabulary`, `mediaCacheTag` (queries) et `ensureMediaMirror`, `refreshStaleMirror`,
`mediaTotalUnits` (miroir). Dépend de `lib/http/anilist`. C'est la seule feature qui sort du serveur.

**`tracking`** — le suivi, le journal, la bibliothèque.
Expose `getEntryForMedia`, `getEntryStatesFor`, `getEntryTimeline`, `getLibrary`,
`getLibraryStatusCounts`, `searchEntries`, `getHeroEntries`, `getDashboard`, `getAiringEntries`, et
les actions `saveEntry`, `removeEntry`. La feature la plus consommée : six routes en dépendent.

**`lists`** — les listes et leur contenu.
Expose `getMyLists`, `getListById`, `getSharedList`, `getListsForMedia`, et huit actions
(`createList`, `updateList`, `deleteList`, `shareList`, `unshareList`, `addToList`,
`reorderListItem`, `removeFromList`). L'ordre passe par `fractional-indexing` (`lib/list-reorder`),
le partage par un jeton (`lib/share-token`), jamais par l'`id`.

**`profile`** — la vue publique d'un membre. `getProfile`, `getProfileStats`, `getProfileTimeline`.
Compose `tracking` et `media` sans leur appartenir.

**`preferences`** — les réglages d'affichage, lus par presque tous les écrans.
`getPreferences` et l'action `updatePreferences`. Porte `titleLanguage` et ses valeurs par défaut.

**`command`** — la palette `⌘K`. `getCommandResults`, servie par `api/command` en `GET`.

---

## Contrôle de santé

Relevé le 5 septembre 2026. **À rejouer et à redater dès qu'on prétend s'y fier.**

| Commande | Résultat |
| --- | --- |
| `pnpm typecheck` | propre — `noUncheckedIndexedAccess` et `verbatimModuleSyntax` actifs depuis le 5 septembre |
| `pnpm test` | 192 tests, 16 fichiers |
| `pnpm lint` | 246 fichiers, aucune correction |
| `pnpm build` | 19 pages, toutes en rendu partiel sauf les handlers |
| `pnpm knip` | aucun signalement |

**Écarts connus :**

- Les composants React ne sont couverts par **aucun test de rendu** : les 16 fichiers portent sur
  des helpers purs, des schémas, le proxy et l'arborescence. Playwright est prévu (PRODUCT.md §7) et
  pas posé.
- `src/architecture.test.ts` couvre en revanche ce qu'aucun autre garde-fou ne voit : aucun module
  `"use client"` n'importe un Server Component `async`, `src/app/` ne contient que des conventions
  Next, `features/` n'a pas de barrel.
- `/collection` est déclarée dans `routes.ts` sans écran derrière. Rien ne pointe dessus — ni la
  navigation, ni la palette. `routes.ts` le dit lui-même dans son commentaire.
- Le repli de panne AniList n'est vérifié par **aucun test** : `tryAniList` a les siens, les cinq
  écrans qui l'appellent n'en ont pas. C'est le même trou que le reste de l'affichage, mais il porte
  ici sur un chemin qu'on ne voit jamais en développement — il ne se déclenche que quand l'API
  tombe.

---

## Le prochain pas

**Poser Playwright, et commencer par le repli de panne.**

Depuis le 21 août, aucun écran ne tombe sur `app/error.tsx` quand AniList ne répond pas : l'accueil
et `/search` remplacent le catalogue par un message, `/calendar` remplace la grille, et
`/media/[id]` sert la fiche depuis le miroir local pour garder le « +1 ». Ces cinq chemins ont une
propriété commune et gênante : **on ne les voit jamais tourner**, puisqu'ils demandent qu'une API
tierce soit en panne. Ils ne peuvent pas être vérifiés à l'œil, seulement par un test qui simule la
coupure.

C'est ce qui fait passer les tests de composants — jusqu'ici « sans engagement » — devant la
collection physique : ils ne couvrent plus seulement du confort, mais du code qui ne s'exécute
qu'un jour de panne.

### Ensuite, peut-être

Sans engagement, et sans ordre : la collection physique (`/collection`, V1.5), l'ordre de
visionnage d'une franchise (PRODUCT.md §8, meilleur rapport valeur/effort du projet).
