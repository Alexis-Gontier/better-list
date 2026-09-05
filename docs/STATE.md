# Où on en est

> **Ce document se met à jour dans le commit qui le périme, jamais après.**
> Un état des lieux tenu après coup est un journal — et on sait ce que devient un journal qu'on ne
> relit pas ([docs/journal/](./journal/)).

[PRODUCT.md](./PRODUCT.md) dit ce qu'on veut construire. Ce fichier dit ce qui **est** construit.
Quand les deux se contredisent, c'est ce fichier qui a raison sur le présent, et PRODUCT.md sur
l'intention.

Relevé le **5 septembre 2026**.

> ### En un mot : l'app n'a plus d'écran.
>
> La mise à blanc du 5 septembre a supprimé **toute** la présentation. Les dix routes construites
> sont des placeholders ; seule l'authentification affiche encore quelque chose de réel. Ce qui
> reste sous `src/` est le socle et les acquis testés — décrits plus bas, et volontairement choisis.
>
> **Ne pas lire ce fichier comme un constat de panne.** Rien n'est cassé : c'est un chantier, et
> l'ordre de reconstruction est au bas de la page.

---

## La carte

Chaque route et où elle en est. La clé entre parenthèses est celle de
[`src/config/routes.ts`](../src/config/routes.ts) — aucun chemin ne s'écrit en dur.

| Route | Rôle | Modèles | État |
| --- | --- | --- | --- |
| `/` (`home`) | Bandeau de reprise, chiffres, rangée « En cours », listes, découverte | `Entry`, `EntryEvent`, `Media`, `List` | **vidé** — en refonte |
| `/search` (`search`) | Recherche du catalogue, filtres en URL | `Media`, `Entry` | **vidé** — en refonte |
| `/media/[id]` (`media`) | Fiche d'une œuvre, suivi, journal, ajout aux listes | `Media`, `Entry`, `EntryEvent`, `ListItem` | **vidé** — en refonte |
| `/library` (`library`) | Ma bibliothèque, filtrée par statut, type et genre | `Entry`, `Media` | **vidé** — en refonte |
| `/lists` (`lists.root`) | Mes listes | `List`, `ListItem` | **vidé** — en refonte |
| `/lists/[id]` (`lists.detail`) | Une liste, réordonnable | `List`, `ListItem`, `Media` | **vidé** — en refonte |
| `/lists/[id]/[viewId]` (`lists.view`) | Une vue posée sur une liste | `ListView`, `ListViewItem` | **déclaré, non construit** — reporté (PRODUCT.md §6) |
| `/l/[token]` (`share.detail`) | Une liste partagée, **hors app authentifiée** | `List`, `ListItem` | **vidé** — en refonte |
| `/u/[username]` (`profile`) | Profil d'un membre : statistiques, journal | `User`, `Entry`, `EntryEvent` | **vidé** — en refonte |
| `/calendar` (`calendar`) | Planning de diffusion, filtré sur ce qu'on suit | `Media`, `Entry` | **vidé** — en refonte |
| `/settings` (`settings`) | Préférences d'affichage | `UserPreferences` | **vidé** — en refonte |
| `/collection` (`collection.root`) | Mon étagère : séries possédées, tomes manquants | `Edition`, `OwnedVolume` | **déclaré, non construit** |
| `/collection/[mediaId]` (`collection.detail`) | Une série : tomes, plages, prêts | `Edition`, `OwnedVolume` | **déclaré, non construit** |
| `/login` · `/signup` · `/waitlist` (`auth.*`) | Connexion GitHub, liste d'attente | `User`, `Session`, `Account` | **livré** — seul écran réel |

La colonne « Features consommées » a disparu de ce tableau : plus aucune route ne consomme de
feature, puisqu'il ne reste ni query ni action. Elle reviendra avec les écrans.

Les tables `ListView`, `ListViewItem`, `Edition` et `OwnedVolume` existent au schéma depuis la
migration initiale et ne sont employées par aucun écran. C'était déjà vrai avant la mise à blanc, et
c'est voulu — PRODUCT.md §6 dit pourquoi.

### La mise à blanc du 5 septembre 2026

Trois passes le même jour, de plus en plus larges.

**La première** a vidé cinq arbres de routes — l'accueil, `/search`, `/library`, `/calendar`,
`/lists` et `/lists/[id]` : 38 fichiers d'UI, plus 7 modules orphelins par ricochet
(`media-carousel`, `view-toggle`, `list-card`, `media-row`, `use-search-filters`,
`use-library-filters`, `entry-card-actions`). Le diagnostic est celui de la spec du 2 septembre :
les écrans avaient été construits par ajout, et `/search` et `/library` étaient le même écran écrit
deux fois.

**La deuxième** a emporté trois composants de `features/tracking/` que la première laissait sans
importateur : `entry-dialog`, `entry-form`, `entry-quick-progress` — 647 lignes de rendu.

**La troisième** a étendu la mise à blanc aux quatre routes qui tenaient encore (`/media/[id]`,
`/u/[username]`, `/settings`, `/l/[token]`) et à tout ce qu'elles faisaient vivre : les composants,
les queries et les actions de `features/`, `components/shared/media-grid` et `pagination`, la palette
`⌘K` avec son route handler `api/command`, et le rafraîchissement du miroir avec `api/cron`.

#### Ce qui a été gardé, et pourquoi

Le choix n'est pas « ce qui restait » mais « ce qui coûte cher à réécrire et ne dépend d'aucun
écran ». Quatre familles :

1. **Les `page.tsx` des dix routes**, réduits à un placeholder
   ([`components/shared/route-under-construction.tsx`](../src/components/shared/route-under-construction.tsx)),
   jamais effacés. `routes.home` est la cible de redirection après connexion, le `callbackURL`
   GitHub, la sortie de la liste d'attente et le repli de `proxy.ts` ; `config/navigation.ts` pointe
   vers les autres. Effacer les fichiers aurait fait atterrir toute connexion sur un 404.
2. **Les helpers purs et leurs tests** — 10 fichiers, **133 des 192 tests**. Transitions de statut,
   brouillon d'entrée, formatage, saison, fraîcheur du miroir, `fractional-indexing`, jeton de
   partage. Aucun ne dépend d'un écran.
3. **Les schémas Zod**, qui tiennent lieu de `src/types/` (ARCHITECTURE.md) : c'est la forme du
   domaine, et elle ne change pas parce que l'apparence change.
4. **Trois acquis coûteux** : [`media.documents.ts`](../src/features/media/server/media.documents.ts)
   et ses 488 lignes de GraphQL AniList (sélection de champs, budget de requêtes),
   [`lib/safe-action.ts`](../src/lib/safe-action.ts) qui porte `actionClient` et `authActionClient`,
   et les contrats d'URL (`calendar-params`, `profile-params`, `search-params`) — la forme des liens
   qu'on peut envoyer est une décision produit, pas un rendu.

Tout le reste — le rendu — a été **supprimé plutôt que gelé**. Geler du code qu'on sait devoir jeter,
c'est se promettre de le relire une fois de trop.

#### Ce que ça a coûté, sans arrondi

- **`api/cron/refresh-media` et `vercel.json` sont supprimés.** Le miroir `Media` n'est donc plus
  rafraîchi quotidiennement en production. `CRON_SECRET` reste déclaré dans `config/env.ts`, sans
  emploi, avec un commentaire qui le dit — le cron revient à la reconstruction.
- **`api/command` est supprimé** avec la palette `⌘K` qu'il servait. Son schéma survit : il porte la
  règle du « +1 », dont `command.queries.ts` était le seul autre dépositaire.
- **Le canari de `architecture.test.ts` est en `.skip`.** Voir les écarts connus — c'est le point le
  plus important de cette page.

### Le seul route handler restant

Il ne vit pas sous le layout `(app)` et le `matcher` du proxy exclut `api/` : il porte sa propre
garde.

| Handler | Rôle | Sa garde |
| --- | --- | --- |
| `api/auth/[...all]` | Better Auth | celle de Better Auth |

`api/command` et `api/cron/refresh-media` ont été supprimés par la mise à blanc, avec le code qu'ils
appelaient.

### Et trois conventions de fichier

| Fichier | Rôle |
| --- | --- |
| `app/robots.ts` | `disallow: "/"` **total**. `/l/<jeton>` s'ouvre sans session : un lien secret indexé n'est plus un secret, il est cherchable. Le placeholder de `/l/[token]` porte en plus son propre `noindex`. |
| `app/icon.tsx` | L'icône d'onglet, dessinée par `ImageResponse` — aucun binaire à relire dans `public/`. |
| `instrumentation.ts` | `onRequestError` : relie le `digest` qu'`error.tsx` affiche au visiteur à une ligne de journal cherchable. |

---

## Ce qui reste dans `features/`

**27 fichiers, dont 10 de tests.** Plus aucune query, aucune action, aucun composant — la couche
`server/` a disparu à l'exception de `media.documents.ts`.

| Feature | Ce qui reste |
| --- | --- |
| **`media`** | `lib/` : `media-format`, `media-freshness`, `media-season`, `search-params` (tous testés). `schemas/` : `media.schema`, `search-media.schema`. `server/media.documents.ts` — les documents GraphQL. |
| **`tracking`** | `lib/` : `entry-draft`, `entry-format`, `entry-transition` (testés), `library-params`. `schemas/tracking.schema`. |
| **`lists`** | `lib/` : `list-reorder` (fractional-indexing), `share-token` — testés tous les deux. `schemas/lists.schema`. |
| **`preferences`** | `schemas/preferences.schema` seul — `titleLanguage` et ses valeurs par défaut. |
| **`command`** | `schemas/command.schema` seul — il porte la règle du « +1 ». |
| **`profile`** | *supprimée en entier* — elle n'était que des queries, et `/u/[username]` était son seul consommateur. |

`lib/http/anilist.ts` n'a pas bougé : c'est du transport, il vit dans `lib/` et non dans une feature.
Avec `media.documents.ts`, l'intégration AniList est donc intacte des deux côtés — seul le cache qui
les reliait (`media.queries.ts`) est parti.

---

## Contrôle de santé

Relevé le 5 septembre 2026, après la mise à blanc. **À rejouer et à redater dès qu'on prétend s'y
fier.**

| Commande | Résultat |
| --- | --- |
| `pnpm typecheck` | propre — `noUncheckedIndexedAccess` et `verbatimModuleSyntax` actifs |
| `pnpm test` | **191 passés, 1 en pause**, 16 fichiers (192 avant) |
| `pnpm lint` | 143 fichiers, aucune correction (246 avant la mise à blanc) |
| `pnpm build` | 17 pages (19 avant), un seul route handler |
| `pnpm knip` | aucun signalement — **mais sous gel**, voir ci-dessous |

**Écarts connus :**

- **Le canari de la frontière server/client est en pause, et son voisin ne garde plus rien.** C'est
  l'écart le plus important de cette page. `architecture.test.ts` vérifiait qu'aucun module
  `"use client"` n'importe un Server Component `async` — et, juste après, qu'il en trouvait au moins
  un, pour que le premier test ne passe pas au vert en parcourant un ensemble vide. Il n'en reste
  aucun dans le dépôt : ils vivaient tous dans `features/*/components/`. Le canari a donc échoué
  exactement comme il devait, et il est passé en `.skip` plutôt qu'abaissé à `>= 0` — l'abaisser
  aurait rendu le problème invisible au lieu de le rendre visible. **En attendant, le test voisin ne
  garde rien.** Le premier écran reconstruit qui pose un Server Component `async` doit retirer ce
  `.skip`.
- **`pnpm knip` est vert sous gel.** `knip.jsonc` porte un bloc `ignoreIssues` couvrant 10 fichiers
  et 8 chemins d'exports/types, plus `ignoreDependencies` pour cinq familles (`@dnd-kit`, `embla`,
  `cmdk`, `react-hotkeys-hook`, `next-safe-action`). Ce ne sont pas des faux positifs : ce code est
  réellement sans appelant, parce qu'aucun écran n'existe. Le gel est posé **par chemin** et non en
  `exclude` global, pour que knip continue de signaler le code mort partout ailleurs. Chaque entrée
  nomme ce qu'elle attend : c'est la liste de reconstruction, et le bloc doit avoir disparu quand les
  routes sont refaites.
- Les composants React ne sont couverts par **aucun test de rendu** — mais il n'y a plus de
  composant à couvrir, hors le chrome. Playwright est prévu (PRODUCT.md §7) et pas posé.
- Le repli de panne AniList n'est vérifié par **aucun test**, et la mise à blanc a emporté ses six
  appelants. Il ne reste que `tryAniList` (`lib/http/anilist.ts`) et ses propres tests. Le repli est
  donc à **re-poser écran par écran** pendant la reconstruction — un chemin qu'on ne voit jamais en
  développement, puisqu'il demande qu'une API tierce soit en panne.
- Le miroir `Media` n'est plus rafraîchi : le cron est supprimé (voir plus haut).
- `/collection` est déclarée dans `routes.ts` sans écran derrière, comme avant la mise à blanc.
  `routes.ts` le dit lui-même dans son commentaire.

---

## Le prochain pas

**Dessiner `/search`, puis `/library`. Le socle visuel est posé ; tout le reste est à écrire.**

### Le socle visuel est en place — et c'est tout ce qui a été repris

`styles/globals.css` porte les tokens « Obsidienne » et `styles/fonts.ts` charge Archivo, désaliasé
de `--font-sans`. `@layer base` applique déjà `font-heading` aux `h1`, `h2` et `h3` : le titrage est
en place avant qu'un seul écran soit écrit.

Ces deux commits viennent de la branche `refonte-design`, par cherry-pick. **Rien d'autre n'en sera
repris.** Cette branche était un essai : ses 13 autres commits — les six composants shadcn, les deux
variants, la `MediaCard`, la grille, la coquille catalogue, `/search` et `/library` — ne sont pas des
patchs à appliquer. La reconstruction repart de zéro sur les tokens.

`refonte-design` reste au dépôt en lecture seule. On peut y aller voir comment un problème avait été
résolu ; on n'y cherche pas de code à ramener.

### ⚠️ Le plan du 2 septembre est un document d'intention, pas une liste de tâches

Ses 54 cases sont vides et le resteront : le
[plan](./superpowers/plans/2026-09-02-refonte-design-fondations.md) a été exécuté une fois, sur
`refonte-design`, et cette exécution est abandonnée. Ses tâches 1 et 2 sont faites (elles sont sur
`main`) ; les tâches 3 à 10 décrivent des fichiers qui n'existent plus.

En revanche, la **spec** qui l'a produit reste valable et vaut la lecture avant de dessiner :
[2026-09-02-refonte-design-ui-design.md](./superpowers/specs/2026-09-02-refonte-design-ui-design.md).
Elle fixe le principe directeur — *la jaquette est la seule chose colorée de l'écran* — et les quatre
seuls emplois autorisés de l'accent. C'est de l'intention visuelle, elle ne périme pas avec le code.

Et la leçon de la séance, qui vaut pour n'importe quelle conclusion sur ce dépôt : **un fichier de
plan décrit une intention, seul `git branch` décrit un dépôt.**

### Une route par branche

L'ordre est choisi, et l'accueil est volontairement dernier — c'est l'écran qui compose le
vocabulaire de tous les autres.

1. `/search`, puis `/library` — **ensemble, et sur une coquille commune à écrire.** C'est le premier
   gain réel de la refonte : ces deux écrans étaient le même, écrit deux fois, et c'est ce doublon
   qui a motivé toute l'opération. Chaque écran demande sa query (`searchMedia`, `getLibrary`), sa
   grille et sa barre de filtres — les contrats d'URL, eux, existent déjà et sont gelés
   (`search-params.ts`, `library-params.ts`).
2. `/media/[id]` — la fiche, et avec elle le premier Server Component `async` : c'est cette branche
   qui doit retirer le `.skip` du canari.
3. `/calendar` — se rebranche sur `airing-week.ts` et `calendar-params.ts`, épargnés.
4. `/lists`, puis `/lists/[id]`, puis `/l/[token]` — le réordonnancement revient, `@dnd-kit` sort du
   gel, et le jeton de partage retrouve un écran.
5. `/settings` et `/u/[username]` — les deux plus petits, une fois les préférences relues.
6. `/` — en dernier, avec le vocabulaire complet sous les yeux.

Hors de cet ordre, à replacer quand ça arrange : la palette `⌘K` et son `api/command`, et le cron de
rafraîchissement du miroir avec son `vercel.json`.

Chaque branche retire du bloc `ignoreIssues` de `knip.jsonc` les entrées que sa route rebranche.
Quand la dernière part, le bloc entier part avec elle.

### Ensuite, peut-être

Sans engagement, et sans ordre : Playwright et le repli de panne AniList (à re-poser de toute façon
pendant la reconstruction), la collection physique (`/collection`, V1.5), l'ordre de visionnage
d'une franchise (PRODUCT.md §8, meilleur rapport valeur/effort du projet).
