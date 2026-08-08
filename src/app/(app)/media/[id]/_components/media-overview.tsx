import { MediaLinks } from "@/app/(app)/media/[id]/_components/media-links";
import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { MediaStats } from "@/app/(app)/media/[id]/_components/media-stats";
import { MediaStreamingEpisodes } from "@/app/(app)/media/[id]/_components/media-streaming-episodes";
import { MediaTags } from "@/app/(app)/media/[id]/_components/media-tags";
import { MediaTrailer } from "@/app/(app)/media/[id]/_components/media-trailer";
import {
  cleanDescription,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Onglet d'ouverture : tout ce qui répond à « c'est quoi, et est-ce que c'est pour moi ».
 *
 * **Une seule colonne, et pas de fiche technique.** Format, statut, saison, taille, studio,
 * source, score et origine sont déjà dans l'en-tête : une table les répétant à droite ne servait
 * qu'à faire deux fois le même travail, en désaccordant les deux affichages au premier changement.
 * L'en-tête est la fiche technique.
 */
export async function MediaOverview({ media }: { media: MediaDetail }) {
  const paragraphs = cleanDescription(media.description);
  const { titleLanguage } = await getPreferences();
  const title = mediaTitle(media.title, titleLanguage);

  return (
    <div className="space-y-8">
      {paragraphs.length > 0 ? (
        <MediaSection id="synopsis" title="Synopsis">
          {/*
            `max-w-prose` : au-delà de ~70 caractères par ligne, l'œil perd le début de la ligne
            suivante. La section fait toute la largeur, le texte non.
          */}
          <div className="max-w-prose space-y-3 text-muted-foreground text-sm leading-relaxed">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </MediaSection>
      ) : null}

      {media.trailer ? (
        <MediaSection id="bande-annonce" title="Bande-annonce">
          <div className="max-w-2xl">
            <MediaTrailer title={title} trailer={media.trailer} />
          </div>
        </MediaSection>
      ) : null}

      <MediaTags media={media} />
      <MediaStats media={media} />
      <MediaStreamingEpisodes media={media} />
      <MediaLinks media={media} />

      {media.synonyms.length > 0 ? (
        <MediaSection
          aside={`${media.synonyms.length}`}
          id="synonymes"
          title="Autres titres"
        >
          {/*
            En ligne et repliés, pas en liste à puces : une œuvre connue a une quinzaine de
            synonymes — un par langue de diffusion — et quinze lignes pour des variantes du même
            titre déséquilibreraient tout l'onglet.
          */}
          <ul className="flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground text-sm">
            {media.synonyms.map((synonym, index) => (
              <li key={synonym}>
                {synonym}
                {index < media.synonyms.length - 1 ? (
                  <span aria-hidden="true"> ·</span>
                ) : null}
              </li>
            ))}
          </ul>
        </MediaSection>
      ) : null}
    </div>
  );
}
