import Link from "next/link";
import { Suspense } from "react";

import { CreateListDialog } from "@/app/(app)/lists/_components/create-list-dialog";
import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import {
  countCommunityLists,
  countMyLists,
} from "@/features/lists/server/community.queries";
import { cn } from "@/lib/utils";

type ListsTab = "mine" | "community";

/**
 * L'en-tête de `/lists` et de `/lists/community` (maquette A) : le titre, « Nouvelle liste », et
 * les deux onglets. Les onglets sont des liens : chacun est une page, avec son adresse.
 */
export function ListsHeader({ active }: { active: ListsTab }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Empilé sur téléphone, en ligne dès `sm` : la raison est dans l'historique de `/lists`. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeading
          description="Les vôtres, et celles des autres membres."
          title="Listes"
        />
        <div className="shrink-0">
          <CreateListDialog />
        </div>
      </div>
      {/* Les compteurs lisent la base : leur propre frontière, le titre ne les attend pas. */}
      <Suspense fallback={<Skeleton className="h-9 w-64" />}>
        <ListsTabs active={active} />
      </Suspense>
    </div>
  );
}

async function ListsTabs({ active }: { active: ListsTab }) {
  const [mine, community] = await Promise.all([
    countMyLists(),
    countCommunityLists(),
  ]);

  return (
    <nav aria-label="Listes" className="flex gap-5 border-b">
      <ListsTabLink
        active={active === "mine"}
        count={mine}
        href={routes.lists.root}
        label="Mes listes"
      />
      <ListsTabLink
        active={active === "community"}
        count={community}
        href={routes.lists.community}
        label="Communauté"
      />
    </nav>
  );
}

function ListsTabLink({
  active,
  count,
  href,
  label,
}: {
  active: boolean;
  count: number;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 py-2 font-medium text-sm transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      href={href}
    >
      {label}
      <Badge variant="secondary">{count}</Badge>
    </Link>
  );
}
