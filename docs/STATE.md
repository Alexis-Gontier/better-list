# Où on en est

> **Ce document se met à jour dans le commit qui le périme, jamais après.**
> Un état des lieux tenu après coup est un journal — et on sait ce que devient un journal qu'on ne
> relit pas ([docs/journal/](./journal/)).

[PRODUCT.md](./PRODUCT.md) dit ce qu'on veut construire. Ce fichier dit ce qui **est** construit.
Quand les deux se contredisent, c'est ce fichier qui a raison sur le présent, et PRODUCT.md sur
l'intention.

Relevé le **6 septembre 2026**.

> ### En un mot : la reconstruction a commencé, par la fiche.
>
> La mise à blanc du 5 septembre avait supprimé **toute** la présentation. Depuis le 6 septembre,
> `/media/[id]` a de nouveau un écran réel — son **hero**, et lui seul. Les neuf autres routes
> construites restent des placeholders.
>
> **La barre de suivi de la fiche n'enregistre rien.** Elle est dessinée, ses contrôles répondent au
> clic, et son état disparaît au rechargement : les Server Actions attendent que la mise en page
> soit validée. C'est écrit dans le fichier, à trois endroits, pour qu'on ne la prenne pas pour
> fonctionnelle en la relisant.
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
| `/media/[id]` (`media`) | Fiche d'une œuvre, suivi, journal, ajout aux listes | `Media`, `Entry`, `EntryEvent`, `ListItem` | **hero livré** — le reste de la page et tout le suivi restent à écrire |
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

La colonne « Features consommées » avait disparu de ce tableau quand plus aucune route ne consommait
de feature. Elle reviendra quand plus d'une route en consommera : aujourd'hui, `/media/[id]` est la
seule, et elle lit `media`, `preferences` et `tracking`.

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

### La fiche du 6 septembre 2026 — ce qu'elle a, et ce qu'elle n'a pas

**Séance de reconstruction, hors de l'ordre annoncé plus bas** : `/media/[id]` a été prise avant
`/search`, à la demande d'Alexis. La mise en page du hero est dictée par lui, écran par écran ; la
logique est écrite sans consigne préalable.

Ce qui est **à l'écran** : bannière pleine largeur avec son cas nul, jaquette calée par le bas sur la
même ligne que la barre de suivi, titre et titres secondaires, cinq faits (format, statut, compteur,
saison, studio **ou** auteur selon le type), la barre de suivi, un séparateur, le synopsis.

Ce qui est **écrit côté serveur** : [`preferences.queries.ts`](../src/features/preferences/server/preferences.queries.ts)
(`getPreferences`, dédupliqué par `cache` de React, jamais `"use cache"` — il dépend du visiteur),
[`media.queries.ts`](../src/features/media/server/media.queries.ts) (`getMediaById`, dont **seule la
lecture brute est cachée**, clé sur l'id seul : mettre `includeAdult` dans la clé aurait doublé les
requêtes AniList pour un document identique) et [`media.mirror.ts`](../src/features/media/server/media.mirror.ts)
(le repli sur la copie locale).

**La barre de suivi n'enregistre rien.** Ses trois contrôles —
[`entry-status-select`](../src/features/tracking/components/entry-status-select.tsx),
[`entry-progress-stepper`](../src/features/tracking/components/entry-progress-stepper.tsx),
[`entry-score-rating`](../src/features/tracking/components/entry-score-rating.tsx) — vivent dans
`features/tracking/components/` parce qu'ils connaissent des entités métier et serviront à d'autres
écrans. Ils sont **promus avant leur deuxième appelant**, ce que la règle de promotion
d'ARCHITECTURE.md interdit d'ordinaire : décision d'Alexis, prise en sachant que `/search` et
`/library` les demanderont. Le bouton ± lui-même ne connaît rien du métier et vit donc dans
[`components/shared/step-button.tsx`](../src/components/shared/step-button.tsx).

**Le repli de panne a été posé plus tôt que prévu, et pour une bonne raison** : AniList était coupée
le jour de la séance (403, « temporarily disabled »). Sans lui, la fiche était une page d'erreur et
rien n'était vérifiable à l'écran. Il n'est donc pas théorique — il a été vu fonctionner.

Ce qui **manque** est inventorié case par case dans [fiche-media.md](./fiche-media.md) : 72 lignes,
15 cochées. Le gros restant, dans l'ordre où ça se posera : les Server Actions du suivi, le journal,
les onglets lourds (personnages, équipe, œuvres liées, recommandations), les chiffres de la
communauté, et l'ajout à une liste.

`button-group` a été installé au passage (le registre shadcn), ce qui porte l'inventaire à 31
composants. Son installation a laissé deux dégâts, tous deux corrigés : un import `from "cn"` que le
CLI n'a pas réécrit, et un **paquet npm parasite nommé `cn`** que `knip` a attrapé.

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

**33 fichiers, dont 10 de tests.** La couche `server/` reprend forme — trois lectures, toujours
aucune action —, et `tracking` retrouve des composants.

| Feature | Ce qu'elle contient |
| --- | --- |
| **`media`** | `lib/` : `media-format`, `media-freshness`, `media-season`, `search-params` (tous testés). `schemas/` : `media.schema`, `search-media.schema`. `server/` : `media.documents` (les documents GraphQL), `media.queries` (la fiche, cachée un jour), `media.mirror` (le repli de panne). |
| **`tracking`** | `lib/` : `entry-draft`, `entry-format`, `entry-transition` (testés), `library-params`. `schemas/tracking.schema`. `components/` : `entry-status-select`, `entry-progress-stepper`, `entry-score-rating` — **l'interface seule, aucun ne persiste quoi que ce soit**. |
| **`preferences`** | `schemas/preferences.schema` et `server/preferences.queries` — les préférences du compte courant, sans cache, parce qu'elles dépendent du visiteur. |
| **`lists`** | `lib/` : `list-reorder` (fractional-indexing), `share-token` — testés tous les deux. `schemas/lists.schema`. |
| **`command`** | `schemas/command.schema` seul — il porte la règle du « +1 ». |
| **`profile`** | *supprimée en entier* — elle n'était que des queries, et `/u/[username]` était son seul consommateur. |

`lib/http/anilist.ts` n'a pas bougé : c'est du transport, il vit dans `lib/` et non dans une feature.
Avec `media.documents.ts` et `media.queries.ts`, l'intégration AniList est de nouveau complète — le
transport, les documents, et le cache qui les relie.

---

## Contrôle de santé

Relevé le 6 septembre 2026, après le hero de la fiche. **À rejouer et à redater dès qu'on prétend
s'y fier.**

| Commande | Résultat |
| --- | --- |
| `pnpm typecheck` | propre — `noUncheckedIndexedAccess` et `verbatimModuleSyntax` actifs |
| `pnpm test` | **199 passés, 1 en pause**, 17 fichiers (191 la veille) |
| `pnpm lint` | 161 fichiers, aucune correction (143 la veille) |
| `pnpm build` | 17 pages, un seul route handler ; `/media/[id]` en rendu partiel |
| `pnpm knip` | aucun signalement — **mais sous gel**, voir ci-dessous |

**Écarts connus :**

- **Le canari de la frontière server/client est toujours en pause, et son voisin ne garde toujours
  rien.** C'est l'écart le plus important de cette page. `architecture.test.ts` vérifie qu'aucun
  module `"use client"` n'importe un Server Component `async` — et, juste après, qu'il en trouve au
  moins un, pour que le premier test ne passe pas au vert en parcourant un ensemble vide.

  **La fiche du 6 septembre n'a pas suffi à le rallumer, contrairement à ce qui était annoncé ici.**
  Elle pose bien un composant serveur `async`, mais **interne à sa page**, et la détection ne regarde
  que les composants *exportés* — à juste titre, puisqu'un composant qu'on n'exporte pas ne peut être
  importé par personne. Le retirer maintenant ferait échouer le test.

  La formulation a donc été corrigée dans le fichier : **le premier module qui _exporte_ un Server
  Component `async` retire ce `.skip`.** Ce sera un composant de `features/*/components/`, très
  probablement le panneau de suivi. En attendant, le test voisin ne garde rien.
- **`pnpm knip` est vert sous gel.** `knip.jsonc` porte un bloc `ignoreIssues` couvrant 9 fichiers
  et 9 chemins d'exports ou de types, plus `ignoreDependencies` pour cinq familles (`@dnd-kit`, `embla`,
  `cmdk`, `react-hotkeys-hook`, `next-safe-action`). Ce ne sont pas des faux positifs : ce code est
  réellement sans appelant, parce qu'aucun écran n'existe. Le gel est posé **par chemin** et non en
  `exclude` global, pour que knip continue de signaler le code mort partout ailleurs. Chaque entrée
  nomme ce qu'elle attend : c'est la liste de reconstruction, et le bloc doit avoir disparu quand les
  routes sont refaites. **Première entrée à bouger, le 6 septembre** : `media.documents.ts` a
  retrouvé un importateur et passe donc du gel « fichier » au gel « exports » — `MEDIA_BY_ID_QUERY`
  est consommée, ses cinq sœurs attendent leur écran.
- Les composants React ne sont couverts par **aucun test de rendu**, et il y en a de nouveau —
  le hero de la fiche et ses contrôles de suivi. Ils ont été vérifiés à l'écran, pas par un test.
  Playwright est prévu (PRODUCT.md §7) et pas posé.
- **La barre de suivi de la fiche est une coquille.** Ses trois contrôles répondent au clic, leur
  état vit dans le composant et disparaît au rechargement. Ce n'est pas une régression, c'est l'ordre
  choisi : la mise en page se valide avant qu'on écrive les Server Actions.
- Le repli de panne AniList n'est vérifié par **aucun test**, mais il a été **vu fonctionner** le
  6 septembre : AniList était réellement coupée ce jour-là, et la fiche s'est servie du miroir. Il
  reste à re-poser écran par écran pour les autres routes.
- « Retirer de ma bibliothèque » figure au menu de la fiche **sans confirmation**. Sans conséquence
  aujourd'hui — l'entrée ne fait rien —, mais c'est une action destructive : elle doit passer par
  `alert-dialog`, déjà installé, le jour où elle écrira.
- Le miroir `Media` n'est plus rafraîchi : le cron est supprimé (voir plus haut).
- `/collection` est déclarée dans `routes.ts` sans écran derrière, comme avant la mise à blanc.
  `routes.ts` le dit lui-même dans son commentaire.

---

## Le prochain pas

**Dessiner `/search`, puis `/library`.** L'ordre ci-dessous a déjà été enfreint une fois, en
connaissance de cause : `/media/[id]` a été prise avant, à la demande d'Alexis, et son hero est
livré. La suite reprend l'ordre annoncé.

### Le socle visuel est en place — et c'est tout ce qui a été repris

`styles/globals.css` porte les tokens « Obsidienne » et `styles/fonts.ts` charge Archivo, désaliasé
de `--font-sans`. `@layer base` applique déjà `font-heading` aux `h1`, `h2` et `h3` : le titrage est
en place avant qu'un seul écran soit écrit.

Ces deux commits viennent de la branche `refonte-design`, par cherry-pick. **Rien d'autre n'en a été
repris.** Cette branche était un essai : ses 13 autres commits — les six composants shadcn, les deux
variants, la `MediaCard`, la grille, la coquille catalogue, `/search` et `/library` — ne sont pas des
patchs à appliquer. La reconstruction repart de zéro sur les tokens.

**La branche a été supprimée le 5 septembre 2026**, une fois les deux commits de style sur `main`.
Le dépôt n'a donc plus qu'une seule branche. Ne pas la chercher : ses 13 commits non repris ne sont
plus atteignables, et le prochain `git gc` les effacera pour de bon.

Ce qu'ils avaient résolu — la coquille catalogue, les filtres avancés, la `MediaCard` signée, la
grille dense — est donc à retrouver par le raisonnement, pas par la lecture. La spec citée plus bas
en garde l'intention ; l'implémentation, elle, est perdue et c'était le choix assumé.

### ⚠️ Le plan du 2 septembre est un document d'intention, pas une liste de tâches

Ses 54 cases sont vides et le resteront : le
[plan](./superpowers/plans/2026-09-02-refonte-design-fondations.md) a été exécuté une fois, sur une
branche depuis supprimée. Ses tâches 1 et 2 sont faites — elles sont sur `main`. Ses tâches 3 à 10
décrivent des fichiers qui n'existent plus, et l'implémentation qui les avait honorées n'existe plus
non plus : elles sont à refaire, pas à retrouver.

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
   (`search-params.ts`, `library-params.ts`). Les trois contrôles de suivi les attendent déjà dans
   `features/tracking/components/`, promus d'avance pour eux.
2. `/media/[id]` — **le hero est fait** (6 septembre). Reste le suivi qui écrit vraiment, le journal,
   les onglets lourds et les chiffres de la communauté. L'inventaire à cocher est dans
   [fiche-media.md](./fiche-media.md).
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
