# La marque — le BL-signet

Le monogramme d'origine — un « B » dont la hampe sert aussi de verticale au « L », le pied
prolongeant la barre du bas vers la gauche — dont **le pied s'achève en queue d'aronde**, comme le
ruban qu'on laisse dans un livre : **là où tu t'es arrêté**. C'est la mémoire de visionnage, ce qui
distingue Better-List d'AniList et de MyAnimeList.

Adoptée le 16 octobre 2026 : le pied passe de 8 à 5 unités et devient un signet.

## La géométrie

La source de vérité est **`logoPath` dans [logo.tsx](../../src/components/layout/logo.tsx)**. Les
fichiers de ce dossier en sont des exports : si le tracé change, on les régénère, jamais l'inverse.

Grille de 24, **chaque trait fait 4 unités** :

| Élément | Construction |
| --- | --- |
| Hampe | x 5→9, de y 0 à y 24 |
| Panses | deux demi-anneaux, rayons 7 / 3, centres (14 ; 7) et (14 ; 17) |
| Pincement | les deux cercles extérieurs se croisent en (18.899 ; 12) |
| Pied-signet | y 20→24, de x 5 à x 0 ; chevron de 2 unités à 45° (0,20 → 2,22 → 0,24) |
| Ligne de base | y 24 : pied de la lettre, et ligne de base du mot dans les lockups |
| Cadrage | collée à gauche du carré de 24 (x 0 → 21) ; les masters de ce dossier la centrent |

## Les fichiers

| Fichier | Usage |
| --- | --- |
| `better-list-symbol-ink.svg` | La marque seule, encre (`#0a0a0b`) — fond clair |
| `better-list-symbol-white.svg` | La marque seule, blanc cassé (`#fafafa`) — fond sombre |
| `better-list-symbol-indigo.svg` | La marque seule, indigo — usage d'accent, hors interface |
| `better-list-app-icon.svg` | Tuile indigo arrondie, marque blanche — avatars, profils, icône |
| `better-list-lockup-horizontal-ink.svg` / `-white.svg` | Marque + mot sur une ligne |
| `better-list-lockup-stacked-ink.svg` | Marque au-dessus du mot — formats carrés |

Dans l'application, **aucun de ces fichiers n'est servi** : la marque est dessinée par le code
(`<Logo>`, `app/icon.tsx`, `app/apple-icon.tsx`, les cartes Open Graph et Discord), pour qu'il n'y
ait qu'une géométrie à relire en diff.

## Les couleurs

| Rôle | Valeur | Source |
| --- | --- | --- |
| Encre | `#0a0a0b` | `--foreground` du thème clair, oklch(0.1448 0.0032 285.82) |
| Blanc | `#fafafa` | `--primary-foreground`, oklch(0.9851 0 0) |
| Indigo | `#4f46e5` | `--primary` du thème clair, oklch(0.5106 0.2301 276.97) |

**Dans l'interface, la marque est en `currentColor`** et suit le texte voisin : la direction
Obsidienne fait passer l'identité par la typographie et la matière, pas par la teinte. L'indigo est
réservé à ce qui vit hors de l'app — onglet, écran d'accueil, avatar.

## Le mot

« Better-List » en **Archivo**, graisse 800, largeur 108, approche −1 % — la police de titrage de
l'app (`--font-heading`), sous licence OFL, donc utilisable dans un logo. Dans les lockups, le mot
est **vectorisé** : les fichiers ne dépendent d'aucune police installée.

La marque a la hauteur de capitale du mot et repose sur sa ligne de base ; le pied-signet
pointe vers la gauche, à l'opposé du mot, comme le pied du L d'origine. Espace entre la marque et le mot : deux hampes (8 unités).

## Les règles

- **Zone de protection** : une hampe (4 unités de la grille, soit 1/6 de la hauteur) tout autour.
- **Tailles minimales** : marque seule 16 px de haut (le chevron se referme, il reste un B) ;
  signet lisible dès 32 px ; lockup horizontal 96 px de large.
- **Fonds** : encre sur clair, blanc sur sombre ou sur indigo. Jamais indigo sur le fond sombre
  Obsidienne — le contraste est trop faible.
- **À ne pas faire** : étirer, incliner, ajouter une ombre ou un dégradé, recolorer les
  contrepoinçons, retourner la marque, remplacer le mot par une autre police, poser la marque sur
  une jaquette chargée sans tuile.

## Les pistes écartées

Huit directions ont été explorées, puis cinq variantes du B-signet à ruban vertical et quatre
placements du signet sur l'ancien monogramme, avec la skill
[logo-design](https://github.com/kaankiziltug/logo-design-skill) : liste déplacée, rangs, page
cornée, tier list, progression, étagère, journal, et des croisements signet × étagère / signet ×
tier list. La tier list et l'étagère se lisent bien comme **images** mais, dès que les panses du B
deviennent des rangs droits, la lettre se lit E ou F : elles restent disponibles comme motifs
secondaires (page Listes, collection, états vides), pas comme marque.

Pas de recherche d'antériorité de marque faite : à prévoir si l'app s'ouvre un jour au-delà du
cercle.
