import { LOCALE, TIMEZONE } from "@/config/locale";

/**
 * Le découpage en semaines du planning de diffusion.
 *
 * Fonctions pures et testées (`airing-week.test.ts`), comme `media-season.ts` — et pour la même
 * raison : un décalage d'un jour est le genre d'erreur qui ne se voit pas en la relisant.
 *
 * **Tout est calculé à Paris** (docs/PRODUCT.md §7). Ce n'est pas une coquetterie d'affichage : un
 * épisode diffusé le mardi à 1 h 30 heure française tombe le lundi en UTC, donc un planning calculé
 * dans le fuseau du serveur rangerait la moitié des animes de la nuit dans la mauvaise colonne. Les
 * bornes envoyées à AniList sont donc des minuits **parisiens**, pas des minuits UTC.
 *
 * La semaine commence le **lundi**, comme partout en France — et pas le dimanche que renvoie
 * `getDay()`.
 */

/** Un jour du planning : sa colonne, son intitulé, et l'instant où il commence. */
export type AiringDay = {
  /** Clé de regroupement `YYYY-MM-DD`. Jamais affichée — seulement comparée. */
  key: string;
  /** « Lundi 3 août ». */
  label: string;
  isToday: boolean;
};

export type AiringWeek = {
  /** Nombre de semaines depuis celle en cours : négatif dans le passé, 0 pour aujourd'hui. */
  offset: number;
  days: AiringDay[];
  /** « 3–9 août 2026 » — la semaine en une ligne. */
  label: string;
  /** Début de la semaine, en secondes Unix. **Inclus.** */
  from: number;
  /** Début de la semaine suivante, en secondes Unix. **Exclu.** */
  to: number;
};

/**
 * Extraction des champs de calendrier à Paris.
 *
 * Locale figée à `en-US` et `hourCycle: "h23"` volontairement : ce n'est pas du texte à lire, c'est
 * une lecture de champs — on veut des chiffres ASCII que `Number` relit, et un minuit qui vaut 0 et
 * non 24, ce que `hour12: false` laisse encore arriver selon la version d'ICU.
 */
const CIVIL_IN_PARIS = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type CivilDate = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function civilInParis(instant: Date): CivilDate {
  const parts = CIVIL_IN_PARIS.formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: field("year"),
    month: field("month"),
    day: field("day"),
    hour: field("hour"),
    minute: field("minute"),
    second: field("second"),
  };
}

function dayKey({
  year,
  month,
  day,
}: Pick<CivilDate, "year" | "month" | "day">) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Le décalage du fuseau à cet instant, en millisecondes. */
function offsetAt(instant: Date): number {
  const civil = civilInParis(instant);

  return (
    Date.UTC(
      civil.year,
      civil.month - 1,
      civil.day,
      civil.hour,
      civil.minute,
      civil.second,
    ) - instant.getTime()
  );
}

/**
 * L'instant UTC de minuit, heure de Paris, pour une date civile donnée.
 *
 * **Deux passes, et la seconde n'est pas superflue.** Le décalage est lu à un instant supposé ; le
 * dernier dimanche de mars, cet instant supposé tombe de l'autre côté du changement d'heure et le
 * décalage lu vaut une heure de trop. La seconde passe le relit à l'instant corrigé, qui est cette
 * fois du bon côté. Un test prend exactement ce cas.
 */
function parisMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetAt(new Date(guess));

  return new Date(guess - offsetAt(new Date(first)));
}

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Jusqu'où on laisse remonter et descendre le planning : un trimestre de part et d'autre.
 *
 * Ce n'est pas une borne technique mais une borne honnête. AniList ne publie de grille horaire que
 * pour les séries annoncées — au-delà d'une saison, la semaine demandée serait vide sans qu'on
 * puisse dire si c'est parce que rien ne sort ou parce que rien n'est encore connu.
 */
export const WEEK_OFFSET_LIMIT = 12;

/** Un `?week=` forgé ou décimal ne doit pas atteindre la requête. */
export function clampWeekOffset(offset: number): number {
  return Math.min(
    Math.max(Math.trunc(offset), -WEEK_OFFSET_LIMIT),
    WEEK_OFFSET_LIMIT,
  );
}

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const WEEK_LABEL_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** Le français ne capitalise pas ses jours ; un début de ligne, si. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** « 22:30 », heure de Paris — l'heure de diffusion telle qu'on la vivrait ici. */
export function formatAiringTime(airingAt: number): string {
  return TIME_FORMAT.format(new Date(airingAt * 1000));
}

/** La colonne où ranger un horaire de diffusion. */
export function airingDayKey(airingAt: number): string {
  return dayKey(civilInParis(new Date(airingAt * 1000)));
}

/**
 * La semaine à afficher : ses sept jours, son intitulé, et ses bornes pour AniList.
 *
 * L'arithmétique de calendrier passe par `Date.UTC` sur la **date civile parisienne**, jamais sur
 * l'instant : en UTC un jour dure toujours vingt-quatre heures, donc ajouter des jours y est exact,
 * là où `instant + 86 400 000` se décale d'une heure deux fois par an. Chaque date obtenue est
 * ensuite reconvertie en instant par `parisMidnight`, qui rattrape le changement d'heure.
 */
export function airingWeek(now: Date, offset: number): AiringWeek {
  const today = civilInParis(now);
  const todayKey = dayKey(today);

  const civilToday = Date.UTC(today.year, today.month - 1, today.day);
  // `getUTCDay()` compte le dimanche comme 0 ; on veut le lundi comme 0.
  const sinceMonday = (new Date(civilToday).getUTCDay() + 6) % DAYS_PER_WEEK;
  const civilMonday =
    civilToday + (offset * DAYS_PER_WEEK - sinceMonday) * MS_PER_DAY;

  /** Huit bornes pour sept jours : la dernière est le début de la semaine suivante. */
  const boundaries = Array.from({ length: DAYS_PER_WEEK + 1 }, (_, index) => {
    const civil = new Date(civilMonday + index * MS_PER_DAY);

    return parisMidnight(
      civil.getUTCFullYear(),
      civil.getUTCMonth() + 1,
      civil.getUTCDate(),
    );
  });

  const days = boundaries.slice(0, DAYS_PER_WEEK).map((start) => {
    const key = dayKey(civilInParis(start));

    return {
      key,
      label: capitalize(DAY_LABEL_FORMAT.format(start)),
      isToday: key === todayKey,
    };
  });

  const first = boundaries[0];
  const last = boundaries[DAYS_PER_WEEK - 1];

  return {
    offset,
    days,
    // `formatRange` factorise ce que les deux dates ont en commun — « 3–9 août 2026 » sur une
    // semaine ordinaire, « 30 novembre – 6 décembre 2026 » à cheval sur deux mois. L'écrire à la
    // main demanderait de traiter les deux cas.
    label: WEEK_LABEL_FORMAT.formatRange(first, last),
    from: Math.floor(first.getTime() / 1000),
    to: Math.floor(boundaries[DAYS_PER_WEEK].getTime() / 1000),
  };
}

/**
 * Les diffusions rangées dans les sept colonnes de la semaine.
 *
 * **Les sept jours sont renvoyés, y compris les vides** : c'est ce qui distingue un planning d'une
 * liste. Savoir qu'il n'y a rien le jeudi est une information, et la masquer ferait glisser le
 * vendredi à sa place.
 *
 * Générique sur l'élément, comme `groupEventsByDay` : l'appelant a joint ses propres données à
 * chaque diffusion, et une signature figée les lui ferait perdre au regroupement.
 */
export function groupAiringByDay<T extends { airingAt: number }>(
  week: AiringWeek,
  items: T[],
): Array<AiringDay & { items: T[] }> {
  const columns = new Map(week.days.map((day) => [day.key, [] as T[]]));

  for (const item of items) {
    // Une diffusion hors des bornes n'a pas de colonne : elle est ignorée plutôt que rangée de
    // force dans le premier jour venu.
    columns.get(airingDayKey(item.airingAt))?.push(item);
  }

  return week.days.map((day) => ({
    ...day,
    items: columns.get(day.key) ?? [],
  }));
}
