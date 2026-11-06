import { describe, expect, it } from "vitest";

import {
  applyTierOp,
  DEFAULT_TIERS,
  groupByTier,
  MAX_TIERS,
  parseTiers,
  TIER_PALETTE,
  type Tier,
  tiersSchema,
} from "@/features/lists/lib/tier-list";

const labels = (tiers: Tier[] | undefined) => tiers?.map((t) => t.label);

describe("les paliers par défaut", () => {
  it("sont S, A, B, C, D aux cinq premiers pastels", () => {
    expect(labels(DEFAULT_TIERS)).toEqual(["S", "A", "B", "C", "D"]);
    expect(DEFAULT_TIERS.map((t) => t.color)).toEqual(TIER_PALETTE.slice(0, 5));
  });

  it("passent la validation", () => {
    expect(tiersSchema.safeParse(DEFAULT_TIERS).success).toBe(true);
  });
});

describe("tiersSchema", () => {
  it(`refuse plus de ${MAX_TIERS} paliers, et aucun`, () => {
    const nine = Array.from({ length: 9 }, () => DEFAULT_TIERS[0]);
    expect(tiersSchema.safeParse(nine).success).toBe(false);
    expect(tiersSchema.safeParse([]).success).toBe(false);
  });

  it("refuse une couleur hors du nuancier", () => {
    expect(
      tiersSchema.safeParse([{ label: "S", color: "#123456" }]).success,
    ).toBe(false);
  });
});

describe("parseTiers", () => {
  it("retombe sur les paliers par défaut quand la colonne est vide ou abîmée", () => {
    expect(parseTiers(null)).toEqual(DEFAULT_TIERS);
    expect(parseTiers("n'importe quoi")).toEqual(DEFAULT_TIERS);
  });
});

describe("applyTierOp", () => {
  it("supprimer A renvoie ses œuvres dans la réserve et décale celles du dessous", () => {
    const r = applyTierOp(DEFAULT_TIERS, { type: "delete", index: 1 });
    expect(labels(r?.tiers)).toEqual(["S", "B", "C", "D"]);
    expect([0, 1, 2, 4].map((i) => r?.remap(i))).toEqual([0, null, 1, 3]);
  });

  it("refuse de supprimer le dernier palier", () => {
    expect(
      applyTierOp([DEFAULT_TIERS[0]], { type: "delete", index: 0 }),
    ).toBeNull();
  });

  it("vider un palier renvoie ses œuvres dans la réserve, sans toucher aux autres", () => {
    const r = applyTierOp(DEFAULT_TIERS, { type: "clear", index: 2 });
    expect(labels(r?.tiers)).toEqual(labels(DEFAULT_TIERS));
    expect([0, 1, 2, 3].map((i) => r?.remap(i))).toEqual([0, 1, null, 3]);
  });

  it("monter un palier échange sa place et ses œuvres avec celui du dessus", () => {
    const r = applyTierOp(DEFAULT_TIERS, {
      type: "move",
      index: 2,
      direction: "up",
    });
    expect(labels(r?.tiers)).toEqual(["S", "B", "A", "C", "D"]);
    expect([1, 2, 3].map((i) => r?.remap(i))).toEqual([2, 1, 3]);
  });

  it("refuse de monter le premier et de descendre le dernier", () => {
    expect(
      applyTierOp(DEFAULT_TIERS, { type: "move", index: 0, direction: "up" }),
    ).toBeNull();
    expect(
      applyTierOp(DEFAULT_TIERS, { type: "move", index: 4, direction: "down" }),
    ).toBeNull();
  });

  it("ajouter au-dessus du premier décale tout d'un cran, avec un nom et une couleur libres", () => {
    const r = applyTierOp(DEFAULT_TIERS, {
      type: "insert",
      index: 0,
      where: "above",
    });
    expect(labels(r?.tiers)).toEqual(["E", "S", "A", "B", "C", "D"]);
    expect(r?.tiers[0].color).toBe(TIER_PALETTE[5]);
    expect([0, 4].map((i) => r?.remap(i))).toEqual([1, 5]);
  });

  it("ajouter en dessous ne décale que ce qui suit", () => {
    const r = applyTierOp(DEFAULT_TIERS, {
      type: "insert",
      index: 1,
      where: "below",
    });
    expect(labels(r?.tiers)).toEqual(["S", "A", "E", "B", "C", "D"]);
    expect([0, 1, 2].map((i) => r?.remap(i))).toEqual([0, 1, 3]);
  });

  it(`refuse un ${MAX_TIERS + 1}e palier`, () => {
    const full = Array.from({ length: MAX_TIERS }, (_, i) => ({
      label: String(i),
      color: TIER_PALETTE[0],
    }));
    expect(
      applyTierOp(full, { type: "insert", index: 0, where: "below" }),
    ).toBeNull();
  });

  it("renomme et recolore sans rien déplacer", () => {
    const renamed = applyTierOp(DEFAULT_TIERS, {
      type: "rename",
      index: 0,
      label: "Dieu",
    });
    expect(labels(renamed?.tiers)?.[0]).toBe("Dieu");
    expect(renamed?.remap(3)).toBe(3);

    const recolored = applyTierOp(DEFAULT_TIERS, {
      type: "recolor",
      index: 0,
      color: TIER_PALETTE[14],
    });
    expect(recolored?.tiers[0].color).toBe(TIER_PALETTE[14]);
  });

  it("refuse un index hors bornes", () => {
    expect(applyTierOp(DEFAULT_TIERS, { type: "clear", index: 7 })).toBeNull();
  });
});

describe("groupByTier", () => {
  it("range chaque œuvre dans son palier, la réserve recevant les nulles et les hors bornes", () => {
    const items = [
      { id: "a", tierIndex: 0 },
      { id: "b", tierIndex: null },
      { id: "c", tierIndex: 2 },
      { id: "d", tierIndex: 9 },
    ];
    const { rows, reserve } = groupByTier(DEFAULT_TIERS, items);
    expect(rows.map((row) => row.items.map((i) => i.id))).toEqual([
      ["a"],
      [],
      ["c"],
      [],
      [],
    ]);
    expect(reserve.map((i) => i.id)).toEqual(["b", "d"]);
  });
});
