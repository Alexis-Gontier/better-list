"use client";

import { useQueryStates } from "nuqs";

/**
 * Brancher un jeu de parseurs nuqs sur l'URL, avec les trois réglages que ce projet veut partout.
 *
 * `useSearchFilters` et `useLibraryFilters` étaient rigoureusement le même fichier à l'import de
 * leurs parseurs près — mêmes options, mêmes commentaires, mot pour mot. Ce n'était pas grave tant
 * qu'ils étaient deux ; ça le devient au troisième, parce qu'un réglage corrigé dans l'un et pas
 * dans l'autre donne deux écrans qui ne se comportent plus pareil pour une raison invisible à la
 * relecture. Les trois choix ci-dessous valent pour **tout** filtre porté par l'URL dans ce projet,
 * donc ils s'écrivent une fois.
 *
 * Ce hook ne connaît aucun domaine : il vit dans `hooks/` et non dans une feature. Ce sont les
 * parseurs qu'on lui passe qui portent le métier, et ils restent chez eux — `features/media/lib/`
 * pour la recherche, `features/tracking/lib/` pour la bibliothèque —, lus dans les deux sens par le
 * serveur (`createLoader`) et par ce hook.
 */
export function useUrlFilters<
  Parsers extends Parameters<typeof useQueryStates>[0],
>(parsers: Parsers, options?: Parameters<typeof useQueryStates>[1]) {
  return useQueryStates(parsers, {
    /** Le bouton retour doit défaire un filtre, pas quitter la page. */
    history: "push",
    /**
     * `shallow: false` : les résultats viennent d'un Server Component, il doit donc se ré-exécuter
     * à chaque changement de filtre. C'est le réglage qui fait fonctionner ces pages — sans lui,
     * l'URL change et la grille reste identique.
     */
    shallow: false,
    /** Une valeur par défaut n'encombre pas l'URL, donc ne se retrouve pas dans un lien partagé. */
    clearOnDefault: true,
    /*
      Ce que l'écran ajoute, et lui seul. Posé **après** les trois réglages pour qu'un appelant
      puisse compléter — l'anti-rebond d'un champ de saisie, par exemple — mais l'ordre le laisse
      aussi en écraser un. C'est voulu : les trois ci-dessus sont un défaut partagé, pas une règle,
      et un écran qui a besoin d'un autre comportement doit pouvoir le dire ici plutôt que de
      contourner le hook et de recopier les deux autres.
    */
    ...options,
  });
}
