import {
  FlagIcon,
  type LucideIcon,
  PencilLineIcon,
  PlayIcon,
  RotateCcwIcon,
  StarIcon,
} from "lucide-react";

import type { MediaDetail } from "@/features/media/schemas/media.schema";
import {
  describeEntryEvent,
  type EntryEventView,
  formatEventTime,
  groupEventsByDay,
} from "@/features/tracking/lib/entry-format";
import type { EntryEventDraft } from "@/features/tracking/lib/entry-transition";
import { getEntryTimeline } from "@/features/tracking/server/tracking.queries";

/**
 * Le journal d'une œuvre — la lecture de `EntryEvent` (docs/PRODUCT.md §4.3).
 *
 * C'est la contrepartie de `saveEntry` : une table append-only qu'on n'affiche jamais ne se vérifie
 * pas, et ses erreurs ne se corrigent pas rétroactivement. Ce composant est donc aussi le contrôle
 * de ce qu'on inscrit.
 *
 * Server Component, dans son propre `<Suspense>` : c'est une seconde requête base non mémorisée,
 * indépendante de celle du panneau. Rien ne descend au client — il n'y a rien d'interactif ici.
 *
 * Il affiche l'**activité récente**, pas l'historique complet (voir `RECENT_EVENTS_COUNT`). La
 * timeline entière est un écran de profil, qui viendra avec V1.
 */

const EVENT_ICONS: Record<EntryEventDraft["type"], LucideIcon> = {
  PROGRESS: PlayIcon,
  STATUS_CHANGED: FlagIcon,
  SCORED: StarIcon,
  NOTE: PencilLineIcon,
  REPEAT_STARTED: RotateCcwIcon,
};

export async function EntryTimeline({ media }: { media: MediaDetail }) {
  const events = await getEntryTimeline(media.id);

  // Une œuvre qu'on ne suit pas n'a pas de journal : un encadré vide sous le panneau annoncerait
  // une fonctionnalité en panne là où il n'y a simplement rien à raconter.
  if (events.length === 0) return null;

  const days = groupEventsByDay(events, new Date());
  const unit = media.type === "ANIME" ? "episode" : "chapitre";

  return (
    <section
      aria-labelledby="activite-recente"
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <h2 className="font-medium text-sm" id="activite-recente">
        Activité récente
      </h2>

      {days.map((day) => (
        <div className="space-y-1.5" key={day.key}>
          <p className="font-medium text-muted-foreground text-xs">
            {day.label}
          </p>

          <ul className="space-y-1.5">
            {day.events.map((event) => (
              <EntryTimelineRow event={event} key={event.id} unit={unit} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function EntryTimelineRow({
  event,
  unit,
}: {
  event: EntryEventView;
  unit: "episode" | "chapitre";
}) {
  const { label, detail } = describeEntryEvent(event, unit);
  const Icon = EVENT_ICONS[event.type];

  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        aria-hidden="true"
        className="mt-[0.2rem] size-3.5 shrink-0 text-muted-foreground"
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-x-1.5">
          <span className="truncate">{label}</span>

          {/*
            La note personnelle est un texte libre : elle passe à la ligne (voir plus bas) au lieu
            de s'écraser dans la largeur restante de la colonne.
          */}
          {detail && event.type !== "NOTE" ? (
            <span className="truncate text-muted-foreground text-xs">
              {detail}
            </span>
          ) : null}

          {/*
            L'heure est une précision, pas l'information : le journal est daté à la journée
            (docs/PRODUCT.md §4.3). Elle part donc à droite, en petit, et `dateTime` porte
            l'horodatage exact pour qui lit la page autrement qu'avec les yeux.
          */}
          <time
            className="ml-auto shrink-0 text-muted-foreground text-xs tabular-nums"
            dateTime={event.createdAt.toISOString()}
          >
            {formatEventTime(event.createdAt)}
          </time>
        </p>

        {event.type === "NOTE" && detail ? (
          <p className="line-clamp-3 text-muted-foreground text-xs italic">
            {detail}
          </p>
        ) : null}
      </div>
    </li>
  );
}
