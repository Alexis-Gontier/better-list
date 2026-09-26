import { describe, expect, it } from "vitest";

import { parseBio, resolveBioHref } from "@/features/people/lib/people-bio";

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
