import { describe, expect, it } from "vitest";

import {
  bioExcerpt,
  bioText,
  parseBio,
  resolveBioHref,
  splitBioFacts,
} from "@/features/people/lib/people-bio";

describe("resolveBioHref", () => {
  it("réécrit les liens AniList vers nos routes", () => {
    expect(resolveBioHref("https://anilist.co/character/17/Shanks")).toEqual({
      href: "/character/17",
      external: false,
    });
    expect(resolveBioHref("https://anilist.co/staff/95021")).toEqual({
      href: "/staff/95021",
      external: false,
    });
    expect(resolveBioHref("https://anilist.co/anime/21/ONE-PIECE/")).toEqual({
      href: "/media/21",
      external: false,
    });
    expect(resolveBioHref("/manga/30013")).toEqual({
      href: "/media/30013",
      external: false,
    });
  });

  it("garde les autres liens http(s) en externe et refuse le reste", () => {
    expect(resolveBioHref("https://twitter.com/x")).toEqual({
      href: "https://twitter.com/x",
      external: true,
    });
    expect(resolveBioHref("javascript:alert(1)")).toBeNull();
    expect(resolveBioHref("pas une url")).toBeNull();
  });
});

describe("parseBio", () => {
  it("rend un texte nu en un paragraphe", () => {
    expect(parseBio("Bonjour.")).toEqual([
      [{ kind: "text", text: "Bonjour." }],
    ]);
  });

  it("rend null et le vide en aucun paragraphe", () => {
    expect(parseBio(null)).toEqual([]);
    expect(parseBio("  \n\n ")).toEqual([]);
  });

  it("sépare les paragraphes sur une ligne vide et garde les retours simples", () => {
    expect(parseBio("a\nb\n\nc")).toEqual([
      [
        { kind: "text", text: "a" },
        { kind: "break" },
        { kind: "text", text: "b" },
      ],
      [{ kind: "text", text: "c" }],
    ]);
  });

  it("lit le gras en __ comme en **", () => {
    expect(parseBio("__Height:__ 172 cm **x**")).toEqual([
      [
        { kind: "strong", children: [{ kind: "text", text: "Height:" }] },
        { kind: "text", text: " 172 cm " },
        { kind: "strong", children: [{ kind: "text", text: "x" }] },
      ],
    ]);
  });

  it("réécrit un lien AniList et laisse le texte d'un lien refusé", () => {
    expect(
      parseBio(
        "[Shanks](https://anilist.co/character/17) et [x](javascript:y)",
      ),
    ).toEqual([
      [
        {
          kind: "link",
          href: "/character/17",
          external: false,
          children: [{ kind: "text", text: "Shanks" }],
        },
        { kind: "text", text: " et " },
        { kind: "text", text: "x" },
      ],
    ]);
  });

  it("masque un spoiler qui contient du gras et traverse une ligne", () => {
    expect(parseBio("~!__A:__ b\nc!~ fin")).toEqual([
      [
        {
          kind: "spoiler",
          children: [
            { kind: "strong", children: [{ kind: "text", text: "A:" }] },
            { kind: "text", text: " b" },
            { kind: "break" },
            { kind: "text", text: "c" },
          ],
        },
        { kind: "text", text: " fin" },
      ],
    ]);
  });

  it("garde un spoiler entier même s'il traverse une ligne vide", () => {
    const [paragraph, ...rest] = parseBio("~!a\n\nb!~");
    expect(rest).toEqual([]);
    expect(paragraph?.[0]?.kind).toBe("spoiler");
  });

  it("nettoie les balises HTML qu'AniList laisse passer", () => {
    expect(parseBio("a<br>b &amp; <i>c</i>")).toEqual([
      [
        { kind: "text", text: "a" },
        { kind: "break" },
        { kind: "text", text: "b & c" },
      ],
    ]);
  });
});

describe("splitBioFacts", () => {
  const LUFFY =
    "__Height:__ 172 cm\n__Affiliations:__ ~!Straw Hat Grand Fleet!~\n__Devil Fruit__: Gomu Gomu no Mi\n~!__Former Bounty:__ 3 000 000 000!~\n\nLuffy is the captain.";

  it("sort les lignes « __Intitulé:__ valeur » de tête, traduites", () => {
    const { facts, body } = splitBioFacts(parseBio(LUFFY));

    expect(facts.map((fact) => fact.label)).toEqual([
      "Taille",
      "Affiliations",
      "Fruit du démon",
      null,
    ]);
    expect(bioText(facts[0]?.value ?? [])).toBe("172 cm");
    expect(bioText(facts[2]?.value ?? [])).toBe("Gomu Gomu no Mi");
    expect(facts[1]?.value[0]?.kind).toBe("spoiler");
    expect(body).toEqual([[{ kind: "text", text: "Luffy is the captain." }]]);
  });

  it("laisse la prose tranquille, même quand elle commence par du gras", () => {
    const paragraphs = parseBio("__Luffy__ is the captain.\n__Age:__ 17");
    expect(splitBioFacts(paragraphs)).toEqual({ facts: [], body: paragraphs });
  });

  it("garde les intitulés inconnus tels quels", () => {
    const { facts } = splitBioFacts(
      parseBio("__Agency:__ Aoni\n__Twitter:__ x"),
    );
    expect(facts.map((fact) => fact.label)).toEqual(["Agence", "Twitter"]);
  });
});

describe("bioExcerpt", () => {
  it("prend la première prose, sans fiche ni spoiler", () => {
    expect(
      bioExcerpt("__Height:__ 172 cm\n\nLuffy ~!dies!~ is the __captain__."),
    ).toBe("Luffy is the captain.");
  });

  it("coupe sur un mot, avec une ellipse", () => {
    expect(bioExcerpt("un deux trois quatre cinq six", 16)).toBe(
      "un deux trois…",
    );
  });

  it("saute un paragraphe fait seulement de liens", () => {
    expect(
      bioExcerpt(
        "__Agency:__ Aoni\n\n[Profile](https://example.com)\n\nA Japanese actress.",
      ),
    ).toBe("A Japanese actress.");
  });

  it("rend null sans texte", () => {
    expect(bioExcerpt(null)).toBeNull();
    expect(bioExcerpt("__Height:__ 172 cm")).toBeNull();
  });
});
