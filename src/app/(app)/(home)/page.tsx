import type { Metadata } from "next";
import { Suspense } from "react";

import { Dashboard } from "@/app/(app)/(home)/_components/dashboard";
import { DashboardSkeleton } from "@/app/(app)/(home)/_components/dashboard-skeleton";
import { Discovery } from "@/app/(app)/(home)/_components/discovery";
import { DiscoverySkeleton } from "@/app/(app)/(home)/_components/discovery-skeleton";
import { RecentActivity } from "@/app/(app)/(home)/_components/recent-activity";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Où vous en êtes, ce que vous avez laissé en chemin, et ce qui sort en ce moment.",
};

/**
 * L'accueil (docs/PRODUCT.md §5).
 *
 * **Il rassemble tout** : le suivi, les listes, le catalogue du moment, le journal. C'est la
 * conséquence directe de la disparition de `/browse` — sur un cercle privé de quatre comptes, une
 * page de découverte séparée obligeait à choisir une porte avant de savoir ce qu'on venait faire.
 * La recherche reste l'écran des questions qu'on a déjà ; celui-ci répond à « et sinon, quoi ? ».
 *
 * **Trois frontières de suspension, une par source.** Le suivi et le journal se lisent dans le
 * miroir local et répondent en quelques millisecondes ; les rangées de découverte attendent
 * AniList. Une frontière unique ferait attendre le « +1 » — le geste le plus fréquent du produit —
 * derrière un appel réseau dont il n'a aucun besoin. `getSession` porte le `cache` de React, donc
 * les trois ne coûtent qu'une lecture de session.
 *
 * L'ordre du DOM est celui de la page, quel que soit l'ordre d'arrivée : le journal reste en bas
 * même s'il est prêt avant les tendances.
 *
 * La page elle-même n'attend rien — l'en-tête part immédiatement.
 */
export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Accueil</h1>
        <p className="text-muted-foreground text-sm">
          Où vous en êtes, ce que vous avez laissé en chemin, et ce qui sort en
          ce moment.
        </p>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>

      <Suspense fallback={<DiscoverySkeleton />}>
        <Discovery />
      </Suspense>

      <Suspense fallback={null}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}
