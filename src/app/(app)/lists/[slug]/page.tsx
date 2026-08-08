import type { Metadata } from "next";
import { Suspense } from "react";

import { ListDetail } from "@/app/(app)/lists/[slug]/_components/list-detail";
import { MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { getListBySlug } from "@/features/lists/server/lists.queries";

export async function generateMetadata({
  params,
}: PageProps<"/lists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const list = await getListBySlug(slug);

  if (!list) return {};

  return {
    title: list.title,
    description: list.description ?? "Une liste d'œuvres.",
    // Une liste est privée par défaut (docs/PRODUCT.md §4.4), et l'app est derrière une garde : rien
    // à indexer.
    robots: { index: false, follow: false },
  };
}

export default function ListPage({ params }: PageProps<"/lists/[slug]">) {
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
