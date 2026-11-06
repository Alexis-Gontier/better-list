import { describe, expect, it } from "vitest";

import { visibleListsWhere } from "@/features/lists/server/list-visibility";

describe("visibleListsWhere", () => {
  it("ouvre mes listes, et celles des autres en « Membres » seulement", () => {
    expect(visibleListsWhere("moi")).toEqual({
      OR: [
        { ownerId: "moi" },
        {
          visibility: "MEMBERS",
          owner: { status: "APPROVED", banned: false },
        },
      ],
    });
  });
});
