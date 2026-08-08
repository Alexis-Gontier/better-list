import { Skeleton } from "@/components/ui/skeleton";

/**
 * Attente du panneau de suivi.
 *
 * Il a son propre `<Suspense>` : la lecture de l'entrée est une requête base non mémorisée (elle
 * dépend de l'utilisateur), et la faire attendre par la fiche AniList — ou l'inverse — retarderait
 * les deux pour rien.
 */
export function EntryPanelSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
