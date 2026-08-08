import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/security/safe-redirect";

const FALLBACK = "/";

describe("safeRedirectPath", () => {
  it("accepte un chemin interne", () => {
    expect(safeRedirectPath("/library", FALLBACK)).toBe("/library");
    expect(safeRedirectPath("/media/21?tab=infos", FALLBACK)).toBe(
      "/media/21?tab=infos",
    );
  });

  it("retombe sur le défaut quand il n'y a rien", () => {
    expect(safeRedirectPath(null, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("", FALLBACK)).toBe(FALLBACK);
  });

  /**
   * Le cœur du sujet : chacune de ces valeurs, transmise à un `location` ou à
   * `signIn.social({ callbackURL })`, enverrait l'utilisateur hors du site depuis une URL qui
   * porte notre domaine.
   */
  it.each([
    ["//evil.com", "protocole-relatif"],
    ["https://evil.com", "URL absolue"],
    ["http://evil.com", "URL absolue en clair"],
    ["javascript:alert(1)", "schéma javascript"],
    ["\\\\evil.com", "antislashs"],
    ["/\\evil.com", "antislash après la barre"],
    ["/library\\..\\evil", "antislash au milieu"],
    ["library", "chemin relatif"],
    ["  //evil.com", "protocole-relatif précédé d'espaces"],
  ])("rejette %s (%s)", (input) => {
    expect(safeRedirectPath(input, FALLBACK)).toBe(FALLBACK);
  });
});
