import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { site } from "@/config/site";

/**
 * Chrome des pages ouvertes **sans compte**.
 *
 * Ce groupe existe pour une raison précise et non cosmétique : la garde d'accès du projet est dans
 * `app/(app)/layout.tsx` et couvre tout ce qui vit dessous (docs/PRODUCT.md §7.1). Une page qui doit
 * s'ouvrir sans session ne peut donc pas y être — pas « ne devrait pas », ne peut pas. D'où un
 * groupe frère, à côté de `(auth)`.
 *
 * Pas de navigation, et **aucun lien vers l'application** : tout ce qu'elle contient est derrière la
 * garde, donc chaque lien mènerait un visiteur sans compte à un écran de connexion qu'il ne peut pas
 * franchir — l'inscription passe par une liste d'attente. La marque est donc posée **sans lien** :
 * elle dit d'où vient la page sans promettre une porte.
 *
 * **Le monogramme seul**, comme l'en-tête de l'application depuis le 6 septembre 2026 (décision
 * d'Alexis, étendue ici le 7) : le nom en toutes lettres doublait une marque qui le dit déjà. Il
 * reste en `sr-only` — `Logo` porte `aria-hidden`, donc le retirer tout à fait laisserait cet
 * en-tête sans le moindre contenu annonçable, et un visiteur au lecteur d'écran ne saurait plus d'où
 * vient la page. C'est la seule chose que cet en-tête a à dire : il ne faut pas la lui prendre.
 */
export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-border/60 border-b">
        <div className="container mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <span className="flex items-center">
            <Logo className="size-5" />
            <span className="sr-only">{site.name}</span>
          </span>
        </div>
      </header>

      <main className="container mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
