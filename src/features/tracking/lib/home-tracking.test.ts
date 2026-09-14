import { describe, expect, it } from "vitest";

import { partitionTracking } from "@/features/tracking/lib/home-tracking";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

function row(id: number, status: EntryStatus) {
  return { id, entry: { status } };
}

describe("partitionTracking", () => {
  it("range une série en cours dans « en cours »", () => {
    const { active, resumable } = partitionTracking([row(1, "CURRENT")]);

    expect(active.map((r) => r.id)).toEqual([1]);
    expect(resumable).toEqual([]);
  });

  it("traite une relecture comme une série en cours", () => {
    const { active } = partitionTracking([row(1, "REPEATING")]);

    expect(active.map((r) => r.id)).toEqual([1]);
  });

  it("range une série en pause dans « à reprendre »", () => {
    const { active, resumable } = partitionTracking([row(1, "PAUSED")]);

    expect(active).toEqual([]);
    expect(resumable.map((r) => r.id)).toEqual([1]);
  });

  it("n'affiche ni les prévues, ni les terminées, ni les abandonnées", () => {
    const { active, resumable } = partitionTracking([
      row(1, "PLANNING"),
      row(2, "COMPLETED"),
      row(3, "DROPPED"),
    ]);

    expect(active).toEqual([]);
    expect(resumable).toEqual([]);
  });

  it("conserve l'ordre reçu dans chaque pile", () => {
    const { active, resumable } = partitionTracking([
      row(1, "CURRENT"),
      row(2, "PAUSED"),
      row(3, "REPEATING"),
      row(4, "CURRENT"),
      row(5, "PAUSED"),
    ]);

    expect(active.map((r) => r.id)).toEqual([1, 3, 4]);
    expect(resumable.map((r) => r.id)).toEqual([2, 5]);
  });
});
