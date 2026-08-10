import { describe, expect, it } from "vitest";

import {
  type EntryDraft,
  entryDraftChanges,
  entryDraftFrom,
  toDateInputValue,
} from "@/features/tracking/lib/entry-draft";
import type { EntryState } from "@/features/tracking/lib/entry-transition";

const ENTRY: EntryState = {
  status: "CURRENT",
  progress: 12,
  progressVolumes: null,
  score: 80,
  favorite: false,
  notes: "Excellent",
  repeatCount: 1,
  startedAt: new Date("2026-03-11T12:00:00.000Z"),
  finishedAt: null,
};

const draft = (partial: Partial<EntryDraft> = {}): EntryDraft => ({
  ...entryDraftFrom(ENTRY),
  ...partial,
});

describe("brouillon de suivi", () => {
  it("n'envoie rien quand rien n'a bougé", () => {
    expect(entryDraftChanges(ENTRY, draft())).toEqual({});
  });

  it("n'envoie que le champ modifié", () => {
    expect(entryDraftChanges(ENTRY, draft({ progress: "13" }))).toEqual({
      progress: 13,
    });
  });

  /**
   * Le cœur de l'affaire : un formulaire enregistre huit champs d'un coup, mais n'a le droit d'en
   * écrire que ce qui a changé — sinon il écrase ce qu'un autre onglet vient de saisir.
   */
  it("laisse les champs intacts hors du lot", () => {
    const changes = entryDraftChanges(
      ENTRY,
      draft({ status: "COMPLETED", score: 100 }),
    );

    expect(changes).toEqual({ status: "COMPLETED", score: 100 });
    expect(changes).not.toHaveProperty("notes");
    expect(changes).not.toHaveProperty("startedAt");
  });

  /** Vider le champ pour le retaper ne doit pas pouvoir enregistrer un retour à zéro. */
  it("ignore une saisie numérique illisible", () => {
    expect(entryDraftChanges(ENTRY, draft({ progress: "" }))).toEqual({});
    expect(entryDraftChanges(ENTRY, draft({ repeatCount: "abc" }))).toEqual({});
  });

  it("distingue effacer une date de ne pas y toucher", () => {
    expect(entryDraftChanges(ENTRY, draft({ startedAt: "" }))).toEqual({
      startedAt: null,
    });
    expect(entryDraftChanges(ENTRY, draft({ finishedAt: "" }))).toEqual({});
  });

  /** Une note réduite à des espaces est une note effacée, pas une note vide. */
  it("normalise les notes", () => {
    expect(entryDraftChanges(ENTRY, draft({ notes: "   " }))).toEqual({
      notes: null,
    });
    expect(entryDraftChanges(ENTRY, draft({ notes: " Excellent " }))).toEqual(
      {},
    );
  });

  /**
   * Sans entrée existante, « Enregistrer » sur un formulaire laissé tel quel doit tout de même
   * créer le suivi : c'est le statut qui le fait naître.
   */
  it("crée le suivi d'une œuvre pas encore suivie", () => {
    expect(entryDraftChanges(null, entryDraftFrom(null))).toEqual({
      status: "PLANNING",
    });
  });
});

describe("date en valeur de champ", () => {
  /** En UTC : le rendu serveur et l'hydratation client doivent tomber sur le même jour. */
  it("formate en AAAA-MM-JJ, sans fuseau local", () => {
    expect(toDateInputValue(new Date("2026-03-11T12:00:00.000Z"))).toBe(
      "2026-03-11",
    );
    expect(toDateInputValue(null)).toBe("");
  });
});
