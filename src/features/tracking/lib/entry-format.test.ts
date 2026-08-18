import { describe, expect, it } from "vitest";

import {
  describeAiringCatchUp,
  describeEntryEvent,
  type EntryEventView,
  formatDayLabel,
  formatEntryProgress,
  formatScore,
  formatSince,
  groupEventsByDay,
  SCORE_STAR_STEP,
  SCORE_STARS,
  scoreToStars,
  starsToScore,
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
      ),
    ).toEqual({ label: "Épisode 20", detail: "+8" });
  });

  it("marque un recul plutôt que de le présenter comme une avance", () => {
    expect(
      describeEntryEvent(
        event({ type: "PROGRESS", progressFrom: 14, progressTo: 10 }),
        "episode",
      ),
    ).toEqual({ label: "Épisode 10", detail: "−4" });
  });

  it("suit l'unité de l'œuvre", () => {
    const { label } = describeEntryEvent(
      event({ type: "PROGRESS", progressFrom: 0, progressTo: 3 }),
      "chapitre",
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
      ),
    ).toEqual({ label: "Terminé", detail: "depuis En cours" });
  });
});

describe("note", () => {
  it("lit la note stockée en étoiles", () => {
    expect(
      describeEntryEvent(event({ type: "SCORED", score: 80 }), "episode"),
    ).toEqual({ label: "Noté 4/5", detail: null });
  });

  /**
   * Une note de 85 tombe entre deux crans — 4,5 vaut 90, 4 vaut 80 — donc elle s'arrondit, et on
   * n'efface pas la précision qu'on perd. Le cas vient des notes importées d'AniList, sur cent.
   */
  it("montre la valeur exacte quand les étoiles l'arrondissent, et se tait sinon", () => {
    expect(
      describeEntryEvent(event({ type: "SCORED", score: 85 }), "episode"),
    ).toEqual({ label: "Noté 4,5/5", detail: "85/100" });

    // 70 tombe pile sur une demi-étoile : rien n'est perdu, donc rien à répéter à côté.
    expect(
      describeEntryEvent(event({ type: "SCORED", score: 70 }), "episode"),
    ).toEqual({ label: "Noté 3,5/5", detail: null });
  });
});

/**
 * La promesse de §4.2 : l'affichage est sur cinq étoiles, le stockage sur cent, et il ne perd
 * jamais de précision. Une note saisie doit donc revenir intacte.
 */
describe("aller-retour des étoiles", () => {
  it("rend la valeur saisie", () => {
    expect(starsToScore(4)).toBe(80);
    expect(scoreToStars(80)).toBe(4);
  });

  /** Une saisie hors bornes est ramenée au réel, comme la progression l'est contre le miroir. */
  it("borne la saisie à l'échelle", () => {
    expect(starsToScore(42)).toBe(100);
    expect(starsToScore(-3)).toBe(0);
  });

  /**
   * Le demi-cran est la raison d'être de `SCORE_STAR_STEP` : cinq étoiles seules ne font que cinq
   * notes, ce qui est trop peu. Une demie vaut exactement dix points — elle survit donc à
   * l'aller-retour, ce qu'un pas par tiers ne ferait pas.
   */
  it("compte les étoiles par demies", () => {
    expect(SCORE_STARS).toBe(5);
    expect(SCORE_STAR_STEP).toBe(0.5);

    expect(starsToScore(3.5)).toBe(70);
    expect(scoreToStars(70)).toBe(3.5);

    expect(starsToScore(0.5)).toBe(10);
    expect(scoreToStars(10)).toBe(0.5);
  });

  /** Une note qui ne tombe sur aucun cran rejoint le plus proche — 85 est à mi-chemin, 90 gagne. */
  it("arrondit au cran le plus proche", () => {
    expect(scoreToStars(85)).toBe(4.5);
    expect(scoreToStars(84)).toBe(4);
    expect(scoreToStars(86)).toBe(4.5);
  });

  /** Le séparateur décimal est celui du produit : « 3,5 » et non « 3.5 ». */
  it("écrit la demie en français", () => {
    expect(formatScore(70)).toBe("3,5/5");
    expect(formatScore(80)).toBe("4/5");
  });
});

describe("relecture", () => {
  /** Il accompagne un `STATUS_CHANGED` vers `REPEATING` : il doit dire autre chose que le statut. */
  it("dit ce que le statut tait", () => {
    expect(
      describeEntryEvent(event({ type: "REPEAT_STARTED" }), "episode"),
    ).toEqual({ label: "Reprise depuis le début", detail: null });
  });
});

describe("progression affichée", () => {
  it("montre le total quand il est connu", () => {
    expect(formatEntryProgress(12, 24)).toBe("12 / 24");
  });

  /**
   * Un total inconnu s'écrit, il ne se tait pas : « 312 » tout court se lit comme une fin de
   * série, alors que la série est en cours de diffusion et qu'il en reste.
   */
  it("avoue le total qu'elle ignore", () => {
    expect(formatEntryProgress(312, null)).toBe("312 / ?");
    expect(formatEntryProgress(312, 0)).toBe("312 / ?");
  });

  /** « 0 / 24 » sur une œuvre seulement prévue n'apprend rien et alourdit chaque vignette. */
  it("ne dit rien à zéro", () => {
    expect(formatEntryProgress(0, 24)).toBeNull();
  });
});

describe("ancienneté", () => {
  const jours = (count: number) =>
    new Date(NOW.getTime() - count * 24 * 60 * 60 * 1000);
  const heures = (count: number) =>
    new Date(NOW.getTime() - count * 60 * 60 * 1000);

  it("dégrade l'unité avec l'âge", () => {
    expect(formatSince(heures(5), NOW)).toBe("il y a 5 heures");
    expect(formatSince(jours(1), NOW)).toBe("hier");
    expect(formatSince(jours(12), NOW)).toBe("il y a 12 jours");
    expect(formatSince(jours(90), NOW)).toBe("il y a 3 mois");
    expect(formatSince(jours(800), NOW)).toBe("il y a 2 ans");
  });

  /**
   * En deçà de l'heure, on ne compte plus : le libellé changerait entre le rendu serveur et la
   * seconde d'après, sur une information qui ne décide de rien.
   */
  it("ne compte pas sous l'heure", () => {
    expect(formatSince(jours(0), NOW)).toBe("à l'instant");
    expect(formatSince(new Date(NOW.getTime() - 59 * 60 * 1000), NOW)).toBe(
      "à l'instant",
    );
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

describe("retard sur un épisode du planning", () => {
  it("ne dit rien de plus qu'« à jour » quand c'est le prochain", () => {
    expect(describeAiringCatchUp(9, 8, "episode")).toEqual({
      state: "next",
      label: "À jour",
    });
  });

  /** Le cas de la première diffusion : ne rien avoir vu, c'est être à jour. */
  it("compte l'épisode 1 comme le prochain quand rien n'a été vu", () => {
    expect(describeAiringCatchUp(1, 0, "episode").state).toBe("next");
  });

  /**
   * Le décompte porte sur ce qui sépare du **début** de cet épisode, pas de sa fin : à l'épisode 9
   * avec une progression de 6, il manque le 7 et le 8 — deux, pas trois.
   */
  it("compte les épisodes qui manquent avant celui-là", () => {
    expect(describeAiringCatchUp(9, 6, "episode")).toEqual({
      state: "behind",
      label: "2 épisodes de retard",
    });
  });

  it("accorde le singulier, et l'unité du support", () => {
    expect(describeAiringCatchUp(9, 7, "episode").label).toBe(
      "1 épisode de retard",
    );
    expect(describeAiringCatchUp(9, 6, "chapitre").label).toBe(
      "2 chapitres de retard",
    );
  });

  it("marque comme vu ce qui est déjà derrière — et n'y propose plus de « +1 »", () => {
    expect(describeAiringCatchUp(9, 9, "episode")).toEqual({
      state: "seen",
      label: "Vu",
    });
    expect(describeAiringCatchUp(9, 12, "episode").state).toBe("seen");
  });
});
