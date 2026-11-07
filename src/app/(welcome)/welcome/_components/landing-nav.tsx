import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

/** Les ancres de la page elle-même, pas des routes : elles n'ont rien à faire dans `routes.ts`. */
export const LANDING_ANCHORS = [
  ["#fonctionnalites", "Fonctionnalités"],
  ["#tier-lists", "Tier lists"],
  ["#confidentialite", "Confidentialité"],
  ["#questions", "Questions"],
] as const;

/**
 * La barre de la landing : collante, sur la même grille que le contenu, transparente sur le hero
 * puis floutée au défilement (`stuck`). En 390, les ancres passent au pied de page.
 */
export function LandingNav() {
  return (
    <header className="stuck sticky top-0 z-50 border-b bg-background/75 backdrop-blur-md">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
        href="#contenu"
      >
        Aller au contenu
      </a>
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto] items-center px-4 sm:px-8 md:grid-cols-[1fr_auto_1fr]">
        <Link
          aria-label={`${site.name}, haut de page`}
          className="flex items-center gap-2.5 justify-self-start"
          href={routes.home}
        >
          <Logo className="size-7" />
          <span className="font-heading font-semibold text-lg tracking-tight">
            {site.name}
          </span>
        </Link>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {LANDING_ANCHORS.map(([href, label]) => (
              <li key={href}>
                <a
                  className="rounded-full px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
                  href={href}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 justify-self-end">
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link href={routes.auth.login}>Se connecter</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex" size="sm">
            <Link href={routes.auth.login}>Rejoindre</Link>
          </Button>
          <Button asChild className="sm:hidden" size="sm" variant="outline">
            <Link href={routes.auth.login}>Se connecter</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
