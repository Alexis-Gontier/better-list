import { describe, expect, it } from "vitest";

import {
  type FavoriteRow,
  groupFavorites,
  isEmptyFavorites,
} from "@/features/favorites/lib/favorites-groups";

function mediaRow(
  id: number,
  type: "ANIME" | "MANGA",
  romaji: string,
): FavoriteRow {
  return {
    kind: "MEDIA",
    anilistId: id,
    name: null,
    image: null,
    media: {
      type,
      titleRomaji: romaji,
      titleEnglish: `${romaji} EN`,
      titleNative: null,
      coverImage: `cover-${id}`,
    },
  };
}

describe("groupFavorites", () => {
  it("répartit œuvres, personnages et staff, dans l'ordre reçu", () => {
    const rows: FavoriteRow[] = [
      mediaRow(1, "MANGA", "Berserk"),
      {
        kind: "CHARACTER",
        anilistId: 40,
        name: "Luffy",
        image: "l",
        media: null,
      },
      mediaRow(2, "ANIME", "Mushishi"),
      { kind: "STAFF", anilistId: 9, name: "Oda", image: null, media: null },
      mediaRow(3, "ANIME", "Ping Pong"),
    ];

    const groups = groupFavorites(rows, "ROMAJI");

    expect(groups.anime.map((tile) => tile.id)).toEqual([2, 3]);
    expect(groups.manga).toEqual([
      { id: 1, name: "Berserk", image: "cover-1" },
    ]);
    expect(groups.characters).toEqual([{ id: 40, name: "Luffy", image: "l" }]);
    expect(groups.staff).toEqual([{ id: 9, name: "Oda", image: null }]);
  });

  it("titre une œuvre dans la langue demandée", () => {
    const groups = groupFavorites(
      [mediaRow(2, "ANIME", "Mushishi")],
      "ENGLISH",
    );
    expect(groups.anime[0]?.name).toBe("Mushishi EN");
  });

  it("écarte une œuvre dont le miroir manque", () => {
    const orphan: FavoriteRow = { ...mediaRow(5, "ANIME", "X"), media: null };
    expect(groupFavorites([orphan], "ROMAJI").anime).toEqual([]);
  });

  it("dit vide quand aucun groupe n'a rien", () => {
    expect(isEmptyFavorites(groupFavorites([], "ROMAJI"))).toBe(true);
    expect(
      isEmptyFavorites(groupFavorites([mediaRow(1, "MANGA", "B")], "ROMAJI")),
    ).toBe(false);
  });
});
