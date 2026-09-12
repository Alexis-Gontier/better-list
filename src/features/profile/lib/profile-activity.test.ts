import { describe, expect, it } from "vitest";

import {
  ACTIVITY_WINDOW_DAYS,
  activityLevel,
  buildActivityCalendar,
} from "@/features/profile/lib/profile-activity";

/**
 * Les dates sont écrites en UTC avec une heure **choisie**, pas arbitraire : le fuseau de référence
 * est `Europe/Paris`, donc `22:30Z` en été tombe le lendemain à Paris. C'est exactement le décalage
 * qu'on veut voir traité, et l'écrire en clair évite qu'un test « passe » pour la mauvaise raison.
 */

describe("activityLevel", () => {
  it("range les comptes dans les cinq crans", () => {
    expect(activityLevel(0)).toBe(0);
    expect(activityLevel(1)).toBe(1);
    expect(activityLevel(2)).toBe(1);
    expect(activityLevel(3)).toBe(2);
    expect(activityLevel(5)).toBe(2);
    expect(activityLevel(6)).toBe(3);
    expect(activityLevel(9)).toBe(3);
    expect(activityLevel(10)).toBe(4);
  });

  it("ne dépasse jamais le dernier cran, si grosse que soit la journée", () => {
    expect(activityLevel(500)).toBe(4);
  });
});

describe("buildActivityCalendar", () => {
  const now = new Date("2026-09-12T10:00:00.000Z");

  it("rend une case par jour de la fenêtre, la dernière étant aujourd'hui", () => {
    const { days } = buildActivityCalendar([], now);

    expect(days).toHaveLength(ACTIVITY_WINDOW_DAYS);
    expect(days.at(-1)?.date).toBe("2026-09-12");
    expect(days.at(0)?.date).toBe("2025-09-13");
  });

  it("écrit les journées vides plutôt que de les omettre", () => {
    const { days, total } = buildActivityCalendar([], now);

    expect(total).toBe(0);
    expect(days.every((day) => day.count === 0 && day.level === 0)).toBe(true);
  });

  it("agrège les événements d'une même journée", () => {
    const { days, total } = buildActivityCalendar(
      [
        new Date("2026-09-10T08:00:00.000Z"),
        new Date("2026-09-10T09:00:00.000Z"),
        new Date("2026-09-10T20:00:00.000Z"),
      ],
      now,
    );

    const day = days.find((candidate) => candidate.date === "2026-09-10");

    expect(day?.count).toBe(3);
    expect(day?.level).toBe(2);
    expect(total).toBe(3);
  });

  it("date un événement de fin de soirée au jour parisien, pas au jour UTC", () => {
    /*
      22 h 30 UTC le 10 septembre = 00 h 30 le 11 à Paris (heure d'été). Une implémentation qui
      découperait en UTC — ou dans le fuseau de la machine de test — le rangerait au 10.
    */
    const { days } = buildActivityCalendar(
      [new Date("2026-09-10T22:30:00.000Z")],
      now,
    );

    expect(days.find((day) => day.date === "2026-09-11")?.count).toBe(1);
    expect(days.find((day) => day.date === "2026-09-10")?.count).toBe(0);
  });

  it("ignore ce qui tombe hors de la fenêtre", () => {
    const { total } = buildActivityCalendar(
      [new Date("2020-01-01T12:00:00.000Z")],
      now,
    );

    expect(total).toBe(0);
  });

  describe("série en cours", () => {
    it("compte les jours consécutifs en remontant depuis aujourd'hui", () => {
      const { streak } = buildActivityCalendar(
        [
          new Date("2026-09-12T09:00:00.000Z"),
          new Date("2026-09-11T09:00:00.000Z"),
          new Date("2026-09-10T09:00:00.000Z"),
        ],
        now,
      );

      expect(streak).toBe(3);
    });

    it("ne rompt pas la série quand la journée courante est encore vide", () => {
      /*
        Le cas de tous les matins : rien fait aujourd'hui, mais trois jours d'affilée derrière. Un
        compteur remis à zéro chaque nuit pour être restauré le soir ne mesurerait rien.
      */
      const { streak } = buildActivityCalendar(
        [
          new Date("2026-09-11T09:00:00.000Z"),
          new Date("2026-09-10T09:00:00.000Z"),
          new Date("2026-09-09T09:00:00.000Z"),
        ],
        now,
      );

      expect(streak).toBe(3);
    });

    it("s'arrête à la première journée vide antérieure à aujourd'hui", () => {
      const { streak } = buildActivityCalendar(
        [
          new Date("2026-09-12T09:00:00.000Z"),
          // Le 11 manque : tout ce qui précède ne compte plus.
          new Date("2026-09-10T09:00:00.000Z"),
          new Date("2026-09-09T09:00:00.000Z"),
        ],
        now,
      );

      expect(streak).toBe(1);
    });

    it("vaut zéro quand il ne s'est rien passé depuis avant-hier", () => {
      const { streak } = buildActivityCalendar(
        [new Date("2026-09-09T09:00:00.000Z")],
        now,
      );

      expect(streak).toBe(0);
    });
  });
});
