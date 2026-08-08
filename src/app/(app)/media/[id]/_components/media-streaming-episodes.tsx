import { ExternalLinkIcon } from "lucide-react";

import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Épisodes disponibles chez les diffuseurs.
 *
 * **Sans vignettes, volontairement.** AniList sert ici des images hébergées par chaque plateforme
 * (Crunchyroll, Hidive, …) : autoriser leurs domaines dans `next.config.ts` reviendrait à ouvrir
 * l'optimiseur d'images à une liste d'hôtes qu'on ne maîtrise pas et qui change sans prévenir. Le
 * titre et le lien portent l'essentiel de l'information.
 *
 * La liste est haute sur une série longue, d'où le défilement borné plutôt qu'une page de deux
 * cents lignes.
 */
export function MediaStreamingEpisodes({ media }: { media: MediaDetail }) {
  const episodes = media.streamingEpisodes.filter((episode) => episode.url);
  if (episodes.length === 0) return null;

  return (
    <MediaSection
      aside={`${episodes.length} épisodes`}
      id="episodes"
      title="Épisodes en ligne"
    >
      <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
        {episodes.map((episode) => (
          <li key={episode.url}>
            <a
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent"
              href={episode.url ?? "#"}
              rel="noreferrer noopener"
              target="_blank"
            >
              <span className="min-w-0 truncate">
                {episode.title ?? "Épisode"}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
                {episode.site}
                <ExternalLinkIcon aria-hidden="true" className="size-3" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </MediaSection>
  );
}
