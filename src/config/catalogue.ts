/**
 * Taille d'une page de catalogue — recherche et bibliothèque.
 *
 * **C'est la grille qui a fixé ce nombre, pas l'inverse** (`components/shared/media-grid.tsx`). Une
 * page dont la taille n'est pas un multiple du nombre de colonnes se termine par une rangée
 * incomplète : 20 résultats sur six colonnes donnent trois rangées pleines puis une rangée de deux,
 * et ce trou en bas d'écran se lit comme un chargement raté plutôt que comme une fin de page.
 *
 * 24 se divise par 2, 3, 4 et 6 — les quatre paliers de la grille. Le changer oblige à revoir les
 * paliers, et c'est pour rendre ce lien impossible à rater que la constante est ici plutôt que
 * dupliquée dans le schéma de recherche et dans la requête de bibliothèque.
 *
 * Elle vit dans `config/` parce qu'elle est lue des deux côtés de la frontière : un schéma Zod, une
 * requête Prisma `server-only`, et deux squelettes de composants.
 */
export const CATALOGUE_PAGE_SIZE = 24;

/**
 * Les deux dispositions d'un catalogue : grille de jaquettes, ou liste dense.
 *
 * Déclarées ici et pas dans `components/shared/view-toggle.tsx`, qui est un îlot client : les
 * parseurs d'URL de la recherche et de la bibliothèque en ont besoin côté serveur, et faire
 * remonter une valeur depuis un module `"use client"` vers un module serveur brouille la frontière
 * que `docs/ARCHITECTURE.md` demande de garder lisible au nom du fichier.
 *
 * `grid` par défaut : la première question posée à un catalogue est « qu'est-ce qu'il y a ? », et
 * la jaquette y répond mieux que le titre. La liste sert quand on sait déjà ce qu'on cherche.
 */
export const VIEW_MODES = ["grid", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
export const DEFAULT_VIEW_MODE = "grid" satisfies ViewMode;
