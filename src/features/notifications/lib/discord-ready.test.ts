import { describe, expect, it } from "vitest";

import {
  type ReadyListItem,
  readyAnnouncements,
  readyEmbed,
} from "@/features/notifications/lib/discord-ready";

function item(overrides: Partial<ReadyListItem> = {}): ReadyListItem {
  return {
    itemId: "i1",
    mediaId: 1,
    title: "Solo Leveling",
    status: "FINISHED",
    cover: "https://img.example/1.jpg",
    isAdult: false,
    listTitle: "A lire une fois fini",
    seen: false,
    ...overrides,
  };
}

describe("readyAnnouncements", () => {
  it("annonce une œuvre prête, et la marque", () => {
    const { announcements, settledItemIds } = readyAnnouncements([item()], {
      includeAdult: false,
    });
    expect(announcements).toEqual([
      {
        mediaId: 1,
        title: "Solo Leveling",
        status: "FINISHED",
        cover: "https://img.example/1.jpg",
        lists: ["A lire une fois fini"],
      },
    ]);
    expect(settledItemIds).toEqual(["i1"]);
  });

  it("n'annonce qu'une fois une œuvre rangée dans deux listes, avec les deux noms", () => {
    const { announcements, settledItemIds } = readyAnnouncements(
      [
        item({ itemId: "a", listTitle: "Webtoons" }),
        item({ itemId: "b", listTitle: "Pour Léa" }),
      ],
      { includeAdult: false },
    );
    expect(announcements).toHaveLength(1);
    expect(announcements[0]?.lists).toEqual(["Webtoons", "Pour Léa"]);
    expect(settledItemIds).toEqual(["a", "b"]);
  });

  it("tait une œuvre déjà vue, mais la marque quand même", () => {
    const result = readyAnnouncements([item({ seen: true })], {
      includeAdult: true,
    });
    expect(result.announcements).toEqual([]);
    expect(result.settledItemIds).toEqual(["i1"]);
  });

  it("suit la préférence 18+ du compte", () => {
    const adult = [item({ isAdult: true })];
    expect(
      readyAnnouncements(adult, { includeAdult: false }).announcements,
    ).toEqual([]);
    expect(
      readyAnnouncements(adult, { includeAdult: true }).announcements,
    ).toHaveLength(1);
  });

  it("range les annonces par titre", () => {
    const { announcements } = readyAnnouncements(
      [
        item({ itemId: "z", mediaId: 2, title: "Zom 100" }),
        item({ itemId: "e", mediaId: 3, title: "Eleceed" }),
      ],
      { includeAdult: false },
    );
    expect(announcements.map(({ title }) => title)).toEqual([
      "Eleceed",
      "Zom 100",
    ]);
  });
});

describe("readyEmbed", () => {
  const media = "https://better-list.example/media/1";

  it("dit pourquoi on en parle, et où elle attendait", () => {
    expect(
      readyEmbed(
        {
          mediaId: 1,
          title: "Solo Leveling",
          status: "FINISHED",
          cover: "https://img.example/1.jpg",
          lists: ["A lire une fois fini"],
        },
        { media },
      ),
    ).toEqual({
      title: "Solo Leveling",
      url: media,
      description:
        "Parution terminée : elle t'attend dans « A lire une fois fini ».",
      image: { url: "https://img.example/1.jpg" },
    });
  });

  it("distingue une parution arrêtée, et liste plusieurs listes", () => {
    const embed = readyEmbed(
      {
        mediaId: 1,
        title: "X",
        status: "CANCELLED",
        cover: null,
        lists: ["A", "B", "C"],
      },
      { media },
    );
    expect(embed.description).toBe(
      "Parution arrêtée, il n'y aura pas de suite : elle t'attend dans « A », « B » et « C ».",
    );
    expect(embed.image).toBeUndefined();
  });
});
