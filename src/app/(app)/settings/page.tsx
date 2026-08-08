import type { Metadata } from "next";
import { Suspense } from "react";

import { PreferencesForm } from "@/app/(app)/settings/_components/preferences-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export const metadata: Metadata = {
  title: "Paramètres",
  description: "Échelle de notation, langue des titres, contenu adulte.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Paramètres</h1>
        <p className="text-muted-foreground text-sm">
          Ces réglages ne changent que votre affichage : ils ne modifient aucune
          donnée enregistrée.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
        <PreferencesLoader />
      </Suspense>
    </div>
  );
}

/**
 * La lecture est suspendue à part : elle dépend du compte, donc elle n'est pas mémorisable, et
 * l'en-tête n'a aucune raison de l'attendre.
 */
async function PreferencesLoader() {
  return <PreferencesForm preferences={await getPreferences()} />;
}
