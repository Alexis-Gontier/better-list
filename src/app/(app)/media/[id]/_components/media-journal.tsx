import { Skeleton } from "@/components/ui/skeleton";
import {
  describeEntryEvent,
  type EntryUnit,
  formatEventTime,
  groupEventsByDay,
} from "@/features/tracking/lib/entry-format";
import { getMediaJournal } from "@/features/tracking/server/library.queries";

/**
 * Mon journal sur cette œuvre (D70), groupé par jour comme sur le profil, **sans jaquette** : on est
 * déjà sur la fiche, la jaquette répéterait celle du hero dix fois. Rien sans historique.
 */
export async function MediaJournal({
  mediaId,
  unit,
}: {
  mediaId: number;
  unit: EntryUnit;
}) {
  const { events, total } = await getMediaJournal(mediaId);
  if (events.length === 0) return null;

  // L'horloge se lit après la lecture en base : sous `cacheComponents`, une date lue avant toute
  // donnée de requête figerait le rendu.
  const days = groupEventsByDay(events, new Date());

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-2 text-xl">
        Mon journal
        <span className="text-muted-foreground text-sm">
          {total > events.length
            ? `${events.length} derniers sur ${total}`
            : total}
        </span>
      </h2>
      <ol className="flex flex-col gap-3">
        {days.map((day) => (
          <li className="flex flex-col gap-1" key={day.key}>
            <h3 className="font-heading text-muted-foreground text-xs uppercase tracking-wide">
              {day.label}
            </h3>
            <ol className="grid gap-x-6 sm:grid-cols-2">
              {day.events.map((event) => {
                const line = describeEntryEvent(event, unit);
                return (
                  <li
                    className="flex items-baseline gap-2 py-1 text-sm"
                    key={event.id}
                  >
                    <span className="truncate">{line.label}</span>
                    {line.detail ? (
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {line.detail}
                      </span>
                    ) : null}
                    <time
                      className="ml-auto shrink-0 text-muted-foreground text-xs tabular-nums"
                      dateTime={event.createdAt.toISOString()}
                    >
                      {formatEventTime(event.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Aux proportions d'un journal court : un titre (28 px), un jour, deux lignes de 28 px. */
export function MediaJournalSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-full" />
    </div>
  );
}
