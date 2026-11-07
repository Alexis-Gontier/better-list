import "server-only";

import type { FranchiseGraph } from "@/features/media/lib/franchise-order";
import type { MediaCompact } from "@/features/media/schemas/media.schema";

export type FranchiseEdge = { relationType: string | null; node: MediaCompact };

/** Les relations d'un lot d'œuvres ; `null` quand AniList n'a pas répondu. */
export type FetchLevel = (
  ids: number[],
) => Promise<Map<number, FranchiseEdge[]> | null>;

/**
 * 50 est le `perPage` maximal d'AniList. 6 requêtes sur les 30 par minute partagées par toute la
 * production : une chaîne d'une douzaine de saisons, parcourue dans les deux sens à la fois, y tient.
 */
const FRANCHISE_LIMITS = { requests: 6, media: 80, batch: 50 };

/**
 * Le parcours par niveaux : chaque lot de maillons nouveaux part en **une** requête, donc le coût
 * suit la longueur de la chaîne, pas sa largeur. Les parallèles sont collectées et jamais
 * explorées : c'est ce qui empêche Gundam de devenir tout AniList.
 */
export async function walkFranchise(
  start: MediaCompact,
  startEdges: FranchiseEdge[],
  fetchLevel: FetchLevel,
  limits = FRANCHISE_LIMITS,
) {
  const media = new Map<number, MediaCompact>([[start.id, start]]);
  const sequels: Array<[number, number]> = [];
  const sides: Array<[number, number]> = [];
  const seen = new Set<number>([start.id]);
  let requests = 0;
  let incomplete = false;

  function absorb(from: number, edges: FranchiseEdge[]): number[] {
    const discovered: number[] = [];
    for (const { relationType, node } of edges) {
      if (relationType === "SIDE_STORY") {
        sides.push([from, node.id]);
        if (!media.has(node.id)) media.set(node.id, node);
        continue;
      }
      if (relationType === "SEQUEL") sequels.push([from, node.id]);
      else if (relationType === "PREQUEL") sequels.push([node.id, from]);
      else continue;
      media.set(node.id, node);
      if (!seen.has(node.id)) {
        seen.add(node.id);
        discovered.push(node.id);
      }
    }
    return discovered;
  }

  let queue = absorb(start.id, startEdges);

  while (
    queue.length > 0 &&
    requests < limits.requests &&
    media.size < limits.media
  ) {
    const batch = queue.slice(0, limits.batch);
    queue = queue.slice(limits.batch);
    requests++;

    const level = await fetchLevel(batch);
    if (!level) {
      incomplete = true;
      break;
    }
    for (const id of batch) queue.push(...absorb(id, level.get(id) ?? []));
  }

  const graph: FranchiseGraph = { currentId: start.id, media, sequels, sides };
  return {
    graph,
    requests,
    truncated: !incomplete && queue.length > 0,
    incomplete,
  };
}
