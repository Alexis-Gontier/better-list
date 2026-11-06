import Image from "next/image";

import type { Tier } from "@/features/lists/lib/tier-list";
import type { ListCover } from "@/features/lists/server/lists.queries";
import { cn } from "@/lib/utils";

/**
 * L'aperçu d'une tier list sur sa carte (maquette D) : ses trois premiers paliers, à la place de la
 * mosaïque. **La même boîte que `ListCoverMosaic`** — 96 × 144 couchée sur téléphone, 8:3 debout —
 * pour qu'une tier list ait la silhouette des autres cartes de la grille.
 */
export function TierPreview({
  rows,
  stacked = false,
}: {
  rows: { tier: Tier; covers: ListCover[] }[];
  /** La carte reste debout à toutes les tailles (rangée de l'accueil). */
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-0.5 overflow-hidden rounded-sm",
        stacked
          ? "aspect-8/3 w-full"
          : "h-36 w-24 sm:aspect-8/3 sm:h-auto sm:w-full",
      )}
    >
      {rows.map(({ tier, covers }) => (
        <div
          className="flex min-h-0 flex-1 gap-0.5 bg-muted/40"
          // Le nom seul ne suffit pas : deux paliers peuvent s'appeler pareil.
          key={`${tier.label}-${tier.color}-${covers[0]?.mediaId ?? "vide"}`}
        >
          <div
            className="flex w-6 shrink-0 items-center justify-center font-semibold text-[10px] text-black"
            style={{ backgroundColor: tier.color }}
          >
            {tier.label}
          </div>
          {covers.map((cover) => (
            <div
              className="relative aspect-2/3 h-full shrink-0 overflow-hidden bg-muted"
              key={cover.mediaId}
            >
              {cover.cover ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="40px"
                  src={cover.cover}
                  title={cover.title || undefined}
                />
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
