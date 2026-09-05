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
| `/` (`home`) | Bandeau de reprise, chiffres, rangée « En cours », listes, quatre rangées de découverte | `tracking`, `media`, `lists`, `preferences` | `Entry`, `EntryEvent`, `Media`, `List` | **vidé** — en refonte |
| `/search` (`search`) | Recherche du catalogue, filtres en URL | `media`, `tracking`, `preferences` | `Media`, `Entry` | **vidé** — en refonte |
| `/media/[id]` (`media`) | Fiche d'une œuvre, suivi, journal, ajout aux listes | `media`, `tracking`, `lists`, `preferences` | `Media`, `Entry`, `EntryEvent`, `ListItem` | **livré** |
| `/library` (`library`) | Ma bibliothèque, filtrée par statut, type et genre | `tracking`, `media` | `Entry`, `Media` | **vidé** — en refonte |
| `/lists` (`lists.root`) | Mes listes | `lists`, `media`, `preferences` | `List`, `ListItem` | **vidé** — en refonte |
| `/lists/[id]` (`lists.detail`) | Une liste, réordonnable | `lists`, `media`, `command` | `List`, `ListItem`, `Media` | **vidé** — en refonte |
| `/lists/[id]/[viewId]` (`lists.view`) | Une vue posée sur une liste | — | `ListView`, `ListViewItem` | **déclaré, non construit** — reporté (PRODUCT.md §6) |
| `/l/[token]` (`share.detail`) | Une liste partagée, **hors app authentifiée** | `lists` | `List`, `ListItem` | **livré** |
| `/u/[username]` (`profile`) | Profil d'un membre : statistiques, journal | `profile` | `User`, `Entry`, `EntryEvent` | **livré** |
| `/calendar` (`calendar`) | Planning de diffusion, filtré sur ce qu'on suit | `media`, `tracking`, `preferences` | `Media`, `Entry` | **vidé** — en refonte |
| `/settings` (`settings`) | Préférences d'affichage | `preferences` | `UserPreferences` | **livré** |
| `/collection` (`collection.root`) | Mon étagère : séries possédées, tomes manquants | — | `Edition`, `OwnedVolume` | **déclaré, non construit** |
| `/collection/[mediaId]` (`collection.detail`) | Une série : tomes, plages, prêts | — | `Edition`, `OwnedVolume` | **déclaré, non construit** |
| `/login` · `/signup` · `/waitlist` (`auth.*`) | Connexion GitHub, liste d'attente | — | `User`, `Session`, `Account` | **livré** |

Les tables `ListView`, `ListViewItem`, `Edition` et `OwnedVolume` existent au schéma depuis la
migration initiale et ne sont employées par aucun écran. C'est voulu, pas un oubli — PRODUCT.md §6
dit pourquoi.

### La mise à blanc du 5 septembre 2026

Six lignes du tableau portent **vidé**. Le 5 septembre, la présentation de cinq arbres de routes a
été supprimée d'un coup — 38 fichiers d'UI, plus 7 modules devenus orphelins par ricochet
(`media-carousel`, `view-toggle`, `list-card`, `media-row`, `use-search-filters`,
`use-library-filters`, `entry-card-actions`). Le diagnostic est celui de la spec du 2 septembre :
les écrans avaient été construits par ajout, et `/search` et `/library` étaient le même écran écrit
deux fois.

Une seconde passe, le même jour, a emporté trois composants de `features/tracking/` que la première
avait laissés sans importateur : `entry-dialog`, `entry-form` et `entry-quick-progress` — 647 lignes
de rendu que la refonte réécrira. `score-stars` et `remove-entry-dialog`, que `entry-form` était
seul à partager avec `entry-controls`, survivent par ce dernier et servent toujours `/media/[id]`.
Avec eux, le gel knip passe de 14 à 11 chemins.

Trois choses n'ont **pas** été supprimées, et il faut le savoir avant de reconstruire :

1. **Les `page.tsx` des cinq routes.** Ils sont réduits à un placeholder
   (`components/shared/route-under-construction.tsx`), pas effacés. `routes.home` est la cible de
   redirection après connexion, le `callbackURL` GitHub, la sortie de la liste d'attente et le repli
   de `proxy.ts` ; `config/navigation.ts` et la palette `⌘K` pointent vers les quatre autres ; et
   les Server Actions de `lists` et `tracking` y adressent seize `revalidatePath()`. Effacer les
   fichiers aurait fait atterrir toute connexion sur un 404.
2. **La couche données.** Queries, actions, schémas et helpers de `features/` sont intacts, tests
   compris — les 192 tests passent toujours, ce qui confirme qu'aucun ne portait sur l'UI supprimée.
3. **Deux modules de `calendar/_lib/`.** `airing-week.ts` (calcul de semaine, couvert) et
   `calendar-params.ts` (le contrat d'URL : la semaine en décalage, pas en date) sont des décisions
   de domaine, pas d'apparence.

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
les actions `saveEntry`, `removeEntry`. Elle était la feature la plus consommée — six routes en
dépendaient. Depuis la mise à blanc, il n'en reste que deux (`/media/[id]` et `/u/[username]`) : les
sept lectures gelées dans `knip.jsonc` attendent les quatre autres.

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
| `pnpm test` | 192 tests, 16 fichiers — **inchangé après la mise à blanc** |
| `pnpm lint` | 199 fichiers, aucune correction (246 avant la mise à blanc) |
| `pnpm build` | 19 pages, toutes en rendu partiel sauf les handlers |
| `pnpm knip` | aucun signalement — **mais sous gel**, voir les écarts |

**Écarts connus :**

- Les composants React ne sont couverts par **aucun test de rendu** : les 16 fichiers portent sur
  des helpers purs, des schémas, le proxy et l'arborescence. Playwright est prévu (PRODUCT.md §7) et
  pas posé.
- `src/architecture.test.ts` couvre en revanche ce qu'aucun autre garde-fou ne voit : aucun module
  `"use client"` n'importe un Server Component `async`, `src/app/` ne contient que des conventions
  Next, `features/` n'a pas de barrel.
- `/collection` est déclarée dans `routes.ts` sans écran derrière. Rien ne pointe dessus — ni la
  navigation, ni la palette. `routes.ts` le dit lui-même dans son commentaire.
- Le repli de panne AniList n'est vérifié par **aucun test**, et la mise à blanc a emporté les cinq
  appelants de `tryAniList` : il n'en reste qu'un, `/media/[id]`. `tryAniList` garde ses propres
  tests. Le repli est donc à **re-poser écran par écran** pendant la reconstruction, et c'est un
  chemin qu'on ne voit jamais en développement — il ne se déclenche que quand l'API tombe.
- **`pnpm knip` est vert sous gel.** `knip.jsonc` porte depuis le 5 septembre un bloc `ignoreIssues`
  qui couvre 11 chemins, plus `ignoreDependencies` pour `@dnd-kit` et `embla`. Ce ne sont pas des
  faux positifs : ce code est réellement sans appelant, parce que les écrans qui l'appelaient
  n'existent plus. Le gel est posé **par chemin** et non en `exclude` global, pour que knip continue
  de signaler le code mort partout ailleurs. Chaque entrée nomme la route qu'elle attend : c'est la
  liste de reconstruction, et elle doit être vide — le bloc supprimé — quand les six routes sont
  refaites. Une décision assumée, prise en connaissance du coût le 5 septembre.

---

## Le prochain pas

**Poser le socle visuel, avant de redessiner le premier écran.**

Les tâches 1 à 6 du plan du 2 septembre
([plan](./superpowers/plans/2026-09-02-refonte-design-fondations.md)) : la police Archivo, les
tokens « Obsidienne », les composants shadcn manquants, les deux variants, la `MediaCard` signée et
la grille dense. Aucune de ces tâches n'a été entamée — les 54 cases du plan sont vides, et
`--font-heading` alias toujours `--font-sans`.

Cet ordre n'est pas négociable pour une raison simple : la `MediaCard` et la grille apparaissent sur
les six routes à reconstruire. Les redessiner après le premier écran obligerait à refaire cet
écran.

### Puis, une route par branche

L'ordre est choisi, et l'accueil est volontairement dernier — c'est l'écran qui compose le
vocabulaire de tous les autres.

1. `/search`, puis `/library` — ensemble, via la coquille commune (tâches 8 à 10 du plan). C'est le
   premier gain réel : la fin du double emploi, avant même le changement d'apparence.
2. `/calendar` — se rebranche sur `airing-week.ts` et `calendar-params.ts`, épargnés.
3. `/lists`, puis `/lists/[id]` — le réordonnancement revient, et `@dnd-kit` sort du gel.
4. `/` — en dernier, avec le vocabulaire complet sous les yeux.

Chaque branche retire du bloc `ignoreIssues` de `knip.jsonc` les entrées que sa route rebranche.
Quand la dernière part, le bloc entier part avec elle.

### Ensuite, peut-être

Sans engagement, et sans ordre : Playwright et le repli de panne AniList (à re-poser de toute façon
pendant la reconstruction), la collection physique (`/collection`, V1.5), l'ordre de visionnage
d'une franchise (PRODUCT.md §8, meilleur rapport valeur/effort du projet).
