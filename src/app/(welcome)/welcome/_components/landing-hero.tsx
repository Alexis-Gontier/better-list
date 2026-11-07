import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { ENABLED_PROVIDERS_LABEL } from "@/lib/auth/providers";

/**
 * Le hero, d'après les landings SaaS (D71) : une annonce, le titre, deux actions, puis **le produit
 * en grand**. Rien n'y dépend d'AniList : il s'affiche tout de suite, et la capture (D63) porte
 * déjà les jaquettes.
 */
export function LandingHero() {
  return (
    <section className="flex flex-col items-center px-4 pt-12 sm:px-8 sm:pt-24">
      <div className="flex flex-col items-center gap-6 text-center sm:gap-7">
        <Link
          className="flex animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 motion-reduce:animate-none items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm transition-colors hover:bg-accent"
          href="#tier-lists"
        >
          Nouveau : les tier lists partagées
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
        </Link>
        <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 motion-reduce:animate-none max-w-[20ch] [animation-delay:80ms] text-balance font-heading font-semibold text-[clamp(38px,5vw,72px)] leading-[1.08] tracking-tight">
          Suivez vos animes et mangas, entre amis.
        </h1>
        <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 motion-reduce:animate-none max-w-[52ch] [animation-delay:160ms] text-pretty text-lg text-muted-foreground sm:text-xl">
          Épisodes, journal daté, collection de tomes et tier lists : tout votre
          suivi au même endroit, sur le catalogue d'AniList.
        </p>
        <div className="flex w-full animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 motion-reduce:animate-none flex-col gap-3 [animation-delay:240ms] sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link href={routes.auth.login}>
              Rejoindre le cercle
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#fonctionnalites">Voir les fonctionnalités</a>
          </Button>
        </div>
        <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 motion-reduce:animate-none text-muted-foreground text-sm [animation-delay:300ms]">
          Sur invitation · avec {ENABLED_PROVIDERS_LABEL}
        </p>
      </div>
      {/* En 390, un cadre 4:5 recadre la capture de bureau : réduite, elle serait illisible. */}
      <div className="settle mt-12 w-full max-w-304 rounded-2xl border bg-card p-1 sm:mt-18 sm:p-2">
        <div className="relative aspect-4/5 overflow-hidden rounded-xl sm:aspect-16/10">
          <Image
            alt="L'accueil de Better-List : une œuvre à la une, puis les séries en cours et leur épisode"
            className="object-cover object-[22%_0%] sm:object-top"
            fill
            priority
            sizes="(min-width: 1216px) 1200px, 100vw"
            src="/screenshots/accueil.jpg"
          />
        </div>
      </div>
    </section>
  );
}
