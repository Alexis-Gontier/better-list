import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Reprendre où on s'est arrêté, et voir ce qui sort en ce moment.",
};

/**
 * L'accueil — vidé par la mise à blanc, reconstruit en dernier.
 *
 * En dernier volontairement : c'est l'écran qui compose le vocabulaire de tous les autres
 * (rangées, cartes, chiffres). Le refaire avant que ce vocabulaire existe reviendrait à le refaire
 * deux fois.
 *
 * Le fichier reste, lui, parce que `routes.home` est bien plus qu'un lien de navigation : la
 * redirection d'après connexion, le `callbackURL` GitHub, la sortie de la liste d'attente et le
 * repli de `proxy.ts` y mènent tous.
 */
export default function HomePage() {
  return (
    <RouteUnderConstruction
      description="Reprendre où on s'est arrêté, et voir ce qui sort en ce moment."
      title="Accueil"
    />
  );
}
