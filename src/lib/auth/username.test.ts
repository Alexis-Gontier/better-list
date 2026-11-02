import { describe, expect, it } from "vitest";

import { MAX_USERNAME_LENGTH, normalizeUsername } from "@/lib/auth/username";

describe("normalizeUsername", () => {
  it("garde un login GitHub tel quel, en minuscules", () => {
    expect(normalizeUsername("Alexis-Gontier")).toBe("alexis-gontier");
  });

  it("remplace ce qu'une URL de profil ne porte pas", () => {
    // Un nom Discord peut contenir des points et des tirets bas.
    expect(normalizeUsername("sora_.kun")).toBe("sora--kun");
  });

  it("prend la partie locale d'une adresse Google", () => {
    expect(normalizeUsername("lea.rousseau@gmail.com".split("@")[0])).toBe(
      "lea-rousseau",
    );
  });

  it("ne laisse pas de tiret au bord", () => {
    expect(normalizeUsername("__léo__")).toBe("l-o");
  });

  it("retombe sur « membre » quand il ne reste rien", () => {
    expect(normalizeUsername("___")).toBe("membre");
  });

  it("coupe à la longueur d'un login GitHub", () => {
    expect(normalizeUsername("a".repeat(60))).toHaveLength(MAX_USERNAME_LENGTH);
  });
});
