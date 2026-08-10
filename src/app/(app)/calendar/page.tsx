import type { Metadata } from "next";
import { Suspense } from "react";

import { CalendarSchedule } from "@/app/(app)/calendar/_components/calendar-schedule";
import { CalendarScheduleSkeleton } from "@/app/(app)/calendar/_components/calendar-schedule-skeleton";
import { CalendarWeekNav } from "@/app/(app)/calendar/_components/calendar-week-nav";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Planning",
  description: "Les épisodes à venir de ce que vous suivez.",
};

/**
 * Le planning de diffusion (docs/PRODUCT.md §5, V2).
 *
 * **Il ne montre que ce qu'on suit, et ce n'est pas une simplification.** Une semaine de diffusion
 * complète, c'est cinq mille entrées chez AniList — mesuré — soit cent requêtes sur un quota de
 * trente par minute partagé par tous les visiteurs (§4.1). Un planning global n'est donc pas une
 * fonctionnalité qu'on remet à plus tard : il n'est pas finançable, et c'est écrit en §9. Ce qui
 * reste est de toute façon ce que la navigation promet depuis le début — « les épisodes à venir de
 * ce que vous suivez » —, et ce qu'aucun des deux grands ne donne : le retard, épisode par épisode.
 *
 * **Deux frontières de suspension.** La navigation de semaine ne dépend que de l'URL et part avec
 * l'en-tête ; la grille attend la base puis AniList. Les réunir ferait attendre les flèches derrière
 * un appel réseau dont elles n'ont aucun besoin — c'est le même découpage que la bibliothèque, où
 * les onglets de statut n'attendent pas les résultats.
 *
 * La page elle-même n'attend rien : elle transmet la promesse `searchParams` à ses enfants.
 */
export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Planning</h1>
        <p className="text-muted-foreground text-sm">
          Les épisodes à venir de ce que vous suivez, et ce qu'il vous manque
          pour les regarder.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <CalendarWeekNav searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<CalendarScheduleSkeleton />}>
        <CalendarSchedule searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
