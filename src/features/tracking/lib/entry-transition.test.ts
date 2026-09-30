import { describe, expect, it } from "vitest";

import {
  applyEntryChanges,
  type EntryState,
  INITIAL_ENTRY,
} from "@/features/tracking/lib/entry-transition";

const NOW = new Date("2026-08-08T12:00:00Z");

const state = (partial: Partial<EntryState> = {}): EntryState => ({
  ...INITIAL_ENTRY,
  ...partial,
});

const apply = (
  current: EntryState | null,
  input: Parameters<typeof applyEntryChanges>[0]["input"],
  total: number | null = null,
) => applyEntryChanges({ current, input, total, now: NOW });

describe("création du suivi", () => {
  it("part de PLANNING et journalise l'entrée dans la bibliothèque", () => {
    const { next, events } = apply(null, { status: "PLANNING" });

    expect(next.status).toBe("PLANNING");
    expect(events).toEqual([
      { type: "STATUS_CHANGED", statusFrom: undefined, statusTo: "PLANNING" },
    ]);
  });

  /** Sans ça, une œuvre prévue sur laquelle on clique « +1 » resterait « prévue » à l'épisode 3. */
  it("passe en cours au premier épisode compté", () => {
    const { next } = apply(null, { progress: 1 }, 12);

    expect(next.status).toBe("CURRENT");
    expect(next.startedAt).toEqual(NOW);
  });
});

describe("progression", () => {
  it("écrit un seul événement pour un déplacement du curseur, pas un par épisode", () => {
    const { events } = apply(state({ status: "CURRENT", progress: 5 }), {
      progress: 20,
    });

    expect(events).toEqual([
      { type: "PROGRESS", progressFrom: 5, progressTo: 20 },
    ]);
  });

  /** Le plafond vient du miroir : une valeur forgée ne doit pas s'inscrire telle quelle. */
  it("ramène une progression au-delà du total", () => {
    const { next } = apply(
      state({ status: "CURRENT", progress: 3 }),
      { progress: 900 },
      12,
    );

    expect(next.progress).toBe(12);
  });

  it("laisse filer la progression quand le total est inconnu", () => {
    const { next } = apply(
      state({ status: "CURRENT", progress: 900 }),
      { progress: 1000 },
      null,
    );

    expect(next.progress).toBe(1000);
  });
});

describe("fin de série", () => {
  it("termine et date la fin quand le dernier épisode est atteint", () => {
    const { next, events } = apply(
      state({ status: "CURRENT", progress: 11, startedAt: new Date(0) }),
      { progress: 12 },
      12,
    );

    expect(next.status).toBe("COMPLETED");
    expect(next.finishedAt).toEqual(NOW);
    expect(events).toEqual([
      { type: "PROGRESS", progressFrom: 11, progressTo: 12 },
      { type: "STATUS_CHANGED", statusFrom: "CURRENT", statusTo: "COMPLETED" },
    ]);
  });

  it("recale la progression sur le total quand on termine à la main", () => {
    const { next, events } = apply(
      state({ status: "CURRENT", progress: 4 }),
      { status: "COMPLETED" },
      12,
    );

    expect(next.progress).toBe(12);
    // Un seul événement de progression pour ce geste, malgré les deux règles qui s'appliquent.
    expect(events.filter((event) => event.type === "PROGRESS")).toHaveLength(1);
  });

  /**
   * Le cas qui fait la différence : un statut explicite prime sur la déduction, sinon choisir
   * « En pause » sur une série finie la rebasculerait en « Terminé ».
   */
  it("n'impose pas COMPLETED quand l'utilisateur choisit un autre statut", () => {
    const { next } = apply(
      state({ status: "CURRENT", progress: 12 }),
      { status: "PAUSED" },
      12,
    );

    expect(next.status).toBe("PAUSED");
  });
});

describe("relecture", () => {
  it("remet le curseur à zéro et double l'événement de statut", () => {
    const { next, events } = apply(
      state({ status: "COMPLETED", progress: 12, finishedAt: new Date(0) }),
      { status: "REPEATING" },
      12,
    );

    expect(next.progress).toBe(0);
    // La première fin a eu lieu : l'état ne l'efface pas.
    expect(next.finishedAt).toEqual(new Date(0));
    expect(events.map((event) => event.type)).toEqual([
      "PROGRESS",
      "STATUS_CHANGED",
      "REPEAT_STARTED",
    ]);
  });

  it("ne compte la relecture qu'une fois terminée", () => {
    const started = apply(
      state({ status: "COMPLETED", progress: 12, repeatCount: 0 }),
      { status: "REPEATING" },
      12,
    );
    expect(started.next.repeatCount).toBe(0);

    const finished = apply(
      state({ status: "REPEATING", progress: 11, repeatCount: 0 }),
      { progress: 12 },
      12,
    );
    expect(finished.next.repeatCount).toBe(1);
  });
});

describe("dates et relectures rattrapables", () => {
  const OLD = new Date("2019-04-12T00:00:00Z");

  /**
   * Le cas qui justifie toute la règle : rattraper un historique. Sans la priorité au manuel, la
   * bascule de statut réécrirait la date saisie par celle du jour, dans le même geste.
   */
  it("garde une date saisie plutôt que de poser celle du jour", () => {
    const { next } = apply(null, { status: "CURRENT", startedAt: OLD });

    expect(next.startedAt).toEqual(OLD);
    expect(next.startedAt).not.toEqual(NOW);
  });

  it("pose la date du jour quand la saisie ne dit rien", () => {
    const { next } = apply(null, { status: "CURRENT" });

    expect(next.startedAt).toEqual(NOW);
  });

  it("laisse effacer une date, sans la reposer aussitôt", () => {
    const { next } = apply(
      state({ status: "PLANNING", startedAt: OLD }),
      { status: "CURRENT", startedAt: null },
      12,
    );

    expect(next.startedAt).toBeNull();
  });

  it("respecte un nombre de relectures saisi au lieu de l'incrémenter", () => {
    const { next } = apply(
      state({ status: "REPEATING", progress: 11, repeatCount: 0 }),
      { progress: 12, repeatCount: 7 },
      12,
    );

    expect(next.status).toBe("COMPLETED");
    expect(next.repeatCount).toBe(7);
  });

  it("garde la date de début saisie même en relançant une série", () => {
    const { next } = apply(
      state({ status: "COMPLETED", progress: 12 }),
      { status: "REPEATING", startedAt: OLD },
      12,
    );

    expect(next.progress).toBe(0);
    expect(next.startedAt).toEqual(OLD);
  });
});

describe("note et journal", () => {
  it("journalise une note chiffrée, pas son effacement", () => {
    const scored = apply(state({ status: "CURRENT", score: null }), {
      score: 85,
    });
    expect(scored.events).toEqual([{ type: "SCORED", score: 85 }]);

    const cleared = apply(state({ status: "CURRENT", score: 85 }), {
      score: null,
    });
    expect(cleared.events).toEqual([]);
    expect(cleared.next.score).toBeNull();
  });

  it("ne journalise rien quand rien ne change", () => {
    const { events } = apply(state({ status: "CURRENT", progress: 5 }), {
      progress: 5,
    });

    expect(events).toEqual([]);
  });
});
