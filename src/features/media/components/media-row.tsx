import { StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Une œuvre en une ligne — le pendant dense de `MediaCard`.
 *
 * Elle existe parce qu'une grille de jaquettes et une liste ne répondent pas à la même question.
 * Parcourir un catalogue est un geste visuel : la jaquette est le meilleur index. Retrouver une
 * œuvre dans plusieurs centaines de suivis ne l'est pas — on connaît déjà le titre, et ce qu'on
 * veut comparer d'une entrée à l'autre (progression, note, statut) doit tomber dans la même
 * colonne pour se lire d'un balayage vertical.
 *
 * Elle partage donc les propriétés de `MediaCard` — même `MediaCompact`, mêmes chaînes déjà
 * formatées — et n'ajoute rien : les deux vues montrent les mêmes données, rangées autrement. Une
 * information qui n'existerait que dans l'une des deux ferait de la bascule un piège.
 *
 * Comme la carte, elle lit la préférence de titre elle-même ; `getPreferences` porte le `cache` de
 * React, donc une page entière ne coûte qu'une requête.
 */
export async function MediaRow({
  media,
  meta,
  genres,
  progress,
  score,
  action,
}: {
  media: MediaCompact;
  meta?: string | null;
  genres?: string[];
  /** `label` est déjà formaté par l'appelant — « 12 / 24 » ici, « 12 » quand le total est inconnu. */
  progress?: { value: number; total: number | null; label: string | null };
  /**
   * **Ma** note, déjà mise à l'échelle du compte — pas `media.averageScore`, qui est celle de la
   * communauté. Elle prend la place de cette dernière dans la colonne de droite, comme sur la
   * vignette : c'est la même règle, et les deux vues doivent montrer la même chose.
   */
  score?: string | null;
  action?: ReactNode;
}) {
  const { titleLanguage } = await getPreferences();
  const title = mediaTitle(media.title, titleLanguage);

  /**
   * La colonne de progression exige **le libellé autant que la fraction**.
   *
   * `formatEntryProgress` rend `null` à zéro (une œuvre seulement prévue), et la barre seule
   * dessinait alors une piste vide surmontée de rien : un gabarit qui a l'air cassé là où
   * l'information réelle est « pas commencé », déjà dite par le statut en ligne de méta.
   */
  const ratio =
    progress?.label && progress.total && progress.total > 0
      ? Math.min(progress.value / progress.total, 1)
      : null;

  return (
    // Même montage que la carte : le bouton est frère du lien et non son descendant, pour que le
    // clic sur « +1 » n'ouvre pas la fiche et que les deux commandes s'annoncent séparément.
    <li className="group relative">
      <Link
        className="flex items-center gap-3 p-2.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
        href={routes.media(media.id)}
      >
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
          {media.coverImage?.medium ? (
            <Image
              alt=""
              className="object-cover"
              fill
              // 44 px de large, en dur : cette vignette-là ne change pas de taille avec le viewport.
              sizes="44px"
              src={media.coverImage.medium}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm group-hover:text-primary">
            {title}
          </p>

          {/*
            Méta et genres sur la même ligne, séparés par un point médian : à cette densité, une
            troisième ligne par entrée double la hauteur de la liste et lui retire sa raison d'être.
            Les genres sont tronqués avec elle — ils sont le premier contenu sacrifiable.
          */}
          <p className="truncate text-muted-foreground text-xs">
            {[meta, genres?.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
          </p>

          {media.isAdult ? (
            <span className="mt-1 inline-block rounded-sm bg-destructive/10 px-1 py-px font-semibold text-[10px] text-destructive">
              18+
            </span>
          ) : null}
        </div>

        {/*
          Les deux colonnes de droite disparaissent sous `sm`, et rien n'est perdu : la progression
          est déjà dans la ligne de méta que l'appelant compose, et la note reste sur la fiche. Les
          masquer vaut mieux que d'écraser le titre, qui est ce qu'on cherche.
        */}
        {ratio !== null ? (
          <div className="hidden w-28 shrink-0 sm:block">
            <p className="mb-1 text-right text-muted-foreground text-xs tabular-nums">
              {progress?.label}
            </p>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {score ? (
          <span className="hidden shrink-0 items-center gap-1 font-medium text-foreground text-xs tabular-nums sm:flex">
            <StarIcon
              aria-hidden="true"
              className="size-3 fill-primary text-primary"
            />
            <span className="sr-only">Ma note : </span>
            {score}
          </span>
        ) : media.averageScore ? (
          <span className="hidden shrink-0 items-center gap-1 font-medium text-muted-foreground text-xs tabular-nums sm:flex">
            <StarIcon
              aria-hidden="true"
              className="size-3 fill-amber-500 text-amber-500"
            />
            <span className="sr-only">Note moyenne : </span>
            {media.averageScore}
          </span>
        ) : null}

        {/*
          Réserve la place des commandes, positionnées en absolu au-dessus. Elles vont par deux
          depuis que la fenêtre d'édition accompagne le « +1 » — d'où une largeur qui les couvre
          toutes les deux, gouttière comprise.
        */}
        {action ? <span aria-hidden="true" className="w-16 shrink-0" /> : null}
      </Link>

      {action ? (
        <div className="-translate-y-1/2 absolute top-1/2 right-2.5">
          {action}
        </div>
      ) : null}
    </li>
  );
}
