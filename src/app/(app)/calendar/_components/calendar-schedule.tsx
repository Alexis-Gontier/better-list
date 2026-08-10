import { CalendarOffIcon, TvMinimalPlayIcon } from "lucide-react";
import Link from "next/link";

import {
  AiringEpisode,
  type AiringEpisodeView,
} from "@/app/(app)/calendar/_components/airing-episode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routes } from "@/config/routes";
import {
  airingWeek,
  clampWeekOffset,
  groupAiringByDay,
} from "@/features/media/lib/airing-week";
import { loadCalendarParams } from "@/features/media/lib/calendar-params";
import { getAiringSchedule } from "@/features/media/server/media.queries";
import { getAiringEntries } from "@/features/tracking/server/tracking.queries";
import { cn } from "@/lib/utils";

/**
 * La semaine, jour par jour.
 *
 * **Deux lectures, et elles ne peuvent pas partir ensemble** : la seconde a besoin du résultat de
 * la première. C'est la contrepartie assumée du filtrage à la source — on demande à AniList la
 * grille horaire *de ces œuvres-là*, ce qui suppose de savoir lesquelles. Le coût est faible : la
 * lecture de bibliothèque est locale (docs/PRODUCT.md §4.1) et répond en quelques millisecondes,
 * là où l'alternative — tout ramener puis filtrer — coûterait cent requêtes AniList.
 *
 * `now` est capturé **une fois** et descendu dans l'arbre. Trente lignes qui appelleraient chacune
 * `Date.now()` pourraient trancher « diffusé ou pas » différemment à la seconde près, et deux
 * lignes voisines se contrediraient.
 */
export async function CalendarSchedule({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { week } = await loadCalendarParams(searchParams);
  const now = new Date();
  const calendar = airingWeek(now, clampWeekOffset(week));

  const entries = await getAiringEntries();

  /**
   * Rien à l'antenne dans la bibliothèque : on s'arrête **avant** d'appeler AniList. Un compte neuf
   * n'a aucune raison de dépenser une requête pour recevoir une liste vide, et l'écran qui lui sert
   * n'est pas un planning — c'est une porte vers le catalogue.
   */
  if (entries.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TvMinimalPlayIcon />
          </EmptyMedia>
          <EmptyTitle>Rien à l'antenne</EmptyTitle>
          <EmptyDescription>
            Le planning suit les animes que vous avez marqués en cours, prévus
            ou en relecture. Aucun des vôtres n'est en cours de diffusion pour
            le moment.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <Button asChild size="sm">
            <Link href={routes.search}>Trouver une série de la saison</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const schedules = await getAiringSchedule({
    mediaIds: entries.map((entry) => entry.media.id),
    from: calendar.from,
    to: calendar.to,
  });

  const byMedia = new Map(entries.map((entry) => [entry.media.id, entry]));

  const airings = schedules.flatMap<AiringEpisodeView>((schedule) => {
    const entry = byMedia.get(schedule.mediaId);
    // AniList ne renvoie que ce qu'on a demandé ; le garde couvre le cas où il renverrait autre
    // chose, plutôt que de laisser une ligne sans progression atteindre l'affichage.
    if (!entry) return [];

    return [
      {
        id: schedule.id,
        episode: schedule.episode,
        airingAt: schedule.airingAt,
        progress: entry.progress,
        media: entry.media,
      },
    ];
  });

  /**
   * La semaine est vide, mais la bibliothèque ne l'est pas : une seule phrase, pas sept lignes
   * « rien ce jour-là ». Le décompte des séries suivies est ce qui distingue « il ne sort rien » de
   * « la page est cassée ».
   */
  if (airings.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
        Aucun épisode cette semaine parmi les {entries.length} séries que vous
        suivez.
      </p>
    );
  }

  const days = groupAiringByDay(calendar, airings);

  return (
    <ol className="space-y-6">
      {days.map((day) => (
        <li className="space-y-2" key={day.key}>
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-medium text-sm",
                day.isToday ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {day.label}
            </h3>

            {day.isToday ? (
              <Badge variant="secondary">Aujourd'hui</Badge>
            ) : null}
          </div>

          {day.items.length > 0 ? (
            <ul className="space-y-2">
              {day.items.map((airing) => (
                <li key={airing.id}>
                  <AiringEpisode airing={airing} now={now} />
                </li>
              ))}
            </ul>
          ) : (
            /*
              Un jour vide reste affiché, sur une seule ligne. C'est ce qui fait la différence entre
              un planning et une liste : savoir qu'il n'y a rien le jeudi est une information, et le
              masquer ferait glisser le vendredi à sa place.
            */
            <p className="flex items-center gap-1.5 text-muted-foreground/70 text-xs">
              <CalendarOffIcon aria-hidden="true" className="size-3.5" />
              Rien ce jour-là.
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
