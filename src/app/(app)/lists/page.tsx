import type { Metadata } from "next";
import { Suspense } from "react";

import { CreateListDialog } from "@/app/(app)/lists/_components/create-list-dialog";
import { ListsOverview } from "@/app/(app)/lists/_components/lists-overview";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Mes listes",
  description: "Classements, sélections et envies de saison.",
};

export default function ListsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-xl">Mes listes</h1>
          <p className="text-muted-foreground text-sm">
            Classements, sélections, envies de saison.
          </p>
        </div>

        {/* Le dialogue n'attend rien du serveur : il reste hors de la frontière de suspension. */}
        <CreateListDialog />
      </header>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => index).map((index) => (
              <Skeleton className="h-48 rounded-lg" key={index} />
            ))}
          </div>
        }
      >
        <ListsOverview />
      </Suspense>
    </div>
  );
}
