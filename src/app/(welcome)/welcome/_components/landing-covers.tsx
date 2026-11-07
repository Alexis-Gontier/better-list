import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { getShowcase } from "@/features/media/server/showcase.queries";

const SHOWN = 12;

/**
 * Le bandeau du catalogue, à la place des logos clients d'une landing SaaS : les douze premières
 * tendances d'AniList. En 390, il défile au doigt plutôt que de rapetisser.
 */
export async function LandingCovers() {
  const { covers } = await getShowcase();
  if (covers.length < SHOWN) return null;

  return (
    <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-12">
      {covers.slice(0, SHOWN).map((cover) => (
        <li
          className="relative aspect-2/3 w-20 shrink-0 snap-start overflow-hidden rounded-md bg-muted ring-1 ring-border ring-inset sm:w-auto"
          key={cover.id}
        >
          <Image
            alt={cover.title}
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 8vw, (min-width: 640px) 16vw, 80px"
            src={cover.src}
          />
        </li>
      ))}
    </ul>
  );
}

/** Le squelette du bandeau, à sa taille exacte : douze jaquettes 2:3. */
export function LandingCoversSkeleton() {
  return (
    <div className="-mx-4 flex gap-2.5 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-4 sm:px-0 lg:grid-cols-12">
      {Array.from({ length: SHOWN }, (_, index) => `jaquette-${index}`).map(
        (key) => (
          <Skeleton
            className="aspect-2/3 w-20 shrink-0 rounded-md sm:w-auto"
            key={key}
          />
        ),
      )}
    </div>
  );
}
