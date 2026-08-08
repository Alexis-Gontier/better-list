import { Badge } from "@/components/ui/badge";
import { formatMediaStatus } from "@/features/media/lib/media-format";
import type { MediaStatus } from "@/features/media/schemas/media.schema";

/**
 * Statut de diffusion, avec une pastille de couleur.
 *
 * La couleur **double** le libellé, elle ne le remplace pas : « En cours » reste écrit en toutes
 * lettres. Un statut porté par la seule couleur serait invisible pour un daltonien comme pour un
 * lecteur d'écran — c'est le cas d'école de l'information-couleur.
 */
const STATUS_DOT: Record<MediaStatus, string> = {
  RELEASING: "bg-emerald-500",
  NOT_YET_RELEASED: "bg-sky-500",
  FINISHED: "bg-muted-foreground",
  HIATUS: "bg-amber-500",
  CANCELLED: "bg-destructive",
};

export function MediaStatusBadge({ status }: { status: MediaStatus | null }) {
  const label = formatMediaStatus(status);
  if (!status || !label) return null;

  return (
    <Badge className="gap-1.5" variant="outline">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${STATUS_DOT[status]}`}
      />
      {label}
    </Badge>
  );
}
