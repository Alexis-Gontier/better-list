import type {
  EntryStatus,
  SaveEntryInput,
} from "@/features/tracking/schemas/tracking.schema";

/**
 * Les changements demandés, dates déjà converties.
 *
 * Le schéma reçoit `startedAt` et `finishedAt` en chaînes `AAAA-MM-JJ` — ce que produit un
 * `<input type="date">` — et la Server Action les transforme avant d'arriver ici. La transition
 * ne raisonne que sur des `Date`, et n'a rien à savoir du format d'un champ de formulaire.
 */
export type EntryChanges = Omit<
  SaveEntryInput,
  "mediaId" | "startedAt" | "finishedAt"
> & {
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

/**
 * Le suivi, comme transition d'état pure.
 *
 * Tout ce qui décide « qu'est-ce que devient l'entrée, et qu'est-ce qu'on inscrit au journal »
 * vit ici, sans Prisma, sans session, sans date implicite. La Server Action ne fait plus que
 * persister le résultat — et cette logique-là, qui est celle qui se trompe, est testable
 * (`entry-transition.test.ts`).
 *
 * Deux idées gouvernent le fichier, toutes deux de docs/PRODUCT.md §4.2 et §4.3 :
 *
 * - **L'état est écrasé, la mémoire est ajoutée.** `next` remplace la ligne `Entry` ; `events`
 *   s'insère par-dessus l'existant et n'est jamais modifié.
 * - **Le geste de l'utilisateur est court, ses conséquences ne le sont pas.** Cliquer « +1 » sur
 *   le dernier épisode termine la série, date la fin, et laisse deux lignes au journal. C'est ici
 *   que ces déductions se font, une fois, plutôt que dans chaque bouton.
 */

export type EntryState = {
  status: EntryStatus;
  progress: number;
  progressVolumes: number | null;
  score: number | null;
  favorite: boolean;
  notes: string | null;
  repeatCount: number;
  startedAt: Date | null;
  finishedAt: Date | null;
};

/** Un événement à insérer. Les champs absents restent `null` en base. */
export type EntryEventDraft = {
  type: "PROGRESS" | "STATUS_CHANGED" | "SCORED" | "NOTE" | "REPEAT_STARTED";
  progressFrom?: number;
  progressTo?: number;
  statusFrom?: EntryStatus;
  statusTo?: EntryStatus;
  score?: number;
  note?: string;
};

/** Une œuvre qu'on n'a jamais touchée : prévue, à zéro, sans note. */
export const INITIAL_ENTRY: EntryState = {
  status: "PLANNING",
  progress: 0,
  progressVolumes: null,
  score: null,
  favorite: false,
  notes: null,
  repeatCount: 0,
  startedAt: null,
  finishedAt: null,
};

export function applyEntryChanges({
  current,
  input,
  total,
  now,
}: {
  /** `null` quand l'œuvre n'est pas encore suivie — le premier geste crée l'entrée. */
  current: EntryState | null;
  input: EntryChanges;
  /** Nombre d'épisodes ou de chapitres. `null` sur une œuvre en cours, dont le total est inconnu. */
  total: number | null;
  now: Date;
}): { next: EntryState; events: EntryEventDraft[] } {
  const base = current ?? INITIAL_ENTRY;

  const next: EntryState = {
    ...base,
    ...(input.status !== undefined && { status: input.status }),
    ...(input.progress !== undefined && { progress: input.progress }),
    ...(input.progressVolumes !== undefined && {
      progressVolumes: input.progressVolumes,
    }),
    ...(input.score !== undefined && { score: input.score }),
    ...(input.favorite !== undefined && { favorite: input.favorite }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.startedAt !== undefined && { startedAt: input.startedAt }),
    ...(input.finishedAt !== undefined && { finishedAt: input.finishedAt }),
    ...(input.repeatCount !== undefined && { repeatCount: input.repeatCount }),
  };

  // Le plafond vient du miroir, jamais du client : « épisode 900 » sur une série de 12 est une
  // saisie erronée ou forgée, dans les deux cas à ramener au réel.
  if (total !== null && total > 0) {
    next.progress = Math.min(next.progress, total);
  }

  /**
   * Déductions de statut — **seulement si l'utilisateur n'en a pas imposé un**. Choisir « En
   * pause » puis voir l'application écrire « Terminé » parce que le compteur est au maximum serait
   * une décision volée.
   */
  if (input.status === undefined) {
    if (next.progress > base.progress && next.status === "PLANNING") {
      next.status = "CURRENT";
    }

    if (
      total !== null &&
      total > 0 &&
      next.progress >= total &&
      next.status !== "COMPLETED"
    ) {
      next.status = "COMPLETED";
    }
  }

  /**
   * Les dates et le compteur de relectures sont **automatiques par défaut, et rattrapables**.
   *
   * Une valeur explicitement envoyée gagne toujours : sans ça, saisir « commencé en 2019 » puis
   * basculer le statut en « En cours » réécrirait la date d'aujourd'hui par-dessus, et rattraper
   * un historique deviendrait impossible. `undefined` — le champ n'a pas été touché — est donc
   * distingué de `null`, qui est un effacement voulu.
   */
  const keepsStartedAt = input.startedAt !== undefined;
  const keepsFinishedAt = input.finishedAt !== undefined;
  const keepsRepeatCount = input.repeatCount !== undefined;

  if (next.status !== base.status) {
    if (
      next.status === "CURRENT" &&
      next.startedAt === null &&
      !keepsStartedAt
    ) {
      next.startedAt = now;
    }

    if (next.status === "COMPLETED") {
      if (!keepsFinishedAt) next.finishedAt = now;
      if (total !== null && total > 0) next.progress = total;
      // Terminer une relecture, c'est la compter. Le compteur ne bouge qu'à cet instant précis.
      if (base.status === "REPEATING" && !keepsRepeatCount) {
        next.repeatCount = base.repeatCount + 1;
      }
    }

    /**
     * Relancer une série remet le curseur à zéro : « j'en suis à l'épisode 24 » est faux dès la
     * seconde où l'on recommence. `finishedAt` reste — la première fin a bien eu lieu, et c'est
     * le journal, pas l'état, qui garde la trace des deux passages.
     */
    if (next.status === "REPEATING") {
      next.progress = 0;
      if (!keepsStartedAt) next.startedAt = now;
    }
  }

  return { next, events: diffEvents(base, next, current === null) };
}

/**
 * Le journal, déduit de l'écart entre l'avant et l'après.
 *
 * Diffé à la fin plutôt qu'enregistré au fil des règles : sinon un « +1 » qui déclenche la fin de
 * série, laquelle recale la progression sur le total, produirait deux événements de progression
 * pour un seul geste.
 */
function diffEvents(
  base: EntryState,
  next: EntryState,
  isNew: boolean,
): EntryEventDraft[] {
  const events: EntryEventDraft[] = [];

  if (next.progress !== base.progress) {
    events.push({
      type: "PROGRESS",
      progressFrom: base.progress,
      progressTo: next.progress,
    });
  }

  // Une entrée qui naît a un statut, même si c'est le statut par défaut : sans cette ligne, la
  // timeline ne saurait pas dire quand l'œuvre est entrée dans la bibliothèque.
  if (next.status !== base.status || isNew) {
    events.push({
      type: "STATUS_CHANGED",
      statusFrom: isNew ? undefined : base.status,
      statusTo: next.status,
    });
  }

  /**
   * `REPEAT_STARTED` **en plus** de `STATUS_CHANGED`, pas à la place : le journal doit rester une
   * source complète de l'historique des statuts, et compter les relectures ne doit pas obliger à
   * en relire l'énumération.
   */
  if (next.status === "REPEATING" && base.status !== "REPEATING") {
    events.push({ type: "REPEAT_STARTED" });
  }

  if (next.score !== base.score && next.score !== null) {
    events.push({ type: "SCORED", score: next.score });
  }

  if (next.notes !== base.notes && next.notes) {
    events.push({ type: "NOTE", note: next.notes });
  }

  return events;
}
