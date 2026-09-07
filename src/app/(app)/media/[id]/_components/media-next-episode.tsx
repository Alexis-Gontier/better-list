import { CalendarClockIcon } from "lucide-react";

import {
  formatAiringDate,
  formatCountdown,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaNextEpisodeProps = {
  /** `nextAiringEpisode` d'AniList. Nul sur tout ce qui n'est pas un anime en cours de diffusion. */
  episode: MediaDetail["nextAiringEpisode"];
};

/**
 * Le prochain épisode — **la seule information de cette page qui se périme à la minute.**
 *
 * Elle est donc en tête du panneau, avant tout ce qui ne bouge jamais : quand une série est en
 * cours, c'est la question qu'on vient poser.
 *
 * **Le décompte est relatif, et la fiche est cachée un jour** (`cacheLife("days")`) : « dans 2 j
 * 4 h » peut donc être faux de plusieurs heures à la lecture. C'est exactement pourquoi la date
 * absolue l'accompagne — elle, ne périme pas —, et pourquoi le décompte est en retrait plutôt
 * qu'en titre. `formatCountdown` le documente déjà de son côté ; ce composant est l'appelant qui
 * tient sa part du contrat.
 */
export function MediaNextEpisode({ episode }: MediaNextEpisodeProps) {
  if (!episode) return null;

  const countdown = formatCountdown(episode.timeUntilAiring);

  return (
    <section className="flex gap-3">
      <CalendarClockIcon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />

      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="font-medium text-sm">
          Épisode {episode.episode}
          {countdown ? (
            <span className="text-muted-foreground"> · dans {countdown}</span>
          ) : null}
        </h2>

        {/*
          `first-letter:uppercase` plutôt qu'une capitale écrite dans le formateur :
          `formatAiringDate` sert aussi au planning, où la date arrive en milieu de phrase.
        */}
        <time
          className="text-muted-foreground text-sm first-letter:uppercase"
          dateTime={new Date(episode.airingAt * 1000).toISOString()}
        >
          {formatAiringDate(episode.airingAt)}
        </time>
      </div>
    </section>
  );
}
