import { describe, expect, it } from "vitest";

import {
  isMirrorStale,
  MIRROR_TTL_MS,
  mirrorStaleCutoffs,
  mirrorTtlMs,
  SETTLED_STATUSES,
  VOLATILE_STATUSES,
} from "@/features/media/lib/media-freshness";

const NOW = new Date("2026-08-08T12:00:00.000Z");

function agedBy(ms: number) {
  return new Date(NOW.getTime() - ms);
}

describe("mirrorTtlMs", () => {
  it("donne trente jours à une œuvre terminée ou annulée", () => {
    for (const status of SETTLED_STATUSES) {
      expect(mirrorTtlMs(status)).toBe(MIRROR_TTL_MS.settled);
    }
  });

  it("donne douze heures à une œuvre en cours, à paraître ou en pause", () => {
    for (const status of VOLATILE_STATUSES) {
      expect(mirrorTtlMs(status)).toBe(MIRROR_TTL_MS.volatile);
    }
  });

  /**
   * Le choix prudent : on ne sait pas ce qu'est une œuvre sans statut, donc on la revoit souvent.
   * La ranger dans la classe lente reviendrait à ne jamais découvrir son vrai statut.
   */
  it("traite un statut inconnu comme volatile", () => {
    expect(mirrorTtlMs(null)).toBe(MIRROR_TTL_MS.volatile);
  });

  /** Les deux classes couvrent l'énumération, sans recouvrement. */
  it("range chaque statut dans une classe et une seule", () => {
    expect(SETTLED_STATUSES).toHaveLength(2);
    expect(VOLATILE_STATUSES).toHaveLength(3);
    expect(
      SETTLED_STATUSES.filter((status) => VOLATILE_STATUSES.includes(status)),
    ).toEqual([]);
  });
});

describe("isMirrorStale", () => {
  it("laisse fraîche une série en cours vue il y a onze heures", () => {
    expect(
      isMirrorStale(
        { status: "RELEASING", syncedAt: agedBy(11 * 60 * 60 * 1000) },
        NOW,
      ),
    ).toBe(false);
  });

  it("périme une série en cours vue il y a treize heures", () => {
    expect(
      isMirrorStale(
        { status: "RELEASING", syncedAt: agedBy(13 * 60 * 60 * 1000) },
        NOW,
      ),
    ).toBe(true);
  });

  /**
   * La même ancienneté donne deux verdicts opposés selon le statut : c'est exactement ce que la
   * politique de §4.1 demande, et la seule raison d'avoir deux durées.
   */
  it("laisse fraîche une série terminée vue il y a treize heures", () => {
    expect(
      isMirrorStale(
        { status: "FINISHED", syncedAt: agedBy(13 * 60 * 60 * 1000) },
        NOW,
      ),
    ).toBe(false);
  });

  it("périme une série terminée vue il y a trente et un jours", () => {
    expect(
      isMirrorStale(
        { status: "FINISHED", syncedAt: agedBy(31 * 24 * 60 * 60 * 1000) },
        NOW,
      ),
    ).toBe(true);
  });

  it("périme sur la seconde exacte plutôt que juste après", () => {
    expect(
      isMirrorStale(
        { status: "RELEASING", syncedAt: agedBy(MIRROR_TTL_MS.volatile) },
        NOW,
      ),
    ).toBe(true);
  });

  /** Une ligne qui vient d'être écrite ne peut pas être périmée — le cas du premier suivi. */
  it("laisse fraîche une ligne écrite à l'instant", () => {
    expect(isMirrorStale({ status: null, syncedAt: NOW }, NOW)).toBe(false);
  });
});

describe("mirrorStaleCutoffs", () => {
  it("place les deux bornes en arrière de leur durée de vie respective", () => {
    const { volatileBefore, settledBefore } = mirrorStaleCutoffs(NOW);

    expect(volatileBefore).toEqual(new Date("2026-08-08T00:00:00.000Z"));
    expect(settledBefore).toEqual(new Date("2026-07-09T12:00:00.000Z"));
  });

  /**
   * L'invariant qui rend la requête du cron correcte : la borne des œuvres figées est forcément plus
   * ancienne que celle des œuvres mouvantes. Les inverser rafraîchirait les fiches terminées toutes
   * les douze heures — le contraire du but du miroir.
   */
  it("garde la borne des œuvres figées plus ancienne que celle des mouvantes", () => {
    const { volatileBefore, settledBefore } = mirrorStaleCutoffs(NOW);

    expect(settledBefore.getTime()).toBeLessThan(volatileBefore.getTime());
  });
});
