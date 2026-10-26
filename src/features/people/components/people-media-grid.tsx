import {
  CatalogueGrid,
  WIDEST_COLUMN_COUNT,
} from "@/components/shared/catalogue-grid";
import type { PeopleMedia } from "@/features/people/schemas/people.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { CatalogueMediaCard } from "@/features/tracking/components/catalogue-media-card";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";

/**
 * La grille d'œuvres d'une personne : la carte du catalogue, **avec la pastille de suivi et la
 * fenêtre d'édition** comme sur `/search` — une œuvre a la même apparence et le même geste partout. Sous
 * chaque carte, ce que la page y pose (le doubleur, le personnage, le rôle).
 *
 * Les entrées de suivi sont lues ici, en une requête pour la grille, sur l'index
 * `[userId, mediaId]` — rien ne pèse sur le quota AniList.
 *
 * `banner={null}` : la bannière n'est pas dans `MediaCompactFields`, et la fenêtre d'édition sait
 * s'en passer.
 */
export async function PeopleMediaGrid({
  items,
  titleLanguage,
  priority = false,
}: {
  items: { media: PeopleMedia; footer: React.ReactNode }[];
  titleLanguage: TitleLanguage;
  /** Vrai pour la première grille de la page seulement : c'est elle qui porte le LCP. */
  priority?: boolean;
}) {
  const entries = await getLibraryEntriesFor(
    items.map((item) => item.media.id),
  );

  return (
    <CatalogueGrid>
      {items.map(({ media, footer }, index) => (
        <CatalogueMediaCard
          entry={entries.get(media.id) ?? null}
          footer={footer}
          key={media.id}
          media={media}
          priority={priority && index < WIDEST_COLUMN_COUNT}
          titleLanguage={titleLanguage}
        />
      ))}
    </CatalogueGrid>
  );
}
