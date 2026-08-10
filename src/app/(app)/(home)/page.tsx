import type { Metadata } from "next";
import { Suspense } from "react";

import { Dashboard } from "@/app/(app)/_components/dashboard";
import { DashboardSkeleton } from "@/app/(app)/_components/dashboard-skeleton";

export const metadata: Metadata = {
  title: "Accueil",
  description: "En cours, à reprendre, et ce que vous avez fait récemment.",
};

/**
 * L'accueil, qui est le tableau de bord (docs/PRODUCT.md §5).
 *
 * La page n'attend rien : l'en-tête part immédiatement, le contenu — qui dépend de l'utilisateur et
 * ne peut donc pas être mémorisé — arrive en flux dans son `<Suspense>`.
 */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Reprendre</h1>
        <p className="text-muted-foreground text-sm">
          Où vous en êtes, et ce que vous avez laissé en chemin.
        </p>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
