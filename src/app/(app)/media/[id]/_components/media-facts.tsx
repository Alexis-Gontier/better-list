import { mediaCredit } from "@/app/(app)/media/[id]/_lib/media-credits";
import {
  formatCount,
  formatMediaFormat,
  formatMediaStatus,
  formatSeason,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaFactsProps = {
  media: MediaDetail;
};

/**
 * La ligne de faits du hero : format, statut, volume, saison, signature.
 *
 * **Une colonne sans valeur disparaît.** Un tiret cadratin dans une grille de cinq colonnes se lit
 * comme une donnée perdue, alors que la plupart de ces absences sont normales : une œuvre en cours
 * de diffusion n'a pas de nombre d'épisodes, un manga n'a pas de saison. On montre ce qu'on sait,
 * et rien à la place de ce qu'on ne sait pas.
 *
 * Aucune couleur ici — c'est la règle de la spec du 2 septembre : hors jaquette, le texte est
 * `--foreground` ou `--muted-foreground`, et l'accent est réservé à l'action en cours.
 */
export function MediaFacts({ media }: MediaFactsProps) {
  const isAnime = media.type === "ANIME";

  const facts = [
    { label: "Format", value: formatMediaFormat(media.format) },
    { label: "Statut", value: formatMediaStatus(media.status) },
    /*
      Le compteur change de nom **et** de source avec le type : `episodes` et `chapters` sont deux
      colonnes distinctes chez AniList, dont l'autre est toujours nulle.
    */
    isAnime
      ? { label: "Épisodes", value: formatCount(media.episodes) }
      : { label: "Chapitres", value: formatCount(media.chapters) },
    { label: "Saison", value: formatSeason(media.season, media.seasonYear) },
    mediaCredit(media),
  ].filter(
    // Le prédicat est explicite : sans lui, `value` resterait `string | null` pour le rendu.
    (fact): fact is { label: string; value: string } =>
      fact !== null && fact.value !== null,
  );

  if (facts.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-4">
      {facts.map((fact) => (
        <div className="min-w-0" key={fact.label}>
          <dt className="text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {fact.label}
          </dt>
          <dd className="mt-1 truncate text-sm font-medium">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
