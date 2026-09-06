# Où on en est

> **Ce document se met à jour dans le commit qui le périme, jamais après.**
> Un état des lieux tenu après coup est un journal — et on sait ce que devient un journal qu'on ne
> relit pas ([docs/journal/](./journal/)).

[PRODUCT.md](./PRODUCT.md) dit ce qu'on veut construire. Ce fichier dit ce qui **est** construit.
Quand les deux se contredisent, c'est ce fichier qui a raison sur le présent, et PRODUCT.md sur
l'intention.

Relevé le **6 septembre 2026**.

> ### En un mot : trois écrans sur onze, et le catalogue est entier.
>
> La mise à blanc du 5 septembre avait supprimé **toute** la présentation. Depuis le 6 septembre,
> trois routes ont de nouveau un écran réel : `/media/[id]` (son **hero**, et lui seul), puis
> **`/search` et `/library` en entier** — barre, facettes, grille, pagination, et le repli sur le
> miroir local quand AniList tombe. Les huit autres routes construites restent des placeholders.
>
> **C'était le premier gain de la refonte, et il est encaissé** : `/search` et `/library` étaient le
> même écran écrit deux fois, et ce doublon est ce qui a motivé toute l'opération. Ils partagent
> désormais quatre pièces — la carte, la grille, la coquille de filtres et la pagination — et ne
> diffèrent plus que par leur source : AniList et son quota d'un côté, mes lignes `Entry` de
> l'autre.
>
> **Et le suivi s'enregistre.** `saveEntry` et `removeEntry` sont les **premières Server Actions du
> dépôt** — il n'en existait aucune depuis la mise à blanc. Les trois écrans écrivent : la fiche au
> geste, la fenêtre d'édition rapide d'une vignette au bouton. `EntryEvent` se remplit donc à partir
> d'aujourd'hui, et comme il n'est pas rétroactif, c'est une date qui compte.
>
> Ce qui **n'écrit toujours pas** : l'ajout à une liste, le favori, les tomes possédés — leurs
> écrans n'existent pas.
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
| `/search` (`search`) | Recherche du catalogue, filtres en URL | `Media`, `Entry` | **livré** — barre, panneau, grille AniList, pagination, repli sur le miroir |
| `/media/[id]` (`media`) | Fiche d'une œuvre, suivi, journal, ajout aux listes | `Media`, `Entry`, `EntryEvent`, `ListItem` | **hero livré, suivi fonctionnel** — restent le journal, les onglets lourds et les listes |
| `/library` (`library`) | Ma bibliothèque, filtrée par statut et type | `Entry`, `Media` | **livré** — rangée de statuts, barre, grille Prisma, pagination |
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
de feature. **Trois routes en consomment maintenant**, et elle n'est pas revenue pour autant : les
trois lisent le même trio — `media`, `preferences` et `tracking` —, donc une colonne qui répéterait
trois fois la même liste n'apprendrait rien. Elle reviendra le jour où deux routes ne liront pas la
même chose.

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

### Le catalogue du 6 septembre 2026 — `/search` et `/library`, ensemble

**La séance reprend l'ordre annoncé au bas de cette page**, après le détour par la fiche. Les deux
écrans ont été dessinés dans la même passe et sur une coquille commune, parce que c'est exactement
le doublon qu'on refusait de refaire.

Ce qui est **à l'écran**, sur `/search` : la barre — terme borné, type, tri —, le panneau dépliant
en trois colonnes (format en cases à cocher, statut, pays d'origine, genres, saison, plage d'années,
note minimale), la rangée de puces actives avec sa croix par facette et son « Tout effacer », puis
la grille de vingt et une cartes et sa pagination.

Sur `/library` : la **rangée de statuts** en tête — six statuts plus « Tout », chacun avec son
compte —, puis une barre plus courte (terme, type, tri), la grille et sa pagination. L'ordre
n'est pas cosmétique : un catalogue se parcourt par ce qu'on cherche, une bibliothèque par où on en
est, donc le statut est l'axe de l'écran et non une facette rangée dans un panneau.

Ce qui est **écrit côté serveur** :

- [`media.queries.ts`](../src/features/media/server/media.queries.ts) gagne `searchMedia`, et
  [`media.documents.ts`](../src/features/media/server/media.documents.ts) les trois arguments qui
  lui manquaient — `startDate_greater` / `_lesser` pour la plage d'années (et **pas** `seasonYear`,
  que la doc d'AniList donne pour dépendant de `season`), et `averageScore_greater` pour la note.
- [`media.mirror.ts`](../src/features/media/server/media.mirror.ts) : `searchMediaInMirror` remplace
  l'échantillon qui tenait lieu de grille. C'est un vrai repli, paginé en base, **et il rapporte ce
  qu'il a perdu** — les tags, qu'on ne stocke pas, et les tris par tendance, popularité ou favoris,
  que le miroir ne copie pas.
- [`library.queries.ts`](../src/features/tracking/server/library.queries.ts) : `getLibrary`,
  `getLibraryStatusCounts`. Aucun cache, ni `"use cache"` ni `cache` de React, et le fichier dit
  pourquoi pour chacun des deux. (`getLibraryGenres` a été retirée le 6 septembre 2026 avec le
  filtre de genre de la bibliothèque — décision d'Alexis : on ne cherche pas par genre dans
  quelques centaines de lignes qu'on a soi-même choisies.)

**La trouvaille de la séance : `pageInfo.total` d'AniList est plafonné à 5000.** Vérifié en
interrogeant l'endpoint — `type: ANIME` seul, puis avec la saison, puis avec la plage d'années, puis
avec la note : les quatre répondent exactement `5000`. Ce n'est pas un compte, c'est une butée, et
`lastPage` en hérite. La pagination annonçait **238 pages dont 226 vides**. Elle ne croit plus ce
compteur : sous le plafond `lastPage` est exact et s'affiche, au plafond on ne suit que
`hasNextPage`. Les filtres, eux, s'appliquaient bien — c'est le compteur seul qui mentait.

**Quatre pièces sont promues au deuxième appelant**, comme la règle le veut : `MediaCard` →
`features/media/components/`, la grille et la coquille de filtres → `components/shared/`, et la
pagination → `components/shared/` à son tour. Le **panneau de facettes n'est pas promu** :
`/library` n'en a pas, donc `FacetColumn`, `ChipGroup`, `RangeSlider` et `CheckboxList` n'auraient
toujours qu'un consommateur.

**Six couleurs de statut, et c'est un écart assumé à la spec** (décision d'Alexis). La spec du
2 septembre autorise l'accent sur « le marqueur de suivi sur une jaquette » ; on passe d'une couleur
qui dit « suivi » à six qui disent lequel. Trois garde-fous, écrits à côté des tokens dans
`styles/globals.css` : chroma bas (0,10–0,14 contre 0,20+ pour l'accent), aucune teinte proche de
l'iris, et **jamais autrement qu'en pastille** — pas de fond, pas de bordure. Un troisième jeu de
valeurs, `.on-inverted-surface`, existe parce qu'une teinte choisie pour Obsidienne se délave sur
l'onglet actif de la rangée de statuts, qui s'inverse : mesuré à l'écran sur « En pause ».

Ce qui **manque**, et qui est su : les **états vides** ne sont pas dessinés — les deux écrans
rendent `null` quand il n'y a rien, alors que « bibliothèque neuve » et « recherche sans résultat »
n'appellent pas le même message ; le **compteur de résultats** n'est pas affiché, et devrait dire
« plus de 5000 » plutôt que « 5000 » ; et le tri par titre suit le romaji sur les deux écrans, pas
`titleLanguage`. L'inventaire complet est dans [recherche-filtres.md](./recherche-filtres.md) :
66 lignes, **18 cochées**.

### L'écriture du 6 septembre 2026 — la première Server Action du dépôt

**C'est l'écart le plus visible du chantier qui se referme.** Depuis la mise à blanc, rien
n'enregistrait : les contrôles répondaient au clic et leur état disparaissait au rechargement.

Deux actions dans
[`tracking.actions.ts`](../src/features/tracking/server/tracking.actions.ts), et **elles sont
courtes parce que tout ce qu'elles font avait été écrit et testé avant elles** : `saveEntrySchema`
valide, `applyEntryChanges` décide de l'état suivant et du journal, `authActionClient` garantit la
session. L'action ne tranche rien elle-même.

| Ce qui écrit | Où | Comment |
| --- | --- | --- |
| `saveEntry` | la barre de la fiche | **au geste** — un contrôle bouge, ce champ-là part |
| `saveEntry` | la fenêtre d'une vignette (`/library`, `/search`) | **au bouton** — on corrige trois choses, on valide |
| `removeEntry` | *sans appelant* | écrite et vue fonctionner, sous confirmation ; son menu a été retiré le même jour |

**La barre de la fiche a deux états**, décision d'Alexis du même jour : tant que l'œuvre n'est pas
suivie, elle ne montre qu'un bouton **« Ajouter à ma bibliothèque »**. Un statut « Prévu », un
compteur à zéro et cinq étoiles vides ne décrivent rien — ils décrivent une entrée qui n'existe pas,
et donnent à croire qu'on peut noter une œuvre qu'on ne suit pas. C'est aussi ce qui coche « l'œuvre
pas encore suivie, distinguée de l'œuvre suivie à zéro » de fiche-media.md §2.7.

**Le menu à trois points a été supprimé le même jour, et la fenêtre d'édition a pris sa place.** Il
portait deux raccourcis vers ce que les contrôles font déjà, et le retrait ; « Modifier les dates »
y était désactivé. La fenêtre tient cette promesse-là pour de bon — dates, relectures, notes
personnelles —, et c'est **exactement la même que celle des vignettes**, son bouton compris.

Ce bouton a hésité : posé à 28 px pour une vignette, il a été ramené à la taille normale d'un bouton
d'icône, la même partout. Une propriété `trigger` avait été ajoutée entre-temps pour que la fiche
puisse en fournir un plus grand ; elle a été **retirée aussitôt** — un point d'extension qui
n'existait que pour rattraper un écart n'a plus lieu d'être quand l'écart disparaît.

Elle n'apparaît **que sur une œuvre suivie**. À côté du bouton d'ajout, elle offrirait un second
chemin pour le même geste, ce qui défait ce que l'état « non suivie » cherche : une seule chose à
faire.

`removeEntry` perd donc son dernier appelant et retourne au gel de `knip.jsonc`, nommément, plutôt
que d'être supprimée. **Plus rien dans l'interface ne retire une œuvre** — c'est un manque assumé,
le temps de redessiner l'endroit où ce geste doit vivre.

L'écart entre les deux façons d'enregistrer n'est pas une inconséquence : il était **décrit dans
`entry-draft.ts` avant d'exister**. Sur une fiche on vient poser *un* geste, et un bouton
« Enregistrer » ajouterait une confirmation à une décision déjà prise ; dans une fenêtre on vient
corriger plusieurs champs, et une écriture par frappe y serait une écriture par hésitation. Les deux
partagent l'invariant qui compte : **on n'envoie jamais l'état complet, seulement ce qui a bougé**
(PRODUCT.md §4.2).

Trois points qui ne se voient pas à l'écran :

- **L'entrée et son journal partent dans la même transaction.** `EntryEvent` est *append-only* et
  non rétroactif : une entrée mise à jour dont l'événement manquerait serait un trou qu'aucune
  reprise ne comble.
- **`ensureMediaMirror` est reposé**, et il était obligatoire, pas optimiste : `Entry.mediaId` porte
  une clé étrangère vers `Media`, donc suivre depuis `/search` une œuvre que personne n'a jamais
  croisée échouait au niveau de la base. C'est le garde-fou de PRODUCT.md §4.1, supprimé par la mise
  à blanc — il ne réécrit rien quand la ligne existe et n'est pas périmée.
- **Le plafond de progression est relu du miroir, jamais reçu du client.** Le total passé au pas de
  progression n'est qu'un confort d'affichage.

**Vérifié à l'écran, pas déduit** : ajout depuis `/search` d'une œuvre absente du miroir, statut et
progression enregistrés, pastille apparue sur le catalogue, valeurs retrouvées sur la fiche après
rechargement complet, déduction « dernier chapitre → Terminé » appliquée par le serveur, puis retrait
sous confirmation et retour exact à l'état de départ. Les données d'essai ont été retirées.

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
| `app/icon.tsx` | L'icône d'onglet, dessinée par `ImageResponse` — aucun binaire à relire dans `public/`. Depuis le 6 septembre 2026 elle rend le monogramme et non plus une lettre : le tracé vient de `components/layout/logo.tsx`, seule géométrie du dépôt, partagée avec les trois en-têtes. |
| `instrumentation.ts` | `onRequestError` : relie le `digest` qu'`error.tsx` affiche au visiteur à une ligne de journal cherchable. |

---

## Ce qui reste dans `features/`

**38 fichiers, dont 10 de tests.** La couche `server/` a ses deux moitiés pour la première fois
depuis la mise à blanc : six fichiers, **dix lectures, deux actions**, plus `ensureMediaMirror` —
qui n'est ni l'une ni l'autre, mais le garde-fou que toute écriture pointant vers `Media` traverse.

**`media` en a un aussi depuis le 6 septembre**, et il y est arrivé par la règle plutôt que par
anticipation : `MediaCard` a démarré dans le `_components/` de `/search` et a été promue le jour où
`/library` l'a demandée. C'est la première promotion du dépôt faite *au deuxième appelant*, comme
ARCHITECTURE.md le veut — les trois contrôles de suivi, eux, avaient été promus d'avance et en
connaissance de cause.

`tracking` a gagné son premier `server/` le même jour (`library.queries.ts`), et une quatrième
composante : `entry-status-dot`, la pastille de statut, posée dans le slot `marker` de la carte.

| Feature | Ce qu'elle contient |
| --- | --- |
| **`media`** | `lib/` : `media-format`, `media-freshness`, `media-season`, `search-params` (tous testés). `schemas/` : `media.schema`, `search-media.schema`. `server/` : `media.documents` (les documents GraphQL), `media.queries` (`getMediaById` et `searchMedia`, cachées un jour), `media.mirror` (le repli de panne fiche **et** recherche, plus `ensureMediaMirror`). `components/` : `media-card`, promue de `/search` quand `/library` l'a demandée. |
| **`tracking`** | `lib/` : `entry-draft`, `entry-format`, `entry-transition` (testés), `library-params`. `schemas/tracking.schema`. `server/` : `library.queries` — cinq lectures sans aucun cache, parce que tout y dépend du visiteur — et **`tracking.actions`, les deux premières Server Actions du dépôt**. `components/` : `entry-status-select`, `entry-progress-stepper`, `entry-score-rating`, `entry-status-dot`, et `entry-quick-edit` — la fenêtre d'édition rapide, promue de `/library` quand `/search` l'a demandée. |
| **`preferences`** | `schemas/preferences.schema` et `server/preferences.queries` — les préférences du compte courant, sans cache, parce qu'elles dépendent du visiteur. |
| **`lists`** | `lib/` : `list-reorder` (fractional-indexing), `share-token` — testés tous les deux. `schemas/lists.schema`. |
| **`command`** | `schemas/command.schema` seul — il porte la règle du « +1 ». |
| **`profile`** | *supprimée en entier* — elle n'était que des queries, et `/u/[username]` était son seul consommateur. |

`lib/http/anilist.ts` n'a pas bougé : c'est du transport, il vit dans `lib/` et non dans une feature.
Avec `media.documents.ts` et `media.queries.ts`, l'intégration AniList est de nouveau complète — le
transport, les documents, et le cache qui les relie.

### Et `components/shared/` reprend forme, par la même règle

Cinq fichiers. `route-under-construction` et `step-button` restaient de la mise à blanc ; les trois
autres sont arrivés le 6 septembre, tous promus au deuxième appelant :

| Fichier | Ce qu'il porte |
| --- | --- |
| `catalogue-grid` | Les paliers 3 et 7 autour de ses enfants, et le squelette aux mêmes proportions. Il ne regarde pas ce qu'il range. |
| `filter-bar` | La rangée, le champ borné, les sélecteurs à étiquette visible, le bouton dépliant et la ligne de puces actives. |
| `catalogue-pagination` | Les crans, en **liens** — chacun est une adresse qu'on peut envoyer. Elle reçoit `hrefFor` et ne sait rien du contrat d'URL qu'il applique. |

Ils sont dans `shared/` et non dans une feature parce qu'ils ne connaissent **aucune** entité : ce
sont leurs appelants qui posent le vocabulaire. `search-filter-bar` parle de formats et de saisons,
`library-filter-bar` de statuts de suivi, et les deux se ressemblent parce qu'ils composent les
mêmes pièces — pas parce que l'un a été recopié sur l'autre. C'est le doublon de la mise à blanc
qu'on refuse de refaire. La pagination pousse le principe le plus loin : chaque écran lui passe
`serializeSearchFilters` ou `serializeLibraryFilters`, donc l'aller-retour est garanti par les
modules mêmes qui reliront l'adresse.

**Le panneau de facettes, lui, n'a pas été promu** : `/library` filtre par un contrat plus court et
n'a pas de panneau du tout, donc `FacetColumn`, `ChipGroup`, `RangeSlider` et `CheckboxList`
n'auraient toujours qu'un seul consommateur. Ils restent dans `search/_components/`. Les promouvoir
« puisqu'on y était » aurait été exactement la faute que la règle interdit.

---

## Contrôle de santé

Relevé le 6 septembre 2026, après les premières Server Actions. **À rejouer et à redater dès qu'on
prétend s'y fier.**

| Commande | Résultat |
| --- | --- |
| `pnpm typecheck` | propre — `noUncheckedIndexedAccess` et `verbatimModuleSyntax` actifs |
| `pnpm test` | **199 passés, 1 en pause**, 17 fichiers — inchangé : trois écrans livrés et deux actions écrites, **aucun test de plus** |
| `pnpm lint` | 176 fichiers, aucune correction (174 avant les actions) |
| `pnpm build` | 17 pages, un seul route handler ; `/search`, `/library` et `/media/[id]` en rendu partiel |
| `pnpm knip` | aucun signalement — **toujours sous gel, mais le gel a maigri**, voir ci-dessous |

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
  Component `async` retire ce `.skip`.**

  **Le pronostic qui figurait ici s'est révélé faux, et il faut le dire.** On annonçait « très
  probablement le panneau de suivi » : il est arrivé le 6 septembre, et c'est un composant
  **client** — il porte de l'état de formulaire et appelle une action. `entry-quick-edit`,
  `entry-status-dot` et `media-card` non plus ne rallument rien : le premier est client, les deux
  autres sont serveurs mais **synchrones**. Le canari attend donc un composant de
  `features/*/components/` qui soit à la fois exporté, serveur et `async` — c'est-à-dire qui lise
  lui-même ses données. Le journal d'une œuvre et la rangée « en cours » de l'accueil en sont les
  candidats, et aucun n'existe. En attendant, le test voisin ne garde toujours rien.
- **`pnpm knip` est vert sous gel.** `knip.jsonc` porte un bloc `ignoreIssues` couvrant **6 fichiers
  et 9 chemins** d'exports ou de types, plus `ignoreDependencies` pour quatre familles (`@dnd-kit`,
  `embla`, `cmdk`, `react-hotkeys-hook`). Ce ne sont pas des faux positifs : ce code est réellement
  sans appelant, parce que l'écran qui l'appellera n'existe pas encore. Le gel est posé **par
  chemin** et non en `exclude` global, pour que knip continue de signaler le code mort partout
  ailleurs. Chaque entrée nomme ce qu'elle attend : c'est la liste de reconstruction, et le bloc doit
  avoir disparu quand les routes sont refaites.

  **Le bloc maigrit à chaque passe, comme prévu.** `media.documents.ts` est passé du gel « fichier »
  au gel « exports » ; `search-params.ts` et `library-params.ts` en sont sortis pour de bon avec le
  catalogue ; et **les Server Actions ont emporté `safe-action.ts`, `tracking.schema.ts` et la
  dépendance `next-safe-action`** — les trois entrées disaient mot pour mot qu'elles attendaient la
  première action.

  Restent au gel, et c'est exactement la liste des écrans qui manquent : `calendar-params` et
  `profile-params` (contrats d'URL de `/calendar` et `/u`), `command.schema` (la palette `⌘K`),
  `lists.schema` (`/lists`), `use-debounced-value`, `use-reduced-motion`, et des chemins d'exports —
  les formateurs de `media`, les cinq documents GraphQL sans écran, les bornes du miroir qui
  attendent le cron, les schémas de `media`, les défauts de `preferences`, et `formatEventTime` qui
  attend le journal.

  **Une entrée y est revenue le jour même, et c'est la seule fois** : `removeEntry` et
  `removeEntrySchema`, quand le menu qui les appelait a été retiré. Le gel dit toujours « en
  attente » et jamais « inutile » — ici il dit en plus « ça marchait, on l'a vu marcher ».
- Les composants React ne sont couverts par **aucun test de rendu**, et il y en a beaucoup plus
  qu'hier : le hero de la fiche, ses contrôles de suivi, et maintenant les deux écrans du catalogue
  avec leur barre, leur panneau, leur grille et leur pagination. **Deux écrans livrés, zéro test
  ajouté** — ils ont été vérifiés à l'écran en 1440 et en 390, pas par un test. C'est ce qui a
  attrapé la pagination à 238 pages, mais ça ne se rejoue pas tout seul. Playwright est prévu
  (PRODUCT.md §7) et toujours pas posé.
- **Les états vides des deux écrans ne sont pas dessinés.** `/search` et `/library` rendent `null`
  quand il n'y a rien à montrer. Ce n'est pas tenable : « bibliothèque neuve », « recherche sans
  résultat, filtres actifs » et « recherche sans résultat, aucun filtre » appellent trois messages
  différents, dont un qui propose de retirer la facette la plus sélective
  (recherche-filtres.md §5). En attendant, ne rien afficher vaut mieux qu'un message qui se
  tromperait de cas — mais ça se lit comme une panne.
- **Les Server Actions ne sont couvertes par aucun test.** `applyEntryChanges` l'est — c'est là que
  vit la logique qui se trompe —, mais ce qui l'entoure (la transaction, le garde-fou du miroir, la
  conversion des dates à midi UTC, `revalidatePath`) n'a été **vérifié qu'à la main**, une fois, le
  6 septembre. Le chemin est décrit plus haut ; il n'est pas rejoué automatiquement.
- **La progression de la fiche n'écrit pas à la frappe**, et c'est délibéré : enregistrer chaque
  caractère écrirait « 1 », « 12 », « 120 » en tapant « 120 », soit trois lignes dans un journal
  qu'on ne peut pas défaire. Elle part au cran, ou **à la sortie du champ** — sans ce second
  déclencheur, un nombre tapé à la main n'aurait jamais été enregistré, ce qui aurait rendu à cette
  barre le mensonge qu'on venait de lui retirer.
- Le repli de panne AniList n'est vérifié par **aucun test**, mais il a été **vu fonctionner** le
  6 septembre : AniList était réellement coupée ce jour-là, et la fiche s'est servie du miroir. Il
  est désormais posé sur **deux** des trois écrans réels — la fiche et `/search`, où
  `searchMediaInMirror` sert une vraie recherche paginée en base et **dit ce qu'elle a perdu**
  (les tags, les tris par tendance ou popularité). `/library` n'en a pas besoin : elle ne lit que
  Prisma, jamais AniList. Son **bandeau d'avis**, lui, est désormais
  global — rendu par le layout, il apparaît sur toutes les routes, y compris celles qui
  n'interrogent jamais AniList. Il repose sur une variable de module (`isAniListDown`), donc sur la
  mémoire d'une instance de serveur : au pire il manque à quelqu'un pendant une requête, jamais
  l'inverse. Le raisonnement est dans `lib/http/anilist.ts`.
- « Retirer de ma bibliothèque » figure au menu de la fiche **sans confirmation**. Sans conséquence
  aujourd'hui — l'entrée ne fait rien —, mais c'est une action destructive : elle doit passer par
  `alert-dialog`, déjà installé, le jour où elle écrira.
- Le miroir `Media` n'est plus rafraîchi : le cron est supprimé (voir plus haut).
- `/collection` est déclarée dans `routes.ts` sans écran derrière, comme avant la mise à blanc.
  `routes.ts` le dit lui-même dans son commentaire.

---

## Le prochain pas

**Le journal.** Le suivi s'enregistre depuis le 6 septembre, et `EntryEvent` se remplit — mais
**rien ne l'affiche**. C'est le prochain pas, et c'est le plus urgent des trois raisons : la table
est *append-only* et non rétroactive, donc chaque jour où personne ne la lit est un jour où l'on ne
sait pas si ce qu'elle enregistre est juste. `describeEntryEvent` et `groupEventsByDay` sont écrits
et testés (`entry-format.ts`), et `formatEventTime` est la dernière entrée du gel `knip` qui
l'attend nommément.

C'est aussi ce qui devrait rallumer le canari d'`architecture.test.ts` : un journal d'œuvre est
précisément un composant de `features/*/components/` exporté, serveur et `async` — celui que le
pronostic précédent attendait à tort du panneau de suivi.

Ensuite, dans l'ordre où ça se posera : les **états vides** des trois écrans, qui ne sont toujours
pas dessinés ; le **compteur de résultats** de `/search`, qui doit dire « plus de 5000 » et non
« 5000 » ; et les champs de suivi que la fiche ne porte pas encore alors que la fenêtre d'une
vignette les a — dates, notes, relectures.

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

1. `/search` et `/library` — **faits** (6 septembre), ensemble et sur une coquille commune, comme
   annoncé. C'était le premier gain réel de la refonte : ces deux écrans étaient le même, écrit deux
   fois. Ils partagent maintenant quatre pièces de `shared/` et `features/media/`, et leurs deux
   contrats d'URL sont sortis du gel de `knip.jsonc`. **Ce qui reste sur ces deux écrans** : les
   états vides, le compteur de résultats, le tri par titre qui devrait suivre `titleLanguage`, et
   l'annotation des cartes du catalogue par ce qu'on suit déjà — l'issue 1 de
   [recherche-filtres.md](./recherche-filtres.md) §2, qui demande une lecture de plus. L'inventaire
   des filtres : 66 lignes, **18 cochées**.
2. `/media/[id]` — **le hero et le suivi sont faits** (6 septembre) : la barre lit l'`Entry` réelle
   et écrit par `saveEntry`. Restent le journal, les onglets lourds, les chiffres de la communauté,
   et les champs de suivi que la fenêtre d'une vignette porte déjà mais pas elle. L'inventaire à
   cocher est dans [fiche-media.md](./fiche-media.md) : 73 lignes, 23 cochées.
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
