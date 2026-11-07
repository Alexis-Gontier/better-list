import "server-only";

import type { MediaCompact } from "@/features/media/schemas/media.schema";

/** La franchise telle que le parcours l'a vue, avant tout ordre. */
export type FranchiseGraph = {
  currentId: number;
  media: Map<number, MediaCompact>;
  /** `[avant, après]` : une arête `SEQUEL` a→b, ou `PREQUEL` lue à l'envers. */
  sequels: Array<[number, number]>;
  /** `[maillon, parallèle]`. */
  sides: Array<[number, number]>;
};

export type FranchiseItem = {
  media: MediaCompact;
  role: "main" | "side";
  /** Le rang dans la chaîne ; `null` pour une parallèle, qui ne compte pas comme une étape. */
  position: number | null;
  current: boolean;
};

// L'id AniList croît avec la date d'ajout : il départage deux œuvres de la même année.
function compareMedia(a: MediaCompact, b: MediaCompact): number {
  const ya = a.seasonYear ?? Number.POSITIVE_INFINITY;
  const yb = b.seasonYear ?? Number.POSITIVE_INFINITY;
  if (ya !== yb) return ya < yb ? -1 : 1;
  return a.id - b.id;
}

function known(graph: FranchiseGraph, ids: Iterable<number>): MediaCompact[] {
  return [...ids].flatMap((id) => {
    const found = graph.media.get(id);
    return found ? [found] : [];
  });
}

/**
 * Tri topologique des suites (Kahn). Parmi les maillons prêts, le mieux classé passe d'abord :
 * c'est ce qui ordonne une bifurcation. Quand rien n'est prêt alors qu'il reste des maillons,
 * c'est un cycle d'AniList : on le coupe en plaçant le mieux classé des restants.
 */
export function orderFranchise(graph: FranchiseGraph): FranchiseItem[] {
  const main = new Set<number>([graph.currentId]);
  for (const [before, after] of graph.sequels) {
    main.add(before);
    main.add(after);
  }

  const next = new Map<number, Set<number>>();
  const indegree = new Map<number, number>();
  for (const id of main) {
    next.set(id, new Set());
    indegree.set(id, 0);
  }
  for (const [before, after] of graph.sequels) {
    const out = next.get(before);
    if (before === after || !out || out.has(after)) continue;
    out.add(after);
    indegree.set(after, (indegree.get(after) ?? 0) + 1);
  }

  const links = known(graph, main);
  const placed = new Set<number>();
  const chain: MediaCompact[] = [];

  while (chain.length < links.length) {
    const remaining = links.filter((m) => !placed.has(m.id)).sort(compareMedia);
    const pick =
      remaining.find((m) => (indegree.get(m.id) ?? 0) <= 0) ?? remaining[0];
    if (!pick) break;
    placed.add(pick.id);
    chain.push(pick);
    for (const after of next.get(pick.id) ?? []) {
      indegree.set(after, (indegree.get(after) ?? 0) - 1);
    }
  }

  const attached = new Set<number>();
  const items: FranchiseItem[] = [];
  chain.forEach((link, index) => {
    items.push({
      media: link,
      role: "main",
      position: index + 1,
      current: link.id === graph.currentId,
    });

    // Une parallèle rattachée à deux maillons ne s'affiche qu'après le premier.
    const sideIds = new Set(
      graph.sides
        .filter(([parent, side]) => parent === link.id && !main.has(side))
        .map(([, side]) => side)
        .filter((side) => !attached.has(side)),
    );
    for (const side of known(graph, sideIds).sort(compareMedia)) {
      attached.add(side.id);
      items.push({ media: side, role: "side", position: null, current: false });
    }
  });

  return items;
}
