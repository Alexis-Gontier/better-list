import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";

import { CoverWall } from "@/app/(auth)/_components/cover-wall";
import { Logo } from "@/components/layout/logo";
import { site } from "@/config/site";

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
 * **Le texte à gauche, le mur de jaquettes à droite** (refonte du 2 octobre 2026 : la mise en page
 * vient de la page premium d'Ortega Scans, la voix reste celle du site). Chaque page porte son propre titre : la connexion se présente,
 * l'attente explique où en est le compte — un titre commun ne dirait ni l'un ni l'autre.
 *
 * Le mur est dans sa propre frontière : il attend AniList, la page n'a pas à l'attendre. Sous
 * `lg`, il passe derrière le texte, atténué, plutôt que de disparaître.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <Suspense fallback={null}>
        <CoverWall />
      </Suspense>

      <header className="mx-auto flex w-full max-w-6xl items-center gap-2.5 px-6 py-6 sm:px-10">
        <Logo className="size-7" />
        <span className="font-heading font-semibold text-lg tracking-tight">
          {site.name}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none">
          {children}
        </div>
      </main>

      {/* Les jaquettes viennent d'AniList, et ses CGU demandent qu'on le dise là où on les montre. */}
      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-muted-foreground text-xs sm:px-10">
        Jaquettes :{" "}
        <a
          className="underline-offset-4 hover:text-foreground hover:underline"
          href={site.attribution.url}
          rel="noreferrer"
          target="_blank"
        >
          {site.attribution.name}
        </a>
      </footer>
    </div>
  );
}
