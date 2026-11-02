import Image from "next/image";
import Link from "next/link";

import { LANDING_COVERS } from "@/app/(welcome)/welcome/_lib/landing-covers";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

const DOORS = [
  {
    href: "#episode",
    name: "Regarder",
    line: "Les épisodes, un par un",
    cover: LANDING_COVERS.frierenAnime,
    title: "Frieren",
  },
  {
    href: "#carnet",
    name: "Lire",
    line: "Les chapitres et les tomes",
    cover: LANDING_COVERS.kenshinManga,
    title: "Rurouni Kenshin",
  },
] as const;

/**
 * Le premier écran : **deux portes**, ce qu'on regarde et ce qu'on lit (direction « l'instrument
 * discret »). La page chuchote là où les catalogues publics crient : un titre court, une phrase,
 * un seul bouton d'accent (D33), et deux jaquettes qui portent toute la couleur.
 */
export function LandingDoors() {
  return (
    <section className="flex min-h-svh flex-col px-4 pt-6 pb-16 sm:px-8">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2.5">
          <Logo className="size-6" />
          <span className="font-heading font-semibold tracking-tight">
            {site.name}
          </span>
        </span>
        <Link
          className="text-[15px] transition-colors hover:text-muted-foreground"
          href={routes.auth.login}
        >
          Se connecter
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-12 pt-16 text-center">
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-balance font-heading font-medium text-[clamp(32px,4vw,52px)] leading-[1.05] tracking-tight">
            Ce que vous regardez,
            <br />
            ce que vous lisez.
          </h1>
          <p className="max-w-[46ch] text-pretty text-lg">
            Better-List est un carnet privé : une dizaine d'amis y suivent leurs
            animes, mangas et webtoons, épisode par épisode.
          </p>
          <div className="flex flex-col items-center gap-2">
            <Button asChild size="lg">
              <Link href={routes.auth.login}>Se connecter</Link>
            </Button>
            <span className="text-muted-foreground text-sm">
              Avec GitHub, Discord ou Google
            </span>
          </div>
        </div>

        <div className="group/doors grid w-full max-w-[640px] grid-cols-2 gap-3.5 sm:gap-20">
          {DOORS.map((door) => (
            <a
              className="flex flex-col gap-3 text-left transition-opacity duration-200 group-has-[a:hover]/doors:opacity-50 hover:opacity-100! focus-visible:opacity-100!"
              href={door.href}
              key={door.name}
            >
              <div className="relative aspect-3/4 w-full overflow-hidden bg-muted">
                <Image
                  alt={`Jaquette de ${door.title}`}
                  className="object-cover"
                  fill
                  priority
                  sizes="(min-width: 640px) 280px, 45vw"
                  src={door.cover}
                />
              </div>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-lg sm:text-[22px]">
                  {door.name}
                </span>
                <span className="text-muted-foreground">{door.line}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
