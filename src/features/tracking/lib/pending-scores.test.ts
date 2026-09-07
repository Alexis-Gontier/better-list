import { describe, expect, it } from "vitest";

import {
  applyPendingScores,
  failScore,
  type PendingScores,
  queueScore,
  settleScore,
} from "@/features/tracking/lib/pending-scores";

const empty = (): PendingScores => new Map();

describe("applyPendingScores", () => {
  /**
   * Le cas qui a motivé le module : la revalidation du premier dépôt renvoie des lignes fraîches
   * où le second n'est pas encore écrit. Les reprendre telles quelles ferait revenir la carte à
   * son ancien cran, le temps d'un aller-retour.
   */
  it("recouvre les lignes serveur par les notes en vol", () => {
    const pending = empty();
    queueScore(pending, 1, 90, null);

    expect(
      applyPendingScores(
        [
          { mediaId: 1, score: null },
          { mediaId: 2, score: 50 },
        ],
        pending,
      ),
    ).toEqual([
      { mediaId: 1, score: 90 },
      { mediaId: 2, score: 50 },
    ]);
  });

  it("rend le tableau d'origine quand rien n'est en vol", () => {
    const rows = [{ mediaId: 1, score: 50 }];
    expect(applyPendingScores(rows, empty())).toBe(rows);
  });
});

describe("queueScore et settleScore", () => {
  /**
   * Deux déplacements de la **même** œuvre peuvent se chevaucher. La note d'avant retenue est celle
   * d'avant le premier : c'est le seul état que le serveur ait jamais confirmé.
   */
  it("garde la note d'avant la première écriture", () => {
    const pending = empty();
    queueScore(pending, 1, 90, 50);
    queueScore(pending, 1, 100, 90);

    expect(pending.get(1)).toEqual({
      score: 100,
      previous: 50,
      inFlight: 2,
    });
  });

  it("n'oublie l'œuvre qu'à la dernière écriture revenue", () => {
    const pending = empty();
    queueScore(pending, 1, 90, 50);
    queueScore(pending, 1, 100, 90);

    settleScore(pending, 1);
    expect(pending.get(1)?.inFlight).toBe(1);

    settleScore(pending, 1);
    expect(pending.has(1)).toBe(false);
  });

  it("ne bronche pas sur une écriture qu'on ne suit pas", () => {
    const pending = empty();
    expect(() => settleScore(pending, 404)).not.toThrow();
  });
});

describe("failScore", () => {
  /**
   * Un échec périme **toutes** les écritures en vol de cette œuvre : elles partaient d'un état qui
   * n'a jamais existé côté serveur. On revient donc à la dernière note confirmée, d'un coup.
   */
  it("rend la note d'avant et cesse de suivre l'œuvre", () => {
    const pending = empty();
    queueScore(pending, 1, 90, 50);
    queueScore(pending, 1, 100, 90);

    expect(failScore(pending, 1)).toEqual({ previous: 50 });
    expect(pending.has(1)).toBe(false);
  });

  /**
   * `null` et non `{ previous: null }` : « aucune écriture en cours » et « elle n'était pas notée »
   * sont deux choses différentes, et les confondre effacerait une note posée depuis un autre onglet.
   */
  it("distingue « rien en vol » de « pas de note »", () => {
    const pending = empty();
    expect(failScore(pending, 404)).toBeNull();

    queueScore(pending, 1, 90, null);
    expect(failScore(pending, 1)).toEqual({ previous: null });
  });
});
