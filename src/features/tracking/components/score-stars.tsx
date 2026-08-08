"use client";

import { XIcon } from "lucide-react";
import { Rating, RatingButton } from "@/components/kibo-ui/rating";
import { Button } from "@/components/ui/button";
import {
  SCORE_POINTS_PER_STAR,
  SCORE_STARS,
  scoreToStars,
} from "@/features/tracking/lib/entry-format";

/**
 * Note en étoiles — l'adaptateur entre le domaine et le composant.
 *
 * Le `Rating` de kibo-ui compte en **étoiles** (1 à 5) ; le suivi stocke une note **sur 0–100**
 * quelle que soit l'échelle affichée (docs/PRODUCT.md §4.2). La conversion vit donc ici, en un
 * seul endroit, plutôt que d'être refaite à chaque appelant.
 *
 * **Cinq étoiles pleines, pas de demies** : dix demi-étoiles feraient ~20 px de large chacune, sous
 * le minimum tactile, pour une précision que personne ne vise au doigt. Une étoile vaut 20 points.
 * Une valeur qui ne tombe pas sur un multiple de 20 — un import AniList noté 85 — s'affiche
 * arrondie **et** en chiffres à côté : on ne fait pas disparaître une précision qu'on ne sait pas
 * dessiner.
 *
 * Ce qu'on gagne à déléguer le rendu : navigation aux flèches avec un seul arrêt de tabulation,
 * `role="radiogroup"`, et l'aperçu au survol — trois choses que la version maison n'avait pas.
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

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Rating
        aria-label="Ma note"
        onValueChange={(next) => onChange(next * SCORE_POINTS_PER_STAR)}
        readOnly={disabled}
        value={stars}
      >
        {Array.from({ length: SCORE_STARS }, (_, index) => (
          <RatingButton
            /**
             * Une seule teinte pour toutes les étoiles : le composant distingue l'état par le
             * remplissage (`fill-current`), pas par la couleur. Deux couleurs casseraient l'aperçu
             * au survol, qui remplit sans repeindre.
             */
            className="text-amber-400"
            key={`etoile-${index + 1}`}
            // Sans ce libellé, le bouton n'a qu'une icône `aria-hidden` — donc pas de nom du tout.
            label={`Noter ${index + 1} sur ${SCORE_STARS}`}
            size={20}
          />
        ))}
      </Rating>

      {/*
        La valeur et son bouton d'effacement forment un bloc : s'ils passent à la ligne, ils y
        passent ensemble. Séparés, la croix se retrouvait seule sous les étoiles, orpheline.
        Le composant ne sait pas revenir à « pas de note » — recliquer la même étoile la garde —,
        d'où ce bouton, qui est le seul chemin vers `null`.
      */}
      {value !== null ? (
        <span className="ml-1 flex items-center gap-1">
          <span className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
            {value} / 100
          </span>
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
