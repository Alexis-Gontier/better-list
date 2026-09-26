import { describe, expect, it } from "vitest";

import {
  formatAge,
  formatFuzzyDate,
  formatGender,
  formatOccupations,
  formatYearsActive,
  groupByYear,
  mergeStaffRoles,
  mergeVoiceRoles,
} from "@/features/people/lib/people-format";
import type { PeopleMedia } from "@/features/people/schemas/people.schema";

const media = (id: number) => ({ id }) as PeopleMedia;

describe("formatFuzzyDate", () => {
  it("écrit jour, mois et année quand ils sont connus", () => {
    expect(formatFuzzyDate({ year: 1954, month: 3, day: 26 })).toBe(
      "26 mars 1954",
    );
    expect(formatFuzzyDate({ year: null, month: 5, day: 1 })).toBe("1er mai");
    expect(formatFuzzyDate({ year: 2001, month: null, day: null })).toBe(
      "2001",
    );
  });

  it("rend null quand rien n'est connu", () => {
    expect(formatFuzzyDate({ year: null, month: null, day: null })).toBeNull();
    expect(formatFuzzyDate(null)).toBeNull();
  });
});

describe("formatAge", () => {
  it("lit l'âge d'un staff et celui, textuel, d'un personnage", () => {
    expect(formatAge(72)).toBe("72 ans");
    expect(formatAge("17")).toBe("17 ans");
    expect(formatAge("17-")).toBe("17 ans au début");
    expect(formatAge("20s")).toBe("20s");
    expect(formatAge(null)).toBeNull();
  });
});

describe("formatYearsActive", () => {
  it("écrit une ou deux bornes", () => {
    expect(formatYearsActive([1973])).toBe("depuis 1973");
    expect(formatYearsActive([1973, 2010])).toBe("1973 – 2010");
    expect(formatYearsActive([])).toBeNull();
    expect(formatYearsActive([null])).toBeNull();
  });
});

describe("formatGender / formatOccupations", () => {
  it("traduit les valeurs courantes et laisse passer le reste", () => {
    expect(formatGender("Male")).toBe("Homme");
    expect(formatGender("Female")).toBe("Femme");
    expect(formatGender("Agender")).toBe("Agender");
    expect(formatOccupations(["Voice Actor", "Singer", "Producer", null])).toBe(
      "Doublage, Chant, Producer",
    );
    expect(formatOccupations([])).toBeNull();
  });
});

describe("groupByYear", () => {
  it("groupe en gardant l'ordre de première apparition", () => {
    const groups = groupByYear(
      [{ y: null }, { y: 2026 }, { y: 2025 }, { y: 2026 }],
      (item) => item.y,
    );
    expect(groups.map((group) => [group.year, group.items.length])).toEqual([
      [null, 1],
      [2026, 2],
      [2025, 1],
    ]);
  });
});

describe("mergeStaffRoles", () => {
  it("réunit les rôles d'une même œuvre sur une carte", () => {
    const merged = mergeStaffRoles([
      { staffRole: "Director", node: media(1) },
      { staffRole: "Storyboard (eps 1-3)", node: media(2) },
      { staffRole: "Script", node: media(1) },
      { staffRole: null, node: media(3) },
    ]);
    expect(merged.map((row) => [row.media.id, row.roles])).toEqual([
      [1, ["Director", "Script"]],
      [2, ["Storyboard (eps 1-3)"]],
      [3, []],
    ]);
  });
});

describe("mergeVoiceRoles", () => {
  it("réunit les personnages d'une même œuvre et écarte les nuls", () => {
    const luffy = { id: 40, name: { full: "Luffy" }, image: null };
    const ace = { id: 2072, name: { full: "Ace" }, image: null };
    const merged = mergeVoiceRoles([
      { characterRole: "MAIN", characters: [luffy, null], node: media(1) },
      {
        characterRole: "SUPPORTING",
        characters: [ace, luffy],
        node: media(1),
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.characters.map((character) => character.id)).toEqual([
      40, 2072,
    ]);
  });
});
