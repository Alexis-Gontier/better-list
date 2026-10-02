import type { ReactNode } from "react";

/**
 * Le titre des pages d'authentification — **celui des autres pages du site, d'un cran plus grand**.
 *
 * Même voix que le titre de la fiche (`font-bold`, `font-heading` posé par la couche de base,
 * casse normale) : la DA « Obsidienne » fait porter l'identité par la typographie et le rythme,
 * pas par un effet d'affiche. Le cran de plus tient à l'écran : il n'a rien d'autre à montrer.
 *
 * **Aucun mot n'y est mis en couleur.** L'accent a un seul emploi par écran, l'action principale
 * (docs/superpowers/specs/2026-09-02-refonte-design-ui-design.md) — ici, le bouton de connexion.
 */
export function AuthTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-balance font-bold text-4xl tracking-tight sm:text-5xl">
      {children}
    </h1>
  );
}
