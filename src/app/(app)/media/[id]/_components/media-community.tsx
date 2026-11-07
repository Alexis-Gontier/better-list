import type { CommunityStats } from "@/app/(app)/media/[id]/_lib/media-community";
import { ScoreDistributionChart } from "@/components/shared/score-distribution-chart";
import {
  formatCount,
  formatListStatus,
  formatRanking,
} from "@/features/media/lib/media-format";

/**
 * Les chiffres de la communauté AniList (D70) : notes, statuts, classements. Tout vient de la
 * requête de fiche ; le bloc ne coûte aucune requête.
 */
export function MediaCommunity({ stats }: { stats: CommunityStats }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl">Communauté</h2>

      {stats.rankings.length > 0 ? (
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {stats.rankings.map((ranking) => {
            const { label, scope } = formatRanking(ranking);
            return (
              <li
                className="flex flex-col"
                key={`${ranking.type}-${ranking.rank}-${scope}`}
              >
                <span className="text-sm">{label}</span>
                {scope ? (
                  <span className="text-muted-foreground text-xs">{scope}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* `min-w-0` sur les colonnes : sans lui, le graphe de Recharts garde sa largeur et pousse
          la colonne hors de l'écran en 390. */}
      <div className="grid gap-6 lg:grid-cols-2">
        {stats.scores.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="font-heading text-muted-foreground text-xs uppercase tracking-wide">
              Notes
            </h3>
            <ScoreDistributionChart
              data={stats.scores}
              label="Membres AniList"
            />
          </div>
        ) : null}

        {stats.statuses.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="font-heading text-muted-foreground text-xs uppercase tracking-wide">
              Statuts
            </h3>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 gap-y-1.5 text-sm">
              {stats.statuses.map((status) => (
                <div
                  className="flex items-baseline justify-between gap-3"
                  key={status.status}
                >
                  <dt className="text-muted-foreground">
                    {formatListStatus(status.status)}
                  </dt>
                  <dd className="tabular-nums">{formatCount(status.amount)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}
