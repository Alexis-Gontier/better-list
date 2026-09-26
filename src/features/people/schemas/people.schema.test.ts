import { describe, expect, it } from "vitest";

import {
  characterDataSchema,
  staffDataSchema,
} from "@/features/people/schemas/people.schema";

const media = {
  id: 21,
  type: "ANIME",
  format: "TV",
  status: "RELEASING",
  averageScore: 88,
  isAdult: false,
  title: {
    romaji: "ONE PIECE",
    english: null,
    native: null,
    userPreferred: "ONE PIECE",
  },
  coverImage: { extraLarge: null, large: "x", medium: null, color: null },
  episodes: null,
  chapters: null,
  season: null,
  seasonYear: null,
  genres: [],
  countryOfOrigin: "JP",
  description: null,
  startDate: { year: null },
};

describe("characterDataSchema", () => {
  it("accepte la forme relevée sur Luffy, âge en chaîne et année de naissance nulle", () => {
    const { Character } = characterDataSchema.parse({
      Character: {
        id: 40,
        name: {
          full: "Luffy Monkey",
          native: "ルフィ",
          alternative: ["Straw Hat"],
          alternativeSpoiler: null,
        },
        image: { large: "x" },
        description: null,
        gender: "Male",
        age: "17-",
        bloodType: "F",
        favourites: 36031,
        dateOfBirth: { year: null, month: 5, day: 5 },
        media: {
          pageInfo: { total: 500, hasNextPage: true },
          edges: [{ characterRole: "MAIN", voiceActors: null, node: media }],
        },
      },
    });

    expect(Character?.age).toBe("17-");
    expect(Character?.name.alternativeSpoiler).toEqual([]);
    expect(Character?.media?.edges[0]?.voiceActors).toEqual([]);
  });
});

describe("staffDataSchema", () => {
  it("accepte un décès entièrement nul et des listes vides à null", () => {
    const { Staff } = staffDataSchema.parse({
      Staff: {
        id: 95021,
        name: { full: "Kazuhiko Inoue", native: null, alternative: null },
        image: null,
        description: null,
        gender: "Male",
        age: 72,
        bloodType: "O",
        favourites: 850,
        primaryOccupations: null,
        yearsActive: [1973],
        homeTown: null,
        dateOfBirth: { year: 1954, month: 3, day: 26 },
        dateOfDeath: { year: null, month: null, day: null },
        voiceRoles: {
          pageInfo: { total: 500, hasNextPage: true },
          edges: [{ characterRole: "MAIN", characters: null, node: media }],
        },
        animeRoles: { pageInfo: { total: 0, hasNextPage: false }, edges: null },
        mangaRoles: null,
      },
    });

    expect(Staff?.primaryOccupations).toEqual([]);
    expect(Staff?.voiceRoles?.edges[0]?.characters).toEqual([]);
    expect(Staff?.animeRoles?.edges).toEqual([]);
    expect(Staff?.mangaRoles).toBeNull();
  });
});
