import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { getShowcase } from "@/features/media/server/showcase.queries";

const SHOWN = 6;

/** La rangée « en ce moment » : les six premières tendances d'AniList, comme les affiches de Letterboxd. */
export async function LandingCovers() {
  const { covers } = await getShowcase();
  if (covers.length < SHOWN) return null;

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
      {covers.slice(0, SHOWN).map((cover) => (
        <li
          className="relative aspect-2/3 overflow-hidden rounded-md bg-muted ring-1 ring-border ring-inset"
          key={cover.id}
        >
          <Image
            alt={cover.title}
            className="object-cover"
            fill
            sizes="(min-width: 640px) 16vw, 33vw"
            src={cover.src}
          />
        </li>
      ))}
    </ul>
  );
}

/** Le squelette de la rangée, à sa taille exacte : six jaquettes 2:3. */
export function LandingCoversSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
      {Array.from({ length: SHOWN }, (_, index) => `jaquette-${index}`).map(
        (key) => (
          <Skeleton className="aspect-2/3 rounded-md" key={key} />
        ),
      )}
    </div>
  );
}
