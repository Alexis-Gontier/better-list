import * as z from "zod";

/*
  Pas de `server-only` : l'éditeur, côté client, lit le nuancier et applique les mêmes gestes en
  optimiste. Une seule définition des paliers pour les deux côtés de la frontière.
*/

/**
 * Le nuancier de TierMaker : onze pastels, puis quatre gris (spec §6). Les cinq premiers sont les
 * paliers par défaut. **Exception à D33** : c'est la seule couleur de l'interface hors jaquettes.
 */
export const TIER_PALETTE = [
  "#FF7F7F",
  "#FFBF7F",
  "#FFDF7F",
  "#FFFF7F",
  "#BFFF7F",
  "#7FFF7F",
  "#7FFFFF",
  "#7FBFFF",
  "#7F7FFF",
  "#FF7FFF",
  "#BF7FBF",
  "#3B3B3B",
  "#858585",
  "#CFCFCF",
  "#F7F7F7",
] as const;

/** Au-delà, une rangée ne tient plus à l'écran sans défiler, et TierMaker s'arrête au même endroit. */
export const MAX_TIERS = 8;

export const tierSchema = z.object({
  label: z.string().trim().min(1).max(12),
  color: z.enum(TIER_PALETTE),
});
export type Tier = z.infer<typeof tierSchema>;

export const tiersSchema = z.array(tierSchema).min(1).max(MAX_TIERS);

export const DEFAULT_TIERS: Tier[] = [
  { label: "S", color: "#FF7F7F" },
  { label: "A", color: "#FFBF7F" },
  { label: "B", color: "#FFDF7F" },
  { label: "C", color: "#FFFF7F" },
  { label: "D", color: "#BFFF7F" },
];

/** Les noms proposés à l'ajout d'un palier, dans l'ordre : le premier qui n'est pas déjà pris. */
const LABEL_SEQUENCE = ["S", "A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * La colonne `List.tiers` relue. Une colonne vide (liste passée en tier list sans paliers) ou
 * abîmée retombe sur le défaut plutôt que de casser la page.
 */
export function parseTiers(json: unknown): Tier[] {
  const parsed = tiersSchema.safeParse(json);
  return parsed.success ? parsed.data : DEFAULT_TIERS;
}

const indexSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_TIERS - 1);

/** Les gestes du menu d'un palier (spec §6, maquette B). */
export const tierOpSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rename"),
    index: indexSchema,
    label: tierSchema.shape.label,
  }),
  z.object({
    type: z.literal("recolor"),
    index: indexSchema,
    color: tierSchema.shape.color,
  }),
  z.object({
    type: z.literal("insert"),
    index: indexSchema,
    where: z.enum(["above", "below"]),
  }),
  z.object({
    type: z.literal("move"),
    index: indexSchema,
    direction: z.enum(["up", "down"]),
  }),
  z.object({ type: z.literal("clear"), index: indexSchema }),
  z.object({ type: z.literal("delete"), index: indexSchema }),
]);
export type TierOp = z.infer<typeof tierOpSchema>;

/**
 * Applique un geste : les nouveaux paliers, et **comment chaque ancien `tierIndex` se renumérote**
 * (`null` = la réserve). `null` pour un geste impossible — supprimer le dernier palier, monter le
 * premier, un neuvième palier, un index hors bornes —, que l'action traite comme « rien à faire ».
 */
export function applyTierOp(
  tiers: Tier[],
  op: TierOp,
): { tiers: Tier[]; remap: (index: number) => number | null } | null {
  const { index } = op;
  if (index >= tiers.length) return null;
  const same = (i: number) => i;

  switch (op.type) {
    case "rename":
      return {
        tiers: tiers.map((t, i) =>
          i === index ? { ...t, label: op.label } : t,
        ),
        remap: same,
      };
    case "recolor":
      return {
        tiers: tiers.map((t, i) =>
          i === index ? { ...t, color: op.color } : t,
        ),
        remap: same,
      };
    case "clear":
      return { tiers, remap: (i) => (i === index ? null : i) };
    case "delete":
      if (tiers.length === 1) return null;
      return {
        tiers: tiers.filter((_, i) => i !== index),
        remap: (i) => (i === index ? null : i > index ? i - 1 : i),
      };
    case "move": {
      const other = op.direction === "up" ? index - 1 : index + 1;
      if (other < 0 || other >= tiers.length) return null;
      const a = tiers[index];
      const b = tiers[other];
      if (!a || !b) return null;
      const next = [...tiers];
      next[index] = b;
      next[other] = a;
      return {
        tiers: next,
        remap: (i) => (i === index ? other : i === other ? index : i),
      };
    }
    case "insert": {
      if (tiers.length >= MAX_TIERS) return null;
      const at = op.where === "above" ? index : index + 1;
      const next = [...tiers];
      next.splice(at, 0, freshTier(tiers));
      return { tiers: next, remap: (i) => (i >= at ? i + 1 : i) };
    }
  }
}

/** Un palier neuf : le premier nom et la première couleur que les autres ne prennent pas. */
function freshTier(tiers: Tier[]): Tier {
  const labels = new Set(tiers.map((t) => t.label));
  const colors = new Set<string>(tiers.map((t) => t.color));
  return {
    label: LABEL_SEQUENCE.find((l) => !labels.has(l)) ?? "?",
    color: TIER_PALETTE.find((c) => !colors.has(c)) ?? TIER_PALETTE[0],
  };
}

/**
 * Range les œuvres dans leur palier, **dans l'ordre reçu** (l'appelant trie par rang). Un
 * `tierIndex` hors bornes — un palier supprimé dans un autre onglet — tombe dans la réserve plutôt
 * que de disparaître.
 */
export function groupByTier<T extends { tierIndex: number | null }>(
  tiers: Tier[],
  items: T[],
): { rows: { tier: Tier; items: T[] }[]; reserve: T[] } {
  const rows = tiers.map((tier) => ({ tier, items: [] as T[] }));
  const reserve: T[] = [];
  for (const item of items) {
    const row = item.tierIndex === null ? undefined : rows[item.tierIndex];
    (row ? row.items : reserve).push(item);
  }
  return { rows, reserve };
}
