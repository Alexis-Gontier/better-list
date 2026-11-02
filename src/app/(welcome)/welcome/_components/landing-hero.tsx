import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LandingBanner } from "@/app/(welcome)/welcome/_components/landing-banner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { ENABLED_PROVIDERS_LABEL } from "@/lib/auth/providers";

/**
 * Le hero, d'après Letterboxd : une œuvre en plein écran, trois phrases courtes qui disent tout le
 * produit, **un seul bouton** (D33). Le texte ne dépend pas d'AniList : il s'affiche tout de suite,
 * la bannière arrive derrière lui.
 */
export function LandingHero() {
  return (
    <section className="relative isolate flex min-h-[86svh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-card">
        <Suspense fallback={null}>
          <LandingBanner />
        </Suspense>
      </div>

      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <Logo className="size-7" />
          <span className="font-heading font-semibold text-lg tracking-tight">
            {site.name}
          </span>
        </span>
        <Link
          className="font-medium text-sm transition-colors hover:text-muted-foreground"
          href={routes.auth.login}
        >
          Se connecter
        </Link>
      </header>

      <div className="mx-auto mt-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-16 text-center sm:pb-20">
        <h1 className="font-heading font-semibold text-[clamp(30px,4.4vw,52px)] leading-[1.1] tracking-tight">
          Suivez ce que vous regardez.
          <br />
          Gardez ce que vous lisez.
          <br />
          Partagez-le entre amis.
        </h1>
        <p className="max-w-[48ch] text-pretty text-lg">
          Better-List est le carnet privé d'une dizaine d'amis : animes, mangas,
          webtoons et light novels, épisode par épisode.
        </p>
        <div className="flex flex-col items-center gap-2">
          <Button asChild size="lg">
            <Link href={routes.auth.login}>
              Rejoindre le cercle
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <span className="text-muted-foreground text-sm">
            Avec {ENABLED_PROVIDERS_LABEL}
          </span>
        </div>
      </div>
    </section>
  );
}
