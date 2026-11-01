# Les maquettes — `better-list.fig`

Un fichier OpenPencil (format `.fig`) qui redessine l'application à partir du code. Il **suit** le
code (D54) : quand un écran change, on met la maquette à jour après, pas l'inverse.

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
- **Un titre peut s'afficher brouillé à l'ouverture** (glyphes mélangés, surtout en Archivo). Le
  texte enregistré est intact : c'est le moteur de rendu. Changer la taille du texte puis la
  remettre corrige l'affichage, le temps de la séance.
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
