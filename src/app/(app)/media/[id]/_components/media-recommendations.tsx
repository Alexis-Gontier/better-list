import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { CatalogueMediaCard } from "@/features/tracking/components/catalogue-media-card";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";

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
 * Il réutilise la carte du catalogue, **avec mon statut** depuis le 29 septembre 2026 (demande
 * d'Alexis) : pastille et fenêtre d'édition, comme sur `/search`, `/library` et l'accueil. Une recommandation
 * que je suis déjà doit se voir d'un coup d'œil — sans quoi on ouvre une fiche pour découvrir
 * qu'on l'a finie l'an dernier.
 *
 * Les deux requêtes trient `[RATING_DESC]` : les premières sont celles que la communauté recommande
 * le plus, aucun tri à refaire ici.
 */
export async function MediaRecommendations({
  recommendations,
  titleLanguage,
  href,
}: MediaRecommendationsProps) {
  if (recommendations.length === 0) return null;

  // Une requête Prisma pour la rangée, comme les œuvres liées au-dessus.
  const entries = await getLibraryEntriesFor(
    recommendations.map((recommended) => recommended.id),
  );

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
          <CatalogueMediaCard
            entry={entries.get(recommended.id) ?? null}
            key={recommended.id}
            media={recommended}
            titleLanguage={titleLanguage}
          />
        ))}
      </div>
    </MediaSection>
  );
}
