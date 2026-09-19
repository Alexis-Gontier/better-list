import Image from "next/image";
import Link from "next/link";
import { EditionMenu } from "@/app/(app)/collection/[mediaId]/_components/edition-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { ShelfStatusLine } from "@/features/collection/components/shelf-status-line";
import type { ShelfSeries } from "@/features/collection/server/collection.queries";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * La tête d'une série de l'étagère : la jaquette, le titre, le compte, et ce qui manque.
 *
 * **L'édition est muette** — décision du 19 septembre 2026, après avoir vu les deux à l'écran.
 * PRODUCT.md §4.5 veut qu'on n'ait rien à remplir dans le cas courant, et l'écran va jusqu'au
 * bout : tant qu'il n'y a qu'une édition, il n'en écrit pas le nom. « Ki-oon · Édition simple ·
 * 30 tomes » sous chaque titre était une ligne vraie et inutile — dans un cercle de quatre
 * comptes, presque personne n'a deux éditions d'une même série.
 *
 * Ce qui reste, c'est **la porte** (`edition-menu.tsx`), parce que « ne rien dire » ne peut pas
 * vouloir dire « ne rien offrir ». Le jour où une deuxième édition existe, un sélecteur prendra la
 * place du silence — ce cas n'a pas d'écran (docs/STATE.md).
 *
 * Composant **serveur** ; seul le menu est un îlot.
 */
export function SeriesHeader({
  series,
  titleLanguage,
}: {
  series: ShelfSeries;
  titleLanguage: TitleLanguage;
}) {
  const title = mediaTitle(series.media.title, titleLanguage);
  const cover = series.media.coverImage?.extraLarge ?? null;

  return (
    <div className="flex gap-5">
      {/*
        `self-start` pour la même raison que sur les rangées de `/collection` : sans lui,
        l'étirement du flex écrase la hauteur calculée par `aspect-2/3`.
      */}
      <div className="relative aspect-2/3 w-24 shrink-0 self-start overflow-hidden rounded-md bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
        {cover ? (
          /*
            `priority` : c'est la plus grande image de la page, donc sa mesure de LCP. La différer
            — ce que `next/image` fait par défaut — retarde le seul instant que cette métrique
            regarde, et Next le signale en clair dans la console.
          */
          <Image
            alt=""
            className="object-cover"
            fill
            priority
            sizes="96px"
            src={cover}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h1 className="text-2xl">{title}</h1>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground tabular-nums">
              {series.edition.volumesTotal === null
                ? `${series.ownedCount} tomes`
                : `${series.ownedCount} / ${series.edition.volumesTotal}`}
            </span>
            {series.isComplete && series.extra.length === 0 ? (
              <Badge variant="secondary">
                {series.isReleasing ? "À jour" : "Complète"}
              </Badge>
            ) : null}
            <EditionMenu
              mediaId={series.media.id}
              volumesTotal={series.edition.volumesTotal}
            />
          </div>
        </div>

        <ShelfStatusLine
          className="text-sm"
          extra={series.extra}
          isComplete={series.isComplete}
          isReleasing={series.isReleasing}
          lastOwned={series.lastOwned}
          missing={series.missing}
          ownedCount={series.ownedCount}
          volumesTotal={series.edition.volumesTotal}
        />

        <div>
          {/*
            Le lien vers la fiche, pas une duplication de la fiche. `/collection/[mediaId]` parle
            de mon étagère ; le synopsis, les personnages et le suivi de lecture sont là-bas.
          */}
          <Button asChild size="sm" variant="outline">
            <Link href={routes.media(series.media.id)}>Voir la fiche</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
