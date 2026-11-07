import { formatMediaFormat } from "@/features/media/lib/media-format";
import type { Media } from "@/features/media/schemas/media.schema";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_UNIT_LABELS,
  formatEntryProgress,
} from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";

type SearchCardMedia = Pick<
  Media,
  "type" | "format" | "episodes" | "chapters" | "seasonYear" | "startDate"
>;

/**
 * La ligne sous le titre d'un résultat (D69) : où j'en suis sur une œuvre suivie, son format et son
 * année sinon. **Toujours une ligne** : `MediaCard` exige le même nombre de lignes sur toute la
 * grille, et l'espace insécable tient la hauteur quand il n'y a rien à dire.
 */
export function searchCardDetail(
  media: SearchCardMedia,
  entry: EntryState | null,
): string {
  if (entry) {
    const anime = media.type === "ANIME";
    const progress = formatEntryProgress(
      entry.progress,
      anime ? media.episodes : media.chapters,
    );
    const unit = ENTRY_UNIT_LABELS[anime ? "episode" : "chapitre"].short;
    const status = ENTRY_STATUS_LABELS[entry.status];
    return progress ? `${status} · ${unit} ${progress}` : status;
  }

  const year = media.seasonYear ?? media.startDate?.year ?? null;
  const parts = [formatMediaFormat(media.format), year?.toString() ?? null];
  return parts.filter(Boolean).join(" · ") || " ";
}
