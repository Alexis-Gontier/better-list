/**
 * Le classement de « Recommandé pour vous » — **pur**, pour être testé sans AniList ni base.
 *
 * Chaque série en cours apporte ses recommandations, déjà rangées par AniList de la plus votée à la
 * moins votée. Une œuvre gagne des points à chaque liste où elle paraît, **d'autant plus qu'elle y
 * est haut placée** : la première d'une liste de vingt vaut un point, la dernière un vingtième.
 * Paraître dans trois listes bat donc presque toujours être premier d'une seule — c'est ce qui fait
 * de la rangée une recommandation pour *moi*, et pas celle d'une seule série.
 *
 * La série qui a apporté le plus de points à une œuvre est retenue comme **sa raison** : c'est elle
 * que la carte nomme.
 */

/** Une série en cours, et ce que la communauté recommande après elle. */
export type RecommendationSeed<Seed, Candidate extends { id: number }> = {
  seed: Seed;
  recommendations: Candidate[];
};

export type RankedRecommendation<Seed, Candidate> = {
  media: Candidate;
  /** La série qui a le plus pesé pour cette œuvre. */
  because: Seed;
};

export function rankRecommendations<Seed, Candidate extends { id: number }>(
  seeds: RecommendationSeed<Seed, Candidate>[],
  { exclude }: { exclude: ReadonlySet<number> },
): RankedRecommendation<Seed, Candidate>[] {
  const tally = new Map<
    number,
    { media: Candidate; score: number; because: Seed; best: number }
  >();

  for (const { seed, recommendations } of seeds) {
    const length = recommendations.length;

    recommendations.forEach((media, rank) => {
      if (exclude.has(media.id)) return;

      const points = (length - rank) / length;
      const current = tally.get(media.id);

      if (!current) {
        tally.set(media.id, {
          media,
          score: points,
          because: seed,
          best: points,
        });
        return;
      }

      current.score += points;
      if (points > current.best) {
        current.best = points;
        current.because = seed;
      }
    });
  }

  /*
    Le tri est stable : à score égal, l'ordre d'arrivée tient — celui des séries en cours, qui
    mènent avec ce qui vient de sortir. C'est le seul départage dont on ait besoin.
  */
  return [...tally.values()]
    .sort((first, second) => second.score - first.score)
    .map(({ media, because }) => ({ media, because }));
}
