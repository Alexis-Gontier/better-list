import { createLoader, createSerializer, parseAsInteger } from "nuqs/server";

/**
 * Paramètres d'URL du profil. Un seul, pour l'instant : combien de paquets du journal sont dépliés
 * (`?page=3` : les trente-six premières entrées). Depuis le 30 septembre 2026, le journal s'allonge
 * par « Voir plus » au lieu de se paginer ; le nom est resté pour ne pas casser les adresses.
 *
 * Il passe quand même par nuqs plutôt que par une lecture directe de `searchParams` — c'est la
 * convention des autres écrans, et c'est `createSerializer` qui construit le lien « Voir plus » avec
 * les parseurs qui le reliront.
 */
export const profileFilterParsers = {
  page: parseAsInteger.withDefault(1),
};

export const loadProfileFilters = createLoader(profileFilterParsers);
export const serializeProfileFilters = createSerializer(profileFilterParsers);
