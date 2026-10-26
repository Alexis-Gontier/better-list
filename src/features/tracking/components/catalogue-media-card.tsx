import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import type {
  Media,
  MediaCompact,
} from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import type { EntryState } from "@/features/tracking/lib/entry-transition";

/**
 * Une œuvre du catalogue : la pastille **seulement si elle est suivie**, comme sur `/search` — une
 * pastille neutre sur chaque carte ferait du marqueur un ornement.
 *
 * La bannière est facultative : les recommandations d'AniList arrivent en `MediaCompact`, qui n'en
 * a pas. La fenêtre d'édition rapide s'ouvre alors sans en-tête d'image, comme pour une œuvre qui
 * n'en a pas du tout.
 */
export function CatalogueMediaCard({
  media,
  entry,
  titleLanguage,
  details,
  footer,
  priority,
}: {
  media: MediaCompact & Partial<Pick<Media, "bannerImage">>;
  entry: EntryState | null;
  titleLanguage: TitleLanguage;
  details?: string[];
  footer?: React.ReactNode;
  priority?: boolean;
}) {
  const total = media.type === "ANIME" ? media.episodes : media.chapters;
  const unit = media.type === "ANIME" ? "episode" : "chapitre";

  return (
    <MediaCard
      action={
        <EntryQuickEdit
          banner={media.bannerImage ?? null}
          cover={media.coverImage?.large ?? null}
          compact
          entry={entry}
          mediaId={media.id}
          title={mediaTitle(media.title, titleLanguage)}
          total={total}
          unit={unit}
        />
      }
      details={details}
      footer={footer}
      marker={entry ? <EntryStatusDot status={entry.status} /> : undefined}
      media={media}
      priority={priority}
      titleLanguage={titleLanguage}
    />
  );
}
