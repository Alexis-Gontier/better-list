import { describe, expect, it } from "vitest";

import {
  createListSchema,
  updateListSchema,
} from "@/features/lists/schemas/lists.schema";

describe("createListSchema", () => {
  it("prend « Sélection » quand le genre n'est pas donné", () => {
    expect(createListSchema.parse({ title: "Pile" })).toMatchObject({
      kind: "SELECTION",
    });
  });

  it("refuse un genre inconnu", () => {
    expect(
      createListSchema.safeParse({ title: "Pile", kind: "TIER" }).success,
    ).toBe(false);
  });

  it("borne la ligne de coupe entre 1 et 100", () => {
    const base = { title: "Top", kind: "RANKING" };
    expect(createListSchema.safeParse({ ...base, cutoff: 0 }).success).toBe(
      false,
    );
    expect(createListSchema.safeParse({ ...base, cutoff: 101 }).success).toBe(
      false,
    );
    expect(createListSchema.safeParse({ ...base, cutoff: 10 }).success).toBe(
      true,
    );
    expect(createListSchema.safeParse({ ...base, cutoff: null }).success).toBe(
      true,
    );
  });
});

describe("updateListSchema", () => {
  it("exige le genre", () => {
    expect(
      updateListSchema.safeParse({ listId: "l1", title: "Top", cutoff: null })
        .success,
    ).toBe(false);
  });
});
