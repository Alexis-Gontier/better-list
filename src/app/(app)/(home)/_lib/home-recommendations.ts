/**
 * Le tirage de « Recommandé pour vous » — **pur**, pour être testé sans AniList ni base.
 *
 * **Le score.** Chaque série en cours apporte ses recommandations, déjà rangées par AniList de la
 * plus votée à la moins votée. Une œuvre gagne des points à chaque liste où elle paraît, d'autant
 * plus qu'elle y est haut placée : la première d'une liste de vingt vaut un point, la dernière un
 * vingtième. Paraître dans deux listes bat donc presque toujours être premier d'une seule.
 *
 * **Le tirage, et pas le classement** (demande d'Alexis, 28 septembre 2026). Trié par score, la
 * rangée était la même à chaque visite. Chaque œuvre reçoit donc une clé aléatoire pondérée par
 * son score — `random() ** (1 / score)`, le tirage sans remise d'Efraimidis et Spirakis — et la
 * rangée suit ces clés : les meilleures restent les plus probables en tête, sans y être assurées.
 *
 * **Une place par série d'abord.** Une série au catalogue mince — une douzaine de recommandations
 * peu votées, dont la moitié déjà lues — pouvait disparaître de la rangée alors qu'elle avait
 * encore de quoi proposer. Chaque série y réserve donc sa meilleure clé avant que le reste se
 * remplisse.
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

type Tallied<Seed, Candidate> = {
  media: Candidate;
  score: number;
  because: Seed;
  best: number;
  key: number;
};

export function drawRecommendations<Seed, Candidate extends { id: number }>(
  seeds: RecommendationSeed<Seed, Candidate>[],
  {
    exclude,
    count,
    random = Math.random,
  }: {
    exclude: ReadonlySet<number>;
    count: number;
    /** Injecté par les tests ; `Math.random` en vrai. */
    random?: () => number;
  },
): RankedRecommendation<Seed, Candidate>[] {
  const tally = new Map<number, Tallied<Seed, Candidate>>();

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
          key: 0,
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

  for (const item of tally.values()) {
    item.key = random() ** (1 / item.score);
  }

  /*
    Le tri est stable : à clé égale, l'ordre d'arrivée tient — celui des séries en cours, qui
    mènent avec ce qui vient de sortir.
  */
  const byKey = [...tally.values()].sort(
    (first, second) => second.key - first.key,
  );

  const picked = new Set<number>();
  for (const { recommendations } of seeds) {
    if (picked.size >= count) break;

    const ids = new Set(recommendations.map((media) => media.id));
    const first = byKey.find(
      (item) => ids.has(item.media.id) && !picked.has(item.media.id),
    );
    if (first) picked.add(first.media.id);
  }
  for (const item of byKey) {
    if (picked.size >= count) break;
    picked.add(item.media.id);
  }

  return byKey
    .filter((item) => picked.has(item.media.id))
    .map(({ media, because }) => ({ media, because }));
}
