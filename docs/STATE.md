# Où on en est

> **Ce document se met à jour dans le commit qui le périme, jamais après.**
> Un état des lieux tenu après coup est un journal — et on sait ce que devient un journal qu'on ne
> relit pas ([docs/journal/](./journal/)).

[PRODUCT.md](./PRODUCT.md) dit ce qu'on veut construire. Ce fichier dit ce qui **est** construit.
Quand les deux se contredisent, c'est ce fichier qui a raison sur le présent, et PRODUCT.md sur
l'intention.

Relevé le **19 août 2026**.

---

## La carte

Chaque route, ce qu'elle consomme et où elle en est. La clé entre parenthèses est celle de
[`src/config/routes.ts`](../src/config/routes.ts) — aucun chemin ne s'écrit en dur.

| Route | Rôle | Features consommées | Modèles | État |
| --- | --- | --- | --- | --- |
| `/` (`home`) | Bandeau de reprise, tableau de bord, catalogue du moment, listes | `tracking`, `media`, `lists`, `preferences` | `Entry`, `EntryEvent`, `Media`, `List` | **livré** |
| `/search` (`search`) | Recherche du catalogue, filtres en URL | `media`, `tracking`, `preferences` | `Media`, `Entry` | **partiel** — tombe en entier pendant une coupure AniList |
| `/media/[id]` (`media`) | Fiche d'une œuvre, suivi, journal, ajout aux listes | `media`, `tracking`, `lists`, `preferences` | `Media`, `Entry`, `EntryEvent`, `ListItem` | **partiel** — même coupure |
| `/library` (`library`) | Ma bibliothèque, filtrée par statut et type | `tracking`, `media` | `Entry`, `Media` | **livré** |
| `/lists` (`lists.root`) | Mes listes | `lists`, `media`, `preferences` | `List`, `ListItem` | **livré** |
| `/lists/[id]` (`lists.detail`) | Une liste, réordonnable | `lists`, `media`, `command` | `List`, `ListItem`, `Media` | **livré** |
| `/lists/[id]/[viewId]` (`lists.view`) | Une vue posée sur une liste | — | `ListView`, `ListViewItem` | **déclaré, non construit** — reporté (PRODUCT.md §6) |
| `/l/[token]` (`share.detail`) | Une liste partagée, **hors app authentifiée** | `lists` | `List`, `ListItem` | **livré** |
| `/u/[username]` (`profile`) | Profil d'un membre : statistiques, journal | `profile` | `User`, `Entry`, `EntryEvent` | **livré** |
| `/calendar` (`calendar`) | Planning de diffusion, filtré sur ce qu'on suit | `media`, `tracking`, `preferences` | `Media`, `Entry` | **partiel** — même coupure |
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
les actions `saveEntry`, `removeEntry`. La feature la plus consommée : cinq routes en dépendent.

**`lists`** — les listes et leur contenu.
Expose `getMyLists`, `getListById`, `getSharedList`, `getListsForMedia`, et huit actions
(`createList`, `updateList`, `deleteList`, `shareList`, `unshareList`, `addToList`,
`reorderListItem`, `removeFromList`). L'ordre passe par `fractional-indexing` (`lib/list-reorder`),
le partage par un jeton (`lib/share-token`), jamais par l'`id`.

**`profile`** — la vue publique d'un membre. `getProfileStats`, `getProfileTimeline`. Compose
`tracking` et `media` sans leur appartenir.

**`preferences`** — les réglages d'affichage, lus par presque tous les écrans.
`getPreferences` et l'action `updatePreferences`. Porte `titleLanguage` et ses valeurs par défaut.

**`command`** — la palette `⌘K`. `getCommandResults`, servie par `api/command` en `GET`.

---

## Contrôle de santé

Relevé le 19 août 2026. **À rejouer et à redater dès qu'on prétend s'y fier.**

| Commande | Résultat |
| --- | --- |
| `pnpm typecheck` | propre |
| `pnpm test` | 177 tests, 13 fichiers |
| `pnpm lint` | 234 fichiers, aucune correction |
| `pnpm knip` | aucun signalement |

**Écarts connus :**

- Les composants React ne sont couverts par **aucun test** : les 13 fichiers de test portent tous
  sur des helpers purs, des schémas ou le proxy. Playwright est prévu (PRODUCT.md §7) et pas posé.
- `/collection` est déclarée dans `routes.ts` sans écran derrière. Rien ne pointe dessus — ni la
  navigation, ni la palette. `routes.ts` le dit lui-même dans son commentaire.

---

## Le prochain pas

**Appliquer `tryAniList` à `/search`, `/calendar` et `/media/[id]`.**

L'accueil survit à une coupure d'AniList depuis le 15 août : il se lit dans le miroir local et
affiche un encadré à la place du catalogue. Les trois autres écrans tombent encore en entier sur
`app/error.tsx`. Le mécanisme est écrit et éprouvé (`src/lib/http/anilist.ts`,
`isAniListOutage`) ; il reste à dessiner l'état vide de chaque écran — un seul message par page.

Les deux règles à respecter en le faisant sont dans
[ARCHITECTURE.md](./ARCHITECTURE.md) : le repli se fait **hors** du `"use cache"`, et une erreur ne
traverse pas `"use cache"` intacte.

### Ensuite, peut-être

Sans engagement, et sans ordre : la collection physique (`/collection`, V1.5), les tests de
composants, l'ordre de visionnage d'une franchise (PRODUCT.md §8, meilleur rapport valeur/effort du
projet).
