import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "@/features/lists/lib/list-slug";

describe("slugify", () => {
  it("met en minuscules et remplace les séparateurs", () => {
    expect(slugify("Mon Top 2026")).toBe("mon-top-2026");
    expect(slugify("  espaces   multiples  ")).toBe("espaces-multiples");
  });

  /** L'interface est en français : un titre accentué est le cas courant, pas le cas limite. */
  it("retire les accents", () => {
    expect(slugify("Séries à revoir cet été")).toBe("series-a-revoir-cet-ete");
    expect(slugify("Æon — Cœur")).toBe("on-c-ur");
  });

  it("ne laisse jamais de tiret en bordure", () => {
    expect(slugify("!!! Chefs-d'œuvre !!!")).toBe("chefs-d-uvre");
    expect(slugify("⭐ favoris ⭐")).toBe("favoris");
  });

  /** Sans repli, un titre entièrement japonais produirait `/lists/` — une URL qui n'existe pas. */
  it("retombe sur un slug par défaut quand il ne reste rien", () => {
    expect(slugify("葬送のフリーレン")).toBe("liste");
    expect(slugify("⭐⭐⭐")).toBe("liste");
    expect(slugify("")).toBe("liste");
  });

  it("borne la longueur sans laisser de tiret final", () => {
    const slug = slugify(`${"a".repeat(58)} suite du titre`);

    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("garde le slug quand il est libre", () => {
    expect(uniqueSlug("Top 2026", ["autre-liste"])).toBe("top-2026");
  });

  /** Un suffixe numérique reste lisible et devinable, là où un identifiant aléatoire ne l'est pas. */
  it("numérote à partir de deux, en sautant ce qui est déjà pris", () => {
    expect(uniqueSlug("Top 2026", ["top-2026"])).toBe("top-2026-2");
    expect(uniqueSlug("Top 2026", ["top-2026", "top-2026-2"])).toBe(
      "top-2026-3",
    );
  });
});
