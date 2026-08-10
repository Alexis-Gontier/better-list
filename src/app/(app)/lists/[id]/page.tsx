import type { Metadata } from "next";
import { Suspense } from "react";

import { ListDetail } from "@/app/(app)/lists/[id]/_components/list-detail";
import { MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { getListById } from "@/features/lists/server/lists.queries";

export async function generateMetadata({
  params,
}: PageProps<"/lists/[id]">): Promise<Metadata> {
  const { id } = await params;
  const list = await getListById(id);

  if (!list) return {};

  return {
    title: list.title,
    description: list.description ?? "Une liste d'œuvres.",
    // Une liste est privée par défaut (docs/PRODUCT.md §4.4), et l'app est derrière une garde : rien
    // à indexer.
    robots: { index: false, follow: false },
  };
}

export default function ListPage({ params }: PageProps<"/lists/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
          <MediaGridSkeleton count={12} />
        </div>
      }
    >
      <ListDetail params={params} />
    </Suspense>
  );
}
