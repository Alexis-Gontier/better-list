"use client";

import * as React from "react";

/**
 * La valeur, mais en retard — le temps que l'utilisateur finisse de taper.
 *
 * Sans ce délai, une recherche à la frappe part une fois par caractère : « frieren » coûterait sept
 * requêtes, dont six dont personne ne verra le résultat. Sur une API plafonnée à 30 requêtes par
 * minute et par IP, ce n'est pas un gaspillage, c'est une panne en puissance (docs/conception.md §4.1).
 *
 * Générique et sans notion de métier, d'où `src/hooks/` et non `features/` (CLAUDE.md).
 *
 * Le nettoyage n'est pas optionnel : sans lui, chaque frappe laisserait un `setTimeout` en vol, et
 * celui d'un composant démonté écrirait dans un état qui n'existe plus.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
