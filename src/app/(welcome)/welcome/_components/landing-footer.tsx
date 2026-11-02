import Link from "next/link";

import { routes } from "@/config/routes";
import { site } from "@/config/site";

/** L'attribution AniList est due là où l'on montre ses jaquettes (CGU) : ici, pour toute la page. */
export function LandingFooter() {
  return (
    <footer className="grid gap-3 px-6 py-8 text-muted-foreground text-xs sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-10 lg:px-16">
      <span>Un carnet privé d'animes et de mangas</span>
      <div className="flex gap-6">
        <Link className="hover:text-foreground" href={routes.auth.login}>
          Se connecter
        </Link>
        <a
          className="hover:text-foreground"
          href={site.attribution.url}
          rel="noreferrer"
          target="_blank"
        >
          Données et jaquettes : {site.attribution.name}
        </a>
      </div>
      <span className="sm:text-right">2026</span>
    </footer>
  );
}
