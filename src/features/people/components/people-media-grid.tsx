import {
  CatalogueGrid,
  WIDEST_COLUMN_COUNT,
} from "@/components/shared/catalogue-grid";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { PeopleMedia } from "@/features/people/schemas/people.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { EntryQuickActions } from "@/features/tracking/components/entry-quick-actions";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";

/**
 * La grille d'œuvres d'une personne : la carte du catalogue, **avec la pastille de suivi et le
 * « +1 »** comme sur `/search` — une œuvre a la même apparence et le même geste partout. Sous
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
      {items.map(({ media, footer }, index) => {
        const entry = entries.get(media.id) ?? null;
        const unit = media.type === "ANIME" ? "episode" : "chapitre";
        const total = media.type === "ANIME" ? media.episodes : media.chapters;

        return (
          <MediaCard
            action={
              <EntryQuickActions
                mediaId={media.id}
                progress={entry?.progress ?? 0}
                total={total}
                tracked={entry !== null}
                unit={unit}
              >
                <EntryQuickEdit
                  banner={null}
                  compact
                  entry={entry}
                  mediaId={media.id}
                  title={mediaTitle(media.title, titleLanguage)}
                  total={total}
                  unit={unit}
                />
              </EntryQuickActions>
            }
            footer={footer}
            key={media.id}
            marker={
              entry ? <EntryStatusDot status={entry.status} /> : undefined
            }
            media={media}
            priority={priority && index < WIDEST_COLUMN_COUNT}
            titleLanguage={titleLanguage}
          />
        );
      })}
    </CatalogueGrid>
  );
}
