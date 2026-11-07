# Les maquettes — `better-list.fig` et `refonte.fig`

Deux fichiers OpenPencil (format `.fig`) qui redessinent l'application. Pour un écran nouveau ou
modifié, la maquette **précède** le code et Alexis la valide ; une fois l'écran livré, elle se
réaligne sur lui (D59, qui révise D54). `better-list.fig` a atteint la limite de nœuds
d'OpenPencil : la refonte continue dans `refonte.fig`, une page par lot (le lot 1 est resté dans
`better-list.fig`). La landing et `/login` ont changé de direction après la maquette du lot 1
(D61) : sa page est à réaligner. La landing actuelle (D71) est dans `refonte.fig`, page
« Refonte — Landing · SaaS ». Ce fichier est à environ 9 100 nœuds : le prochain lot ouvre un
nouveau fichier.

## Les pages

| Page | Contenu |
| --- | --- |
| Tokens | Le nuancier, les rayons et l'échelle typographique, chaque pastille liée à sa variable |
| Composants — ui | `Button` et `Button · survol`, `Badge`, `Input`, `Tabs Trigger`, `Tabs List`, `Card`, `Empty` |
| Chrome — layout | `Logo`, icônes du chrome, `Avatar`, `Kbd`, `Header`, `Footer`, menus ouverts |
| Composites — shared | Jaquettes, bannières, `Media Card`, `Entry Quick Edit`, `Home Rail Header`, `Spotlight Slide`, icônes |
| Écran — … | Accueil, fiche œuvre, bibliothèque, listes, profil, recherche, planning, collection, paramètres, personnage et équipe, connexion, liste partagée, erreurs |

Chaque écran existe en **1440 et en 390 px**, en thème Obsidienne. La page « Erreurs » reprend les
sept frontières du code : `not-found`, `error`, `forbidden`, `unauthorized`, `global-error`, la liste
introuvable (dans le chrome de l'application) et l'erreur de partage (dans celui de `(share)`).

## Les conventions

- **Une variable porte le nom de sa variable CSS** (`primary`, `muted-foreground`,
  `status-paused`…), dans la collection « Thème », modes Obsidienne (défaut) et Clair. Les rayons
  sont dans « Rayon » (`radius-sm` à `radius-4xl`, base 6 px), les styles de texte sous
  `heading/`, `text/` et `mono/`.
- **`mix/…` : les couleurs que Tailwind écrit avec une opacité.** OpenPencil ne lie pas une
  variable et une opacité sur la même peinture, d'où un token par mélange, avec sa valeur par mode :

  | Token | Obsidienne | Clair |
  | --- | --- | --- |
  | `mix/outline-bg` | `input` à 30 % | `background` |
  | `mix/outline-border` | `input` | `border` |
  | `mix/destructive-soft` | `destructive` à 20 % | `destructive` à 10 % |
  | `mix/ring-soft` | `ring` à 50 % | `ring` à 50 % |
  | `mix/card-ring` | `foreground` à 10 % | `foreground` à 10 % |
  | `mix/border-soft` | `border` à 60 % | `border` à 60 % |
  | `mix/primary-hover` | `primary` à 80 % | `primary` à 80 % |
  | `mix/outline-bg-hover` | `input` à 50 % | `muted` |
  | `mix/secondary-hover` | `secondary` + 5 % de `foreground` | idem |
  | `mix/ghost-hover` | `muted` à 50 % | `muted` |
  | `mix/destructive-hover` | `destructive` à 30 % | `destructive` à 20 % |

- **Les variantes reprennent les `cva`** : `Button` est un ComponentSet `variant=…, size=…` avec
  exactement les valeurs de `button.tsx`. Un composant du fichier se relit contre son fichier
  source.
- **Une icône est un composant `icon/<nom-lucide>`** dont le tracé est lié à une couleur
  (`muted-foreground` pour le chrome, `foreground` ailleurs). La couleur d'une icône ne se lie pas
  au rendu : il faut la lier tracé par tracé après coup.
- **Les jaquettes et les bannières sont les vraies**, prises sur AniList : un composant
  `cover/<slug>` (148 × 222, image en 2×) ou `banner/<slug>`. L'image est posée sur un rectangle
  enfant `image`, par-dessus l'aplat de la couleur dominante d'AniList (`coverImage.color`), qui
  reste dessous — posée sur la racine, une surcharge d'instance la masquait après rechargement.
  Changer l'image d'un composant change toutes les cartes.
- **Le survol n'est dessiné que là où il change quelque chose de lisible** : `Button · survol` (une
  variante par `variant`, taille par défaut) et l'action de la carte, `Entry Quick Edit`.
- **`Media Card`** expose `Titre`, `Ligne`, `Ligne visible` et `Jaquette` (échange d'instance).
  Son action d'édition rapide n'est **pas** dans le composant : une instance d'`Entry Quick Edit`
  est posée en position absolue sur les seules cartes qui la montrent — toutes celles en 390 des
  écrans où le code la passe (accueil, bibliothèque, liste ouverte, recherche), et une carte
  survolée en 1440 sur l'accueil. Dans le composant, elle aurait coûté cinq nœuds à chacune des
  184 cartes (voir la limite plus bas).

## Mettre les tokens à jour

Quand `globals.css` change, convertir les `oklch` en sRGB et réimporter au format DTCG
(`import_design_tokens` du serveur MCP OpenPencil) : un fichier par mode sous `Thème/`, mêmes noms
que les variables CSS, `sidebar-*` exclus. Les variables sont rapprochées par nom ; rien n'est
supprimé.

## Les pièges d'OpenPencil

- **Le fichier est à environ 9 500 nœuds, et OpenPencil s'arrête à 10 000.** Au-delà, tous les
  outils MCP qui modifient des propriétés (`bind_variable`, `set_fill`, `set_variable`…) refusent
  (« Document too large for atomic agent editing »). Avant d'ajouter beaucoup, compter
  (`figma.graph.nodes.size + figma.graph.variables.size` dans `openpencil eval`) ; quand un écran ne
  tient plus, c'est le moment de couper le fichier en deux.
- **Une image se pose par `openpencil eval --stdin`**, avec l'API de plugin
  (`figma.createImage(bytes)` puis une peinture `IMAGE` sur le rectangle) : `set_image_fill` prend
  l'image en base64 dans l'appel, ce qui la fait transiter par l'agent.
- **Des titres s'affichent brouillés après réouverture** (glyphes mélangés, surtout les Archivo en
  500 à 700 : titre de la diapositive, « Activité », « Apparitions »). C'est un bug d'OpenPencil
  0.16 à l'enregistrement : il range dans le fichier les contours des glyphes de chaque texte, et en
  raccroche quelques-uns aux mauvais contours — un lot différent à chaque enregistrement. Le texte
  lui-même est intact. Pour voir juste le temps d'une séance, effacer ces glyphes
  (`figma.graph.updateNode(id, { derivedTextGlyphs: null })` dans `openpencil eval`) ou changer la
  taille du texte puis la remettre ; rien ne l'empêche durablement.
- **Le moteur de rendu peut planter** (« memory access out of bounds », « table index is out of
  bounds ») et laisser l'onglet mort : plus rien ne s'exporte. Le fichier n'est pas en cause ;
  quitter complètement OpenPencil et le relancer.
- **Dupliquer un écran qui contient des instances peut empêcher l'enregistrement** (« Ambiguous
  instance geometry address ») : remplacer les instances de la copie par des instances neuves.
- **Agrandir une instance de jaquette n'étire pas son rectangle `image`** : le redimensionner à la
  main, ou garder la taille du composant (148 × 222).
- **Le mode d'un frame ne se règle pas** par le serveur MCP : tout est rendu dans le mode par
  défaut (Obsidienne).
- **Un dégradé posé avec une transformation corrompt le nœud** : passer par `set_fill` et ses
  directions.
- **Un export sans page cible échoue** quand le nœud n'est pas sur la page courante.
