import { describe, expect, it } from "vitest";

import { banExpiresIn } from "@/features/admin/lib/ban-duration";

describe("banExpiresIn", () => {
  it("compte les jours en secondes, ce qu'attend Better Auth", () => {
    expect(banExpiresIn("7d")).toBe(7 * 24 * 60 * 60);
    expect(banExpiresIn("30d")).toBe(30 * 24 * 60 * 60);
  });

  it("ne pose pas d'échéance à un bannissement définitif", () => {
    expect(banExpiresIn("forever")).toBeUndefined();
  });
});
