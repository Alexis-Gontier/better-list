import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { CoverWall } from "@/features/media/components/cover-wall";

const ANCHORS = [
  { href: "#suivi", label: "Le suivi" },
  { href: "#journal", label: "Le journal" },
  { href: "#listes", label: "Les listes" },
  { href: "#etagere", label: "L'étagère" },
] as const;

/**
 * Le hero « split stage » (maquette lot 1) : le mur de jaquettes tient à gauche pendant que la
 * colonne de droite défile, et le nom déborde du texte sur le mur. **Un seul bouton d'accent**
 * (D33) : « Se connecter » sous la phrase ; celui de la navigation reste en contour.
 */
export function LandingHero() {
  return (
    <section className="grid gap-5 p-5 lg:min-h-svh lg:grid-cols-[47%_1fr]">
      <div className="relative h-[58svh] overflow-hidden rounded-lg bg-card lg:sticky lg:top-5 lg:h-[calc(100svh-2.5rem)]">
        <Suspense fallback={null}>
          <CoverWall />
        </Suspense>
        <Button
          asChild
          className="absolute top-3 right-3 lg:hidden"
          size="sm"
          variant="outline"
        >
          <Link href={routes.auth.login}>Se connecter</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-10 lg:gap-0">
        <nav className="hidden items-center justify-end gap-6 text-sm lg:flex">
          {ANCHORS.map((anchor) => (
            <a
              className="text-muted-foreground transition-colors hover:text-foreground"
              href={anchor.href}
              key={anchor.href}
            >
              {anchor.label}
            </a>
          ))}
          <Button asChild size="sm" variant="outline">
            <Link href={routes.auth.login}>Se connecter</Link>
          </Button>
        </nav>

        <div className="flex flex-col gap-6 lg:flex-1 lg:justify-center lg:pl-[22%]">
          <p className="max-w-[26ch] text-pretty text-2xl leading-snug">
            Le carnet privé où une dizaine d'amis suivent leurs animes, mangas
            et webtoons, épisode par épisode.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="w-full sm:w-auto" size="lg">
              <Link href={routes.auth.login}>Se connecter</Link>
            </Button>
            <span className="text-muted-foreground text-sm">
              GitHub, Discord ou Google
            </span>
          </div>
        </div>

        <h1 className="relative z-10 text-right font-heading font-medium text-[clamp(56px,12vw,184px)] leading-none tracking-[-0.04em] max-lg:order-first lg:-ml-[10vw]">
          better-list
        </h1>
      </div>
    </section>
  );
}
