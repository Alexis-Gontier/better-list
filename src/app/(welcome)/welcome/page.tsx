import type { Metadata } from "next";
import { Suspense } from "react";

import { LandingClose } from "@/app/(welcome)/welcome/_components/landing-close";
import { LandingDoors } from "@/app/(welcome)/welcome/_components/landing-doors";
import { LandingEpisode } from "@/app/(welcome)/welcome/_components/landing-episode";
import { LandingFooter } from "@/app/(welcome)/welcome/_components/landing-footer";
import { LandingNotebook } from "@/app/(welcome)/welcome/_components/landing-notebook";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: { absolute: "Better-List — le carnet privé de vos animes et mangas" },
  description:
    "Le carnet privé où une dizaine d'amis suivent leurs animes, mangas et webtoons, épisode par épisode.",
  alternates: { canonical: routes.home },
};

/**
 * La landing (spec refonte §5.2) : servie à `/` par `proxy.ts` à qui n'a pas de session.
 *
 * **Aucune donnée de membre, aucune requête AniList** : les fragments d'interface et leurs
 * jaquettes sont écrits en dur. Seule la fin de page lit un cookie, dans sa propre frontière.
 */
export default function WelcomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LandingDoors />
      <LandingEpisode />
      <LandingNotebook />
      <Suspense fallback={null}>
        <LandingClose />
      </Suspense>
      <LandingFooter />
    </div>
  );
}
