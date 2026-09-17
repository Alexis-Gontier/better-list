import { describe, expect, it } from "vitest";

import {
  cleanDescription,
  formatCharacterRole,
  formatCountdown,
  formatDateRange,
  formatDuration,
  formatFuzzyDate,
  formatMediaCount,
  formatRelationType,
  formatSeason,
  formatSource,
  formatStaffRole,
  formatVoiceLanguage,
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

describe("formatMediaCount", () => {
  const count = (
    partial: Partial<Parameters<typeof formatMediaCount>[0]>,
  ): Parameters<typeof formatMediaCount>[0] => ({
    type: "ANIME",
    format: "TV",
    episodes: null,
    chapters: null,
    ...partial,
  });

  it("compte en épisodes un anime, en chapitres une œuvre écrite", () => {
    expect(formatMediaCount(count({ episodes: 12 }))).toBe("12 épisodes");
    expect(
      formatMediaCount(
        count({ type: "MANGA", format: "MANGA", chapters: 214 }),
      ),
    ).toBe("214 chapitres");
  });

  it("accorde le singulier", () => {
    expect(formatMediaCount(count({ format: "OVA", episodes: 1 }))).toBe(
      "1 épisode",
    );
  });

  it("ne lit que le compteur de son type", () => {
    expect(formatMediaCount(count({ chapters: 214 }))).toBeNull();
    expect(
      formatMediaCount(count({ type: "MANGA", format: "MANGA", episodes: 12 })),
    ).toBeNull();
  });

  it("laisse un film au seul libellé de son format", () => {
    expect(
      formatMediaCount(count({ format: "MOVIE", episodes: 1 })),
    ).toBeNull();
  });

  it("traite zéro et null comme un volume inconnu", () => {
    expect(formatMediaCount(count({ episodes: 0 }))).toBeNull();
    expect(formatMediaCount(count({ episodes: null }))).toBeNull();
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

describe("formatRelationType", () => {
  it("traduit les liens dont le terme anglais ne dit rien", () => {
    expect(formatRelationType("SIDE_STORY")).toBe("Histoire parallèle");
    expect(formatRelationType("SEQUEL")).toBe("Suite");
  });

  /**
   * AniList ajoute des valeurs à cette énumération. Une relation dont le type est inconnu doit
   * rester affichée — perdre le lien serait pire que montrer son étiquette brute.
   */
  it("retombe sur le brut plutôt que de faire disparaître la relation", () => {
    expect(formatRelationType("TIE_IN")).toBe("TIE_IN");
    expect(formatRelationType(null)).toBeNull();
  });
});

describe("formatCharacterRole", () => {
  it("traduit les trois rôles", () => {
    expect(formatCharacterRole("MAIN")).toBe("Principal");
    expect(formatCharacterRole("BACKGROUND")).toBe("Figuration");
  });

  it("retombe sur le brut", () => {
    expect(formatCharacterRole("CAMEO")).toBe("CAMEO");
    expect(formatCharacterRole(null)).toBeNull();
  });
});

describe("formatVoiceLanguage", () => {
  /** AniList rend le mot anglais en toutes lettres, pas un code ISO : la table indexe ce mot-là. */
  it("traduit la langue de doublage", () => {
    expect(formatVoiceLanguage("Japanese")).toBe("Japonais");
    expect(formatVoiceLanguage("French")).toBe("Français");
  });

  it("retombe sur le brut", () => {
    expect(formatVoiceLanguage("Hindi")).toBe("Hindi");
    expect(formatVoiceLanguage(null)).toBeNull();
  });
});

describe("formatStaffRole", () => {
  it("traduit les rôles courants", () => {
    expect(formatStaffRole("Original Creator")).toBe("Œuvre originale");
    expect(formatStaffRole("Music")).toBe("Musique");
  });

  /**
   * La forme la plus fréquente sur une série longue : sans le détachement, l'onglet Équipe de One
   * Piece restait presque entièrement en anglais.
   */
  it("détache la portée entre parenthèses, la traduction faite", () => {
    expect(formatStaffRole("Director (eps 1-278)")).toBe(
      "Réalisation (eps 1-278)",
    );
  });

  /** Sans traduction connue, la chaîne d'AniList est rendue intacte, portée comprise. */
  it("retombe sur le brut sans le recomposer", () => {
    expect(formatStaffRole("Theme Song Performance (OP1)")).toBe(
      "Theme Song Performance (OP1)",
    );
    expect(formatStaffRole("2nd Key Animation")).toBe("2nd Key Animation");
    expect(formatStaffRole(null)).toBeNull();
  });
});
