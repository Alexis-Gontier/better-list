"use client";

import { libraryFilterParsers } from "@/features/tracking/lib/library-params";
import { useUrlFilters } from "@/hooks/use-url-filters";

/**
 * Écriture des filtres de la bibliothèque dans l'URL.
 *
 * Les parseurs viennent de `lib/library-params.ts` ; le serveur lit les mêmes via
 * `loadLibraryFilters`. Une seule définition pour les deux sens, et les réglages nuqs sont dans
 * `useUrlFilters`, partagés avec la recherche.
 */
export function useLibraryFilters() {
  return useUrlFilters(libraryFilterParsers);
}
