import { LOCALE, TIMEZONE } from "@/config/locale";
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
 * Cinq étoiles, **par demies** — une étoile vaut vingt points, une demie en vaut dix
 * (docs/PRODUCT.md §4.2 : le stockage reste sur 0–100 quelle que soit l'échelle affichée).
 *
 * Les constantes vivent ici et pas dans `score-stars.tsx` : ce fichier-là est un îlot client, et la
 * timeline — un Server Component — a besoin de la même conversion pour afficher « Noté 3,5/5 ».
 */
export const SCORE_STARS = 5;
/** Le plus petit geste possible sur les étoiles. Une demie, donc dix notes et non cinq. */
export const SCORE_STAR_STEP = 0.5;

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
 * Le dénominateur quand personne ne le connaît.
 *
 * Une série en cours de diffusion n'a pas de nombre d'épisodes chez AniList, et l'omettre laissait
 * lire « 145 » comme un total. Le point d'interrogation dit la seule chose vraie : il en reste, on
 * ne sait pas combien. C'est une constante et non un littéral recopié — la fraction s'écrit dans
 * la vignette, dans le panneau de la fiche et dans le formulaire.
 */
export const UNKNOWN_TOTAL = "?";

/**
 * Où j'en suis, en une chaîne : « 12 / 24 », ou « 145 / ? » quand le total est inconnu.
 *
 * `null` à zéro : sur une œuvre seulement prévue, « 0 / 24 » n'apprend rien et alourdit chaque
 * vignette d'une bibliothèque. L'absence de compteur dit déjà « pas commencé ».
 */
export function formatEntryProgress(
  progress: number,
  total: number | null,
): string | null {
  if (progress <= 0) return null;
  return `${progress} / ${total && total > 0 ? total : UNKNOWN_TOTAL}`;
}

/**
 * Où j'en suis vis-à-vis d'un épisode du planning.
 *
 * L'état est renvoyé **à côté** du libellé, et pas déduit de lui : un appelant qui déciderait de
 * son affichage en comparant la chaîne à `"Vu"` se casserait à la première reformulation. Le
 * libellé est fait pour être lu, l'état pour être testé.
 *
 * `next` est le seul état sur lequel un « +1 » a un sens univoque : cet épisode-là est exactement
 * le suivant, donc avancer d'un cran veut dire « je viens de le voir » et rien d'autre. Deux
 * épisodes de retard, et le geste n'en rattraperait qu'un.
 */
export type AiringCatchUp = {
  state: "seen" | "next" | "behind";
  label: string;
};

/**
 * Le retard, mesuré contre un épisode du planning.
 *
 * C'est l'information que ni AniList ni MyAnimeList ne donnent sur leur grille horaire : ils disent
 * ce qui sort, pas ce qu'il vous manque pour le regarder. Sur un tracker, c'est l'inverse qui
 * décide — savoir qu'il sort un épisode 9 ce soir n'a d'usage que rapporté au fait qu'on en est au
 * 6.
 *
 * Le décompte porte sur ce qui sépare du **début** de cet épisode-là : à l'épisode 9 avec une
 * progression de 6, il en manque deux (le 7 et le 8) avant d'y arriver, pas trois.
 */
export function describeAiringCatchUp(
  episode: number,
  progress: number,
  unit: EntryUnit,
): AiringCatchUp {
  if (progress >= episode) return { state: "seen", label: "Vu" };
  if (progress === episode - 1) return { state: "next", label: "À jour" };

  const missing = episode - 1 - progress;
  const { singular } = ENTRY_UNIT_LABELS[unit];

  return {
    state: "behind",
    label: `${missing} ${singular}${missing > 1 ? "s" : ""} de retard`,
  };
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat(LOCALE, {
  numeric: "auto",
});

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
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
 *
 * **L'heure est le premier palier**, et elle a remplacé un « aujourd'hui » qui perdait l'essentiel
 * là où on le lit le plus : la carte de reprise ne montre que les trente derniers jours, et sur une
 * série qu'on suit, « il y a deux heures » et « ce matin » ne disent pas la même chose du fil qu'on
 * est en train de reprendre. Le même mot couvrait les deux. Sous l'heure, on ne compte plus : « il y
 * a 3 minutes » sur un suivi n'apprend rien de plus que « à l'instant », et rendrait le libellé
 * mouvant entre le rendu serveur et la seconde suivante.
 */
export function formatSince(date: Date, now: Date): string {
  const elapsed = now.getTime() - date.getTime();
  const days = Math.floor(elapsed / MILLISECONDS_PER_DAY);

  if (days < 1) {
    const hours = Math.floor(elapsed / MILLISECONDS_PER_HOUR);
    return hours < 1 ? "à l'instant" : RELATIVE_FORMAT.format(-hours, "hour");
  }
  if (days < DAYS_PER_MONTH) return RELATIVE_FORMAT.format(-days, "day");
  if (days < DAYS_PER_YEAR) {
    return RELATIVE_FORMAT.format(-Math.floor(days / DAYS_PER_MONTH), "month");
  }

  return RELATIVE_FORMAT.format(-Math.floor(days / DAYS_PER_YEAR), "year");
}

/**
 * Combien vaut une étoile en points de stockage. Vingt, et une demie en vaut dix.
 *
 * Le stockage reste sur 0–100 (docs/PRODUCT.md §4.2) alors que l'affichage est sur cinq : c'est ce
 * facteur qui fait l'aller-retour. Il garde tout leur sens aux notes importées d'AniList, qui
 * arrivent sur cent et qu'aucune conversion n'écrase.
 */
const POINTS_PER_STAR = 100 / SCORE_STARS;

/** Note stockée sur 0–100 → étoiles affichées, arrondies à la demie la plus proche. */
export function scoreToStars(score: number): number {
  return (
    Math.round(score / POINTS_PER_STAR / SCORE_STAR_STEP) * SCORE_STAR_STEP
  );
}

/**
 * Étoiles saisies → note stockée sur 0–100, **entière**.
 *
 * L'arrondi n'est pas une précaution de style : la colonne est un entier. Une demi-étoile tombe
 * pile sur dix points, mais rien n'oblige un futur pas à tomber juste.
 */
export function starsToScore(stars: number): number {
  return Math.round(
    Math.min(Math.max(stars, 0), SCORE_STARS) * POINTS_PER_STAR,
  );
}

/**
 * Une note d'étoiles telle qu'elle se lit en français : « 3,5 » et non « 3.5 ».
 *
 * Le séparateur vient de la locale du produit et n'est pas écrit à la main — c'est aussi ce que
 * lisent les noms accessibles des crans, qu'un lecteur d'écran francophone prononce alors
 * correctement.
 */
const STARS_FORMAT = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
});

export function formatStars(stars: number): string {
  return STARS_FORMAT.format(stars);
}

/** « 3,5/5 », « 4/5 » — la note telle qu'on la lit. */
export function formatScore(score: number): string {
  return `${formatStars(scoreToStars(score))}/${SCORE_STARS}`;
}

/**
 * La valeur exacte, **et seulement quand les étoiles la perdent**.
 *
 * Une note de 85 s'affiche « 4,5/5 » : arrondie. On ne fait pas disparaître une précision qu'on ne
 * sait pas dessiner — mais on ne répète pas non plus « 85/100 » à côté d'une note qui vaut
 * exactement ça. Le cas n'est pas théorique : les notes venues d'AniList sont sur cent.
 *
 * La question se pose par **l'aller-retour et non par un reste de division** : l'échelle perd de la
 * précision exactement quand la note n'y survit pas au passage.
 */
export function exactScoreIfRounded(score: number): string | null {
  return starsToScore(scoreToStars(score)) === score ? null : `${score}/100`;
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
        label: `Noté ${formatScore(event.score)}`,
        detail: exactScoreIfRounded(event.score),
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
