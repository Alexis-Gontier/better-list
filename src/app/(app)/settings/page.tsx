import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Paramètres",
  description: "Échelle de notation, langue des titres, contenu adulte.",
};

/**
 * Les préférences — vidées par la mise à blanc totale du 5 septembre 2026.
 *
 * `features/preferences/` ne garde que son schéma Zod : `titleLanguage` et ses valeurs par défaut
 * restent la source de vérité, et `media-format.ts` continue de s'en servir. Ce qui a disparu, c'est
 * la lecture (`getPreferences`) et l'écriture (`updatePreferences`) — douze appelants au moment de
 * la suppression, tous dans des écrans désormais vides.
 */
export default function SettingsPage() {
  return (
    <RouteUnderConstruction
      description="Échelle de notation, langue des titres, contenu adulte."
      title="Paramètres"
    />
  );
}
