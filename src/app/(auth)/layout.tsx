import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

/**
 * **Hors index, pour les deux pages d'un coup.**
 *
 * Posé sur le layout et non page par page : une garde répétée page par page est une garde qu'on
 * oubliera sur la suivante. La landing, elle, est indexable et vit hors de ce groupe.
 *
 * **Ce n'est pas un doublon de `robots.ts`, ce sont deux mécanismes distincts.** `robots.txt`
 * demande de **ne pas parcourir** ; cette balise demande de **ne pas indexer**. Certains robots
 * ignorent le premier et respectent la seconde, et un fichier `robots.txt` mal servi un jour ne doit
 * pas suffire à ouvrir le site.
 *
 * ⚠️ Corollaire à connaître, il vaut pour tout le site : un robot qui obéit à `Disallow: /` ne
 * charge pas la page, donc **ne lit jamais cette balise**. Les deux ne s'additionnent pas comme on
 * l'espère. La garde réelle reste ailleurs — `requireApprovedUser()` pour l'app, le jeton de 144
 * bits pour `/l/<jeton>` — et jamais dans ce que l'on demande poliment à un tiers.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Chrome minimal des pages d'authentification : pas de navigation — il n'y a rien à naviguer tant
 * qu'on n'est pas entré.
 *
 * **Une colonne étroite, au calme**, comme la landing (direction « l'instrument discret ») : le
 * nom en haut, le contenu centré, rien d'autre. Pas de jaquettes : cet écran ne se regarde pas, il
 * se traverse.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col px-4 py-6 sm:px-8">
      <header>
        <Link className="inline-flex items-center gap-2.5" href={routes.home}>
          <Logo className="size-6" />
          <span className="font-heading font-semibold tracking-tight">
            {site.name}
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center pb-[10svh]">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
