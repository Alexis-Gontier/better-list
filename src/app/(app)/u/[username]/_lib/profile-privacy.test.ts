import { describe, expect, it } from "vitest";

import { DEFAULT_PREFERENCES } from "@/features/preferences/schemas/preferences.schema";
import {
  canViewProfileSection,
  profileAdultFilter,
} from "@/features/profile/lib/profile-privacy";

const open = { ...DEFAULT_PREFERENCES };
const hidden = { ...DEFAULT_PREFERENCES, profileVisible: false };

describe("canViewProfileSection", () => {
  it("montre tout au propriétaire, même un profil caché", () => {
    expect(canViewProfileSection({ isOwner: true }, hidden, "journal")).toBe(
      true,
    );
  });

  it("cache tout aux autres quand le profil est caché", () => {
    for (const section of [
      "journal",
      "stats",
      "activity",
      "favorites",
    ] as const) {
      expect(canViewProfileSection({ isOwner: false }, hidden, section)).toBe(
        false,
      );
    }
  });

  it("suit le réglage de chaque section", () => {
    const noJournal = { ...open, showJournal: false };
    expect(
      canViewProfileSection({ isOwner: false }, noJournal, "journal"),
    ).toBe(false);
    expect(canViewProfileSection({ isOwner: false }, noJournal, "stats")).toBe(
      true,
    );
  });
});

describe("profileAdultFilter", () => {
  it("garde la préférence du propriétaire pour lui-même", () => {
    expect(
      profileAdultFilter({
        isOwner: true,
        viewerIncludeAdult: true,
        privacy: open,
      }),
    ).toBe(true);
  });

  it("cache le 18+ d'un profil qui ne le montre pas, même au lecteur qui l'accepte", () => {
    expect(
      profileAdultFilter({
        isOwner: false,
        viewerIncludeAdult: true,
        privacy: open,
      }),
    ).toBe(false);
  });

  it("le montre seulement si les deux l'acceptent", () => {
    const adult = { ...open, showAdult: true };
    expect(
      profileAdultFilter({
        isOwner: false,
        viewerIncludeAdult: true,
        privacy: adult,
      }),
    ).toBe(true);
    expect(
      profileAdultFilter({
        isOwner: false,
        viewerIncludeAdult: false,
        privacy: adult,
      }),
    ).toBe(false);
  });
});
