/**
 * Taille d'une page de catalogue — recherche et bibliothèque.
 *
 * **C'est la grille qui a fixé ce nombre, pas l'inverse.** Une page dont la taille n'est pas un
 * multiple du nombre de colonnes se termine par une rangée incomplète : 20 résultats sur sept
 * colonnes donnent deux rangées pleines puis une rangée de six, et ce trou en bas d'écran se lit
 * comme un chargement raté plutôt que comme une fin de page.
 *
 * **21, soit trois rangées de sept** — décision d'Alexis du 6 septembre 2026, prise en regardant la
 * grille. Elle remplace 24, choisi quand les paliers étaient 2, 3, 4 et 6 : sept colonnes ne
 * divisent pas 24, et il fallait trancher entre la densité voulue et l'ancien nombre. Les paliers
 * sont donc **3 et 7**, les deux seuls diviseurs utiles de 21, et le saut de l'un à l'autre se fait
 * en une fois à `lg`.
 *
 * Sept colonnes, c'est aussi la densité que vise la spec du 2 septembre : à cette largeur une
 * jaquette fait environ 140 px, et c'est ce qui a fait remonter la méta hors de la carte.
 *
 * Le changer oblige à revoir les paliers — `search-media.schema.test.ts` casse si les deux
 * divergent —, et c'est pour rendre ce lien impossible à rater que la constante est ici plutôt que
 * dupliquée dans le schéma de recherche et dans la requête de bibliothèque.
 *
 * Elle vit dans `config/` parce qu'elle est lue des deux côtés de la frontière : un schéma Zod, une
 * requête Prisma `server-only`, et deux squelettes de composants.
 */
export const CATALOGUE_PAGE_SIZE = 21;

/**
 * Les deux dispositions d'un catalogue : grille de jaquettes, ou liste dense.
 *
 * Déclarées ici et pas dans `components/shared/view-toggle.tsx`, qui est un îlot client : les
 * parseurs d'URL de la recherche et de la bibliothèque en ont besoin côté serveur, et faire
 * remonter une valeur depuis un module `"use client"` vers un module serveur brouille la frontière
 * que `CLAUDE.md` demande de garder lisible au nom du fichier.
 *
 * `grid` par défaut : la première question posée à un catalogue est « qu'est-ce qu'il y a ? », et
 * la jaquette y répond mieux que le titre. La liste sert quand on sait déjà ce qu'on cherche.
 */
export const VIEW_MODES = ["grid", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
export const DEFAULT_VIEW_MODE = "grid" satisfies ViewMode;
