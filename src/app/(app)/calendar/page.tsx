import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Planning",
  description: "Les épisodes à venir de ce que vous suivez.",
};

/**
 * Le planning — vidé par la mise à blanc.
 *
 * Ses deux modules de `_lib/` ont été épargnés : `airing-week.ts` (calcul de semaine, couvert par
 * ses tests) et `calendar-params.ts` (le contrat d'URL — la semaine en décalage, pas en date).
 * Ce sont des décisions de domaine, pas d'apparence ; le nouvel écran s'y rebranchera.
 */
export default function CalendarPage() {
  return (
    <RouteUnderConstruction
      description="Les épisodes à venir de ce que vous suivez."
      title="Planning"
    />
  );
}
