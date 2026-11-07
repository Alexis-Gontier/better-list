import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  LandingCovers,
  LandingCoversSkeleton,
} from "@/app/(welcome)/welcome/_components/landing-covers";
import { LandingFaq } from "@/app/(welcome)/welcome/_components/landing-faq";
import { LandingFeatures } from "@/app/(welcome)/welcome/_components/landing-features";
import { LandingHero } from "@/app/(welcome)/welcome/_components/landing-hero";
import {
  LandingJoin,
  LandingJoinSkeleton,
} from "@/app/(welcome)/welcome/_components/landing-join";
import { LandingNav } from "@/app/(welcome)/welcome/_components/landing-nav";
import { LandingSearch } from "@/app/(welcome)/welcome/_components/landing-search";
import { LandingSteps } from "@/app/(welcome)/welcome/_components/landing-steps";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { ENABLED_PROVIDERS_LABEL } from "@/lib/auth/providers";

export const metadata: Metadata = {
  title: { absolute: "Better-List — le suivi privé de vos animes et mangas" },
  description:
    "Épisodes, journal daté, collection de tomes et tier lists : le suivi d'animes et de mangas d'une dizaine d'amis, sur le catalogue d'AniList.",
  alternates: { canonical: routes.home },
};

/**
 * La landing (D58, D71) : servie à `/` par `proxy.ts` à qui n'a pas de session.
 *
 * **D'après les landings SaaS** : le produit en grand sous le titre, le bandeau du catalogue, six
 * tuiles qui montrent chacune un fragment de l'app, la recherche, l'entrée, la FAQ, puis la
 * connexion. Les jaquettes sont partout (la leçon de D61), et toutes viennent de la vitrine des
 * tendances, déjà en cache pour l'accueil : la page n'ajoute aucune requête à AniList.
 */
export default function WelcomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LandingNav />

      <main id="contenu">
        <LandingHero />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-18 pb-24 sm:gap-40 sm:px-8 sm:pt-30 sm:pb-30">
          <section className="reveal flex flex-col gap-6 sm:items-center">
            <h2 className="text-muted-foreground text-sm">
              Le catalogue d'AniList, avec les tendances du jour
            </h2>
            <div className="w-full">
              <Suspense fallback={<LandingCoversSkeleton />}>
                <LandingCovers />
              </Suspense>
            </div>
          </section>

          <LandingFeatures />
          <LandingSearch />
          <LandingSteps providersLabel={ENABLED_PROVIDERS_LABEL} />
          <LandingFaq />

          <Suspense fallback={<LandingJoinSkeleton />}>
            <LandingJoin />
          </Suspense>
        </div>
      </main>

      {/* Les jaquettes viennent d'AniList, et ses CGU demandent qu'on le dise là où on les montre. */}
      <footer className="flex flex-wrap items-center justify-between gap-4 px-4 py-7 text-muted-foreground text-sm sm:px-8">
        <span>{site.name} · un carnet privé d'animes et de mangas · 2026</span>
        <span className="flex gap-6">
          <Link
            className="transition-colors hover:text-foreground"
            href={routes.auth.login}
          >
            Se connecter
          </Link>
          <a
            className="transition-colors hover:text-foreground"
            href={site.attribution.url}
            rel="noreferrer"
            target="_blank"
          >
            Données et images : {site.attribution.name}
          </a>
        </span>
      </footer>
    </div>
  );
}
