import "server-only";

import { READY_MEDIA_STATUSES } from "@/features/lists/lib/list-sections";
import type { ListKind } from "@/features/lists/schemas/lists.schema";

export type ForkSource = {
  id: string;
  title: string;
  description: string | null;
  kind: ListKind;
  cutoff: number | null;
  items: { mediaId: number; rank: string }[];
};

/**
 * La copie d'une liste (lot 3, §3) : le contenu et son ordre, **pas** ce qui appartient à
 * l'original (jeton de partage, likes, notes, annonces Discord). Elle naît privée : copier n'est
 * pas publier.
 */
export function forkData(source: ForkSource, ownerId: string) {
  return {
    list: {
      ownerId,
      title: source.title,
      description: source.description,
      kind: source.kind,
      cutoff: source.cutoff,
      visibility: "PRIVATE" as const,
      forkedFromId: source.id,
    },
    items: source.items.map(({ mediaId, rank }) => ({ mediaId, rank })),
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
