/**
 * La géométrie du bandeau d'ouverture de l'accueil, partagée par la coquille client et la
 * diapositive serveur.
 *
 * **Ces constantes ne peuvent pas vivre dans `hero-carousel.tsx`** : ce fichier porte `"use client"`,
 * et Next remplace tout export non composant d'un module client par une référence client — la
 * constante lue depuis un Server Component devient une fonction-piège, silencieusement. C'est la
 * règle « jamais d'export server et client depuis le même fichier », qui ne vaut pas que pour les
 * fonctions (le bug tel qu'il est apparu : docs/JOURNAL.md, 5 septembre 2026).
 */

/**
 * La boîte du bandeau : dans la colonne, pas bord à bord, et à hauteur **fixe**.
 *
 * Pas de `vh` : la barre d'adresse mobile en fait varier la valeur en cours de défilement, donc le
 * bandeau sauterait sous le doigt. Partagée avec le squelette, ce qui garantit que rien ne bouge à la
 * fin du chargement.
 */
export const HERO_HEIGHT = "h-75 md:h-105";

/**
 * La hauteur est répétée sur **chaque diapositive**, et ce n'est pas une redondance : le viewport
 * qu'Embla insère (`components/ui/carousel.tsx`) n'a pas de hauteur propre, et tout le contenu d'une
 * diapositive est en position absolue — donc de hauteur intrinsèque nulle. Un `h-full` seul
 * effondrerait le bandeau à zéro pixel.
 *
 * Ni arrondi ni rognage ici. Depuis `HERO_PEEK`, l'arrondi appartient à chaque diapositive — posé sur
 * le contenant, il mordrait les coins des voisines qui dépassent.
 */
export const HERO_BOX = `relative w-full ${HERO_HEIGHT}`;

/**
 * La boîte d'**une** diapositive : c'est elle qui porte l'arrondi et le rognage.
 *
 * `rounded-lg` à tous les paliers, y compris mobile, parce que notre boîte garde la gouttière du
 * `main` — des coins carrés au milieu d'une marge se lisent comme un rendu inachevé.
 *
 * `overflow-hidden` est indispensable et pas décoratif : le contenu est en position absolue sur les
 * quatre bords, donc sans rognage l'image déborderait des coins arrondis et les annulerait.
 */
export const HERO_SLIDE_BOX = "relative h-full overflow-hidden rounded-lg";

/**
 * **La diapositive active laisse voir un dixième de ses voisines de chaque côté.**
 *
 * Même motif que la demi-vignette des rangées de découverte : une image coupée net au bord se lit
 * comme la fin de la page, là où un morceau de la suivante dit « il y en a d'autres » — et le dit au
 * doigt, là où il n'y a plus de flèches. 80 % pour la diapositive, centrée, donc 10 % de chaque côté.
 *
 * **La gouttière est un remplissage porté par chaque diapositive, jamais un `gap` sur la piste** : en
 * mode `loop`, Embla translate la diapositive bouclée sans tenir compte du `gap` du conteneur, et la
 * voisine arrivait collée à gauche sur la première diapositive (docs/JOURNAL.md, 5 septembre 2026).
 */
export const HERO_PEEK = {
  basis: "basis-4/5",
  /** La demi-gouttière, de chaque côté de chaque diapositive : 12 px entre deux voisines. */
  gutter: "px-1.5",
} as const;

/**
 * Le voile posé sur la bannière : horizontal et symétrique, il assombrit les deux bords — à gauche
 * le texte, à droite la jaquette — et laisse respirer le centre.
 *
 * **En noir fixe et non en `background`** : une couleur de page obligerait à un dégradé par thème et
 * ferait dépendre le contraste du thème. Un noir constant porte du texte blanc dans les deux avec le
 * même ratio.
 */
export const HERO_SCRIM =
  "absolute inset-0 z-[1] bg-linear-to-r from-black/75 via-black/35 to-black/75";
