import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { TierBoard } from "@/app/(app)/library/tiers/_components/tier-board";
import { TierTypeRow } from "@/app/(app)/library/tiers/_components/tier-type-row";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { loadTierFilters } from "@/features/tracking/lib/library-params";
import { TIER_BOARD } from "@/features/tracking/lib/score-tiers";
import { getScoredLibrary } from "@/features/tracking/server/library.queries";

export const metadata: Metadata = {
  title: "Tier list",
  description: "Recaler mes notes en comparant les œuvres entre elles.",
};

/**
 * La tier list de mes notes — **un palier par cran, et déposer une œuvre écrit sa note.**
 *
 * Elle répond à un manque que la fiche ne comble pas : on y note une œuvre seule, sans rien à côté,
 * et un 4 posé en 2019 ne veut plus dire ce qu'un 4 posé aujourd'hui veut dire. Ici les œuvres sont
 * les unes à côté des autres, donc la note se décide par comparaison — c'est le geste, et l'écran
 * n'existe que pour lui.
 *
 * **Ce n'est pas la `ListView TIERS` de docs/PRODUCT.md §4.4**, qui posera des paliers libres sur
 * une liste et reste à faire. Les deux ne se confondent pas : là-bas les paliers sont nommés par
 * celui qui range et ne signifient rien hors de la liste ; ici ils *sont* la note, donc ils
 * n'ont ni nom à choisir, ni contenu à stocker — `Entry.score` porte tout, et aucune table n'a été
 * ajoutée pour cet écran.
 *
 * **Une seule zone suspendue.** L'écran n'a pas de contrôles à faire venir séparément : la rangée de
 * types se rend depuis l'adresse, sans lecture. Seul le plateau attend la base.
 */
export default function LibraryTiersPage({
  searchParams,
}: PageProps<"/library/tiers">) {
  return (
    <div className="flex flex-col gap-6">
      {/*
        L'écart est porté par la colonne et pas par les traits, comme sur `/library` : une marge
        posée sur un séparateur lui ferait dicter l'espacement de ses deux voisins.
      */}
      <div className="flex flex-col gap-4">
        <PageHeading
          description="Mes notes, palier par palier. Glisser une œuvre d'un cran à l'autre enregistre sa note — au doigt, à la souris ou au clavier."
          title="Tier list"
        />
        <Separator />

        <Suspense fallback={<Skeleton className="h-8 w-64 rounded-md" />}>
          <TierTypeControls searchParams={searchParams} />
        </Suspense>

        <Separator />
      </div>

      <Suspense fallback={<TierBoardSkeleton />}>
        <TierBoardSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * La rangée de types.
 *
 * Elle lit l'adresse de son côté plutôt que de recevoir des filtres déjà décodés : lire
 * `searchParams` au niveau de la page la rendrait dynamique en entier, et la coquille statique de
 * l'écran — le titre, les traits — serait perdue pour un seul paramètre. Même raison que sur
 * `/library`.
 */
async function TierTypeControls({
  searchParams,
}: {
  searchParams: PageProps<"/library/tiers">["searchParams"];
}) {
  const filters = await loadTierFilters(searchParams);

  return <TierTypeRow filters={filters} />;
}

/** Le plateau et ses œuvres. */
async function TierBoardSection({
  searchParams,
}: {
  searchParams: PageProps<"/library/tiers">["searchParams"];
}) {
  const { includeAdult, titleLanguage } = await getPreferences();
  const filters = await loadTierFilters(searchParams);
  const entries = await getScoredLibrary({
    filters,
    includeAdult,
    titleLanguage,
  });

  /*
    Un plateau vide n'est pas rendu du tout : onze lignes vides ne se lisent pas comme « rien à
    noter », elles se lisent comme un écran cassé. Le vide filtré et le vide neuf se distinguent
    sans requête de plus — le type est dans l'adresse, et lui seul peut avoir tout écarté.
  */
  if (entries.length === 0) {
    const filtered = filters.type !== null;

    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            {filtered
              ? "Rien de ce type à noter"
              : "Rien à noter pour l'instant"}
          </EmptyTitle>

          <EmptyDescription>
            {filtered
              ? "Aucune œuvre de ce type dans ma bibliothèque. Voir le plateau entier, ou en suivre une."
              : "Le plateau montre les œuvres commencées, notées ou non. Celles qui sont seulement prévues n'y sont pas : on ne juge pas ce qu'on n'a pas ouvert."}
          </EmptyDescription>
        </EmptyHeader>

        <Button asChild variant="outline">
          <Link href={filtered ? routes.library.tiers : routes.library.root}>
            {filtered ? "Voir tout le plateau" : "Ouvrir ma bibliothèque"}
          </Link>
        </Button>
      </Empty>
    );
  }

  return <TierBoard entries={entries} />;
}

/** Le squelette du plateau, aux proportions de ce qu'il annonce : ses lignes, à hauteur réelle. */
function TierBoardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {TIER_BOARD.map((tier) => (
        <Skeleton className="h-28 w-full rounded-lg" key={tier.id} />
      ))}
    </div>
  );
}
