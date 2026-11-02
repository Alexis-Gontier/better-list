import type { Metadata } from "next";
import { Suspense } from "react";

import { LandingFooter } from "@/app/(welcome)/welcome/_components/landing-footer";
import { LandingHero } from "@/app/(welcome)/welcome/_components/landing-hero";
import { LandingNotebook } from "@/app/(welcome)/welcome/_components/landing-notebook";
import { LandingSignIn } from "@/app/(welcome)/welcome/_components/landing-sign-in";
import { LandingTrace } from "@/app/(welcome)/welcome/_components/landing-trace";
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
 * **Aucune donnée de membre** : les fragments d'interface sont écrits en dur, avec des titres réels.
 * Seul le mur de jaquettes lit AniList, à la requête (D52) et dans sa propre frontière.
 */
export default function WelcomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LandingHero />
      <LandingTrace />
      <LandingNotebook />
      <Suspense fallback={null}>
        <LandingSignIn />
      </Suspense>
      <LandingFooter />
    </div>
  );
}
