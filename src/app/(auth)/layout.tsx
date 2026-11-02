import type { Metadata } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { BannerBackdrop } from "@/app/(auth)/_components/banner-backdrop";

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
 * **Une colonne centrée, d'après Linear et Vercel** : le logo, le titre, les fournisseurs. En fond,
 * la bannière du moment, floue, dans sa propre frontière : la page n'attend pas AniList.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <BannerBackdrop />
      </Suspense>
      <main className="flex w-full max-w-[360px] flex-col items-center gap-8">
        <Link aria-label={site.name} href={routes.home}>
          <Logo className="size-10" />
        </Link>
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
