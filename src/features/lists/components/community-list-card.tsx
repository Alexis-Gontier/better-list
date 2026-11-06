import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { routes } from "@/config/routes";
import { ListCoverMosaic } from "@/features/lists/components/list-cover-mosaic";
import { LIST_KIND_LABELS } from "@/features/lists/lib/list-labels";
import type { ListSummary } from "@/features/lists/server/lists.queries";
import { LikeButton } from "@/features/social/components/like-button";
import { cn } from "@/lib/utils";

/**
 * La carte d'une liste de la Communauté (maquette A) : la charpente de `ListCard`, plus l'auteur et
 * le ♥. **Le lien s'étire** sur toute la carte et le bouton passe par-dessus : un bouton dans un
 * lien serait du HTML invalide (D65).
 *
 * Dans la rangée de l'accueil (D66) : `h3` sous le titre de la rangée, et `stacked` — la carte y
 * reste debout à toutes les tailles, comme sur la maquette, au lieu de se coucher sur téléphone.
 */
export function CommunityListCard({
  list,
  headingLevel: Heading = "h2",
  stacked = false,
}: {
  list: ListSummary;
  headingLevel?: "h2" | "h3";
  stacked?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative flex h-full gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40",
        stacked ? "flex-col" : "sm:flex-col",
      )}
    >
      <ListCoverMosaic
        covers={list.covers}
        empty={list.itemCount === 0}
        stacked={stacked}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Heading className="truncate font-medium" title={list.title}>
          <Link
            className="after:absolute after:inset-0 after:rounded-lg"
            href={routes.lists.detail(list.id)}
          >
            {list.title}
          </Link>
        </Heading>

        <div className="mt-auto flex items-center gap-2 pt-2 text-muted-foreground text-xs">
          <UserAvatar
            className="size-5 text-[10px]"
            image={list.owner.image}
            name={list.owner.name}
          />
          <span className="min-w-0 flex-1 truncate">
            {list.owner.name} · {LIST_KIND_LABELS[list.kind]} · {list.itemCount}
          </span>
          <LikeButton
            compact
            count={list.likeCount}
            listId={list.id}
            liked={list.likedByMe}
          />
        </div>
      </div>
    </article>
  );
}
