import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchFilterBar } from "@/app/(app)/search/_components/search-filter-bar";
import { getYearBounds } from "@/app/(app)/search/_lib/year-bounds";
import {
  CatalogueGrid,
  CatalogueGridSkeleton,
  WIDEST_COLUMN_COUNT,
} from "@/components/shared/catalogue-grid";
import { Separator } from "@/components/ui/separator";
import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import { MediaCard } from "@/features/media/components/media-card";
import { getMediaSampleFromMirror } from "@/features/media/server/media.mirror";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export const metadata: Metadata = {
  title: "Rechercher",
  description: "Chercher un anime, un manga, un webtoon ou un light novel.",
};

/**
 * La recherche — la barre, ses facettes, et **un aperçu de la grille**.
 *
 * La page ne lit pas encore ses `searchParams` : la barre est un îlot client qui parle à l'URL par
 * les mêmes parseurs (`loadSearchFilters` les relira ici quand la grille arrivera). C'est l'ordre
 * choisi pour toute la refonte — la mise en page se valide à l'écran avant que la donnée ne la
 * traverse.
 *
 * **Les cartes affichées ne sont pas des résultats.** Elles viennent du miroir local et ignorent
 * tout ce qui est dans l'adresse : c'est un aperçu, posé pour dessiner la carte sur de vraies
 * jaquettes et de vrais titres. Ce qui manque : la vraie query `searchMedia`, la pagination, le
 * compteur de résultats, les cas vides et la densité. L'inventaire est dans
 * docs/recherche-filtres.md.
 */
export default async function SearchPage() {
  const yearBounds = await getYearBounds();

  return (
    <div className="flex flex-col gap-6">
      {/*
        L'écart est porté par la colonne, pas par les traits : une marge posée sur un séparateur lui
        ferait dicter l'espacement de ses deux voisins, et la prochaine section ajoutée ici
        arriverait avec un rythme différent selon qu'elle suit un trait ou non. Même raison que sur
        la fiche.
      */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl">Rechercher</h1>
        <Separator />
        <SearchFilterBar yearBounds={yearBounds} />
        <Separator />
      </div>

      {/*
        La grille est **suspendue** et la coquille ne l'attend pas : la barre de filtres est du HTML
        statique, elle n'a aucune raison d'attendre une lecture en base pour s'afficher. Une
        frontière par zone, jamais de `loading.tsx` de segment (docs/ARCHITECTURE.md).
      */}
      <Suspense fallback={<CatalogueGridSkeleton />}>
        <MediaSampleGrid />
      </Suspense>
    </div>
  );
}

async function MediaSampleGrid() {
  const { includeAdult, titleLanguage } = await getPreferences();
  const media = await getMediaSampleFromMirror({
    take: CATALOGUE_PAGE_SIZE,
    includeAdult,
  });

  // Le miroir ne contient que ce que quelqu'un a déjà consulté ou suivi : il peut être vide, et
  // c'est un état normal tant que rien ne le remplit — pas une erreur à signaler.
  if (media.length === 0) return null;

  return (
    <CatalogueGrid>
      {media.map((item, index) => (
        <MediaCard
          key={item.id}
          media={item}
          // La première rangée au palier le plus large : c'est tout ce qui est au-dessus de la
          // ligne de flottaison, et la première de ces jaquettes porte la mesure de LCP.
          priority={index < WIDEST_COLUMN_COUNT}
          titleLanguage={titleLanguage}
        />
      ))}
    </CatalogueGrid>
  );
}
