import {
  createLoader,
  createParser,
  createSerializer,
  parseAsInteger,
} from "nuqs/server";

import { isDayKey } from "@/features/profile/lib/profile-activity";

/**
 * Paramètres d'URL du profil.
 *
 * `page` dit combien de paquets du journal sont dépliés (`?page=3` : les trente-six premières
 * entrées). Depuis le 30 septembre 2026, le journal s'allonge par « Voir plus » au lieu de se
 * paginer ; le nom est resté pour ne pas casser les adresses.
 *
 * Ils passent par nuqs plutôt que par une lecture directe de `searchParams` — c'est la convention
 * des autres écrans, et c'est `createSerializer` qui construit les liens avec les parseurs qui les
 * reliront.
 */

/**
 * `?jour=AAAA-MM-JJ` — le journal resserré sur une case du calendrier (11 octobre 2026).
 *
 * Une clé qui ne désigne pas un vrai jour retombe sur « tout le journal » plutôt que d'atteindre
 * la requête : un `?jour=2026-02-31` forgé à la main ne mérite pas une erreur.
 */
const parseAsDayKey = createParser({
  parse: (value: string) => (isDayKey(value) ? value : null),
  serialize: (value: string) => value,
});

export const profileFilterParsers = {
  page: parseAsInteger.withDefault(1),
  jour: parseAsDayKey,
};

/** L'ancre de la section du journal : les cases du calendrier y mènent, « Tout le journal » aussi. */
export const JOURNAL_ANCHOR = "journal";

export const loadProfileFilters = createLoader(profileFilterParsers);
export const serializeProfileFilters = createSerializer(profileFilterParsers);
