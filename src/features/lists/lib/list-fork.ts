import "server-only";

import { READY_MEDIA_STATUSES } from "@/features/lists/lib/list-sections";
import { parseTiers } from "@/features/lists/lib/tier-list";
import type { ListKind } from "@/features/lists/schemas/lists.schema";

export type ForkSource = {
  id: string;
  title: string;
  description: string | null;
  kind: ListKind;
  cutoff: number | null;
  tiers?: unknown;
  items: { mediaId: number; rank: string; tierIndex?: number | null }[];
};

/**
 * « Copier » recopie la liste telle qu'elle est ; « Faire ma version » (tier list seulement, §6)
 * reprend les mêmes œuvres et les mêmes paliers, **tout dans la réserve**, et se lie à l'original
 * par `versionOfId` plutôt que `forkedFromId` : l'original compte ses versions à part.
 */
export type ForkMode = "copy" | "version";

/**
 * La copie d'une liste (lot 3, §3) : le contenu et son ordre, **pas** ce qui appartient à
 * l'original (jeton de partage, likes, notes, annonces Discord). Elle naît privée : copier n'est
 * pas publier.
 */
export function forkData(
  source: ForkSource,
  ownerId: string,
  mode: ForkMode = "copy",
) {
  const tier = source.kind === "TIER";
  return {
    list: {
      ownerId,
      title: source.title,
      description: source.description,
      kind: source.kind,
      cutoff: source.cutoff,
      visibility: "PRIVATE" as const,
      ...(mode === "version"
        ? { versionOfId: source.id }
        : { forkedFromId: source.id }),
      ...(tier ? { tiers: parseTiers(source.tiers) } : {}),
    },
    items: source.items.map(({ mediaId, rank, tierIndex }) => ({
      mediaId,
      rank,
      ...(tier
        ? { tierIndex: mode === "version" ? null : (tierIndex ?? null) }
        : {}),
    })),
  };
}

/** Une œuvre déjà prête n'est pas une nouvelle (D50) : la copie la marque annoncée d'emblée. */
export function readyNotifiedAtFor(
  mediaStatus: string | null,
  now: Date,
): Date | null {
  return (READY_MEDIA_STATUSES as readonly string[]).includes(mediaStatus ?? "")
    ? now
    : null;
}
