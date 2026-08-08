import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import {
  formatCount,
  formatListStatus,
} from "@/features/media/lib/media-format";
import type {
  MediaDetail,
  ScoreDistribution,
  StatusDistribution,
} from "@/features/media/schemas/media.schema";

/**
 * Ce que la communauté AniList a fait de l'œuvre : comment elle l'a notée, et où elle en est.
 *
 * Deux graphes **monochromes**, et c'est un choix, pas un manque. Chacun ne porte qu'une seule
 * série : la hauteur (ou la longueur) est la donnée, la couleur n'encode rien. Colorer les six
 * statuts imposerait une palette catégorielle à valider en daltonisme pour ne rien dire de plus
 * que les libellés déjà écrits à côté.
 *
 * La teinte est `foreground` : elle se retourne toute seule entre thème clair et sombre et reste
 * contrastée sur les deux fonds, là où un accent fixe serait illisible sur l'un des deux.
 *
 * Les valeurs sont dans le texte accessible de chaque barre — le graphe est un confort de lecture
 * posé sur une liste, pas un contenu qui n'existerait qu'en pixels.
 */
export function MediaStats({ media }: { media: MediaDetail }) {
  const scores = (media.stats?.scoreDistribution ?? [])
    .filter((entry): entry is ScoreDistribution => entry !== null)
    .sort((a, b) => a.score - b.score);

  const statuses = (media.stats?.statusDistribution ?? [])
    .filter((entry): entry is StatusDistribution => entry !== null)
    .sort((a, b) => b.amount - a.amount);

  if (scores.length === 0 && statuses.length === 0) return null;

  const voters = scores.reduce((total, entry) => total + entry.amount, 0);
  const tallestScore = Math.max(...scores.map((entry) => entry.amount), 1);
  const followers = statuses.reduce((total, entry) => total + entry.amount, 0);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {scores.length > 0 ? (
        <MediaSection
          aside={`${formatCount(voters)} votes`}
          id="distribution-notes"
          title="Distribution des notes"
        >
          <div className="rounded-lg border p-3">
            <ol className="flex h-28 items-end gap-1">
              {scores.map((entry) => {
                const share = Math.round((entry.amount / voters) * 100);

                return (
                  <li
                    className="flex h-full flex-1 items-end"
                    key={entry.score}
                    /**
                     * Infobulle native : sur un graphe de dix barres servi par un Server
                     * Component, elle rend le même service qu'un survol scripté sans rien
                     * ajouter au bundle.
                     */
                    title={`${entry.score} % — ${formatCount(entry.amount)} votes (${share} %)`}
                  >
                    <div
                      className="w-full rounded-t-sm bg-foreground/70"
                      style={{
                        // 2 % de plancher : une note qu'une seule personne a mise reste visible.
                        height: `${Math.max((entry.amount / tallestScore) * 100, 2)}%`,
                      }}
                    >
                      <span className="sr-only">
                        {entry.score} % : {formatCount(entry.amount)} votes
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Axe réduit aux deux bornes : dix étiquettes ne tiendraient pas et n'aideraient pas. */}
            <div
              aria-hidden="true"
              className="mt-2 flex justify-between text-muted-foreground text-xs tabular-nums"
            >
              <span>{scores[0]?.score} %</span>
              <span>{scores.at(-1)?.score} %</span>
            </div>
          </div>
        </MediaSection>
      ) : null}

      {statuses.length > 0 ? (
        <MediaSection
          aside={`${formatCount(followers)} membres`}
          id="distribution-statuts"
          title="Où en est la communauté"
        >
          <dl className="space-y-2 rounded-lg border p-3">
            {statuses.map((entry) => {
              const share = Math.round((entry.amount / followers) * 100);

              return (
                <div className="space-y-1" key={entry.status}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <dt>{formatListStatus(entry.status)}</dt>
                    <dd className="text-muted-foreground tabular-nums">
                      {formatCount(entry.amount)}{" "}
                      <span className="text-xs">({share} %)</span>
                    </dd>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-foreground/70"
                      style={{ width: `${Math.max(share, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </dl>
        </MediaSection>
      ) : null}
    </div>
  );
}
