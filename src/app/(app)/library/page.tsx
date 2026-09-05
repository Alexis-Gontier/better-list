import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Ma bibliothèque",
  description: "Ce que je regarde, ce que je lis, et où j'en suis.",
};

/**
 * Ma bibliothèque — vidée par la mise à blanc.
 *
 * Se reconstruit juste après `/search`, sur la même coquille : c'est la fusion de ces deux écrans
 * qui est le premier gain de la refonte, avant même le changement d'apparence.
 */
export default function LibraryPage() {
  return (
    <RouteUnderConstruction
      description="Ce que je regarde, ce que je lis, et où j'en suis."
      title="Ma bibliothèque"
    />
  );
}
