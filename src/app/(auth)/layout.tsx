import type { Metadata } from "next";
import type { ReactNode } from "react";

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
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <Logo className="mx-auto mb-4 size-10" />
          <h1 className="font-semibold text-2xl tracking-tight">{site.name}</h1>
          <p className="text-muted-foreground text-sm">{site.description}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
