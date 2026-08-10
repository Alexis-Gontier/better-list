"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Rating, RatingButton } from "@/components/ui/rating";
import {
  exactScoreIfRounded,
  formatStars,
  SCORE_STAR_STEP,
  SCORE_STARS,
  scoreToStars,
  starsToScore,
} from "@/features/tracking/lib/entry-format";

/**
 * Note en étoiles — l'adaptateur entre le domaine et le composant.
 *
 * Le `Rating` de `components/ui` compte en **étoiles** (0,5 à 5) ; le suivi stocke une note **sur
 * 0–100** quelle que soit l'échelle affichée (docs/PRODUCT.md §4.2). La conversion vit donc ici, en
 * un seul endroit, plutôt que d'être refaite à chaque appelant.
 *
 * **Cinq étoiles, par demies** : dix notes possibles, ce qui est le minimum pour que « bien » et
 * « très bien » ne tombent pas sur le même cran. Une demi-étoile vaut dix points, une pleine vingt.
 * Une valeur qui ne tombe sur aucun des deux — un import AniList noté 85 — s'affiche arrondie **et**
 * en chiffres à côté : on ne fait pas disparaître une précision qu'on ne sait pas dessiner.
 *
 * Le geste reste visé à l'étoile et non au demi-pixel : chaque étoile porte deux zones de clic de
 * ~10 px de large sur 20 de haut, et le clavier parcourt les mêmes crans à la flèche.
 *
 * L'échelle vit dans `lib/entry-format.ts` : la timeline, qui est un Server Component, affiche les
 * mêmes notes et ne peut rien importer d'un fichier `"use client"`.
 */

export function ScoreStars({
  value,
  onChange,
  disabled,
}: {
  /** Note sur 0–100, ou `null` quand l'œuvre n'est pas notée. */
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
}) {
  const stars = value === null ? 0 : scoreToStars(value);
  const exact = value === null ? null : exactScoreIfRounded(value);

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Rating
        aria-label="Ma note"
        onValueChange={(next) => onChange(starsToScore(next))}
        readOnly={disabled}
        step={SCORE_STAR_STEP}
        value={stars}
      >
        {Array.from({ length: SCORE_STARS }, (_, index) => (
          <RatingButton
            /**
             * Une seule teinte pour toutes les étoiles : le composant distingue l'état par le
             * remplissage, pas par la couleur. Deux couleurs casseraient l'aperçu au survol, qui
             * remplit sans repeindre — et la coupe d'une demie ne se verrait plus.
             *
             * `foreground` et non un blanc en dur : c'est bien blanc sur le thème sombre, et ça
             * reste lisible sur le thème clair, où des étoiles blanches disparaîtraient. L'ambre
             * est resté à la moyenne AniList, sur les vignettes — deux sources de note, deux
             * teintes.
             */
            className="text-foreground"
            halfLabel={`Noter ${formatStars(index + SCORE_STAR_STEP)} sur ${SCORE_STARS}`}
            key={`etoile-${index + 1}`}
            // Sans ce libellé, le bouton n'a qu'une icône `aria-hidden` — donc pas de nom du tout.
            label={`Noter ${index + 1} sur ${SCORE_STARS}`}
            size={20}
          />
        ))}
      </Rating>

      {/*
        La valeur exacte n'apparaît **que si les étoiles la perdent** — une note importée d'AniList
        à 85, qui ne tombe sur aucun demi-cran. Elle s'affichait auparavant en permanence, ce qui
        répétait en chiffres ce que cinq étoiles disent déjà, et débordait du champ dans lequel le
        formulaire les range désormais.

        La valeur et la croix forment un bloc : s'ils passent à la ligne, ils y passent ensemble.
        Séparés, la croix se retrouvait seule sous les étoiles, orpheline. Le composant ne sait pas
        revenir à « pas de note » — recliquer le même cran le garde —, d'où ce bouton, qui est le
        seul chemin vers `null`.
      */}
      {value !== null ? (
        <span className="flex items-center gap-1">
          {exact ? (
            <span className="ml-1 whitespace-nowrap text-muted-foreground text-xs tabular-nums">
              {exact}
            </span>
          ) : null}
          <Button
            aria-label="Retirer la note"
            className="size-7 text-muted-foreground"
            disabled={disabled}
            onClick={() => onChange(null)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-3.5" />
          </Button>
        </span>
      ) : null}
    </div>
  );
}
