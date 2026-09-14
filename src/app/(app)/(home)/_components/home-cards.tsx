import { StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";
import { ListCoverMosaic } from "@/features/lists/components/list-cover-mosaic";
import type { ListSummary } from "@/features/lists/server/lists.queries";
import {
  cleanDescription,
  formatMediaStatus,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type {
  Media,
  MediaCompact,
} from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { ENTRY_STATUS_LABELS } from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import { cn } from "@/lib/utils";

function coverOf(media: MediaCompact) {
  return media.coverImage?.extraLarge ?? media.coverImage?.large ?? null;
}

function formatScore(averageScore: number | null) {
  if (!averageScore) return null;
  return (averageScore / 20).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  });
}

/** Une pastille posée sur une image : fond presque opaque, capitales serrées. */
function ImageBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <Badge
      className={cn(
        "gap-1 font-semibold text-[10px] uppercase tabular-nums tracking-wide",
        tone === "neutral" && "bg-overlay text-foreground",
      )}
      variant={tone === "accent" ? "default" : "secondary"}
    >
      {children}
    </Badge>
  );
}

// --- À la une ------------------------------------------------------------------

/**
 * Ce que la une me dit d'une œuvre que **je suis déjà**.
 *
 * Le geste plutôt que l'état quand il y en a un à poser : « Reprendre à l'épisode 13 » se lit et
 * s'exécute, là où « En cours » demande de retrouver soi-même où l'on en était. Les autres statuts
 * n'ont pas de geste — on ne « reprend » pas une série terminée —, et rendent leur libellé.
 *
 * Le plafond n'est qu'un garde-fou d'affichage : une progression déjà au bout, sur une série que le
 * miroir croit plus courte qu'elle n'est, ne doit pas proposer un épisode qui n'existe pas.
 */
function spotlightTracking(entry: EntryState, episodes: number | null): string {
  const next = entry.progress + 1;
  const resumable =
    entry.status === "CURRENT" ||
    entry.status === "REPEATING" ||
    entry.status === "PAUSED";

  if (!resumable || (episodes !== null && next > episodes)) {
    return ENTRY_STATUS_LABELS[entry.status];
  }

  return entry.progress === 0 ? "À commencer" : `Reprendre à l'épisode ${next}`;
}

/**
 * Une tendance à la une : l'image en fond, **le texte centré en bas**.
 *
 * **La hauteur est fixe**, ce qui empêche le carrousel de sauter d'une diapositive à l'autre.
 *
 * **Une œuvre que je suis parle de moi, pas d'elle** (décision d'Alexis du 14 septembre 2026) : sa
 * pastille et son geste prennent la place du synopsis — dont je n'ai plus besoin, je la regarde
 * déjà — et le statut de diffusion quitte la rangée de pastilles, où « En cours » aurait voisiné
 * avec « En cours » en disant tout autre chose : l'un est l'état de la série, l'autre le mien.
 */
export function FeaturedSpotlight({
  media,
  titleLanguage,
  priority,
  entry,
}: {
  media: Media;
  titleLanguage: TitleLanguage;
  priority?: boolean;
  /** Mon suivi de cette œuvre, ou `null` si elle n'est pas dans ma bibliothèque. */
  entry: EntryState | null;
}) {
  const background = media.bannerImage ?? coverOf(media);
  const synopsis = cleanDescription(media.description)[0];
  const score = formatScore(media.averageScore);
  const status = formatMediaStatus(media.status);

  return (
    <Link
      className="group relative isolate block h-72 overflow-hidden rounded-xl sm:h-96"
      href={routes.media(media.id)}
      prefetch={false}
    >
      {background ? (
        <Image
          alt=""
          className={cn(
            "-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none",
            !media.bannerImage && "scale-125 opacity-60 blur-2xl",
          )}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 70vw, 90vw"
          src={background}
        />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/40 to-transparent" />

      <div className="flex h-full flex-col items-center justify-end gap-2 px-6 pb-6 text-center sm:pb-8">
        <h3 className="line-clamp-2 max-w-2xl text-balance font-bold font-heading text-2xl sm:text-3xl">
          {mediaTitle(media.title, titleLanguage)}
        </h3>
        {entry ? (
          <p className="flex items-center gap-2 font-medium text-sm">
            <EntryStatusDot labelled status={entry.status} />
            {spotlightTracking(entry, media.episodes)}
          </p>
        ) : synopsis ? (
          <p className="line-clamp-2 max-w-xl text-pretty text-muted-foreground text-sm">
            {synopsis}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          {media.episodes ? (
            <ImageBadge>{media.episodes} épisodes</ImageBadge>
          ) : null}
          {status && !entry ? (
            <ImageBadge
              tone={media.status === "RELEASING" ? "accent" : "neutral"}
            >
              {status}
            </ImageBadge>
          ) : null}
          {score ? (
            <ImageBadge>
              <StarIcon className="fill-current" />
              {score}
            </ImageBadge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

// --- Listes -----------------------------------------------------------------------

/** Une liste : sa mosaïque, son nom, combien elle contient. */
export function ListTile({ list }: { list: ListSummary }) {
  return (
    <Link
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50"
      href={routes.lists.detail(list.id)}
    >
      <ListCoverMosaic covers={list.covers} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold text-sm">{list.title}</span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {list.itemCount} œuvres
        </span>
      </div>
    </Link>
  );
}
