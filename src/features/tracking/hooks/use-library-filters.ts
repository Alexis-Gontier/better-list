"use client";

import { useQueryStates } from "nuqs";

import { libraryFilterParsers } from "@/features/tracking/lib/library-params";

/**
 * Écriture des filtres de la bibliothèque dans l'URL.
 *
 * Les parseurs viennent de `lib/library-params.ts` ; le serveur lit les mêmes via
 * `loadLibraryFilters`. Une seule définition pour les deux sens.
 */
export function useLibraryFilters() {
  return useQueryStates(libraryFilterParsers, {
    /** Le bouton retour doit défaire un filtre, pas quitter la page. */
    history: "push",
    /** Les résultats viennent d'un Server Component : il doit se ré-exécuter à chaque changement. */
    shallow: false,
    clearOnDefault: true,
  });
}
