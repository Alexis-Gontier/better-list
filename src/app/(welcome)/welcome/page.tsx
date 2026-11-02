import type { Metadata } from "next";
import { Suspense } from "react";

import { LandingCircle } from "@/app/(welcome)/welcome/_components/landing-circle";
import { LandingFaq } from "@/app/(welcome)/welcome/_components/landing-faq";
import { LandingFeatures } from "@/app/(welcome)/welcome/_components/landing-features";
import { LandingFooter } from "@/app/(welcome)/welcome/_components/landing-footer";
import { LandingHero } from "@/app/(welcome)/welcome/_components/landing-hero";
import { LandingJoin } from "@/app/(welcome)/welcome/_components/landing-join";
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
 * Mise en page d'après Firecrawl : un cadre de rails, un hero à widget, une grille bordée, un
 * bandeau d'accent, les questions et l'appel final. **Aucune donnée de membre, aucune requête
 * AniList** : les fragments et leurs jaquettes sont écrits en dur.
 */
export default function WelcomePage() {
  return (
    <div className="min-h-svh overflow-x-clip bg-background px-0 sm:px-6">
      <div className="mx-auto max-w-6xl border-border sm:border-x">
        <LandingHero />
        <LandingFeatures />
        <LandingCircle />
        <LandingFaq />
        <Suspense fallback={null}>
          <LandingJoin />
        </Suspense>
        <LandingFooter />
      </div>
    </div>
  );
}
