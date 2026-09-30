import { describe, expect, it } from "vitest";

import { setFavoriteSchema } from "@/features/favorites/schemas/favorites.schema";

const IMAGE = "https://s4.anilist.co/file/anilistcdn/character/large/b40.png";

describe("setFavoriteSchema", () => {
  it("accepte une œuvre par son seul id", () => {
    const result = setFavoriteSchema.safeParse({
      target: { kind: "MEDIA", anilistId: 21 },
      favorite: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepte un personnage avec son instantané", () => {
    const result = setFavoriteSchema.safeParse({
      target: { kind: "CHARACTER", anilistId: 40, name: "Luffy", image: IMAGE },
      favorite: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepte un staff sans portrait", () => {
    const result = setFavoriteSchema.safeParse({
      target: { kind: "STAFF", anilistId: 95_011, name: "Oda", image: null },
      favorite: false,
    });
    expect(result.success).toBe(true);
  });

  it("refuse un personnage sans nom", () => {
    const result = setFavoriteSchema.safeParse({
      target: { kind: "CHARACTER", anilistId: 40, image: IMAGE },
      favorite: true,
    });
    expect(result.success).toBe(false);
  });

  it("refuse une image hors AniList", () => {
    const result = setFavoriteSchema.safeParse({
      target: {
        kind: "STAFF",
        anilistId: 1,
        name: "X",
        image: "https://evil.example/x.png",
      },
      favorite: true,
    });
    expect(result.success).toBe(false);
  });

  it("refuse un id non positif", () => {
    const result = setFavoriteSchema.safeParse({
      target: { kind: "MEDIA", anilistId: 0 },
      favorite: true,
    });
    expect(result.success).toBe(false);
  });
});
