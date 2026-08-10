import {
  type EntryState,
  INITIAL_ENTRY,
} from "@/features/tracking/lib/entry-transition";
import type { SaveEntryInput } from "@/features/tracking/schemas/tracking.schema";

/**
 * Le suivi tel qu'un **formulaire** le manipule, et la traduction en changements à envoyer.
 *
 * Deux façons d'éditer cohabitent dans le produit, et ce fichier est ce qui les réconcilie :
 *
 * - le panneau de la fiche enregistre **au geste** — chaque contrôle envoie ce qu'il vient de
 *   changer, seul ;
 * - la fenêtre d'une vignette enregistre **au bouton** — on vient y corriger trois choses d'un
 *   coup, et une écriture par frappe y serait une écriture par hésitation.
 *
 * Ce que les deux partagent est l'invariant qui compte : **on n'envoie jamais l'état complet**
 * (docs/PRODUCT.md §4.2). Un onglet ouvert depuis dix minutes qui réécrirait ses huit champs
 * effacerait, en cochant « favori », une progression saisie ailleurs entre-temps. Le formulaire
 * respecte donc la même règle que les contrôles, par différence plutôt que par construction.
 *
 * Fonctions pures, sans React : c'est la partie qui décide de ce qui part en base, donc la partie
 * qui doit être testée (`entry-draft.test.ts`).
 */

/**
 * Les champs du formulaire, **dans le type que porte un `<input>`**.
 *
 * Les nombres et les dates y sont des chaînes, et c'est volontaire : un champ vide, un « 1 » en
 * cours de frappe vers « 12 » ou une date à moitié saisie n'ont pas d'équivalent numérique. Les
 * convertir à chaque touche obligerait à choisir une valeur pour l'intermédiaire, et cette valeur
 * finirait enregistrée.
 */
export type EntryDraft = {
  status: EntryState["status"];
  progress: string;
  score: number | null;
  favorite: boolean;
  repeatCount: string;
  /** Format `AAAA-MM-JJ`, celui d'un `<input type="date">`. Chaîne vide = pas de date. */
  startedAt: string;
  finishedAt: string;
  notes: string;
};

/**
 * `Date` → valeur d'un `<input type="date">`.
 *
 * En UTC, et pas avec les accesseurs locaux : ces formulaires sont rendus une première fois sur le
 * serveur, dont le fuseau n'est pas celui du visiteur. `getFullYear()` produirait deux valeurs
 * différentes de part et d'autre et casserait l'hydratation. Les dates saisies sont d'ailleurs
 * stockées à midi UTC exprès, pour qu'aucun fuseau ne fasse basculer le jour.
 */
export function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** L'état du suivi, prêt à être édité. `null` — œuvre pas encore suivie — part de l'entrée neuve. */
export function entryDraftFrom(entry: EntryState | null): EntryDraft {
  const base = entry ?? INITIAL_ENTRY;

  return {
    status: base.status,
    progress: String(base.progress),
    score: base.score,
    favorite: base.favorite,
    repeatCount: String(base.repeatCount),
    startedAt: toDateInputValue(base.startedAt),
    finishedAt: toDateInputValue(base.finishedAt),
    notes: base.notes ?? "",
  };
}

/**
 * Ce qui a bougé entre l'état chargé et le brouillon — et **rien d'autre**.
 *
 * Un champ absent du résultat vaut `undefined` pour la Server Action, c'est-à-dire « je n'y touche
 * pas, garde ton automatisme » (docs/PRODUCT.md §4.2). C'est ce qui laisse la transition dater la
 * fin d'une série au dernier épisode alors que le formulaire affichait une date vide : ne pas
 * l'avoir touchée n'est pas l'avoir effacée.
 *
 * Une saisie numérique illisible — champ vidé, texte — est **ignorée** plutôt que ramenée à zéro :
 * effacer le champ « épisode » pour le retaper ne doit pas pouvoir enregistrer une remise à zéro,
 * qui inscrirait un recul au journal.
 *
 * Sur une œuvre pas encore suivie, le statut part toujours : c'est lui qui crée l'entrée, et sans
 * lui « Enregistrer » sur un formulaire laissé tel quel n'aurait rien fait.
 */
export function entryDraftChanges(
  entry: EntryState | null,
  draft: EntryDraft,
): Omit<SaveEntryInput, "mediaId"> {
  const base = entry ?? INITIAL_ENTRY;
  const changes: Omit<SaveEntryInput, "mediaId"> = {};

  if (entry === null || draft.status !== base.status) {
    changes.status = draft.status;
  }

  const progress = Number.parseInt(draft.progress, 10);
  if (!Number.isNaN(progress) && progress !== base.progress) {
    changes.progress = Math.max(progress, 0);
  }

  const repeatCount = Number.parseInt(draft.repeatCount, 10);
  if (!Number.isNaN(repeatCount) && repeatCount !== base.repeatCount) {
    changes.repeatCount = Math.max(repeatCount, 0);
  }

  if (draft.score !== base.score) changes.score = draft.score;
  if (draft.favorite !== base.favorite) changes.favorite = draft.favorite;

  if (draft.startedAt !== toDateInputValue(base.startedAt)) {
    changes.startedAt = draft.startedAt || null;
  }

  if (draft.finishedAt !== toDateInputValue(base.finishedAt)) {
    changes.finishedAt = draft.finishedAt || null;
  }

  const notes = draft.notes.trim() || null;
  if (notes !== base.notes) changes.notes = notes;

  return changes;
}
