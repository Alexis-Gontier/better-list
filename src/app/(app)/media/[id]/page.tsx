import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Fiche",
  description: "Une œuvre, son suivi, son journal et ses listes.",
};

/**
 * La fiche d'une œuvre — vidée par la mise à blanc totale du 5 septembre 2026.
 *
 * C'était le seul écran à servir la fiche depuis le miroir local quand AniList tombait, pour garder
 * le « +1 » utilisable un jour de panne. Ce repli est à re-poser à la reconstruction : il ne reste
 * de lui que `tryAniList` (`lib/http/anilist.ts`) et ses tests. Les documents GraphQL qui
 * alimentaient la fiche sont épargnés dans `features/media/server/media.documents.ts`.
 *
 * Le titre redevient statique : il était bâti sur `getMediaById`, supprimé avec les queries.
 */
export default function MediaPage() {
  return (
    <RouteUnderConstruction
      description="Une œuvre, son suivi, son journal et ses listes."
      title="Fiche d'une œuvre"
    />
  );
}
