import { createLoader, createSerializer, parseAsInteger } from "nuqs/server";

/**
 * Le seul paramètre d'URL de l'accueil : la page de la grille qui le termine.
 *
 * Il vit dans un fichier à part plutôt que dans `search-params.ts` du domaine `media` parce qu'il ne
 * décrit pas la recherche : l'accueil n'a ni terme, ni genre, ni tri réglable. Réutiliser le jeu de
 * la recherche ferait apparaître `?view=` et `?sort=` dans une adresse où ils ne commandent rien, et
 * lierait deux écrans dont les besoins n'ont aucune raison d'évoluer ensemble.
 *
 * Même mécanique en revanche — parseurs `nuqs/server`, isomorphes —, pour que l'adresse écrite par la
 * pagination soit relue à l'identique par la grille. C'est la règle posée dans `search-params.ts` :
 * on ne décode jamais un paramètre à la main d'un côté de la frontière.
 */
export const homeParsers = {
  page: parseAsInteger.withDefault(1),
};

export const loadHomeParams = createLoader(homeParsers);
export const serializeHomeParams = createSerializer(homeParsers);

/**
 * L'ancre de la grille.
 *
 * Sans elle, tourner la page ramènerait en haut de l'accueil — c'est-à-dire au bandeau, à trois
 * rangées et à une grille de listes, soit tout ce qu'on venait justement de dépasser. Le fragment
 * fait atterrir le lien sur la grille elle-même.
 */
export const HOME_CATALOGUE_ANCHOR = "catalogue";
