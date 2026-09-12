import { mediaCredit } from "@/app/(app)/media/[id]/_lib/media-credits";
import {
  formatAiringDate,
  formatCount,
  formatCountdown,
  formatMediaFormat,
  formatMediaStatus,
  formatSeason,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaFactsProps = {
  media: MediaDetail;
};

/** Une colonne de la ligne. `hint` passe à l'infobulle native, quand il y a plus à en dire. */
type Fact = { label: string; value: string; hint?: string };

/**
 * Le prochain épisode : lequel, et dans combien de temps.
 *
 * **Le décompte est recalculé depuis `airingAt`, pas lu dans `timeUntilAiring`.** Ce dernier est
 * figé à l'instant de la lecture AniList, or celle-ci est cachée un jour (`cacheLife`) : « dans
 * 3 j » pourrait donc se tromper d'une journée entière. `airingAt` est un horodatage absolu — il ne
 * périme pas, et la soustraction se fait au rendu.
 *
 * Si le décompte est passé — l'épisode est sorti depuis la dernière lecture AniList —, on garde le
 * numéro et on laisse tomber le « dans … » : annoncer un épisode à venir déjà diffusé serait faux,
 * mais dire quel épisode arrive reste juste.
 */
function nextAiring(airing: MediaDetail["nextAiringEpisode"]): Fact | null {
  if (!airing) return null;

  const countdown = formatCountdown(
    airing.airingAt - Math.floor(Date.now() / 1000),
  );

  return {
    label: "Prochain ép.",
    value: countdown
      ? `Ép. ${airing.episode} · dans ${countdown}`
      : `Ép. ${airing.episode}`,
    hint: formatAiringDate(airing.airingAt),
  };
}

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
 *
 * **La diffusion est une colonne, pas une section** (décision d'Alexis du 11 septembre 2026) : le
 * prochain épisode tient en une ligne, et c'est une information qu'on veut avant le premier
 * défilement. Une section à elle seule aurait cassé le rythme de la page pour six mots.
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
    nextAiring(media.nextAiringEpisode),
  ].filter(
    // Le prédicat est explicite : sans lui, `value` resterait `string | null` pour le rendu.
    (fact): fact is Fact => fact !== null && fact.value !== null,
  );

  if (facts.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-4">
      {facts.map((fact) => (
        <div className="min-w-0" key={fact.label}>
          <dt className="text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {fact.label}
          </dt>
          {/*
            L'infobulle native plutôt qu'un `Tooltip` : elle ne coûte pas un composant client dans
            un hero qui est entièrement serveur, et la date absolue est un complément — personne ne
            doit avoir à la chercher pour comprendre la ligne.
          */}
          <dd className="mt-1 truncate text-sm font-medium" title={fact.hint}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
