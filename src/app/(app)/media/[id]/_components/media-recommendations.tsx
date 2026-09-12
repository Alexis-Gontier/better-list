import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { MediaCard } from "@/features/media/components/media-card";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

type MediaRecommendationsProps = {
  /**
   * Les œuvres à recommander, **déjà filtrées**.
   *
   * Le composant reçoit une liste plutôt que la fiche entière depuis que les onglets ont leurs
   * propres lectures : ses deux appelants ne partent pas de la même donnée — l'aperçu prend
   * l'échantillon de la requête de fiche, l'onglet prend sa lecture dédiée. Leur faire passer par
   * une fiche complète aurait obligé la lecture dédiée à en fabriquer une fausse.
   */
  recommendations: MediaCompact[];
  titleLanguage: TitleLanguage;
  /** L'onglet où la liste se lit en entier. Absent quand on y est déjà. */
  href?: string;
};

/**
 * « Si tu as aimé celle-ci » — les œuvres proches, les mieux recommandées par la communauté.
 *
 * **Dernier bloc, et c'est sa place** : c'est la porte de sortie. Tout ce qui précède parle de
 * l'œuvre qu'on regarde ; celui-ci propose d'en regarder une autre, donc il vient après que la
 * question posée a reçu sa réponse.
 *
 * Il réutilise `MediaCard` **telle quelle**, sans slot ni variante. C'est exactement son emploi —
 * une jaquette, un titre, un lien vers une fiche —, et c'est ce qui fait rimer la fiche avec
 * `/search` et `/library` : trois écrans, une seule carte.
 *
 * Les deux requêtes trient `[RATING_DESC]` : les premières sont celles que la communauté recommande
 * le plus, aucun tri à refaire ici.
 */
export function MediaRecommendations({
  recommendations,
  titleLanguage,
  href,
}: MediaRecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <MediaSection href={href} title="À voir ensuite">
      {/*
        Les mêmes gouttières resserrées que la grille du catalogue
        (`components/shared/catalogue-grid.tsx`), et le même écart vertical plus grand que
        l'horizontal : c'est lui qui sépare le titre d'une carte de la jaquette d'en dessous, donc le
        seul des deux qui ait un texte à protéger.
      */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-7">
        {recommendations.map((recommended) => (
          <MediaCard
            key={recommended.id}
            media={recommended}
            titleLanguage={titleLanguage}
          />
        ))}
      </div>
    </MediaSection>
  );
}
