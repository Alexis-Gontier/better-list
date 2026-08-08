import Link from "next/link";

import { routes } from "@/config/routes";
import { mirroredTitle } from "@/features/media/lib/media-format";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import {
  describeEntryEvent,
  type EntryEventView,
  formatEventTime,
  groupEventsByDay,
} from "@/features/tracking/lib/entry-format";

/**
 * Le journal, toutes œuvres confondues.
 *
 * C'est la même lecture que le journal d'une fiche, à ceci près que chaque ligne doit dire **de
 * quelle œuvre** elle parle — d'où le titre en tête de ligne, qui est aussi le lien.
 *
 * Le regroupement et la description viennent de `lib/entry-format.ts`, sans rien réécrire : c'est
 * la raison pour laquelle `groupEventsByDay` est générique sur l'événement.
 *
 * Il a démarré dans le `_components/` du tableau de bord ; la timeline du profil en a eu besoin,
 * donc il est monté ici. Il connaît `EntryEvent`, donc `features/tracking/` et non
 * `components/shared/`. **Les deux appelants n'en diffèrent que par le nombre d'événements
 * qu'ils lui passent** — douze pour un survol, une page entière pour une timeline.
 */

export type ActivityEvent = EntryEventView & {
  entry: {
    media: {
      id: number;
      type: "ANIME" | "MANGA";
      titleRomaji: string | null;
      titleEnglish: string | null;
      titleNative: string | null;
    };
  };
};

export async function EntryActivityList({
  events,
}: {
  events: ActivityEvent[];
}) {
  const { titleLanguage, scoreFormat } = await getPreferences();
  const days = groupEventsByDay(events, new Date());

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {days.map((day) => (
        <div className="space-y-2" key={day.key}>
          <p className="font-medium text-muted-foreground text-xs">
            {day.label}
          </p>

          <ul className="space-y-2">
            {day.events.map((event) => {
              const media = event.entry.media;
              const { label, detail } = describeEntryEvent(
                event,
                media.type === "ANIME" ? "episode" : "chapitre",
                scoreFormat,
              );

              return (
                <li
                  className="flex flex-wrap items-baseline gap-x-2 text-sm"
                  key={event.id}
                >
                  <Link
                    className="font-medium hover:underline"
                    href={routes.media(media.id)}
                  >
                    {mirroredTitle(media, titleLanguage)}
                  </Link>

                  <span className="text-muted-foreground">{label}</span>

                  {/*
                    La note personnelle est du texte libre : on la borne à une ligne ici, là où la
                    fiche lui en accorde trois. Le tableau de bord est un survol, pas une lecture.
                  */}
                  {detail ? (
                    <span className="truncate text-muted-foreground text-xs">
                      {detail}
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
          </ul>
        </div>
      ))}
    </div>
  );
}
