import { MediaCard } from "@/features/media/components/media-card";
import {
  formatMediaFormat,
  formatMediaStatus,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * « Si tu as aimé ça » — les rapprochements votés par la communauté AniList.
 *
 * Le `rating` est un solde de votes pour et contre : il peut être négatif quand le rapprochement
 * est contesté. On écarte ces cas-là plutôt que d'afficher une recommandation dont les votants
 * disent eux-mêmes qu'elle est mauvaise.
 *
 * Le filtre adulte reprend la règle des relations : une œuvre 18+ ne s'invite pas depuis une fiche
 * tout public. La préférence est appliquée côté serveur (`getMediaById`), on ne fait ici que ne
 * pas ouvrir de porte dérobée par la recommandation.
 */
export function MediaRecommendations({ media }: { media: MediaDetail }) {
  const recommendations = media.recommendations.nodes
    .filter((node) => node.mediaRecommendation && (node.rating ?? 0) > 0)
    .filter((node) => !node.mediaRecommendation?.isAdult || media.isAdult);

  if (recommendations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune recommandation pour l'instant.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {recommendations.map((node) => {
        // Écarté par le filtre ci-dessus ; le garde est là pour le typage.
        if (!node.mediaRecommendation) return null;

        return (
          <li key={node.mediaRecommendation.id}>
            <MediaCard
              media={node.mediaRecommendation}
              meta={
                [
                  formatMediaFormat(node.mediaRecommendation.format),
                  formatMediaStatus(node.mediaRecommendation.status),
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
