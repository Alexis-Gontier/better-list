import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de la fiche, servi pendant que la lecture AniList se résout.
 *
 * Il reprend **la géométrie exacte** de la fiche réelle — même bannière bord à bord, même largeur
 * de jaquette, même remontée sur la bannière, même barre d'onglets. C'est tout l'intérêt : si les
 * proportions diffèrent, le contenu qui arrive fait sauter la page, et le remède devient pire que
 * l'attente.
 */
export function MediaDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        {/* Même sortie du container que `MediaBanner` — voir le commentaire qui s'y trouve. */}
        <Skeleton className="-mt-6 relative left-1/2 h-44 w-screen -translate-x-1/2 rounded-none sm:h-64 lg:h-80" />

        {/* Mêmes pistes et mêmes remontées que `MediaHero` — sinon l'arrivée du contenu saute. */}
        <div className="grid items-start gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
          <Skeleton className="-mt-24 aspect-2/3 w-32 rounded-lg sm:-mt-32 sm:w-full lg:-mt-40" />

          <div className="min-w-0 space-y-4 sm:pt-2">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-3/4 max-w-md" />
              <Skeleton className="h-4 w-64" />
            </div>

            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-full max-w-lg" />

            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Le panneau de suivi, à gauche — mêmes proportions que `EntryPanelSkeleton`. */}
        <div className="space-y-4 rounded-lg border p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="min-w-0 space-y-6">
          <div className="flex gap-4 border-b pb-2">
            {["apercu", "personnages", "staff", "relations"].map((tab) => (
              <Skeleton className="h-6 w-24" key={tab} />
            ))}
          </div>

          {/* L'aperçu est sur une seule colonne : synopsis d'abord, puis les sections empilées. */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full max-w-prose" />
            <Skeleton className="h-4 w-full max-w-prose" />
            <Skeleton className="h-4 w-4/5 max-w-prose" />
          </div>
        </div>
      </div>
    </div>
  );
}
