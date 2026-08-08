import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { MediaGrid, MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaCard } from "@/features/media/components/media-card";
import { formatMediaFormat } from "@/features/media/lib/media-format";
import type { MediaBrowse } from "@/features/media/schemas/media.schema";

/**
 * Une rangée du catalogue éditorialisé : un titre, une grille, et parfois une porte de sortie.
 *
 * La section et son squelette vivent dans le **même fichier**, pour la raison qui a déjà fait
 * cohabiter `MediaGrid` et `MediaGridSkeleton` : c'est la seule façon de garantir qu'ils ne divergent
 * pas, et un squelette qui n'a pas la même hauteur que la section décale la page à chaque fin de
 * chargement.
 */

/** Une rangée vide ne s'affiche pas du tout — même règle que les sections du tableau de bord. */
export function BrowseSection({
  title,
  description,
  media,
  href,
}: {
  title: string;
  description: string;
  media: MediaBrowse[];
  /**
   * Vers la recherche préfiltrée, quand elle sait exprimer le même ensemble.
   *
   * Volontairement facultatif : la recherche n'a pas de paramètre de saison, donc les rangées
   * saisonnières n'ont pas de « Tout voir ». Un lien qui perdrait le filtre en chemin serait pire que
   * pas de lien — il enverrait sur une page qui ne montre pas ce qu'on a cliqué.
   */
  href?: string;
}) {
  if (media.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="space-y-0.5">
          <h2 className="font-semibold text-base">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        {href ? (
          <Link
            className="flex shrink-0 items-center gap-1 text-muted-foreground text-sm hover:text-foreground hover:underline"
            href={href}
          >
            Tout voir
            <ArrowRightIcon className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <MediaGrid>
        {media.map((item) => (
          <li key={item.id}>
            <MediaCard
              media={item}
              meta={[formatMediaFormat(item.format), item.seasonYear]
                .filter(Boolean)
                .join(" · ")}
            />
          </li>
        ))}
      </MediaGrid>
    </section>
  );
}

export function BrowseSectionSkeleton({ count }: { count: number }) {
  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <MediaGridSkeleton count={count} />
    </section>
  );
}
