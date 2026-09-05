import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Rechercher",
  description: "Chercher un anime, un manga, un webtoon ou un light novel.",
};

/**
 * La recherche — vidée par la mise à blanc.
 *
 * Se reconstruit la première, avec `/library`, sur la coquille commune : les deux écrans étaient
 * le même, écrit deux fois (docs/superpowers/specs/2026-09-02-refonte-design-ui-design.md).
 */
export default function SearchPage() {
  return (
    <RouteUnderConstruction
      description="Chercher un anime, un manga, un webtoon ou un light novel."
      title="Rechercher"
    />
  );
}
