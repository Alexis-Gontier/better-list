import { createLoader, createSerializer, parseAsInteger } from "nuqs/server";

/**
 * Le paramètre d'URL du planning — **source unique, client et serveur**.
 *
 * Un seul axe : la semaine, exprimée en **décalage** depuis celle en cours et non en date. C'est ce
 * qui fait que `/calendar` sans paramètre est toujours la semaine du jour, et qu'un lien envoyé à
 * quelqu'un ne le renvoie pas trois mois en arrière. La contrepartie est qu'un tel lien ne désigne
 * pas une semaine fixe — pour un cercle de quatre comptes qui se partagent surtout « regarde ce
 * qu'il sort ce soir », c'est le bon compromis.
 *
 * La borne n'est pas ici mais dans `clampWeekOffset` (`airing-week.ts`) : un parseur nuqs sait
 * refuser ce qui n'est pas un entier, pas décider ce qu'est une semaine raisonnable.
 */
export const calendarParsers = {
  week: parseAsInteger.withDefault(0),
};

/** Lecture du décalage depuis les `searchParams` d'une page. */
export const loadCalendarParams = createLoader(calendarParsers);

/**
 * Construction d'une URL de planning, pour les flèches de navigation. Bâtir l'adresse avec le
 * parseur qui la relira garantit l'aller-retour, et omet `week=0` — la semaine en cours reste donc
 * à `/calendar` tout court.
 */
export const serializeCalendarParams = createSerializer(calendarParsers);
