import type {
  MediaDetail,
  MediaRanking,
  StatusDistribution,
} from "@/features/media/schemas/media.schema";

export type CommunityStats = {
  scores: { stars: number; count: number }[];
  statuses: StatusDistribution[];
  rankings: MediaRanking[];
};

/** Trois classements : au-delà, la liste dit la même chose avec des rangs moins flatteurs. */
const RANKINGS_SHOWN = 3;

/**
 * Les chiffres de la communauté AniList, prêts à afficher (D70). Tout vient de la requête de fiche :
 * ce bloc ne coûte aucune requête. `null` quand il n'y a rien, ce qui est le cas d'une fiche servie
 * par le miroir local.
 */
export function communityStats(
  media: Pick<MediaDetail, "stats" | "rankings">,
): CommunityStats | null {
  // Le palier AniList est sur 100 (10, 20… 100) ; l'app note en étoiles, par demies.
  const scores = (media.stats?.scoreDistribution ?? [])
    .flatMap((bar) => (bar ? [bar] : []))
    .toSorted((a, b) => a.score - b.score)
    .map((bar) => ({ stars: bar.score / 20, count: bar.amount }));

  const statuses = (media.stats?.statusDistribution ?? [])
    .flatMap((status) => (status ? [status] : []))
    .toSorted((a, b) => b.amount - a.amount);

  const rankings = media.rankings
    .toSorted(
      (a, b) => a.rank - b.rank || Number(b.allTime) - Number(a.allTime),
    )
    .slice(0, RANKINGS_SHOWN);

  if (scores.length + statuses.length + rankings.length === 0) return null;
  return { scores, statuses, rankings };
}
