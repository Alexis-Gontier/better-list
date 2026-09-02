# Refonte design UI/UX — design

> Décidé le 2 septembre 2026. Ce document fixe **l'intention visuelle** ; il ne décrit aucun
> composant à écrire. Il sert de source au prompt Claude Design
> ([prompt](./2026-09-02-refonte-design-ui-prompt.md)) et, plus tard, au plan d'implémentation.

## Pourquoi

Les écrans ont été construits par ajout : une idée principale, puis une feature, puis une autre,
chacune posée sur la précédente. Deux symptômes le prouvent dans le code :

- `/search` et `/library` sont **le même écran écrit deux fois** — grille, tri, filtres,
  pagination — via deux implémentations disjointes (`search-filters.tsx` + `filter-popover.tsx`
  d'un côté, `library-filters.tsx` + `library-status-nav.tsx` + `library-genre-*.tsx` de l'autre).
- Le thème est le shadcn par défaut, non touché : `baseColor: neutral`, chroma ≈ 0.004 partout,
  `--radius: 0.5rem`, `--font-heading` déclaré mais aliasé sur `--font-sans`. **Toute l'identité
  visuelle reste à écrire.**

Maintenant que les features majeures sont livrées (STATE.md : douze routes, six features), on peut
repenser les écrans **avec le vocabulaire complet en tête**, ce qui était impossible en chemin.

## Le principe directeur

**La jaquette est la seule chose colorée de l'écran.**

Un catalogue affiche cinquante images discordantes par page — chaque œuvre arrive avec sa propre
direction artistique, sur laquelle l'app n'a aucun contrôle. L'interface doit donc être un cadre
sombre et désaturé qui ne se bat pas avec elles : pas de surfaces colorées, pas de dégradés
décoratifs, **un seul emploi de l'accent par écran** — l'action en cours.

Conséquence sur la décision « identité forte » : **l'identité passe par la typographie, le rythme
et la matière** (rayons, ombres, densité, liserés), pas par la couleur. Une app de catalogue qui
met son accent partout finit par se battre avec ses propres images.

### Les quatre emplois autorisés de l'accent

Le premier rendu des maquettes a échoué exactement là-dessus : l'iris s'était répandu sur les
légendes, les paragraphes, les textes d'aide et les synopsis, si bien que le bouton principal ne
ressortait plus de rien. La règle est donc écrite en dur, et elle est courte — l'accent ne sert
qu'à :

1. le fond du bouton d'action principal, **un seul par écran** ;
2. le liseré ou le fond d'un élément actif ou sélectionné ;
3. le halo de l'anneau de focus clavier ;
4. le marqueur de suivi sur une jaquette.

Tout le reste du texte est `--foreground` ou `--muted-foreground`. Aucune légende, aucune
annotation, aucun paragraphe, aucun lien courant n'est coloré. Le code rend cette règle tenable
là où la maquette ne le pouvait pas : quand `--muted-foreground` est la seule valeur du texte
secondaire, aucun mot ne peut devenir violet tout seul.

## Ce qu'on touche, ce qu'on ne touche pas

### Les tokens — `src/styles/globals.css`, et rien d'autre

Les trente variables existantes sont réécrites (`--background`, `--card`, `--primary`, `--muted`,
`--border`, `--ring`, `--radius`, la série `--chart-*`, la série `--sidebar-*`). Le mode clair
reste supporté ; le mode sombre devient le canon.

Quatre tokens sont **ajoutés**, chacun parce qu'un contournement existe déjà dans le code :

| Token | Ce qu'il remplace |
| --- | --- |
| `--overlay` | `bg-background/95`, écrit en dur deux fois dans `media-card.tsx` avec un commentaire d'excuse à chaque fois. Le fond d'une pastille posée sur une jaquette est une décision de système. |
| `--surface-raised` | shadcn n'a que `card`. En dark-first il faut deux niveaux d'élévation distincts (carte posée / panneau flottant), sinon tout s'aplatit. |
| `--font-heading` | Déjà déclaré dans `@theme inline`, aliasé sur `--font-sans` : il ne pointe sur rien. La DA lui donne une valeur. |
| `--ring-accent` | Le focus. `--ring` calé sur la couleur du texte donne un halo gris illisible sur fond sombre. |

### Les variants — trois exceptions, pas une de plus

La règle reste : **on ne modifie pas le style des composants shadcn**, ils héritent des tokens.
Trois variants sont ajoutés, chacun justifié par une répétition déjà présente :

1. `Badge variant="overlay"` — `media-card.tsx` repeint le Badge à la main trois fois
   (`bg-destructive` opaque, `bg-background/95` deux fois). Trois occurrences du même contournement,
   c'est un variant manquant.
2. `Button size="icon-sm"` — le « +1 » posé sur la jaquette a besoin d'une cible tactile garantie
   sous `pointer-coarse`, qu'aucune taille par défaut ne donne.
3. `Card` sans bordure — la grille dense n'a pas la place d'un liseré par carte.

### Hors périmètre de cette règle

`MediaCard`, `MediaRow`, `ListCard` **ne sont pas des composants shadcn** : ils vivent dans
`src/features/`. Main libre — c'est le seul endroit où l'identité s'exprime vraiment.

## L'inventaire shadcn

**Installés (30)** — `alert-dialog · avatar · badge · button · card · carousel · collapsible ·
command · dialog · dropdown-menu · empty · hover-card · input · input-group · kbd · label ·
navigation-menu · popover · rating · select · separator · skeleton · sonner · spinner · switch ·
tabs · textarea · toggle · toggle-group · tooltip`

`rating` vient du registre `@kibo-ui` déclaré dans `components.json`, pas de shadcn.

**À installer (7)** — les filtres avancés en réclament cinq à eux seuls :

| Composant | Ce qui le rend nécessaire |
| --- | --- |
| `checkbox` | Type et format en multi-sélection. Genres et tags, eux, passent en **puces cliquables** (`toggle`) et non en cases : la maquette l'a fait contre le brief, et c'est mieux — vingt genres en puces se balaient d'un regard, en cases ils font une colonne. |
| `accordion` | Les sections repliables du panneau de filtres. |
| `sheet` | Le tiroir de filtres en mobile. Sans lui, pas de filtres avancés sur téléphone. |
| `slider` | La plage d'années (1940–2100) et la plage de notes. Un `select` par année est inutilisable. |
| `scroll-area` | La liste de genres et de tags dans un panneau de hauteur bornée. |
| `radio-group` | Le tri, quand il ne tient pas dans un `select`. |

`sidebar` figurait dans cette liste : il en sort avec l'abandon de la variante A. On installe **six**
composants, pas sept.

Ils s'installent tels quels et héritent des tokens : rien à dessiner pour eux.

**Le reste du registre**, disponible sans être nécessaire ici : `alert`, `aspect-ratio`,
`breadcrumb`, `button-group`, `calendar`, `chart`, `combobox`, `context-menu`, `data-table`,
`date-picker`, `drawer`, `field`, `form`, `input-otp`, `item`, `menubar`, `pagination`, `progress`,
`resizable`, `table`, `typography`.

## Écran par écran

### La coquille catalogue — `/search` et `/library`

Les deux écrans deviennent **la même coquille**, paramétrée par sa source.

```
┌──────────────────────────────────────────────────────┐
│  En-tête (inchangé + champ de recherche inline)      │
├──────────────────────────────────────────────────────┤
│  Titre de l'écran  ·  compteur de résultats          │
│  [zone de filtres — deux variantes à comparer]       │
│  chips de filtres actifs  ·  tri  ·  densité         │
├──────────────────────────────────────────────────────┤
│  Grille dense, 7 à 8 colonnes au-delà de 1280px      │
│  Pagination                                          │
└──────────────────────────────────────────────────────┘
```

Ce que la source change, et rien d'autre :

| | `/search` (AniList) | `/library` (mes entrées) |
| --- | --- | --- |
| Facettes communes | type · format · statut de l'œuvre · genres · tags · année · saison | idem |
| Facettes propres | popularité · note moyenne | **mon** statut de suivi · **ma** note · progression |
| Tête d'écran | — | la rangée de statuts avec compteurs (`library-status-nav`, déjà écrit) |

Les facettes existent déjà dans les schémas : `searchMediaInputSchema` (`search`, `type`, `format`,
`status`, `genres`, `tags`, `season`, `seasonYear`, `sort`, `page`, `perPage`, `includeAdult`,
bornes 1940–2100) et `libraryFilterParsers` (`LIBRARY_STATUS_OPTIONS`, `LIBRARY_TYPE_OPTIONS`,
`LIBRARY_SORT_OPTIONS`). La refonte ne les étend pas, elle leur donne une surface.

**La mécanique de filtres : variante B, tranchée au visuel le 2 septembre 2026.** Les deux
candidates ont été maquettées sur le même contenu ; la variante A — un rail latéral persistant de
260 px — est **abandonnée**. Ce qui reste :

- Une barre compacte au-dessus de la grille : champ de recherche, type, tri, et un bouton
  « Filtres · 3 » qui porte le compte des facettes actives.
- Sous elle, un panneau qui se déplie en pleine largeur, en trois colonnes : « Type & format »
  (cases à cocher), « Genres & tags » (puces cliquables), « Année, saison, note » (curseurs de
  plage et puces de saison). Le panneau se referme par « Replier le panneau ».
- Une ligne de puces de filtres actifs, chacune avec sa croix.
- En mobile, le même panneau dans un `Sheet`, avec « Tout effacer » et « Voir les N résultats » en
  pied collant.

Outre la préférence exprimée, c'est la variante la moins coûteuse : la grille garde toute sa
largeur (huit colonnes au lieu de sept), et la coquille n'a pas deux mises en page à tenir selon
la largeur de la fenêtre — seulement un panneau qui se déplie et un tiroir en mobile.

**Ce que la densité impose.** À environ 140 px de large, il n'y a plus la place pour « titre plus
ligne de méta » sous la jaquette. La méta (format, statut, année) **remonte dans la hover card** ;
seul le titre reste sous l'image. L'autre issue — garder la méta et redescendre à six colonnes —
revient à annuler le choix de densité, et n'est pas retenue.

### La MediaCard

La carte actuelle est juste mais visuellement anonyme : rectangle 2:3, liseré, ombre au survol.
Trois leviers de signature ont été comparés en maquette, **et les trois sont tranchés** :

1. **La matière du liseré — liseré interne clair, 8 % de blanc, `inset`.** Il encastre la jaquette
   dans le fond sans dessiner de cadre autour d'elle. La bordure externe, testée à côté,
   disparaissait sur les jaquettes sombres.
2. **Le geste au survol — l'image ne bouge pas, un voile monte depuis le bas**, portant le « +1 » et
   la progression en barre fine. L'agrandissement (`scale-105`, le geste par défaut d'aujourd'hui)
   est **écarté** : cinquante jaquettes qui respirent au passage de la souris font vibrer la grille.
3. **Le marqueur de suivi — un liseré d'accent de 2 px au bord gauche de la jaquette.** Le coin
   biseauté, testé à côté, mangeait l'illustration. C'est **la seule fonction nouvelle de cette
   refonte** : voir d'un coup d'œil, dans une grille de résultats, ce qu'on suit déjà. Il se porte
   partout où une vignette porte une pastille de progression — catalogue, accueil, listes — et pas
   seulement sur la planche qui l'a inventé, ce que les maquettes ont oublié de faire.

Ce que la carte **garde**, parce que c'est déjà arbitré et justifié dans `media-card.tsx` : le
« 18+ » en haut à gauche (il qualifie l'image, donc se lit avant elle), progression puis ma note
empilées en haut à droite sur fond opaque, une seule ligne de titre coupée aux points de
suspension, l'encart de survol déclenché par le lien (donc atteignable au focus), le bouton
d'action rendu **à côté** du lien et non dedans.

États à couvrir : non suivie · en cours · terminée · en pause · 18+ · sans jaquette · squelette ·
la version `MediaRow`.

### L'en-tête

Une seule modification : **un champ de recherche inline**, largeur fixe, qui ouvre la palette au
clic. Aujourd'hui la recherche n'est atteignable que par `⌘K` — un bouton discret — ou en naviguant
vers `/search` ; dans un catalogue, c'est l'objet le plus utilisé de l'app. Le reste de la barre
(logo, les deux menus, notifications, thème, menu utilisateur) ne bouge pas et n'hérite que des
tokens.

**Avec une exception que la maquette a révélée : sur la coquille catalogue, ce champ s'efface** et
ne laisse que son icône. Sans ça, `/search` porte deux champs de recherche l'un au-dessus de
l'autre — celui de l'en-tête et celui de la barre de filtres. C'est celui de la page qui gagne, et
il récupère la largeur libérée.

### La fiche — `/media/[id]`

Vingt et un composants empilés verticalement. Restructuration : bannière et hero d'abord —
jaquette, titre, **actions de suivi accessibles sans défilement** — puis deux colonnes : synopsis
et onglets à gauche, panneau collant à droite (faits, mon suivi, mon journal). Les sections lourdes
(personnages, staff, relations, recommandations, épisodes en ligne) passent en onglets plutôt qu'en
empilement.

Le repli de panne (`media-partial-notice.tsx`, la fiche servie depuis le miroir local) doit avoir sa
place dans la maquette : c'est un état réel du produit, pas une exception.

### Les listes

- `/lists` — grille de cartes de liste avec **un aperçu en mosaïque des quatre premières
  jaquettes**. La carte est textuelle aujourd'hui : dans une app d'images, une liste sans image ne
  donne pas envie d'être ouverte.
- `/lists/[id]` — la coquille de grille du catalogue, plus les poignées de réordonnancement et la
  barre d'actions de liste (renommer, partager, supprimer, ajouter une œuvre).

### L'accueil

En dernier, une fois le vocabulaire fixé : il ne fait qu'assembler ce que les autres écrans
définissent — bandeau de reprise, rangée « En cours », listes, rangées de découverte.

## Les états qu'aucune maquette n'a le droit d'oublier

Chargement (squelettes), zéro résultat, bibliothèque vide, aucune liste, **et le repli quand AniList
ne répond pas** — cinq écrans le portent déjà (`catalogue-unavailable.tsx`,
`media-partial-notice.tsx`). Un système qui ne les prévoit pas se fait rattraper à la première
panne.

## Le canvas Claude Design, en deux temps

**Temps 1 — la planche de style, trois directions.** Chacune : palette complète, échelle
typographique, boutons, badges, champs, et **la même grille de huit cartes** pour comparer à surface
égale.

| Direction | Fond | Accent | Typo | Matière |
| --- | --- | --- | --- | --- |
| Encre & Vermillon | `#0E1116` bleu-nuit désaturé | `#E0483A` vermillon | titrage serif fine, corps sans | rayon 4 px, ombres nettes |
| Ardoise & Ambre | `#12150F` gris-vert profond | `#E8A33D` ambre | titrage grotesque large | rayon 8 px, ombres douces |
| Obsidienne & Iris | `#0A0A0C` quasi-noir neutre | `#7C6CF5` iris | sans serrée partout | rayon 10 px, halo sur l'actif |

**Tranché au visuel le 2 septembre 2026 : aucune des trois, mais leur mélange — « Obsidienne ».**
Les couleurs de la troisième, la typographie et la matière de la deuxième, rayon ramené à 6 px, et
le halo réservé au seul anneau de focus. Les valeurs exactes sont dans
[le prompt](./2026-09-02-refonte-design-ui-prompt.md#la-direction-retenue--obsidienne), qui fait
foi sur ce point.

**Temps 2 — les écrans**, rendus dans la direction retenue :

1. Catalogue, variante A (rail latéral), état rempli
2. Catalogue, variante B (panneau dépliable), même contenu
3. Catalogue, les états : chargement, zéro résultat, AniList injoignable, mobile avec `Sheet`
4. Planche MediaCard : les huit états croisés avec les trois leviers de signature
5. Fiche `/media/[id]`
6. `/lists` et `/lists/[id]`
7. Accueil

## Ce qui a été tranché au visuel, et ce qui reste ouvert

Les deux temps du canvas ont eu lieu le 2 septembre 2026. **Tranché** : la direction artistique
(« Obsidienne », un mélange des trois candidates), la mécanique de filtres (variante B), les trois
leviers de la MediaCard, les puces pour les genres, le champ de recherche qui s'efface sur le
catalogue.

**Ouvert, et volontairement** : l'ordre d'implémentation et le découpage en commits — c'est le
plan, pas le design.

Trois défauts du dernier rendu ne sont **pas** repris comme des décisions, parce que ce sont des
défauts d'application que le code rend impossibles : des mots colorés au hasard dans un paragraphe
(la règle des quatre emplois de l'accent y répond), un marqueur de suivi absent des grilles (il est
maintenant écrit qu'il se porte partout), et un état de chargement rendu vide (les squelettes
existent déjà dans le code, ils ne sont pas à réinventer).
