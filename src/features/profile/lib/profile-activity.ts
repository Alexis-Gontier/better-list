import { LOCALE, TIMEZONE } from "@/config/locale";
import { dayKey } from "@/features/tracking/lib/entry-format";

/**
 * Le calendrier d'activité : une année d'événements rangée en 365 cases.
 *
 * Fonctions **pures**, sans Prisma ni React : elles reçoivent des dates et rendent des nombres,
 * donc elles se testent sans base ni rendu (`profile-activity.test.ts`). C'est aussi ce qui permet
 * au composant d'être un simple afficheur — il ne calcule aucun seuil.
 *
 * **Tout le découpage passe par `dayKey`**, donc par le fuseau de `config/locale.ts`, jamais par
 * celui de la machine. Un événement du 3 mars à 00 h 30 à Paris appartient au 3 mars, y compris sur
 * un serveur qui vit en UTC et le date du 2.
 */

/** Une case du calendrier. `date` est une clé `AAAA-MM-JJ` **en fuseau de Paris**. */
export type ActivityDay = {
  date: string;
  count: number;
  /** 0 à 4. Calculé à la lecture par `activityLevel`, jamais stocké. */
  level: number;
};

export type ActivityCalendar = {
  days: ActivityDay[];
  total: number;
  /** Jours consécutifs avec au moins un événement, en remontant depuis aujourd'hui. */
  streak: number;
};

/** Le nombre de jours affichés — un an, aujourd'hui compris. */
export const ACTIVITY_WINDOW_DAYS = 365;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Les quatre seuils qui séparent les cinq niveaux : 0, puis 1-2, 3-5, 6-9, 10 et plus.
 *
 * **Des seuils absolus et non des quantiles**, et c'est une décision. Sur un cercle de quatre
 * comptes, une année à trois journées actives ferait, en quantiles, passer « 1 événement » pour un
 * sommet : chaque profil redéfinirait son échelle, et deux profils côte à côte deviendraient
 * incomparables — alors que les comparer du regard est à peu près tout ce qu'on fait d'un
 * calendrier d'activité.
 */
const LEVEL_THRESHOLDS = [1, 3, 6, 10];

/** Le niveau d'intensité d'une journée, d'après son nombre d'événements. */
export function activityLevel(count: number): number {
  let level = 0;

  for (const threshold of LEVEL_THRESHOLDS) {
    if (count >= threshold) level += 1;
  }

  return level;
}

/**
 * Une année d'horodatages → la grille, son total et la série en cours.
 *
 * **La fenêtre est glissante** : elle finit aujourd'hui et commence 364 jours plus tôt, pas au
 * 1er janvier. C'est pour ça que le composant n'affiche jamais « en 2026 » — sur onze mois de
 * l'année, ce serait faux.
 *
 * Les journées vides sont **écrites**, pas omises : le calendrier a besoin d'une case par jour pour
 * que la grille garde sa forme, et un trou dans la série décalerait tout ce qui suit d'une colonne.
 */
export function buildActivityCalendar(
  timestamps: Date[],
  now: Date,
): ActivityCalendar {
  const counts = new Map<string, number>();

  for (const timestamp of timestamps) {
    const key = dayKey(timestamp);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: ActivityDay[] = [];
  let total = 0;

  /*
    On recule depuis aujourd'hui plutôt que d'avancer depuis une date de départ calculée : la
    dernière case doit être le jour courant, et c'est la seule façon de le garantir sans dépendre
    de l'arithmétique des changements d'heure. Un aller-retour par `dayKey` normalise le reste.
  */
  for (let back = ACTIVITY_WINDOW_DAYS - 1; back >= 0; back -= 1) {
    const date = new Date(now.getTime() - back * MILLISECONDS_PER_DAY);
    const key = dayKey(date);
    const count = counts.get(key) ?? 0;

    total += count;
    days.push({ date: key, count, level: activityLevel(count) });
  }

  return { days, total, streak: currentStreak(days) };
}

/**
 * Les jours consécutifs actifs, en remontant depuis la fin de la grille.
 *
 * **Une journée vide *aujourd'hui* n'interrompt pas la série**, et c'est le seul cas particulier de
 * cette fonction. À 9 h du matin, on n'a encore rien fait de sa journée ; compter zéro remettrait
 * le compteur à zéro chaque nuit, pour le restaurer le soir venu. La série se rompt donc à la
 * première journée vide **antérieure** à aujourd'hui.
 */
function currentStreak(days: ActivityDay[]): number {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (!day) break;

    if (day.count > 0) {
      streak += 1;
      continue;
    }

    // Le jour courant est le dernier de la grille : vide, il est sauté plutôt que fatal.
    if (index === days.length - 1) continue;

    break;
  }

  return streak;
}

/** Une clé `AAAA-MM-JJ` qui désigne un vrai jour — le 31 février n'en est pas un. */
export function isDayKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  return date.toISOString().slice(0, 10) === value;
}

/**
 * Les parties d'un instant **lues à Paris**. `en-US` et `h23` pour des nombres sans surprise :
 * seules les valeurs comptent ici, pas leur mise en forme.
 */
const ZONE_PARTS_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** L'avance de Paris sur UTC à cet instant, en millisecondes (une ou deux heures selon la saison). */
function zoneOffsetAt(instant: number): number {
  const parts = Object.fromEntries(
    ZONE_PARTS_FORMAT.formatToParts(new Date(instant)).map((part) => [
      part.type,
      Number(part.value),
    ]),
  );
  const asUtc = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  return asUtc - instant;
}

/** Minuit à Paris, ce jour-là. Deux passes : l'avance de minuit peut différer de celle de 0 h UTC. */
function zoneMidnight(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  const utcMidnight = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const guess = utcMidnight - zoneOffsetAt(utcMidnight);
  return utcMidnight - zoneOffsetAt(guess);
}

/**
 * Le jour `AAAA-MM-JJ` de Paris → l'intervalle d'instants `[début, fin[` qu'il couvre.
 *
 * C'est l'inverse de `dayKey`, et il en faut un pour que le journal filtré sur une case du
 * calendrier montre **exactement** ce que la case compte. Un intervalle calculé en UTC
 * décalerait d'une ou deux heures, et un événement de 0 h 30 changerait de jour entre la case et
 * le journal.
 *
 * **La fin est le minuit du lendemain, pas début + 24 h** : les jours de changement d'heure durent
 * 23 ou 25 heures (`profile-activity.test.ts`).
 */
export function dayRange(key: string): { gte: Date; lt: Date } {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1))
    .toISOString()
    .slice(0, 10);

  return { gte: new Date(zoneMidnight(key)), lt: new Date(zoneMidnight(next)) };
}

/**
 * **`timeZone: "UTC"` est ici le bon fuseau, et c'est le seul endroit du projet où l'écrire.** Les
 * clés `AAAA-MM-JJ` arrivent déjà calculées à Paris par le serveur (`dayKey`) ; ce format ne fait
 * que réécrire une **date seule** en français, il ne convertit aucun instant. Relire cette clé en
 * `Europe/Paris` la décalerait d'un jour en heure d'été, puisqu'elle est reconstruite à minuit UTC.
 *
 * La locale, elle, vient bien de `config/locale.ts` : la règle du projet vaut pour tout `Intl.*`.
 */
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** « samedi 3 octobre 2026 » — l'intitulé d'une case, au survol comme en tête du journal filtré. */
export function formatDayKey(key: string): string {
  return DAY_LABEL_FORMAT.format(new Date(`${key}T00:00:00Z`));
}
