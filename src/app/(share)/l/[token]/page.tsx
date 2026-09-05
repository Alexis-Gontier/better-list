import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Liste partagée",
  description: "Une liste ouverte par lien.",
  /*
   * **Ne pas retirer.** C'est la seule route de l'app qui s'ouvre sans session : un lien secret
   * indexé n'est plus un secret, il est cherchable. `app/robots.ts` ferme déjà tout le site par un
   * `disallow: "/"` total, et cette balise le double au niveau de la page — la mise à blanc n'a pas
   * touché cette propriété, et la reconstruction ne le doit pas non plus.
   */
  robots: { index: false, follow: false },
};

/**
 * Une liste partagée par jeton — vidée par la mise à blanc totale du 5 septembre 2026.
 *
 * Le jeton lui-même est intact : `features/lists/lib/share-token.ts` et ses quatre tests n'ont pas
 * bougé, et le partage continue de passer par lui plutôt que par l'`id`. Ce qui a disparu, c'est la
 * lecture `getSharedList` et le rendu de la grille — plus l'`opengraph-image.tsx`, qui dessinait
 * l'aperçu du lien à partir de cette lecture et n'avait donc plus rien à décrire.
 */
export default function SharedListPage() {
  return (
    <RouteUnderConstruction
      description="Une liste ouverte par lien."
      title="Liste partagée"
    />
  );
}
