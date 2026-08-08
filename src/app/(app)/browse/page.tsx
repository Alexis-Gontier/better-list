import type { Metadata } from "next";
import { Suspense } from "react";

import { BrowseCatalogue } from "@/app/(app)/browse/_components/browse-catalogue";
import { BrowseCatalogueSkeleton } from "@/app/(app)/browse/_components/browse-catalogue-skeleton";

export const metadata: Metadata = {
  title: "Parcourir",
  description: "La saison en cours, les tendances, les mieux notés.",
};

/**
 * Parcourir — le catalogue éditorialisé (docs/PRODUCT.md §5, V1).
 *
 * Le pendant de `/search` : là où la recherche répond à une question qu'on a déjà, cette page en
 * suggère une. C'était la dernière entrée de la navigation qui menait encore à un 404.
 *
 * La page n'attend rien — l'en-tête part immédiatement, et tout ce qui dépend d'AniList et de la
 * préférence de compte arrive en flux derrière une frontière unique. Une frontière par rangée serait
 * une fausse bonne idée : les cinq viennent de la **même** requête, donc elles sont prêtes en même
 * temps, et les éclater ne ferait que multiplier les sauts de mise en page.
 */
export default function BrowsePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Parcourir</h1>
        <p className="text-muted-foreground text-sm">
          La saison en cours, les tendances, les mieux notés.
        </p>
      </header>

      <Suspense fallback={<BrowseCatalogueSkeleton />}>
        <BrowseCatalogue />
      </Suspense>
    </div>
  );
}
