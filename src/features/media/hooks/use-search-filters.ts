"use client";

import { useQueryStates } from "nuqs";

import { searchFilterParsers } from "@/features/media/lib/search-params";

/**
 * Écriture des filtres dans l'URL.
 *
 * Les parseurs viennent de `lib/search-params.ts` : ce hook ne fait que les brancher côté client.
 * Le serveur lit les mêmes, via `loadSearchFilters` — une seule définition pour les deux sens.
 */
export function useSearchFilters() {
  return useQueryStates(searchFilterParsers, {
    /** Le bouton retour doit défaire une recherche, pas quitter la page. */
    history: "push",
    /**
     * `shallow: false` : les résultats viennent d'un Server Component, il doit donc se ré-exécuter
     * à chaque changement de filtre. C'est le réglage qui fait fonctionner toute la page.
     */
    shallow: false,
    /** Une valeur par défaut n'encombre pas l'URL. */
    clearOnDefault: true,
  });
}
