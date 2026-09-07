import { MediaCard } from "@/features/media/components/media-card";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

type MediaRecommendationsProps = {
  /** Déjà filtrées par `relatedMedia` — voir `_lib/media-related.ts`. */
  items: MediaCompact[];
  titleLanguage: TitleLanguage;
};

/**
 * « Si tu as aimé ça » — les rapprochements votés par la communauté d'AniList.
 *
 * **Ce ne sont pas des suggestions calculées pour moi.** Le produit n'a aucune recommandation
 * personnelle et n'en promet aucune : ces douze titres sont ceux que d'autres lecteurs ont
 * rattachés à celui-ci, triés par le nombre de voix. C'est une porte de sortie utile en bas d'une
 * fiche, pas un moteur.
 *
 * Le `rating` d'AniList — le nombre de voix — n'est pas affiché : la requête trie déjà dessus
 * (`sort: [RATING_DESC]`), donc l'ordre porte l'information, et un chiffre sous chaque jaquette
 * ferait comparer des scores qui ne veulent rien dire hors contexte.
 */
export function MediaRecommendations({
  items,
  titleLanguage,
}: MediaRecommendationsProps) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Dans le même esprit</h2>

      <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <li key={item.id}>
            <MediaCard media={item} titleLanguage={titleLanguage} />
          </li>
        ))}
      </ul>
    </section>
  );
}
