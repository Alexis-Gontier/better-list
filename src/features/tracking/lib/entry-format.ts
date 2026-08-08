import { LOCALE, TIMEZONE } from "@/config/locale";
import type { ScoreFormat } from "@/features/preferences/schemas/preferences.schema";
import type { EntryEventDraft } from "@/features/tracking/lib/entry-transition";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

/**
 * Mise en forme du suivi et de son journal.
 *
 * Fonctions pures, sans React, sans Prisma : elles servent au panneau (client) comme à la timeline
 * (serveur), et elles sont testées (`entry-format.test.ts`). Un module isomorphe est le seul moyen
 * de partager ces libellés sans faire traverser la frontière server/client à autre chose que des
 * chaînes.
 *
 * Les tables sont exhaustives par construction : un `Record<EntryStatus, string>` casse au build si
 * l'énumération gagne une valeur.
 *
 * `features/media/lib/media-format.ts` porte une table aux mêmes six libellés — mais pour la
 * distribution des statuts **de la communauté AniList**, qui est une donnée du domaine `media`.
 * Deux domaines qui affichent par coïncidence les mêmes mots ne sont pas une duplication à
 * factoriser : coupler `tracking` à `media` pour six mots coûterait plus que de les réécrire.
 */

export type EntryUnit = "episode" | "chapitre";

/**
 * L'unité en français lisible. `EntryUnit` est un jeton technique — sans accent, invariable —, et
 * l'écrire tel quel dans une étiquette donne « Avancer d'un episode » à lire au lecteur d'écran.
 *
 * Les tournures sont écrites en entier plutôt que composées : le français élide (« nombre
 * **d'**épisodes » mais « nombre **de** chapitres ») et accorde le participe au support — on *voit*
 * des épisodes, on *lit* des chapitres. Aucune concaténation ne produit ça correctement.
 */
export const ENTRY_UNIT_LABELS: Record<
  EntryUnit,
  { singular: string; consumed: string }
> = {
  episode: { singular: "épisode", consumed: "Épisodes vus" },
  chapitre: { singular: "chapitre", consumed: "Chapitres lus" },
};

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  CURRENT: "En cours",
  PLANNING: "Prévu",
  COMPLETED: "Terminé",
  PAUSED: "En pause",
  DROPPED: "Abandonné",
  REPEATING: "Relecture",
};

/**
 * Cinq étoiles pleines, une étoile vaut vingt points (docs/PRODUCT.md §4.2 : le stockage reste sur
 * 0–100). Les deux constantes vivent ici et pas dans `score-stars.tsx` : ce fichier-là est un îlot
 * client, et la timeline — un Server Component — a besoin de la même conversion pour afficher
 * « Noté 4/5 ».
 */
export const SCORE_STARS = 5;
export const SCORE_POINTS_PER_STAR = 20;

/**
 * Un événement du journal, tel qu'il est lu.
 *
 * Volontairement décrit ici plutôt qu'importé du client Prisma : ce type traverse la frontière
 * server/client, et un type généré côté serveur n'a rien à faire dans un composant. Les champs
 * sont ceux de `EntryEvent` (prisma/schema.prisma), moins ceux dont l'affichage n'a que faire.
 */
export type EntryEventView = {
  id: string;
  type: EntryEventDraft["type"];
  progressFrom: number | null;
  progressTo: number | null;
  statusFrom: EntryStatus | null;
  statusTo: EntryStatus | null;
  score: number | null;
  note: string | null;
  createdAt: Date;
};

/** Une ligne de journal : ce qui s'est passé, et la précision qui l'accompagne. */
export type EntryEventLine = {
  label: string;
  detail: string | null;
};

/**
 * **Le fuseau est fixe, et il vient de `@/config/locale`** — jamais de celui de la machine. Le
 * pourquoi y est écrit ; le respecter ici est ce qui rend le journal identique au rendu serveur et
 * après hydratation.
 *
 * La clé de journée passe par `en-CA`, dont le format est celui d'une date ISO. Sa forme exacte n'a
 * aucune importance : elle n'est ni affichée ni triée, seulement comparée à d'autres clés produites
 * par la même fonction.
 */
const DAY_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const DAY_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
});

const DAY_WITH_YEAR_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const YEAR_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
});

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Clé de regroupement d'une journée. Sa forme exacte n'a aucune importance — elle n'est jamais
 * affichée ni triée, seulement comparée à d'autres clés produites par la même fonction.
 */
function dayKey(date: Date): string {
  return DAY_KEY_FORMAT.format(date);
}

/** Heure d'un événement, dans le fuseau de référence. */
export function formatEventTime(date: Date): string {
  return TIME_FORMAT.format(date);
}

/**
 * Intitulé d'une journée : « Aujourd'hui », « Hier », puis la date.
 *
 * L'année ne s'affiche que si ce n'est pas l'année courante — sur un journal, la répétition de
 * « 2026 » à chaque ligne n'apprend rien, alors que « 3 mars 2019 » signale au premier coup d'œil
 * un rattrapage d'historique.
 */
export function formatDayLabel(date: Date, now: Date): string {
  const key = dayKey(date);

  if (key === dayKey(now)) return "Aujourd'hui";
  if (key === dayKey(new Date(now.getTime() - MILLISECONDS_PER_DAY))) {
    return "Hier";
  }

  return YEAR_FORMAT.format(date) === YEAR_FORMAT.format(now)
    ? DAY_FORMAT.format(date)
    : DAY_WITH_YEAR_FORMAT.format(date);
}

/**
 * Où j'en suis, en une chaîne : « 12 / 24 », ou « 12 » quand le total est inconnu.
 *
 * `null` à zéro : sur une œuvre seulement prévue, « 0 / 24 » n'apprend rien et alourdit chaque
 * vignette d'une bibliothèque. L'absence de compteur dit déjà « pas commencé ».
 */
export function formatEntryProgress(
  progress: number,
  total: number | null,
): string | null {
  if (progress <= 0) return null;
  return total && total > 0 ? `${progress} / ${total}` : String(progress);
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat(LOCALE, {
  numeric: "auto",
});

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/**
 * « il y a trois mois » — l'ancienneté d'un geste.
 *
 * C'est toute l'information de la section « à reprendre » (docs/PRODUCT.md §8.4) : savoir qu'une
 * série est en pause n'apprend rien, savoir qu'elle l'est depuis huit mois décide.
 *
 * **Une durée, pas une date** : aucun fuseau n'intervient ici, contrairement aux intitulés de
 * journée. On dégrade l'unité avec l'âge — au-delà d'un mois, « il y a 47 jours » se compte au lieu
 * de se lire.
 */
export function formatSince(date: Date, now: Date): string {
  const days = Math.floor(
    (now.getTime() - date.getTime()) / MILLISECONDS_PER_DAY,
  );

  if (days < 1) return "aujourd'hui";
  if (days < DAYS_PER_MONTH) return RELATIVE_FORMAT.format(-days, "day");
  if (days < DAYS_PER_YEAR) {
    return RELATIVE_FORMAT.format(-Math.floor(days / DAYS_PER_MONTH), "month");
  }

  return RELATIVE_FORMAT.format(-Math.floor(days / DAYS_PER_YEAR), "year");
}

/** Note stockée sur 0–100 → nombre d'étoiles affichées. */
export function scoreToStars(score: number): number {
  return Math.round(score / SCORE_POINTS_PER_STAR);
}

/**
 * Combien vaut un cran de l'échelle, en points de stockage.
 *
 * Le stockage reste sur 0–100 quelle que soit l'échelle affichée (docs/PRODUCT.md §4.2) : c'est ce
 * facteur qui fait l'aller-retour, et le fait qu'il soit défini une fois est ce qui garantit qu'une
 * note saisie à « 8/10 » se relise « 4/5 » après un changement de réglage, sans avoir bougé en base.
 */
export const SCORE_STEP: Record<ScoreFormat, number> = {
  POINT_100: 1,
  POINT_10: 10,
  POINT_5: SCORE_POINTS_PER_STAR,
};

/** Le maximum de l'échelle affichée : 100, 10 ou 5. */
export function scoreScaleMax(format: ScoreFormat): number {
  return Math.round(100 / SCORE_STEP[format]);
}

/** Note stockée → valeur dans l'échelle affichée. */
export function scoreToScale(score: number, format: ScoreFormat): number {
  return Math.round(score / SCORE_STEP[format]);
}

/** Valeur saisie dans l'échelle affichée → note stockée sur 0–100. */
export function scaleToScore(value: number, format: ScoreFormat): number {
  return (
    Math.min(Math.max(value, 0), scoreScaleMax(format)) * SCORE_STEP[format]
  );
}

/** « 8/10 », « 4/5 », « 85/100 » — la note dans l'échelle du lecteur. */
export function formatScore(score: number, format: ScoreFormat): string {
  return `${scoreToScale(score, format)}/${scoreScaleMax(format)}`;
}

/**
 * La valeur exacte, **et seulement quand l'échelle la perd**.
 *
 * Une note de 85 s'affiche « 4/5 » sur cinq étoiles : arrondie. On ne fait pas disparaître une
 * précision qu'on ne sait pas dessiner — mais on ne répète pas non plus « 85/100 » à côté de
 * « 85/100 ».
 */
export function exactScoreIfRounded(
  score: number,
  format: ScoreFormat,
): string | null {
  return score % SCORE_STEP[format] === 0 ? null : `${score}/100`;
}

/**
 * Un événement en une phrase.
 *
 * L'unité vient de l'œuvre (`ANIME` → épisode, sinon chapitre) : le journal ne la porte pas, et il
 * a raison — elle est une propriété du média, pas de l'événement, et un média ne change pas de
 * type entre deux lignes.
 */
export function describeEntryEvent(
  event: EntryEventView,
  unit: EntryUnit,
  scoreFormat: ScoreFormat,
): EntryEventLine {
  switch (event.type) {
    case "PROGRESS": {
      const to = event.progressTo ?? 0;
      const label = `${unit === "episode" ? "Épisode" : "Chapitre"} ${to}`;

      /**
       * L'écart, pas la valeur de départ : « +8 » dit ce qui a été fait ce jour-là, là où
       * « depuis 12 » demande une soustraction au lecteur. C'est toute la raison d'être du couple
       * `from`/`to` (docs/PRODUCT.md §4.3).
       */
      if (event.progressFrom === null || event.progressFrom === to) {
        return { label, detail: null };
      }

      const delta = to - event.progressFrom;
      return {
        label,
        // Signe moins typographique (U+2212) et non un trait d'union : un recul se lit.
        detail: delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`,
      };
    }

    case "STATUS_CHANGED": {
      // `statusTo` est toujours écrit par la transition ; le repli couvre une ligne abîmée à la
      // main en base plutôt que de laisser « undefined » s'afficher.
      if (event.statusTo === null) {
        return { label: "Statut modifié", detail: null };
      }

      const to = ENTRY_STATUS_LABELS[event.statusTo];

      // `statusFrom` absent = l'entrée vient de naître : c'est l'entrée dans la bibliothèque.
      if (event.statusFrom === null) {
        return { label: "Ajouté à la bibliothèque", detail: to };
      }

      return {
        label: to,
        detail: `depuis ${ENTRY_STATUS_LABELS[event.statusFrom]}`,
      };
    }

    case "SCORED": {
      if (event.score === null) return { label: "Note modifiée", detail: null };

      return {
        label: `Noté ${formatScore(event.score, scoreFormat)}`,
        detail: exactScoreIfRounded(event.score, scoreFormat),
      };
    }

    case "NOTE":
      return { label: "Note personnelle", detail: event.note };

    /**
     * `REPEAT_STARTED` accompagne toujours un `STATUS_CHANGED` vers `REPEATING` : il ne redit donc
     * pas le statut, il dit ce que le statut tait — que le curseur est reparti de zéro.
     */
    case "REPEAT_STARTED":
      return { label: "Reprise depuis le début", detail: null };

    default:
      return { label: "Événement", detail: null };
  }
}

export type EntryEventDay<T> = {
  key: string;
  label: string;
  events: T[];
};

/**
 * Le journal, regroupé par journée.
 *
 * La granularité voulue est le jour (docs/PRODUCT.md §4.3) : « le 3 mars, 15 épisodes » est
 * l'information, l'heure exacte du quinzième ne l'est pas.
 *
 * Générique sur l'événement, et pas fixé à `EntryEventView` : le tableau de bord lit le journal de
 * **toutes** les œuvres et joint le titre à chaque ligne. Un paramètre de type lui garde ce champ
 * supplémentaire, là où une signature figée le lui aurait fait perdre au premier regroupement.
 *
 * L'ordre d'entrée est **conservé tel quel** — c'est la requête qui trie, une fois, en base, où
 * l'index le fait gratuitement. Re-trier ici masquerait un `orderBy` oublié.
 */
export function groupEventsByDay<T extends { createdAt: Date }>(
  events: T[],
  now: Date,
): EntryEventDay<T>[] {
  const days: EntryEventDay<T>[] = [];

  for (const event of events) {
    const key = dayKey(event.createdAt);
    const last = days.at(-1);

    if (last?.key === key) {
      last.events.push(event);
      continue;
    }

    days.push({
      key,
      label: formatDayLabel(event.createdAt, now),
      events: [event],
    });
  }

  return days;
}
