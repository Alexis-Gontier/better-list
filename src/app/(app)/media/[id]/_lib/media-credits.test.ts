import { describe, expect, it } from "vitest";

import {
  type CreditSource,
  mediaCredit,
} from "@/app/(app)/media/[id]/_lib/media-credits";

function studio(id: number, name: string, isMain: boolean) {
  return { isMain, node: { id, name } };
}

function staff(id: number, full: string | null, role: string | null) {
  return {
    role,
    node: {
      id,
      name: { full, native: null },
      image: null,
      description: null,
      favourites: null,
      gender: null,
      age: null,
      dateOfBirth: null,
      primaryOccupations: null,
    },
  };
}

function source(overrides: Partial<CreditSource> = {}): CreditSource {
  return {
    type: "ANIME",
    studios: { edges: [] },
    staff: { edges: [] },
    ...overrides,
  };
}

describe("mediaCredit", () => {
  describe("sur un anime", () => {
    it("retient le studio principal, et pas le premier venu", () => {
      const media = source({
        studios: {
          edges: [studio(1, "Aniplex", false), studio(2, "ufotable", true)],
        },
      });

      expect(mediaCredit(media)).toEqual({
        label: "Studio",
        value: "ufotable",
      });
    });

    it("retombe sur le premier studio quand aucun n'est principal", () => {
      const media = source({
        studios: { edges: [studio(1, "Aniplex", false)] },
      });

      expect(mediaCredit(media)).toEqual({ label: "Studio", value: "Aniplex" });
    });

    it("ne regarde pas le staff : un anime crédite son studio", () => {
      const media = source({
        staff: { edges: [staff(9, "Gege Akutami", "Original Creator")] },
      });

      expect(mediaCredit(media)).toBeNull();
    });
  });

  describe("sur un manga", () => {
    /**
     * AniList ne fournit **aucun éditeur** pour un manga, et son champ `studios` y revient vide
     * (docs/conception.md §9). L'auteur est la seule attribution réellement disponible : c'est elle
     * qui occupe la cinquième colonne de la ligne de faits.
     */
    it("retient l'auteur de l'histoire plutôt qu'un rôle secondaire", () => {
      const media = source({
        type: "MANGA",
        staff: {
          edges: [
            staff(1, "Kohei Horikoshi", "Assistant"),
            staff(2, "Hajime Isayama", "Story & Art"),
          ],
        },
      });

      expect(mediaCredit(media)).toEqual({
        label: "Auteur",
        value: "Hajime Isayama",
      });
    });

    it("accepte « Story » et « Art » séparés, en gardant le premier venu", () => {
      const media = source({
        type: "MANGA",
        staff: {
          edges: [
            staff(1, "Riichiro Inagaki", "Story"),
            staff(2, "Boichi", "Art"),
          ],
        },
      });

      expect(mediaCredit(media)).toEqual({
        label: "Auteur",
        value: "Riichiro Inagaki",
      });
    });

    it("retombe sur le premier crédit quand aucun rôle ne se reconnaît", () => {
      const media = source({
        type: "MANGA",
        staff: { edges: [staff(1, "Naoki Urasawa", null)] },
      });

      expect(mediaCredit(media)).toEqual({
        label: "Auteur",
        value: "Naoki Urasawa",
      });
    });

    it("ignore un crédit sans nom plutôt que d'afficher un vide", () => {
      const media = source({
        type: "MANGA",
        staff: {
          edges: [
            staff(1, null, "Story & Art"),
            staff(2, "Tsutomu Nihei", "Art"),
          ],
        },
      });

      expect(mediaCredit(media)).toEqual({
        label: "Auteur",
        value: "Tsutomu Nihei",
      });
    });
  });

  it("renvoie null quand il n'y a rien à créditer — la colonne disparaît alors", () => {
    expect(mediaCredit(source())).toBeNull();
    expect(mediaCredit(source({ type: "MANGA" }))).toBeNull();
  });
});
