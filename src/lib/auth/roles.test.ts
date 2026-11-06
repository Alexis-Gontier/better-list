import { describe, expect, it } from "vitest";

import { isAdmin } from "@/lib/auth/roles";

describe("isAdmin", () => {
  it("reconnaît le rôle admin", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it("refuse tout le reste, rôle absent compris", () => {
    expect(isAdmin({ role: "user" })).toBe(false);
    expect(isAdmin({ role: null })).toBe(false);
    expect(isAdmin({})).toBe(false);
  });
});
