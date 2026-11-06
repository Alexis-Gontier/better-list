import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import * as z from "zod";
import {
  LISTS_GRID_COLUMNS,
  ListsGridSkeleton,
} from "@/app/(app)/lists/_components/lists-grid";
import { ListsHeader } from "@/app/(app)/lists/_components/lists-header";
import { CommunityEmpty } from "@/app/(app)/lists/community/_components/community-empty";
import { CommunitySort } from "@/app/(app)/lists/community/_components/community-sort";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { CommunityListCard } from "@/features/lists/components/community-list-card";
import { getCommunityLists } from "@/features/lists/server/community.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export const metadata: Metadata = {
  title: "Communauté",
  description: "Les listes que les autres membres ouvrent au cercle.",
};

/** Ce que l'URL peut demander ; une valeur inconnue retombe sur le défaut plutôt que d'échouer. */
const querySchema = z.object({
  tri: z.enum(["aimees", "recentes"]).catch("aimees"),
  page: z.coerce.number().int().min(1).max(50).catch(1),
});

/**
 * La Communauté (lot 3, §3) : les listes « Membres » des autres. La page n'`await` rien, elle passe
 * la promesse des `searchParams` à la zone qui attend (D29).
 */
export default function CommunityPage({
  searchParams,
}: PageProps<"/lists/community">) {
  return (
    <div className="flex flex-col gap-6">
      <ListsHeader active="community" />
      <Suspense fallback={<ListsGridSkeleton />}>
        <CommunityGrid searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CommunityGrid({
  searchParams,
}: {
  searchParams: PageProps<"/lists/community">["searchParams"];
}) {
  const { tri, page } = querySchema.parse(await searchParams);
  const { includeAdult } = await getPreferences();
  const { lists, hasMore } = await getCommunityLists({
    includeAdult,
    sort: tri,
    page,
  });

  // Sans liste, le tri n'a rien à trier : l'état vide seul.
  if (lists.length === 0) return <CommunityEmpty />;

  return (
    <div className="flex flex-col gap-6">
      <CommunitySort active={tri} />
      <div className={LISTS_GRID_COLUMNS}>
        {lists.map((list) => (
          <CommunityListCard key={list.id} list={list} />
        ))}
      </div>
      {hasMore ? (
        <Button asChild className="w-fit" variant="outline">
          <Link
            href={routes.lists.communityPage(tri, page + 1)}
            replace
            scroll={false}
          >
            Voir plus
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
