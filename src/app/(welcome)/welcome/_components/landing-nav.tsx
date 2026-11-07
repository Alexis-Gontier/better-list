import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

/** Les ancres de la page elle-même, pas des routes : elles n'ont rien à faire dans `routes.ts`. */
const LINKS = [
  ["#fonctionnalites", "Fonctionnalités"],
  ["#confidentialite", "Confidentialité"],
  ["#questions", "Questions"],
] as const;

/** La barre de la landing : marque, trois ancres, la connexion. En 390, seule la connexion reste. */
export function LandingNav() {
  return (
    <header className="flex h-16 items-center justify-between px-4 sm:px-8">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
        href="#contenu"
      >
        Aller au contenu
      </a>
      <div className="flex items-center gap-10">
        <span className="flex items-center gap-2.5">
          <Logo className="size-7" />
          <span className="font-heading font-semibold text-lg tracking-tight">
            {site.name}
          </span>
        </span>
        <nav aria-label="Sections" className="hidden gap-7 md:flex">
          {LINKS.map(([href, label]) => (
            <a
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Link
          className="hidden font-medium text-sm transition-colors hover:text-muted-foreground sm:inline"
          href={routes.auth.login}
        >
          Se connecter
        </Link>
        <Button asChild className="hidden sm:inline-flex" size="sm">
          <Link href={routes.auth.login}>Rejoindre</Link>
        </Button>
        <Button asChild className="sm:hidden" size="sm" variant="outline">
          <Link href={routes.auth.login}>Se connecter</Link>
        </Button>
      </div>
    </header>
  );
}
