import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { MediaSpoilerTags } from "@/app/(app)/media/[id]/_components/media-spoiler-tags";
import { Badge } from "@/components/ui/badge";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Tags communautaires, avec leur pertinence.
 *
 * Le `rank` d'AniList est un pourcentage d'accord des votants : un tag à 95 % décrit l'œuvre, un
 * tag à 20 % est une opinion isolée. On l'affiche plutôt que de le cacher — sans lui, « Isekai
 * 18 % » et « Isekai 98 % » se ressemblent, et la liste ne veut plus rien dire.
 *
 * **Les tags marqués spoiler sont derrière un dépliant.** C'est le seul endroit de la fiche où un
 * affichage direct gâcherait ce que le visiteur est venu chercher : « Mort d'un personnage
 * principal » n'est pas une métadonnée neutre.
 */
export function MediaTags({ media }: { media: MediaDetail }) {
  const relevant = media.tags.filter((tag) => (tag.rank ?? 0) >= 40);

  const isSpoiler = (tag: (typeof relevant)[number]) =>
    Boolean(tag.isMediaSpoiler || tag.isGeneralSpoiler);

  const safe = relevant.filter((tag) => !isSpoiler(tag));
  const spoilers = relevant.filter(isSpoiler);

  if (relevant.length === 0) return null;

  return (
    <MediaSection id="tags" title="Tags">
      <ul className="flex flex-wrap gap-1.5">
        {safe.map((tag) => (
          <li key={tag.id}>
            <Badge className="gap-1.5 font-normal" variant="outline">
              {tag.name}
              {tag.rank ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {tag.rank} %
                </span>
              ) : null}
            </Badge>
          </li>
        ))}
      </ul>

      {spoilers.length > 0 ? <MediaSpoilerTags tags={spoilers} /> : null}
    </MediaSection>
  );
}
