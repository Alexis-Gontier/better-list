import { createLoader, createSerializer, parseAsInteger } from "nuqs/server";

/**
 * Paramètres d'URL du profil. Un seul, pour l'instant : la page de la timeline.
 *
 * Il passe quand même par nuqs plutôt que par une lecture directe de `searchParams` — c'est la
 * convention des deux autres écrans paginés, et c'est `createSerializer` qui construit les liens de
 * pagination avec les parseurs qui les reliront.
 */
export const profileFilterParsers = {
  page: parseAsInteger.withDefault(1),
};

export const loadProfileFilters = createLoader(profileFilterParsers);
export const serializeProfileFilters = createSerializer(profileFilterParsers);
