import { describe, expect, it } from "vitest";
import { searchCardDetail } from "@/app/(app)/search/_lib/search-card-detail";
import type { EntryState } from "@/features/tracking/lib/entry-transition";

const anime = {
  type: "ANIME" as const,
  format: "TV" as const,
  episodes: 24,
  chapters: null,
  seasonYear: 2017,
  startDate: { year: 2017, month: 4, day: 1 },
};

const manga = {
  type: "MANGA" as const,
  format: "MANGA" as const,
  episodes: null,
  chapters: null,
  seasonYear: null,
  startDate: { year: 1989, month: null, day: null },
};

function entry(overrides: Partial<EntryState>): EntryState {
  return {
    status: "CURRENT",
    progress: 0,
    progressVolumes: null,
    score: null,
    notes: null,
    repeatCount: 0,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  };
}

describe("searchCardDetail", () => {
  it("dit le statut et la progression d'une œuvre suivie", () => {
    expect(searchCardDetail(anime, entry({ progress: 14 }))).toBe(
      "En cours · ép. 14 / 24",
    );
  });

  it("dit le statut seul tant que rien n'est commencé", () => {
    expect(searchCardDetail(anime, entry({ status: "PLANNING" }))).toBe(
      "Prévu",
    );
  });

  it("compte les chapitres d'un manga, total inconnu", () => {
    expect(searchCardDetail(manga, entry({ progress: 120 }))).toBe(
      "En cours · ch. 120 / ?",
    );
  });

  it("dit le format et l'année d'une œuvre non suivie", () => {
    expect(searchCardDetail(anime, null)).toBe("Série TV · 2017");
    expect(searchCardDetail(manga, null)).toBe("Manga · 1989");
  });

  it("garde une ligne quand il n'y a rien à dire", () => {
    expect(
      searchCardDetail(
        { ...manga, format: null, startDate: null, seasonYear: null },
        null,
      ),
    ).toBe(" ");
  });
});
