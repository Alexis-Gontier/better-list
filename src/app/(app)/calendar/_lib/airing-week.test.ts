import { describe, expect, it } from "vitest";

import {
  airingDayKey,
  airingWeek,
  clampWeekOffset,
  formatAiringTime,
  groupAiringByDay,
  WEEK_OFFSET_LIMIT,
} from "@/app/(app)/calendar/_lib/airing-week";

/**
 * Le sujet de ce fichier est le fuseau, pas le calendrier.
 *
 * Les instants sont donc écrits en UTC (`Z`) et les attentes en heure de Paris : c'est exactement
 * l'écart que le code doit rattraper, et l'écrire autrement rendrait les tests d'accord avec le
 * bug qu'ils sont censés attraper.
 */

const HOUR = 3600;
const WEEK = 7 * 24 * HOUR;

/** Secondes Unix d'un instant écrit en UTC. */
function seconds(iso: string): number {
  return Date.parse(iso) / 1000;
}

/**
 * ICU sépare les bornes d'un intervalle par des espaces fines insécables, et pas toujours les
 * mêmes d'une version à l'autre. Ces tests portent sur le texte, pas sur la typographie.
 */
function plain(value: string): string {
  return value.replace(/\s/g, " ");
}

describe("airingWeek", () => {
  it("part du jour courant, pas du lundi", () => {
    // Samedi 8 août 2026, 12 h à Paris.
    const week = airingWeek(new Date("2026-08-08T10:00:00Z"), 0);

    expect(week.days).toHaveLength(7);
    expect(week.days[0]?.key).toBe("2026-08-08");
    expect(week.days[0]?.label).toBe("Samedi 8 août");
    expect(week.days[6]?.key).toBe("2026-08-14");
    expect(plain(week.label)).toBe("8–14 août 2026");
  });

  it("commence aujourd'hui quel que soit le jour de la semaine", () => {
    // Le dimanche et le lundi étaient les deux cas particuliers de l'ancien calcul : l'un parce que
    // `getDay()` le compte comme 0, l'autre parce qu'il était l'origine. Ils n'ont plus rien de
    // particulier, et ce test est là pour que ça le reste.
    expect(airingWeek(new Date("2026-08-09T10:00:00Z"), 0).days[0]?.key).toBe(
      "2026-08-09",
    );
    expect(airingWeek(new Date("2026-08-10T10:00:00Z"), 0).days[0]?.key).toBe(
      "2026-08-10",
    );
  });

  it("marque le jour courant en première colonne, et lui seul", () => {
    const week = airingWeek(new Date("2026-08-08T10:00:00Z"), 0);

    expect(week.days.filter((day) => day.isToday)).toHaveLength(1);
    expect(week.days[0]?.isToday).toBe(true);
  });

  it("ne marque aucun jour courant sur une fenêtre décalée", () => {
    const week = airingWeek(new Date("2026-08-08T10:00:00Z"), 1);

    expect(week.days.filter((day) => day.isToday)).toHaveLength(0);
  });

  it("change de jour à minuit à Paris, pas à minuit UTC", () => {
    // Dimanche 23 h 30 UTC, donc lundi 1 h 30 à Paris : la fenêtre a déjà tourné ici, pas là-bas.
    const week = airingWeek(new Date("2026-08-09T23:30:00Z"), 0);

    expect(week.days[0]?.key).toBe("2026-08-10");
    expect(week.days[0]?.isToday).toBe(true);
  });

  it("décale de sept jours entiers, dans les deux sens", () => {
    const now = new Date("2026-08-08T10:00:00Z");

    expect(airingWeek(now, 1).days[0]?.key).toBe("2026-08-15");
    expect(airingWeek(now, -1).days[0]?.key).toBe("2026-08-01");
    expect(airingWeek(now, -1).days[6]?.key).toBe("2026-08-07");
  });

  it("borne la fenêtre sur des minuits parisiens", () => {
    const week = airingWeek(new Date("2026-08-08T10:00:00Z"), 0);

    // Été : Paris est à UTC+2, donc minuit tombe à 22 h la veille.
    expect(week.from).toBe(seconds("2026-08-07T22:00:00Z"));
    expect(week.to).toBe(seconds("2026-08-14T22:00:00Z"));
  });

  it("perd une heure sur une fenêtre qui traverse le passage à l'heure d'été", () => {
    // Dimanche 29 mars 2026, 2 h devient 3 h. La fenêtre du 25 au 31 l'enjambe et ne dure donc que
    // 167 heures — un `from + 7 jours` déborderait d'une heure sur le 1er avril.
    const week = airingWeek(new Date("2026-03-25T12:00:00Z"), 0);

    expect(week.days[0]?.key).toBe("2026-03-25");
    expect(week.days[6]?.key).toBe("2026-03-31");
    expect(week.from).toBe(seconds("2026-03-24T23:00:00Z"));
    expect(week.to).toBe(seconds("2026-03-31T22:00:00Z"));
    expect(week.to - week.from).toBe(WEEK - HOUR);
  });

  it("gagne une heure sur une fenêtre qui traverse le retour à l'heure d'hiver", () => {
    const week = airingWeek(new Date("2026-10-21T12:00:00Z"), 0);

    expect(week.days[0]?.key).toBe("2026-10-21");
    expect(week.days[6]?.key).toBe("2026-10-27");
    expect(week.from).toBe(seconds("2026-10-20T22:00:00Z"));
    expect(week.to).toBe(seconds("2026-10-27T23:00:00Z"));
    expect(week.to - week.from).toBe(WEEK + HOUR);
  });

  it("traverse les mois et les années", () => {
    const straddling = airingWeek(new Date("2026-11-30T12:00:00Z"), 0);
    expect(plain(straddling.label)).toBe("30 novembre – 6 décembre 2026");

    const newYear = airingWeek(new Date("2026-12-31T12:00:00Z"), 0);
    expect(newYear.days[0]?.key).toBe("2026-12-31");
    expect(newYear.days[6]?.key).toBe("2027-01-06");
  });
});

describe("clampWeekOffset", () => {
  it("borne le décalage des deux côtés", () => {
    expect(clampWeekOffset(99)).toBe(WEEK_OFFSET_LIMIT);
    expect(clampWeekOffset(-99)).toBe(-WEEK_OFFSET_LIMIT);
    expect(clampWeekOffset(3)).toBe(3);
  });

  it("tronque une valeur décimale plutôt que de la laisser passer", () => {
    expect(clampWeekOffset(1.9)).toBe(1);
    expect(clampWeekOffset(-1.9)).toBe(-1);
  });
});

describe("airingDayKey", () => {
  it("range une diffusion de la nuit au jour parisien, pas au jour UTC", () => {
    // Diffusion à 22 h 30 UTC : il est déjà 0 h 30 le lendemain à Paris.
    expect(airingDayKey(seconds("2026-08-09T22:30:00Z"))).toBe("2026-08-10");
    expect(airingDayKey(seconds("2026-08-09T21:30:00Z"))).toBe("2026-08-09");
  });
});

describe("formatAiringTime", () => {
  it("donne l'heure de Paris", () => {
    expect(formatAiringTime(seconds("2026-08-09T22:00:00Z"))).toBe("00:00");
    expect(formatAiringTime(seconds("2026-08-09T13:30:00Z"))).toBe("15:30");
  });
});

describe("groupAiringByDay", () => {
  const week = airingWeek(new Date("2026-08-08T10:00:00Z"), 0);

  it("rend les sept jours, y compris les vides", () => {
    const days = groupAiringByDay(week, [
      { airingAt: seconds("2026-08-10T12:00:00Z") },
    ]);

    expect(days).toHaveLength(7);
    expect(days[2]?.items).toHaveLength(1);
    expect(days.filter((day) => day.items.length === 0)).toHaveLength(6);
  });

  it("conserve l'ordre d'entrée dans une journée", () => {
    const days = groupAiringByDay(week, [
      { airingAt: seconds("2026-08-10T10:00:00Z"), episode: 1 },
      { airingAt: seconds("2026-08-10T16:00:00Z"), episode: 2 },
    ]);

    expect(days[2]?.items.map((item) => item.episode)).toEqual([1, 2]);
  });

  it("ignore une diffusion hors des bornes plutôt que de la ranger de force", () => {
    const days = groupAiringByDay(week, [
      { airingAt: seconds("2026-09-01T12:00:00Z") },
    ]);

    expect(days.every((day) => day.items.length === 0)).toBe(true);
  });
});
