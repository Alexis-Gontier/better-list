import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Liste",
  description: "Une liste d'œuvres, réordonnable et partageable.",
  // Une liste est privée par défaut (docs/PRODUCT.md §4.4), et l'app est derrière une garde : rien
  // à indexer.
  robots: { index: false, follow: false },
};

/**
 * Une liste — vidée par la mise à blanc.
 *
 * Le titre était dynamique tant que `getListById` existait ; la seconde passe du 5 septembre a
 * emporté `lists/server/` avec toutes les queries, et il redevient statique.
 *
 * Les deux mécaniques qui faisaient cet écran sont épargnées et testées : le réordonnancement
 * (`features/lists/lib/list-reorder.ts`, `fractional-indexing`) et le partage par jeton
 * (`features/lists/lib/share-token.ts`). Seule leur présentation a disparu.
 */
export default function ListPage() {
  return (
    <RouteUnderConstruction
      description="Une liste d'œuvres, réordonnable et partageable."
      title="Liste"
    />
  );
}
