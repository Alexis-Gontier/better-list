import { Heart } from "lucide-react";
import Image from "next/image";

import { BioSpoiler } from "@/features/people/components/bio-spoiler";

type PersonHeaderProps = {
  image: string | null;
  name: string | null;
  native: string | null;
  alternatives: (string | null)[];
  /** Les surnoms qui trahissent l'intrigue (« Joy Boy ») : masqués comme un spoiler de biographie. */
  spoilerAlternatives?: (string | null)[];
  favourites: number | null;
  /** Les faits et la biographie, rendus à droite du portrait sous le nom. */
  children?: React.ReactNode;
};

/**
 * L'en-tête d'une page Personnage ou Staff : portrait, nom, autres noms, favoris, puis ce que la
 * page y glisse. Deux appelants dès sa création, donc dans `features/people/components/`.
 */
export function PersonHeader({
  image,
  name,
  native,
  alternatives,
  spoilerAlternatives = [],
  favourites,
  children,
}: PersonHeaderProps) {
  const others = [native, ...alternatives].filter((value): value is string =>
    Boolean(value),
  );
  const hidden = spoilerAlternatives.filter((value): value is string =>
    Boolean(value),
  );

  return (
    <header className="flex flex-col gap-6 sm:flex-row">
      <div className="relative aspect-2/3 w-40 shrink-0 overflow-hidden rounded-md bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] sm:w-48">
        {image ? (
          <Image
            alt=""
            className="object-cover"
            fill
            priority
            sizes="192px"
            src={image}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-semibold text-2xl">{name ?? "Sans nom"}</h1>
            {others.length > 0 || hidden.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                {others.join(", ")}
                {hidden.length > 0 ? (
                  <>
                    {others.length > 0 ? ", " : null}
                    <BioSpoiler>{hidden.join(", ")}</BioSpoiler>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          {favourites ? (
            <p className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-sm tabular-nums">
              <Heart aria-hidden className="size-4" />
              {new Intl.NumberFormat("fr-FR").format(favourites)}
              <span className="sr-only">favoris sur AniList</span>
            </p>
          ) : null}
        </div>

        {children}
      </div>
    </header>
  );
}
