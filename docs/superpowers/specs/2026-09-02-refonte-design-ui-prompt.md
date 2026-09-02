# Prompts Claude Design

Deux prompts, à envoyer dans l'ordre. Le premier sert à **choisir** la direction artistique ; le
second dessine les écrans dans la direction retenue. Le design est dans
[le document voisin](./2026-09-02-refonte-design-ui-design.md).

---

## Temps 1 — la planche de style (à envoyer maintenant)

```
Je refonds l'interface de Better-List, une app privée de suivi d'animes, mangas, webtoons et
light novels pour un cercle de quatre comptes. Stack : Next.js, Tailwind v4, shadcn/ui avec des
tokens CSS en oklch. Elle est aujourd'hui au thème shadcn par défaut, entièrement gris neutre.

Dessine-moi UNE planche de style comparative avec trois directions artistiques côte à côte, en
trois colonnes de largeur égale sur un même artboard de 3600×2200.

LE PRINCIPE QUI GOUVERNE TOUT
Cette app affiche cinquante jaquettes d'œuvres par écran, chacune avec ses propres couleurs
criardes et discordantes, sur lesquelles l'app n'a aucun contrôle. L'interface doit donc être un
cadre sombre et désaturé qui ne se bat pas avec elles. L'identité passe par la typographie, le
rythme et la matière — rayons, ombres, liserés, densité — PAS par la couleur. L'accent ne sert
qu'à une chose par écran : l'action en cours. Pas de surfaces colorées, pas de dégradés
décoratifs, pas de glassmorphism.

Toutes les directions sont dark-first.

DIRECTION 1 — « Encre & Vermillon »
  fond #0E1116 (bleu-nuit très désaturé), surface #161A21, accent #E0483A (vermillon,
  le rouge du sceau japonais), texte #ECEFF3 et #8A93A0
  titrage : serif fine et contrastée (type Instrument Serif ou Fraunces)
  corps : sans-serif neutre (Inter)
  rayon 4px, ombres nettes et courtes, liserés fins
  registre : élégant, adulte, éditorial

DIRECTION 2 — « Ardoise & Ambre »
  fond #12150F (gris-vert profond), surface #1B1F19, accent #E8A33D (ambre chaud),
  texte #F0F2ED et #939A8C
  titrage : grotesque large et lourde (type Archivo ou Hanken Grotesk)
  corps : Inter
  rayon 8px, ombres douces et diffuses
  registre : chaleureux, robuste, le plus tolérant aux jaquettes de toutes couleurs

DIRECTION 3 — « Obsidienne & Iris »
  fond #0A0A0C (quasi-noir neutre), surface #141417, accent #7C6CF5 (iris),
  texte #FAFAFA et #8B8B94
  titrage et corps : une seule sans-serif serrée (type Geist), pas de serif
  rayon 10px, halo lumineux discret sur l'élément actif
  registre : app moderne et technologique (Linear, Vercel)

CE QUE CHAQUE COLONNE DOIT MONTRER, dans cet ordre et à l'identique d'une colonne à l'autre —
c'est une comparaison, donc rien ne doit varier sauf le style :

1. Le nom de la direction, et sous lui la palette en pastilles étiquetées :
   fond, surface, surface élevée, bordure, texte, texte secondaire, accent, destructive
2. L'échelle typographique : un H1 « Better List », un H2 « Ma bibliothèque », un H3
   « En cours de visionnage », un paragraphe de corps de trois lignes, une légende, et un
   nombre tabulaire « 12 / 24 »
3. Les contrôles, en ligne : bouton principal « Ajouter à ma liste », bouton secondaire,
   bouton fantôme, bouton icône, un champ de recherche avec son icône, un select « Trier par »,
   une puce de filtre actif avec sa croix « Action ×», un interrupteur, une case à cocher
   cochée, un curseur de plage d'années
4. Les badges : « 18+ » en rouge opaque, « 12 / 24 » sur fond opaque, « ★ 8/10 »,
   un badge secondaire « Shonen »
5. LA GRILLE DE COMPARAISON — la partie qui décide : huit vignettes d'œuvres en deux rangées
   de quatre, format 2:3, environ 150px de large. Chaque vignette : la jaquette, un liseré,
   un titre sur une seule ligne coupé aux points de suspension dessous. Sur trois d'entre
   elles, une pastille de progression « 12 / 24 » en haut à droite ; sur une, un « 18+ » en
   haut à gauche. Utilise des jaquettes fictives aux couleurs volontairement DISCORDANTES
   entre elles — une rose bonbon, une bleu électrique, une sépia, une verte saturée — parce
   que c'est exactement la situation réelle, et que la direction qui survit à ça est la bonne.
6. Un état de focus clavier visible sur un bouton, pour juger de l'anneau de focus.

Écris tout le texte d'interface en français. N'invente aucun composant exotique : tout doit être
réalisable avec shadcn/ui et des variables CSS.
```

---

## La direction retenue — « Obsidienne »

Arbitrée au visuel le 2 septembre 2026, après la planche du temps 1. Aucune des trois directions
n'a été prise telle quelle : c'est **les couleurs de la 3, la typographie et la matière de la 2**.

| | Retenu | Pourquoi |
| --- | --- | --- |
| Couleurs | celles d'Obsidienne & Iris | les préférées ; le quasi-noir neutre laisse les jaquettes seules colorées |
| Typographie | le grotesque large d'Ardoise & Ambre | la serif fine de la direction 1 a été écartée ; la sans serrée partout de la 3 manquait de caractère en titrage |
| Rayon | **6 px** | un cran sous les 8 px de la 2, que la direction 3 rendait déjà trop ronds à 10 px sur fond sombre |
| Ombres | douces et diffuses (direction 2) | le halo de la direction 3 est **réservé au seul anneau de focus clavier** — les deux ensemble font briller toute l'interface |

Ce que ça donne, et qui remplace la ligne « Obsidienne & Iris » du tableau du design :

```
fond            #0A0A0C   quasi-noir neutre
surface         #141417   cartes, rangées
surface élevée  #1C1C21   popovers, panneaux flottants
bordure         #26262C
texte           #FAFAFA   /  secondaire #8B8B94
accent          #7C6CF5   iris — un seul emploi par écran
destructive     #E5484D
titrage         Archivo ou Hanken Grotesk, large, interlettrage resserré
corps           Inter
rayon           6px
ombres          douces et diffuses ; halo lumineux uniquement sur le focus clavier
liseré jaquette interne, 8% de blanc
```

---

## Temps 2 — les écrans (à envoyer maintenant)

Le premier artboard est une planche de confirmation : si la direction fusionnée ne tient pas, ça se
verra là avant les six écrans qui suivent.

```
On repart des trois directions de la planche précédente, mais je n'en garde aucune telle quelle.
La direction définitive, appelée « Obsidienne », est un mélange : les COULEURS de la direction 3
(Obsidienne & Iris), la TYPOGRAPHIE et la MATIÈRE de la direction 2 (Ardoise & Ambre).

  fond            #0A0A0C   quasi-noir neutre
  surface         #141417   cartes, rangées
  surface élevée  #1C1C21   popovers, panneaux flottants
  bordure         #26262C
  texte           #FAFAFA   /  secondaire #8B8B94
  accent          #7C6CF5   iris — UN SEUL emploi par écran, l'action en cours
  destructive     #E5484D
  titrage         grotesque large et lourde (Archivo ou Hanken Grotesk), interlettrage resserré
  corps           Inter
  rayon           6px partout
  ombres          douces et diffuses
  focus clavier   un halo lumineux à l'accent — et c'est le SEUL endroit où quelque chose brille
  jaquettes       liseré interne clair, 8% de blanc, qui les fait paraître encastrées

Le principe qui gouverne tout reste le même : l'app affiche cinquante jaquettes discordantes par
écran, l'interface est un cadre sombre qui ne se bat pas avec elles. Pas de surfaces colorées, pas
de dégradés décoratifs, pas de glassmorphism.

Dessine maintenant les écrans de l'app, un artboard par écran, 1600×1200 sauf mention contraire.
Texte en français.

ARTBOARD 0 — « Confirmation » (1400×900)
Avant les écrans, une planche courte pour vérifier le mélange : la palette en pastilles étiquetées,
l'échelle typographique (H1 « Better List », H2 « Ma bibliothèque », H3, un paragraphe, une
légende, le nombre tabulaire « 12 / 24 »), les boutons dans leurs quatre variantes, un champ de
recherche, une puce de filtre actif, les badges « 18+ » / « 12 / 24 » / « ★ 8/10 », un bouton en
focus clavier avec son halo, et la même grille de huit vignettes aux jaquettes volontairement
discordantes que la planche précédente.

CE QUI EST COMMUN À TOUS LES ÉCRANS
Un en-tête collant, hauteur 56px, bordure basse : à gauche le logo « BETTER LIST » et deux menus
« Découvrir » et « Ma bibliothèque » ; à droite un champ de recherche de 240px avec son icône et
le raccourci ⌘K affiché dedans, une cloche de notifications, un bouton de thème, un avatar.
Contenu centré sur 1152px maximum.

ARTBOARD 1 — « Catalogue, variante A : rail latéral »
Un rail de filtres de 260px collant à gauche, la grille à droite.
Le rail, en accordéons : Type (Anime / Manga / Webtoon / Light novel, cases à cocher),
Format, Statut, Genres (une douzaine de cases à cocher dans une zone défilante),
Tags, Année (curseur de plage 1940–2100), Saison, Note.
En tête du rail : « Filtres » et un lien « Tout effacer ».
À droite : le titre « Recherche », « 1 248 résultats », une ligne de puces de filtres actifs,
un select de tri, un réglage de densité, puis une grille dense de 7 colonnes de vignettes
d'œuvres (format 2:3, titre sur une ligne dessous, pastille de progression sur celles que je
suis, liseré d'accent au bord gauche sur celles-là aussi), et une pagination en bas.

ARTBOARD 2 — « Catalogue, variante B : panneau dépliable »
Exactement le même contenu et les mêmes résultats, mais sans rail : une barre compacte au-dessus
de la grille (champ de recherche, select Type, select Tri, bouton « Filtres · 3 » avec le compte
des filtres actifs), et sous elle le panneau déplié en pleine largeur, en trois colonnes de
facettes. La grille passe alors à 8 colonnes puisqu'elle a toute la largeur.

ARTBOARD 3 — « Catalogue, les états » (2400×1400, quatre cadres sur un même artboard)
a) chargement : la grille en squelettes
b) zéro résultat : un état vide centré, « Aucune œuvre ne correspond », avec les filtres actifs
   rappelés et un bouton « Effacer les filtres »
c) service indisponible : « Le catalogue est momentanément injoignable », ton factuel, pas
   d'illustration dramatique — c'est une panne de l'API AniList, l'app fonctionne toujours
d) mobile 390px : la barre compacte, le bouton Filtres, la grille à 3 colonnes, et par-dessus
   le tiroir de filtres ouvert en Sheet

ARTBOARD 4 — « Planche MediaCard » (2000×1400)
La vignette d'œuvre déclinée. En lignes, les trois leviers de signature :
  ligne 1 : liseré interne clair de 8% de blanc, encastré, contre le liseré actuel
  ligne 2 : survol — l'image fixe et un voile qui monte du bas portant un bouton « +1 » et une
            barre de progression fine, contre le survol qui agrandit l'image
  ligne 3 : marqueur de suivi — liseré d'accent de 2px au bord gauche, contre un coin biseauté
En colonnes, les états : non suivie · en cours (12/24) · terminée · en pause · 18+ ·
sans jaquette · squelette.
Puis, en bas, la version en rangée (jaquette miniature à gauche, titre, méta, barre de
progression pleine largeur, actions à droite) et la hover card ouverte (titre, titre alternatif,
format · statut, note moyenne, quatre genres, cinq lignes de synopsis).

ARTBOARD 5 — « Fiche d'une œuvre » (1600×2000)
Une bannière large en haut, la jaquette qui la chevauche, le titre, le titre alternatif, les
faits (format, statut, épisodes, saison, studio) et — sans avoir à défiler — les actions de
suivi : statut, progression avec un « +1 », ma note en étoiles, « Ajouter à une liste ».
En dessous, deux colonnes : à gauche le synopsis puis des onglets (Personnages, Staff,
Relations, Recommandations, Épisodes) ; à droite un panneau collant avec les statistiques, mon
suivi et mon journal daté. Prévois aussi, en encart, le bandeau « Fiche partielle : servie
depuis notre copie locale ».

ARTBOARD 6 — « Mes listes et une liste » (2400×1200, deux cadres)
a) /lists : une grille de cartes de liste. Chaque carte porte une mosaïque des quatre premières
   jaquettes, le titre, le nombre d'œuvres, la date de modification, une pastille « Partagée ».
   Plus une carte « Nouvelle liste » en pointillés.
b) /lists/[id] : le titre de la liste, sa description, les actions (Renommer, Partager,
   Supprimer), un champ « Ajouter une œuvre », puis la grille de vignettes avec des poignées de
   réordonnancement et un bouton de retrait au survol.

ARTBOARD 7 — « Accueil » (1600×2200)
Un bandeau de reprise en tête : la dernière œuvre en cours, en grand, avec « Reprendre à
l'épisode 13 ». Sous lui une ligne de trois ou quatre chiffres (œuvres suivies, épisodes vus
cette semaine, heures). Puis une rangée horizontale défilante « En cours », une rangée « Mes
listes », et quatre rangées de découverte : Tendances, Cette saison, Populaires, À venir.
Chaque rangée : un titre, un lien « Tout voir », des vignettes au même format que la grille.
```

---

## Temps 3 — les corrections (envoyé après le premier rendu des écrans)

Cinq corrections relevées sur le rendu du temps 2. La plus importante est la première :
l’accent avait débordé sur tout le texte secondaire, ce qui annulait la règle fondatrice
(un seul emploi de l’accent par écran). Les décisions actées au passage : **variante B
retenue, variante A abandonnée** ; **puces pour les genres et les tags, cases à cocher pour
type et format** ; **les trois leviers de la MediaCard tranchés** (liseré interne 8 % blanc,
voile montant à image fixe, liseré d’accent 2 px à gauche).

```
Corrections sur les artboards existants. La direction « Obsidienne » ne change pas, les
structures d'écrans non plus : ce sont cinq corrections ciblées, plus une règle qui manquait.

1. LA RÈGLE QUI MANQUAIT — L'ACCENT A DÉBORDÉ. C'est la correction la plus importante.
   L'iris #7C6CF5 est employé sur des dizaines d'éléments par écran : légendes, paragraphes de
   corps, textes d'aide, annotations, synopsis, phrases d'état vide. Il ne doit servir QUE à ces
   quatre choses, et à rien d'autre :
     - le fond du bouton d'action principal (un seul par écran)
     - le liseré ou le fond d'un élément actif ou sélectionné
     - le halo de l'anneau de focus clavier
     - le marqueur de suivi sur une jaquette (point 3 ci-dessous)
   TOUT le reste du texte est soit #FAFAFA (principal), soit #8B8B94 (secondaire). Aucune
   légende, aucune annotation, aucun paragraphe, aucune phrase d'aide, aucun texte de lien
   courant ne doit être coloré. Repasse tous les artboards avec cette règle : aujourd'hui, le
   bouton principal ne ressort de rien parce qu'une douzaine d'autres éléments portent la même
   couleur que lui.
   Vérifie en particulier : la légende de l'artboard 0, le paragraphe de corps de l'artboard 0,
   la phrase « Trois filtres sont actifs… » de l'état zéro résultat, les annotations
   « retenu / écarté » de la planche MediaCard, le corps de la hover card (qui est actuellement
   orange), le synopsis de la fiche.

2. DEUX CHAMPS DE RECHERCHE SE SUPERPOSENT SUR L'ÉCRAN CATALOGUE.
   L'en-tête porte « Rechercher… ⌘K » et la barre de la page porte « Rechercher une œuvre… »,
   l'un sous l'autre. Sur l'écran catalogue (artboards 2 et 3), RETIRE le champ de l'en-tête :
   il ne reste que l'icône de recherche, ou rien. Le champ de la page prend tout le relais, et
   il peut s'élargir puisqu'il ne partage plus. Sur tous les AUTRES écrans (fiche, listes,
   accueil), le champ de l'en-tête reste comme il est.

3. LE MARQUEUR DE SUIVI N'EST SUR AUCUNE GRILLE.
   La planche MediaCard retient « liseré d'accent 2px au bord gauche de la jaquette » pour dire
   qu'une œuvre est déjà suivie — mais aucune grille ne le porte. Généralise-le : sur l'artboard
   catalogue, sur les rangées de l'accueil, sur la grille d'une liste, toute vignette qui porte
   une pastille de progression doit AUSSI porter ce liseré d'accent à gauche. C'est la seule
   fonction nouvelle de cette refonte : voir d'un coup d'œil, dans une grille de résultats de
   recherche, ce qu'on suit déjà.

4. L'ÉTAT « SERVICE INDISPONIBLE » PROMET CE QU'IL NE MONTRE PAS.
   Il affiche « Disponible hors ligne — depuis la copie locale » au-dessus de huit cartes vides
   et grises. Soit les cartes montrent de vraies jaquettes issues de la copie locale — c'est le
   sens du repli —, soit cette section disparaît et il ne reste que le bandeau d'avertissement
   avec ses deux boutons. Choisis la première : dessine de vraies vignettes, avec leurs titres,
   sous ce libellé.

5. LA FICHE INVENTE UNE DONNÉE QU'ON N'A PAS.
   Sous les recommandations, chaque vignette porte « 80 % de correspondance », « 76 % de
   correspondance ». Ce chiffre n'existe pas dans nos données. Retire-le : les vignettes de
   recommandation portent le titre et rien de plus, comme partout ailleurs.

CE QUI EST DÉJÀ BON, ET QUE TU NE DOIS PAS TOUCHER
  - la variante B du catalogue (barre compacte + panneau dépliable) : c'est celle qui est
    retenue, la variante A est abandonnée
  - les genres et les tags rendus en PUCES cliquables plutôt qu'en cases à cocher — c'est mieux
    que ce que le brief demandait, garde-le. Les cases à cocher restent pour Type et Format.
  - les trois arbitrages de la planche MediaCard (liseré interne 8% blanc, voile montant à image
    fixe, liseré d'accent à gauche) : ils sont validés, garde exactement ces trois-là et tu peux
    retirer les six variantes écartées de la planche
  - la mosaïque de quatre jaquettes sur les cartes de liste
  - la structure en deux colonnes de la fiche, et le bandeau « Fiche partielle »
  - la grille à 8 colonnes et le tiroir de filtres en mobile
```
