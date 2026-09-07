import {
  formatCount,
  formatCountry,
  formatDateRange,
  formatDuration,
  formatFuzzyDate,
  formatSource,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaSpecsProps = {
  media: MediaDetail;
};

/**
 * La fiche technique — ce que la ligne de faits du hero n'a pas pris.
 *
 * **Elle ne répète rien.** Format, statut, compteur, saison et signature sont déjà en haut de
 * l'écran, sur la même ligne d'œil que le titre ; les redonner ici ferait de ce panneau un doublon
 * qu'on cesserait de lire. Ne restent que les précisions qu'on vient chercher exprès — d'où on
 * tire l'histoire, combien de temps dure un épisode, sur quelles années la série s'étale.
 *
 * Même règle que `MediaFacts`, et pour la même raison : **une ligne sans valeur disparaît**. Un
 * tiret dans une liste de définitions se lit comme une donnée perdue, alors que la plupart de ces
 * absences sont normales — un manga n'a pas de durée d'épisode, une série en cours n'a pas de date
 * de fin.
 */
export function MediaSpecs({ media }: MediaSpecsProps) {
  const isAnime = media.type === "ANIME";

  const specs = [
    { label: "Source", value: formatSource(media.source) },
    /*
      **Le pays n'est montré que sur les œuvres écrites**, et ce n'est pas une économie de place :
      c'est lui qui distingue un manga d'un manhwa ou d'un manhua, distinction que le format
      d'AniList ne porte pas (docs/fiche-media.md §1.1). Sur un anime, « Japon » est vrai de neuf
      fiches sur dix et n'apprend donc rien.
    */
    isAnime
      ? null
      : { label: "Origine", value: formatCountry(media.countryOfOrigin) },
    isAnime
      ? { label: "Durée d'un épisode", value: formatDuration(media.duration) }
      : /*
          `volumes` n'est renseigné que sur les séries terminées, et c'est une limite d'AniList,
          pas un oubli (docs/fiche-media.md §1.3). Une série en cours affichera donc l'absence,
          c'est-à-dire rien.
        */
        { label: "Tomes", value: formatCount(media.volumes) },
    {
      label: isAnime ? "Diffusion" : "Publication",
      value: airingPeriod(media),
    },
  ].filter(
    (spec): spec is { label: string; value: string } =>
      spec !== null && spec.value !== null,
  );

  if (specs.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.12em]">
        Fiche technique
      </h2>

      {/*
        Le libellé à gauche, la valeur à droite et alignée au bord : dans une colonne étroite, deux
        lignes empilées par entrée doubleraient la hauteur du panneau pour ne rien gagner en
        lisibilité. `gap-x-6` garde un couloir entre les deux même quand la valeur est longue.
      */}
      <dl className="flex flex-col gap-2 text-sm">
        {specs.map((spec) => (
          <div
            className="flex items-baseline justify-between gap-x-6"
            key={spec.label}
          >
            <dt className="shrink-0 text-muted-foreground">{spec.label}</dt>
            <dd className="min-w-0 text-right font-medium">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * La période, et le cas de l'œuvre qui n'est pas finie.
 *
 * `formatDateRange` rend la seule date de début quand la fin manque — ce qui est juste pour une
 * œuvre annulée ou sans date de fin connue, mais se lit comme une date de parution unique sur une
 * série qui paraît encore depuis 1989. « Depuis le » lève l'ambiguïté, et seulement là où le statut
 * la crée.
 */
function airingPeriod(
  media: Pick<MediaDetail, "startDate" | "endDate" | "status">,
): string | null {
  if (media.status === "RELEASING" && !media.endDate?.year) {
    const start = formatFuzzyDate(media.startDate);
    if (!start) return null;

    /*
      L'article ne va qu'avec un jour : « depuis le 25 août 1989 », mais « depuis août 1989 » et
      « depuis 1989 ». La date d'AniList est floue — les trois formes existent —, donc c'est la
      présence du jour qui décide, pas la mise en forme.
    */
    return `Depuis ${media.startDate?.day ? "le " : ""}${start}`;
  }

  return formatDateRange(media.startDate, media.endDate);
}
