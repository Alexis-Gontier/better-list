/**
 * La géométrie du bandeau d'ouverture de l'accueil, partagée par la coquille client et la
 * diapositive serveur.
 *
 * **Ces constantes vivent ici et non dans `hero-carousel.tsx`, et ce n'est pas un rangement — c'est
 * une correction.** Elles y étaient, à côté du composant qui les emploie ; or ce fichier porte
 * `"use client"`, et `home-hero.tsx` est un Server Component. Next remplace alors tout export non
 * composant d'un module client par une référence client : la constante importée côté serveur n'était
 * plus une chaîne mais une fonction-piège, dont l'interpolation dans une `className` a produit
 * `class="relative function() { throw new Error(...) }"`. Aucune erreur à la compilation, aucune au
 * typecheck — un bandeau de 252 px au lieu de 480, trouvé à l'écran.
 *
 * C'est la règle de `docs/ARCHITECTURE.md` — jamais d'export server et client depuis le même
 * fichier — et la démonstration qu'elle ne vaut pas que pour les fonctions.
 */

/**
 * La boîte du bandeau : **dans la colonne, pas bord à bord**.
 *
 * Le bandeau a d'abord été construit en pleine largeur (`w-screen` recentré, échappé du `max-w-6xl`
 * du layout). Il rentre maintenant dans la colonne, ce qui change ce qu'il raconte : une carte posée
 * sur la page plutôt que l'ouverture de la page. Le reste de l'accueil — rangées, grille, listes —
 * s'aligne sur la même gouttière, et un seul bloc qui la franchissait décalait l'œil à chaque
 * défilement.
 *
 * Les hauteurs sont fixes et non en `vh` : `55vh` sur un téléphone en paysage donne une bande de
 * deux cents pixels où le titre et les boutons ne tiennent pas, et `vh` se redimensionne quand la
 * barre d'adresse mobile apparaît en cours de défilement — le bandeau sauterait sous le doigt.
 *
 * Partagée entre le carrousel et son squelette : c'est ce qui garantit qu'ils occupent la même
 * place, donc que rien ne bouge à la fin du chargement.
 */
export const HERO_HEIGHT = "h-75 md:h-105";

/**
 * La hauteur est répétée sur **chaque diapositive**, et ce n'est pas une redondance.
 *
 * Le viewport qu'Embla insère entre la boîte et les diapositives (`<div className="overflow-hidden">`
 * dans `components/ui/carousel.tsx`) n'a pas de hauteur propre. Un `h-full` sur la diapositive s'y
 * résoudrait donc contre une boîte de hauteur automatique — et comme tout le contenu d'une
 * diapositive est en position absolue (image, voile, calque de texte), sa hauteur intrinsèque est
 * nulle : le bandeau s'effondrerait à zéro pixel.
 *
 * Donner la hauteur aux deux extrémités règle le problème sans toucher à la primitive shadcn, que
 * `components.json` régénère.
 *
 * **Elle ne porte ni arrondi ni rognage**, et c'est un changement : depuis que la diapositive active
 * n'occupe que 80 % de la boîte (`HERO_PEEK`), l'arrondi appartient à chaque diapositive et non à
 * leur contenant — posé ici, il mordrait les coins des voisines qui dépassent, c'est-à-dire
 * arrondirait un bord qui n'est pas le leur. Le rognage, lui, est déjà fait par le viewport qu'Embla
 * insère.
 */
export const HERO_BOX = `relative w-full ${HERO_HEIGHT}`;

/**
 * La boîte d'**une** diapositive : c'est elle qui porte l'arrondi et le rognage.
 *
 * **`rounded-lg` à tous les paliers**, et c'est une correction faite à l'écran. La référence dont
 * vient cette disposition n'arrondit qu'à partir de `md`, ce qui est juste chez elle : sa boîte
 * touche les bords de l'écran sur mobile, où un arrondi flotterait dans le vide. La nôtre garde la
 * gouttière du `main` (mesuré : 343 px de large, 16 px de marge à 390 px de viewport), donc des coins
 * carrés au milieu d'une marge se lisent comme un rendu inachevé. La règle copiée sans son motif
 * aurait produit l'inverse de ce qu'elle vise.
 *
 * `overflow-hidden` y est indispensable et pas décoratif : tout le contenu d'une diapositive est en
 * position absolue sur ses quatre bords (image, voile, calque de texte), donc sans rognage l'image
 * déborderait des coins arrondis et les annulerait.
 */
export const HERO_SLIDE_BOX = "relative h-full overflow-hidden rounded-lg";

/**
 * **La diapositive active laisse voir un dixième de ses voisines de chaque côté.**
 *
 * C'est ce qui distingue ce bandeau d'une bannière pleine boîte, et le motif est celui de la
 * demi-vignette des rangées de découverte (`MediaCarousel`) : une image coupée net au bord se lit
 * comme la fin de la page, là où un morceau de la suivante dit « il y en a d'autres » sans écrire un
 * mot. Les points en bas disent *combien* et *où l'on est*, jamais *de quel côté est la suite* —
 * c'est cette bande qui le dit, et elle le dit aussi au doigt, là où il n'y a plus de flèches.
 *
 * L'arithmétique : 80 % pour la diapositive, centrée, donc les 20 % restants se partagent en deux.
 *
 * **La gouttière est un remplissage porté par chaque diapositive, et c'est une correction faite à
 * l'écran.** Elle a d'abord été un `gap` sur la piste — la façon évidente d'écarter des éléments
 * flex, et symétrique sous un centrage, contrairement au `-ml`/`pl` de shadcn. Mais en mode `loop`,
 * Embla ne réordonne pas le DOM : il **translate** la dernière diapositive pour la faire apparaître
 * à gauche de la première, et cette translation est calculée sur la largeur des diapositives, sans
 * le `gap` du conteneur flex. La voisine bouclée arrivait donc collée à la diapositive active — à
 * gauche seulement, et seulement sur la première diapositive, c'est-à-dire précisément à l'arrivée
 * sur la page. À droite, la voisine est un vrai frère dans le flux : le `gap` s'y appliquait, d'où
 * une asymétrie qui se lisait comme un défaut d'affichage.
 *
 * Un remplissage vit **dans** la diapositive : il voyage avec elle quand Embla la déplace. Posé des
 * deux côtés en demi-gouttière, il reste par ailleurs symétrique sous le centrage, ce qui était la
 * raison d'avoir écarté le motif shadcn.
 */
export const HERO_PEEK = {
  basis: "basis-4/5",
  /** La demi-gouttière, de chaque côté de chaque diapositive : 12 px entre deux voisines. */
  gutter: "px-1.5",
} as const;

/**
 * Le voile posé sur la bannière, **horizontal et symétrique**.
 *
 * Il assombrit les deux bords et laisse respirer le centre, là où l'illustration a le plus de chances
 * d'être intéressante. Les deux zones sombres ne sont pas décoratives : à gauche vient le texte, à
 * droite la jaquette — ce sont exactement les endroits qui ont besoin d'un fond.
 *
 * **En noir fixe, et pas en `background`.** Le bandeau a d'abord fondu vers la couleur de page, ce
 * qui le fondait joliment dans l'accueil mais rendait le contraste dépendant du thème : il fallait un
 * dégradé par thème, et le texte changeait de couleur avec lui. Un voile noir constant porte du texte
 * blanc dans les deux thèmes, avec le même ratio — le contraste cesse d'être une chose à vérifier
 * deux fois.
 */
export const HERO_SCRIM =
  "absolute inset-0 z-[1] bg-linear-to-r from-black/75 via-black/35 to-black/75";
