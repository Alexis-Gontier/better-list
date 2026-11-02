import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";

import { Logo } from "@/components/layout/logo";
import { site } from "@/config/site";
import { CoverWall } from "@/features/media/components/cover-wall";

/**
 * **Hors index, pour les trois pages d'un coup.**
 *
 * Posé sur le layout et non page par page : `/login`, `/signup` et `/waitlist` sont les seules
 * pages du produit qui répondent vraiment à un visiteur sans session — tout le reste de `(app)`
 * redirige avant de rendre quoi que ce soit —, et une garde répétée trois fois est une garde qu'on
 * oubliera sur la quatrième.
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
 * Chrome minimal des pages d'authentification : pas de header, pas de navigation — il n'y a rien
 * à naviguer tant qu'on n'est pas entré.
 *
 * **Deux colonnes à `lg`** (mise en page `login-02` de shadcn, maquette lot 1) : le contenu centré
 * à gauche, le mur de jaquettes à droite sur `bg-muted`. Sous `lg`, le mur disparaît : sur un
 * téléphone, il ne ferait que repousser les boutons.
 *
 * Le mur est dans sa propre frontière : il attend AniList, la page n'a pas à l'attendre.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <header className="flex items-center gap-2.5">
          <Logo className="size-7" />
          <span className="font-heading font-semibold text-lg tracking-tight">
            {site.name}
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none">
            {children}
          </div>
        </main>
      </div>

      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <Suspense fallback={null}>
          <CoverWall />
        </Suspense>
        {/* Les jaquettes viennent d'AniList, et ses CGU demandent qu'on le dise là où on les montre. */}
        <p className="absolute right-6 bottom-6 text-muted-foreground text-xs">
          Jaquettes :{" "}
          <a
            className="underline-offset-4 hover:text-foreground hover:underline"
            href={site.attribution.url}
            rel="noreferrer"
            target="_blank"
          >
            {site.attribution.name}
          </a>
        </p>
      </div>
    </div>
  );
}
