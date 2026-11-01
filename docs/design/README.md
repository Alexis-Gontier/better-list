# Les maquettes — `better-list.fig`

Un fichier OpenPencil (format `.fig`) qui redessine l'application à partir du code. Il **suit** le
code (D54) : quand un écran change, on met la maquette à jour après, pas l'inverse.

## Les pages

| Page | Contenu |
| --- | --- |
| Tokens | Le nuancier, les rayons et l'échelle typographique, chaque pastille liée à sa variable |
| Composants — ui | `Button`, `Badge`, `Input`, `Tabs Trigger`, `Tabs List`, `Card` |
| Chrome — layout | `Logo`, icônes du chrome, `Avatar`, `Kbd`, `Header`, `Footer`, menus ouverts |
| Composites — shared | Jaquettes, bannières, `Media Card`, `Home Rail Header`, `Spotlight Slide`, icônes |
| Écran — … | Accueil, fiche œuvre, bibliothèque, listes, profil, recherche, planning, collection, paramètres, personnage et équipe, connexion, liste partagée |

Chaque écran existe en **1440 et en 390 px**, en thème Obsidienne. Les pages d'erreur ne sont pas
dessinées.

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

- **Les variantes reprennent les `cva`** : `Button` est un ComponentSet `variant=…, size=…` avec
  exactement les valeurs de `button.tsx`. Un composant du fichier se relit contre son fichier
  source.
- **Une icône est un composant `icon/<nom-lucide>`** dont le tracé est lié à une couleur
  (`muted-foreground` pour le chrome, `foreground` ailleurs). La couleur d'une icône ne se lie pas
  au rendu : il faut la lier tracé par tracé après coup.
- **Les jaquettes sont des placeholders** : un composant `cover/<slug>` teinté de la couleur
  dominante qu'AniList donne pour la vraie (`coverImage.color`). La couleur est portée par un
  rectangle enfant `image` — posée sur la racine, une surcharge d'instance la masquait après
  rechargement. Pour une vraie image, la déposer sur ce rectangle : toutes les cartes suivent.
- **`Media Card`** expose `Titre`, `Ligne`, `Ligne visible` et `Jaquette` (échange d'instance).

## Mettre les tokens à jour

Quand `globals.css` change, convertir les `oklch` en sRGB et réimporter au format DTCG
(`import_design_tokens` du serveur MCP OpenPencil) : un fichier par mode sous `Thème/`, mêmes noms
que les variables CSS, `sidebar-*` exclus. Les variables sont rapprochées par nom ; rien n'est
supprimé.

## Les pièges d'OpenPencil

- **Un titre peut s'afficher brouillé à l'ouverture** (glyphes mélangés). Le texte enregistré est
  intact : c'est le moteur de rendu. Changer la taille du texte puis la remettre suffit.
- **Agrandir une instance de jaquette n'étire pas son rectangle `image`** : le redimensionner à la
  main, ou garder la taille du composant (148 × 222).
- **Le mode d'un frame ne se règle pas** par le serveur MCP : tout est rendu dans le mode par
  défaut (Obsidienne).
- **Un dégradé posé avec une transformation corrompt le nœud** : passer par `set_fill` et ses
  directions.
- **Un export sans page cible échoue** quand le nœud n'est pas sur la page courante.
