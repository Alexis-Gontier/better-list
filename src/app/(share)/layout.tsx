import type { ReactNode } from "react";

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
 * franchir — l'inscription passe par une liste d'attente. Le nom du site est écrit, pas cliquable :
 * il dit d'où vient la page sans promettre une porte.
 */
export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-border/60 border-b">
        <div className="container mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <span className="font-semibold text-sm tracking-tight">
            {site.name}
          </span>
        </div>
      </header>

      <main className="container mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
