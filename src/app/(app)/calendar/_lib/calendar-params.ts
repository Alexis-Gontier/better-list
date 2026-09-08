import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server";

/**
 * Les paramètres d'URL du planning — **source unique, client et serveur**.
 *
 * **Premier axe : la semaine**, exprimée en **décalage** depuis celle en cours et non en date.
 * C'est ce qui fait que `/calendar` sans paramètre est toujours la semaine du jour, et qu'un lien
 * envoyé à quelqu'un ne le renvoie pas trois mois en arrière. La contrepartie est qu'un tel lien ne
 * désigne pas une semaine fixe — pour un cercle de quatre comptes qui se partagent surtout
 * « regarde ce qu'il sort ce soir », c'est le bon compromis.
 *
 * La borne n'est pas ici mais dans `clampWeekOffset` (`airing-week.ts`) : un parseur nuqs sait
 * refuser ce qui n'est pas un entier, pas décider ce qu'est une semaine raisonnable.
 *
 * **Second axe : la portée**, ajouté le 8 septembre 2026 sur décision d'Alexis. Ce fichier a porté
 * un seul axe jusque-là, et sa docstring le disait — l'écart est donc assumé et daté, pas subi.
 *
 * **Il a fait tomber une limite de `docs/PRODUCT.md` §9**, plutôt que de la contourner. §9 écartait
 * le planning global en toutes lettres, et précisait que le proposer supposerait « une seconde
 * source ou un miroir des grilles horaires, **pas un réglage** » — c'est-à-dire exactement ce
 * paramètre. Son chiffre était faux : il annonçait cinq mille diffusions par semaine, la mesure en
 * donne **124**. Les cinq mille venaient du `pageInfo.total` plafonné d'AniList, que le dépôt
 * documentait déjà sous `ANILIST_TOTAL_CAP` sans faire le rapprochement. §9 est corrigé, daté, et
 * porte la mesure.
 *
 * Le défaut reste `suivis` : c'est ce que l'écran fait de mieux, et c'est aussi la branche qui ne
 * coûte rien.
 */
export const CALENDAR_SCOPES = ["suivis", "tout"] as const;
export type CalendarScope = (typeof CALENDAR_SCOPES)[number];

export const calendarParsers = {
  week: parseAsInteger.withDefault(0),
  portee: parseAsStringLiteral(CALENDAR_SCOPES).withDefault("suivis"),
};

/** Lecture du décalage depuis les `searchParams` d'une page. */
export const loadCalendarParams = createLoader(calendarParsers);

/**
 * Construction d'une URL de planning, pour les flèches de navigation. Bâtir l'adresse avec le
 * parseur qui la relira garantit l'aller-retour, et omet `week=0` — la semaine en cours reste donc
 * à `/calendar` tout court.
 */
export const serializeCalendarParams = createSerializer(calendarParsers);
