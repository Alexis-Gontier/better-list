import { describe, expect, it } from "vitest";

import {
  cleanDescription,
  formatCharacterRole,
  formatCountdown,
  formatDateRange,
  formatDuration,
  formatFuzzyDate,
  formatRelationType,
  formatSeason,
  formatSource,
  formatStaffRole,
  mediaTitle,
} from "@/features/media/lib/media-format";

const title = (partial: Partial<Parameters<typeof mediaTitle>[0]>) => ({
  romaji: null,
  english: null,
  native: null,
  userPreferred: null,
  ...partial,
});

describe("mediaTitle", () => {
  const frieren = title({
    romaji: "Sousou no Frieren",
    english: "Frieren: Beyond Journey's End",
    native: "葬送のフリーレン",
  });

  it("suit la préférence du compte", () => {
    expect(mediaTitle(frieren, "ROMAJI")).toBe("Sousou no Frieren");
    expect(mediaTitle(frieren, "ENGLISH")).toBe(
      "Frieren: Beyond Journey's End",
    );
    expect(mediaTitle(frieren, "NATIVE")).toBe("葬送のフリーレン");
  });

  /**
   * `userPreferred` est le titre choisi par AniList d'après les réglages du compte **qui interroge
   * l'API** — le nôtre, anonyme et identique pour tous. Le laisser gagner rendrait la préférence
   * sans effet, ce qui était le cas avant que les réglages existent.
   */
  it("ignore `userPreferred` tant qu'un titre demandé existe", () => {
    expect(
      mediaTitle(
        title({ userPreferred: "Frieren", romaji: "Sousou no" }),
        "ROMAJI",
      ),
    ).toBe("Sousou no");
  });

  it("retombe sur ce qui existe quand la langue demandée manque", () => {
    expect(mediaTitle(title({ romaji: "Sousou no Frieren" }), "ENGLISH")).toBe(
      "Sousou no Frieren",
    );
    expect(mediaTitle(title({ native: "葬送のフリーレン" }), "ROMAJI")).toBe(
      "葬送のフリーレン",
    );
  });

  it("ne renvoie jamais une chaîne vide, même sans aucun titre", () => {
    expect(mediaTitle(title({}))).toBe("—");
  });
});

describe("formatFuzzyDate", () => {
  /** Les dates AniList sont partielles par nature : une œuvre annoncée n'a souvent qu'une année. */
  it("s'adapte à ce qui est connu", () => {
    expect(formatFuzzyDate({ year: 2023, month: 9, day: 29 })).toBe(
      "29 septembre 2023",
    );
    expect(formatFuzzyDate({ year: 2023, month: 9, day: null })).toBe(
      "septembre 2023",
    );
    expect(formatFuzzyDate({ year: 2023, month: null, day: null })).toBe(
      "2023",
    );
  });

  it("renvoie null sans année, le jour et le mois seuls ne disant rien", () => {
    expect(formatFuzzyDate(null)).toBeNull();
    expect(formatFuzzyDate({ year: null, month: 9, day: 29 })).toBeNull();
  });
});

describe("formatDateRange", () => {
  it("ne répète pas une date identique", () => {
    const date = { year: 2016, month: 8, day: 26 };
    expect(formatDateRange(date, date)).toBe("26 août 2016");
  });

  it("tolère une fin inconnue — le cas d'une œuvre en cours", () => {
    expect(formatDateRange({ year: 2023, month: 9, day: 29 }, null)).toBe(
      "29 septembre 2023",
    );
  });

  it("compose l'intervalle quand les deux bornes existent", () => {
    expect(
      formatDateRange(
        { year: 2023, month: 9, day: null },
        { year: 2024, month: 3, day: null },
      ),
    ).toBe("septembre 2023 – mars 2024");
  });
});

describe("formatSeason", () => {
  it("compose saison et année", () => {
    expect(formatSeason("FALL", 2023)).toBe("Automne 2023");
  });

  it("se contente de ce qui est disponible", () => {
    expect(formatSeason("FALL", null)).toBe("Automne");
    expect(formatSeason(null, 2023)).toBe("2023");
    expect(formatSeason(null, null)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("passe en heures au-delà de soixante minutes", () => {
    expect(formatDuration(24)).toBe("24 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(95)).toBe("1 h 35 min");
  });

  it("traite zéro et null comme une durée inconnue", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });
});

describe("formatSource", () => {
  it("traduit l'énumération AniList", () => {
    expect(formatSource("LIGHT_NOVEL")).toBe("Light novel");
  });

  /** AniList étend `MediaSource` sans prévenir : mieux vaut le brut qu'un trou dans la fiche. */
  it("retombe sur la valeur brute quand elle est inconnue", () => {
    expect(formatSource("BOARD_GAME")).toBe("BOARD_GAME");
    expect(formatSource(null)).toBeNull();
  });
});

describe("formatRelationType", () => {
  it("traduit les liens qu'on lit le plus", () => {
    expect(formatRelationType("ADAPTATION")).toBe("Adaptation");
    expect(formatRelationType("SIDE_STORY")).toBe("Histoire parallèle");
  });

  /** Un lien inconnu doit garder son groupe : sans titre, la section entière disparaîtrait. */
  it("retombe sur la valeur brute, et ignore l'absence", () => {
    expect(formatRelationType("PROLOGUE")).toBe("PROLOGUE");
    expect(formatRelationType(null)).toBeNull();
  });
});

describe("formatCharacterRole", () => {
  it("traduit les trois rôles d'AniList", () => {
    expect(formatCharacterRole("MAIN")).toBe("Principal");
    expect(formatCharacterRole("BACKGROUND")).toBe("Figuration");
    expect(formatCharacterRole(null)).toBeNull();
  });
});

describe("formatStaffRole", () => {
  it("traduit les rôles courants", () => {
    expect(formatStaffRole("Original Creator")).toBe("Œuvre originale");
  });

  /**
   * Le rôle est une **chaîne libre** chez AniList, pas une énumération : la table ne peut pas être
   * exhaustive, et l'anglais vaut mieux qu'une invention.
   */
  it("laisse en anglais ce qu'elle ne connaît pas", () => {
    expect(formatStaffRole("Theme Song Performance (ED)")).toBe(
      "Theme Song Performance (ED)",
    );
  });
});

describe("formatCountdown", () => {
  it("s'arrête à deux unités", () => {
    expect(formatCountdown(2 * 86_400 + 4 * 3600 + 37 * 60)).toBe("2 j 4 h");
    expect(formatCountdown(4 * 3600 + 37 * 60)).toBe("4 h 37 min");
  });

  it("omet l'unité nulle", () => {
    expect(formatCountdown(2 * 86_400)).toBe("2 j");
    expect(formatCountdown(3 * 3600)).toBe("3 h");
  });

  /** Sous la minute, « 0 min » ferait croire à une donnée manquante. */
  it("plancher à une minute, et rien du tout une fois l'heure passée", () => {
    expect(formatCountdown(30)).toBe("1 min");
    expect(formatCountdown(0)).toBeNull();
    expect(formatCountdown(-120)).toBeNull();
  });
});

describe("cleanDescription", () => {
  /**
   * Le champ est saisi par des contributeurs : même en `asHtml: false`, AniList y laisse des
   * balises. On les retire plutôt que d'injecter du HTML tiers dans la page.
   */
  it("retire les balises et découpe en paragraphes", () => {
    expect(
      cleanDescription("Premier <i>paragraphe</i>.<br><br>Second paragraphe."),
    ).toEqual(["Premier paragraphe.", "Second paragraphe."]);
  });

  it("recolle les retours à la ligne simples dans un même paragraphe", () => {
    expect(cleanDescription("Une phrase<br>coupée en deux.")).toEqual([
      "Une phrase coupée en deux.",
    ]);
  });

  it("renvoie un tableau vide plutôt que null", () => {
    expect(cleanDescription(null)).toEqual([]);
    expect(cleanDescription("   ")).toEqual([]);
  });
});
