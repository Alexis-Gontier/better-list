import Image from "next/image";
import Link from "next/link";

import { MediaInListsDialog } from "@/app/(app)/media/[id]/_components/media-in-lists-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import {
  getListsWithMedia,
  type MediaListRef,
} from "@/features/lists/server/community.queries";

/** Quatre cartes au plus sur la fiche, le reste dans « Tout voir » (lot 3, §3). */
const VISIBLE = 4;

/**
 * « Dans les listes » (maquette D) : les listes visibles qui contiennent l'œuvre, les miennes
 * comprises. Rien du tout quand il n'y en a aucune : un bloc vide ne dirait rien d'utile.
 */
export async function MediaInLists({
  mediaId,
  includeAdult,
}: {
  mediaId: number;
  includeAdult: boolean;
}) {
  const lists = await getListsWithMedia(mediaId, { includeAdult });
  if (lists.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="flex items-baseline gap-2 text-xl">
          Dans les listes
          <span className="text-muted-foreground text-sm">{lists.length}</span>
        </h2>
        {lists.length > VISIBLE ? (
          <MediaInListsDialog count={lists.length}>
            {lists.map((list) => (
              <MediaListMiniCard key={list.id} list={list} />
            ))}
          </MediaInListsDialog>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {lists.slice(0, VISIBLE).map((list) => (
          <MediaListMiniCard key={list.id} list={list} />
        ))}
      </div>
    </section>
  );
}

/** Une mini-carte : deux jaquettes, le titre, l'auteur et la place de l'œuvre dans un classement. */
function MediaListMiniCard({ list }: { list: MediaListRef }) {
  return (
    <Link
      className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/40"
      href={routes.lists.detail(list.id)}
    >
      <div className="flex shrink-0 gap-0.5 overflow-hidden rounded-sm">
        {[0, 1].map((index) => {
          const cover = list.covers[index];
          return (
            <div
              className="relative h-9 w-6 bg-muted-foreground/20"
              key={cover?.mediaId ?? `vide-${index}`}
            >
              {cover?.cover ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="24px"
                  src={cover.cover}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm">{list.title}</span>
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <UserAvatar
            className="size-4 text-[8px]"
            image={list.owner.image}
            name={list.owner.name}
          />
          {list.isMine ? "Vous" : list.owner.name}
          {list.rank === null ? null : ` · #${list.rank}`}
        </span>
      </div>
    </Link>
  );
}

/** Le titre et quatre mini-cartes, aux hauteurs réelles (titre 28 px, carte 58 px). */
export function MediaInListsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton className="h-[58px]" key={key} />
        ))}
      </div>
    </div>
  );
}
