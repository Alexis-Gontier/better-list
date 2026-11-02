import Link from "next/link";

import { routes } from "@/config/routes";
import { site } from "@/config/site";

/** L'attribution AniList est due là où l'on montre ses jaquettes (CGU) : ici, pour toute la page. */
export function LandingFooter() {
  return (
    <footer className="grid gap-2 px-4 pb-8 text-muted-foreground text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-baseline sm:px-8">
      <span>Un carnet privé d'animes et de mangas</span>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link
          className="text-foreground transition-colors hover:text-muted-foreground"
          href={routes.auth.login}
        >
          Se connecter
        </Link>
        <a
          className="text-foreground transition-colors hover:text-muted-foreground"
          href={site.attribution.url}
          rel="noreferrer"
          target="_blank"
        >
          Jaquettes : {site.attribution.name}
        </a>
      </div>
      <span className="sm:text-right">2026</span>
    </footer>
  );
}
