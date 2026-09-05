import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";
import { getListById } from "@/features/lists/server/lists.queries";

/**
 * Le titre reste dynamique alors même que l'écran est vidé : la liste, elle, existe toujours en
 * base, et l'onglet du navigateur est la seule chose qui puisse encore la nommer pendant la
 * refonte.
 */
export async function generateMetadata({
  params,
}: PageProps<"/lists/[id]">): Promise<Metadata> {
  const { id } = await params;
  const list = await getListById(id);

  if (!list) return {};

  return {
    title: list.title,
    description: list.description ?? "Une liste d'œuvres.",
    // Une liste est privée par défaut (docs/PRODUCT.md §4.4), et l'app est derrière une garde : rien
    // à indexer.
    robots: { index: false, follow: false },
  };
}

/**
 * Une liste — vidée par la mise à blanc.
 *
 * C'est l'écran qui portait le réordonnancement (`fractional-indexing` via `lib/list-reorder`) et
 * le partage par jeton. Ces deux mécaniques vivent dans `features/lists/`, tests compris : rien
 * n'en a été perdu ici, seule leur présentation a disparu.
 */
export default function ListPage() {
  return (
    <RouteUnderConstruction
      description="Une liste d'œuvres, réordonnable et partageable."
      title="Liste"
    />
  );
}
