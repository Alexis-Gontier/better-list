"use client";

import { searchFilterParsers } from "@/features/media/lib/search-params";
import { useUrlFilters } from "@/hooks/use-url-filters";

/**
 * Écriture des filtres de recherche dans l'URL.
 *
 * Les parseurs viennent de `lib/search-params.ts` : ce hook ne fait que les brancher côté client.
 * Le serveur lit les mêmes, via `loadSearchFilters` — une seule définition pour les deux sens.
 *
 * Les réglages nuqs (`history`, `shallow`, `clearOnDefault`) sont dans `useUrlFilters`, partagés
 * avec la bibliothèque : ce sont des choix de projet, pas des choix de la recherche.
 */
export function useSearchFilters() {
  return useUrlFilters(searchFilterParsers);
}
