import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LandingAbilities } from "@/app/(welcome)/welcome/_components/landing-abilities";
import {
  LandingCovers,
  LandingCoversSkeleton,
} from "@/app/(welcome)/welcome/_components/landing-covers";
import { LandingHero } from "@/app/(welcome)/welcome/_components/landing-hero";
import {
  LandingJoin,
  LandingJoinSkeleton,
} from "@/app/(welcome)/welcome/_components/landing-join";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: "Better-List — le carnet privé de vos animes et mangas" },
  description:
    "Le carnet privé où une dizaine d'amis suivent leurs animes, mangas et webtoons, épisode par épisode.",
  alternates: { canonical: routes.home },
};

/**
 * La landing (D58, D61) : servie à `/` par `proxy.ts` à qui n'a pas de session.
 *
 * **D'après Letterboxd** : une œuvre en plein écran, trois phrases et un bouton, les jaquettes du
 * moment, ce que l'outil permet en six tuiles, puis la connexion. Ce sont les jaquettes qui donnent
 * envie ; elles viennent des tendances d'AniList, déjà en cache pour l'accueil.
 */
export default function WelcomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LandingHero />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-4 pb-24 sm:px-8 sm:gap-32">
        <section className="flex flex-col gap-5">
          <h2 className="font-heading font-semibold text-muted-foreground text-sm">
            En ce moment sur AniList
          </h2>
          <Suspense fallback={<LandingCoversSkeleton />}>
            <LandingCovers />
          </Suspense>
        </section>

        <section>
          <LandingAbilities />
        </section>

        <section>
          <Suspense fallback={<LandingJoinSkeleton />}>
            <LandingJoin />
          </Suspense>
        </section>
      </main>

      {/* Les jaquettes viennent d'AniList, et ses CGU demandent qu'on le dise là où on les montre. */}
      <footer className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 text-muted-foreground text-sm sm:px-8">
        <span>Un carnet privé d'animes et de mangas · 2026</span>
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
