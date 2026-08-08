import { describe, expect, it } from "vitest";

import {
  describeEntryEvent,
  type EntryEventView,
  formatDayLabel,
  formatEntryProgress,
  formatSince,
  groupEventsByDay,
  scaleToScore,
  scoreScaleMax,
  scoreToScale,
} from "@/features/tracking/lib/entry-format";

/** Un samedi d'été, donc en heure d'été de Paris (UTC+2) — le cas qui piège les regroupements. */
const NOW = new Date("2026-08-08T12:00:00Z");

const event = (partial: Partial<EntryEventView> = {}): EntryEventView => ({
  id: "evt",
  type: "PROGRESS",
  progressFrom: null,
  progressTo: null,
  statusFrom: null,
  statusTo: null,
  score: null,
  note: null,
  createdAt: NOW,
  ...partial,
});

describe("progression", () => {
  it("affiche le curseur et l'écart parcouru", () => {
    expect(
      describeEntryEvent(
        event({ type: "PROGRESS", progressFrom: 12, progressTo: 20 }),
        "episode",
        "POINT_5",
      ),
    ).toEqual({ label: "Épisode 20", detail: "+8" });
  });

  it("marque un recul plutôt que de le présenter comme une avance", () => {
    expect(
      describeEntryEvent(
        event({ type: "PROGRESS", progressFrom: 14, progressTo: 10 }),
        "episode",
        "POINT_5",
      ),
    ).toEqual({ label: "Épisode 10", detail: "−4" });
  });

  it("suit l'unité de l'œuvre", () => {
    const { label } = describeEntryEvent(
      event({ type: "PROGRESS", progressFrom: 0, progressTo: 3 }),
      "chapitre",
      "POINT_5",
    );

    expect(label).toBe("Chapitre 3");
  });
});

describe("statut", () => {
  /** `statusFrom` absent = l'entrée vient de naître. C'est l'entrée dans la bibliothèque. */
  it("distingue la création d'un changement", () => {
    expect(
      describeEntryEvent(
        event({
          type: "STATUS_CHANGED",
          statusFrom: null,
          statusTo: "PLANNING",
        }),
        "episode",
        "POINT_5",
      ),
    ).toEqual({ label: "Ajouté à la bibliothèque", detail: "Prévu" });

    expect(
      describeEntryEvent(
        event({
          type: "STATUS_CHANGED",
          statusFrom: "CURRENT",
          statusTo: "COMPLETED",
        }),
        "episode",
        "POINT_5",
      ),
    ).toEqual({ label: "Terminé", detail: "depuis En cours" });
  });
});

describe("note", () => {
  it("suit l'échelle du lecteur, sans que la note stockée bouge", () => {
    const scored = event({ type: "SCORED", score: 80 });

    expect(describeEntryEvent(scored, "episode", "POINT_5")).toEqual({
      label: "Noté 4/5",
      detail: null,
    });
    expect(describeEntryEvent(scored, "episode", "POINT_10")).toEqual({
      label: "Noté 8/10",
      detail: null,
    });
    expect(describeEntryEvent(scored, "episode", "POINT_100")).toEqual({
      label: "Noté 80/100",
      detail: null,
    });
  });

  /** Une note de 85 s'arrondit à 4 étoiles : on n'efface pas la précision qu'on perd. */
  it("montre la valeur exacte quand l'échelle l'arrondit, et se tait sinon", () => {
    expect(
      describeEntryEvent(
        event({ type: "SCORED", score: 85 }),
        "episode",
        "POINT_5",
      ),
    ).toEqual({ label: "Noté 4/5", detail: "85/100" });

    // Sur 100, il n'y a rien à arrondir : répéter « 85/100 » à côté de « 85/100 » n'aide personne.
    expect(
      describeEntryEvent(
        event({ type: "SCORED", score: 85 }),
        "episode",
        "POINT_100",
      ),
    ).toEqual({ label: "Noté 85/100", detail: null });
  });
});

/**
 * La promesse de §4.2 : l'échelle est un affichage, le stockage ne perd jamais de précision. Une
 * note saisie sur une échelle doit donc revenir intacte, et se relire sur les autres.
 */
describe("aller-retour d'échelle", () => {
  it("rend la valeur saisie, quelle que soit l'échelle", () => {
    expect(scaleToScore(8, "POINT_10")).toBe(80);
    expect(scoreToScale(80, "POINT_10")).toBe(8);

    expect(scaleToScore(4, "POINT_5")).toBe(80);
    expect(scoreToScale(80, "POINT_5")).toBe(4);

    expect(scaleToScore(85, "POINT_100")).toBe(85);
    expect(scoreToScale(85, "POINT_100")).toBe(85);
  });

  /** Une saisie hors bornes est ramenée au réel, comme la progression l'est contre le miroir. */
  it("borne la saisie à l'échelle", () => {
    expect(scaleToScore(42, "POINT_10")).toBe(100);
    expect(scaleToScore(-3, "POINT_5")).toBe(0);
  });

  it("annonce le maximum de chaque échelle", () => {
    expect(scoreScaleMax("POINT_5")).toBe(5);
    expect(scoreScaleMax("POINT_10")).toBe(10);
    expect(scoreScaleMax("POINT_100")).toBe(100);
  });
});

describe("relecture", () => {
  /** Il accompagne un `STATUS_CHANGED` vers `REPEATING` : il doit dire autre chose que le statut. */
  it("dit ce que le statut tait", () => {
    expect(
      describeEntryEvent(
        event({ type: "REPEAT_STARTED" }),
        "episode",
        "POINT_5",
      ),
    ).toEqual({ label: "Reprise depuis le début", detail: null });
  });
});

describe("progression affichée", () => {
  it("montre le total quand il est connu, la seule valeur sinon", () => {
    expect(formatEntryProgress(12, 24)).toBe("12 / 24");
    expect(formatEntryProgress(312, null)).toBe("312");
  });

  /** « 0 / 24 » sur une œuvre seulement prévue n'apprend rien et alourdit chaque vignette. */
  it("ne dit rien à zéro", () => {
    expect(formatEntryProgress(0, 24)).toBeNull();
  });
});

describe("ancienneté", () => {
  const jours = (count: number) =>
    new Date(NOW.getTime() - count * 24 * 60 * 60 * 1000);

  it("dégrade l'unité avec l'âge", () => {
    expect(formatSince(jours(0), NOW)).toBe("aujourd'hui");
    expect(formatSince(jours(1), NOW)).toBe("hier");
    expect(formatSince(jours(12), NOW)).toBe("il y a 12 jours");
    expect(formatSince(jours(90), NOW)).toBe("il y a 3 mois");
    expect(formatSince(jours(800), NOW)).toBe("il y a 2 ans");
  });
});

describe("intitulé du jour", () => {
  it("nomme aujourd'hui et hier", () => {
    expect(formatDayLabel(NOW, NOW)).toBe("Aujourd'hui");
    expect(formatDayLabel(new Date("2026-08-07T10:00:00Z"), NOW)).toBe("Hier");
  });

  it("omet l'année courante et l'écrit pour les autres", () => {
    expect(formatDayLabel(new Date("2026-03-03T10:00:00Z"), NOW)).toBe(
      "3 mars",
    );
    expect(formatDayLabel(new Date("2019-03-03T10:00:00Z"), NOW)).toBe(
      "3 mars 2019",
    );
  });

  /**
   * 23 h 30 UTC un 7 août, c'est 1 h 30 le 8 à Paris. Sans fuseau fixe, le rendu serveur et le
   * rendu client ne rangeraient pas cet événement le même jour.
   */
  it("range la soirée selon le fuseau de référence, pas selon UTC", () => {
    expect(formatDayLabel(new Date("2026-08-07T23:30:00Z"), NOW)).toBe(
      "Aujourd'hui",
    );
  });
});

describe("regroupement par jour", () => {
  it("regroupe les événements d'une même journée et garde l'ordre reçu", () => {
    const days = groupEventsByDay(
      [
        event({ id: "a", createdAt: new Date("2026-08-08T09:00:00Z") }),
        event({ id: "b", createdAt: new Date("2026-08-08T07:00:00Z") }),
        event({ id: "c", createdAt: new Date("2026-08-06T20:00:00Z") }),
      ],
      NOW,
    );

    expect(days).toHaveLength(2);
    expect(days[0]?.label).toBe("Aujourd'hui");
    expect(days[0]?.events.map((item) => item.id)).toEqual(["a", "b"]);
    expect(days[1]?.label).toBe("6 août");
  });

  it("ne renvoie aucun jour pour un journal vide", () => {
    expect(groupEventsByDay([], NOW)).toEqual([]);
  });
});
