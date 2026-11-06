import { describe, expect, it } from "vitest";

import {
  notificationLabel,
  shouldNotify,
} from "@/features/social/lib/notification-rules";

describe("shouldNotify", () => {
  it("ne notifie jamais son propre geste", () => {
    expect(shouldNotify({ actorId: "a", recipientId: "a" })).toBe(false);
    expect(shouldNotify({ actorId: "a", recipientId: "b" })).toBe(true);
  });
});

describe("notificationLabel", () => {
  it("dit qui a aimé quoi", () => {
    expect(
      notificationLabel({
        type: "LIST_LIKED",
        actorName: "Sora",
        listTitle: "Top 10",
        provider: null,
      }),
    ).toEqual({ lead: "Sora a aimé", subject: "Top 10" });
  });

  it("dit qui a copié quoi", () => {
    expect(
      notificationLabel({
        type: "LIST_FORKED",
        actorName: "Léo",
        listTitle: "Top 10",
        provider: null,
      }),
    ).toEqual({ lead: "Léo a copié", subject: "Top 10" });
  });

  it("nomme le fournisseur d'une demande", () => {
    expect(
      notificationLabel({
        type: "SIGNUP_PENDING",
        actorName: "Kenji",
        listTitle: null,
        provider: "discord",
      }),
    ).toEqual({ lead: "Nouvelle demande :", subject: "Kenji (Discord)" });
  });
});
