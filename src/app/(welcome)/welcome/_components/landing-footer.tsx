import Link from "next/link";

import { LandingBand } from "@/app/(welcome)/welcome/_components/landing-frame";
import { Logo } from "@/components/layout/logo";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

/** L'attribution AniList est due là où l'on montre ses jaquettes (CGU) : ici, pour toute la page. */
export function LandingFooter() {
  return (
    <LandingBand>
      <footer className="flex flex-col gap-4 px-5 py-8 text-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span className="flex items-center gap-2.5 text-foreground">
          <Logo className="size-5" />
          <span className="font-heading font-semibold">{site.name}</span>
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
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
            Données et jaquettes : {site.attribution.name}
          </a>
          <span>2026</span>
        </div>
      </footer>
    </LandingBand>
  );
}
