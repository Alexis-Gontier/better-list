"use client";

import { StepButton } from "@/components/shared/step-button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Rating, RatingButton } from "@/components/ui/rating";
import {
  SCORE_STAR_STEP,
  SCORE_STARS,
  scoreToStars,
  starsToScore,
} from "@/features/tracking/lib/entry-format";

/**
 * Ma note : cinq étoiles par demies, encadrées de deux crans.
 *
 * **Le composant parle en points, pas en étoiles.** Il reçoit et renvoie le score tel qu'il est
 * stocké — un entier de 0 à 100, l'échelle d'AniList (docs/conception.md §4.2) — et convertit
 * lui-même avec `scoreToStars` / `starsToScore`, qui sont testées. C'est ce qui évite que chaque
 * appelant refasse la conversion, et que l'un d'eux la refasse mal.
 *
 * Les deux crans servent la précision : viser une demi-étoile sur une cible de seize pixels est un
 * geste d'orfèvre, alors qu'un cran à la fois ne demande rien.
 *
 * **Effacer une note n'est pas ici**, et ce n'est pas un oubli : `null` — « pas encore noté » — et
 * zéro — « noté zéro », qui est un jugement — sont deux choses distinctes en base, et les
 * distinguer demande un geste à part. Il viendra avec les Server Actions.
 */

/**
 * Les cinq étoiles, par leur rang et non par leur index : c'est le rang qui nomme le cran pour un
 * lecteur d'écran (« 3 étoiles »), et une clé de rendu tirée d'une position se périme au premier
 * réordonnancement.
 */
const STAR_RANKS = Array.from({ length: SCORE_STARS }, (_, index) => index + 1);

type EntryScoreRatingProps = {
  /** Le score stocké, sur 0–100. `null` quand l'œuvre n'est pas notée. */
  score: number | null;
  onScoreChange: (score: number) => void;
  /**
   * La largeur du groupe. Même raison que sur ses deux voisins — une rangée veut la largeur
   * naturelle, une colonne de grille veut `w-full`. Ce sont les **étoiles** qui absorbent la place
   * en plus (`flex-1` sur leur segment), jamais les crans : un cran plus large ne se vise pas
   * mieux, il déséquilibre juste le groupe.
   */
  className?: string;
};

export function EntryScoreRating({
  score,
  onScoreChange,
  className,
}: EntryScoreRatingProps) {
  const stars = scoreToStars(score ?? 0);

  return (
    <ButtonGroup className={className}>
      <StepButton
        direction="decrement"
        disabled={stars <= 0}
        label="Baisser la note d'une demi-étoile"
        onClick={() => onScoreChange(starsToScore(stars - SCORE_STAR_STEP))}
      />

      {/*
        `ButtonGroupText` arrive en `bg-muted`, une couleur qui ne vaut ni celle des boutons ni celle
        d'un champ : au milieu du groupe, le segment des étoiles se détachait comme s'il n'était pas
        du même objet. On reprend donc l'expression exacte que portent le bouton `outline` et
        l'`InputGroup` — les deux modes compris, sans quoi le clair et le sombre ne seraient pas
        d'accord.
      */}
      <ButtonGroupText className="flex-1 justify-center bg-background dark:bg-input/30">
        <Rating
          aria-label="Ma note"
          onValueChange={(next) => onScoreChange(starsToScore(next))}
          step={SCORE_STAR_STEP}
          value={stars}
        >
          {STAR_RANKS.map((rank) => (
            <RatingButton
              key={rank}
              label={`${rank} étoile${rank > 1 ? "s" : ""}`}
              size={16}
            />
          ))}
        </Rating>
      </ButtonGroupText>

      <StepButton
        direction="increment"
        disabled={stars >= SCORE_STARS}
        label="Monter la note d'une demi-étoile"
        onClick={() => onScoreChange(starsToScore(stars + SCORE_STAR_STEP))}
      />
    </ButtonGroup>
  );
}
