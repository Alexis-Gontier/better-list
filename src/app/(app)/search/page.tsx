import type { Metadata } from "next";
import { Suspense } from "react";

import { MediaCard } from "@/app/(app)/search/_components/media-card";
import { SearchFilterBar } from "@/app/(app)/search/_components/search-filter-bar";
import { getYearBounds } from "@/app/(app)/search/_lib/year-bounds";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
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
      <Suspense fallback={<MediaGridSkeleton />}>
        <MediaSampleGrid />
      </Suspense>
    </div>
  );
}

/**
 * Les paliers de colonnes — **3 et 7, les deux seuls diviseurs utiles de 21**.
 *
 * `CATALOGUE_PAGE_SIZE` vaut trois rangées de sept (`config/catalogue.ts`), et une page dont la
 * taille n'est pas un multiple du nombre de colonnes se termine par une rangée incomplète. D'où le
 * saut direct de 3 à 7 : les paliers intermédiaires habituels — 4, 5, 6 — laisseraient tous un trou
 * en bas d'écran, qui se lit comme un chargement raté plutôt que comme une fin de page.
 *
 * `search-media.schema.test.ts` tient le lien entre les deux : il casse si l'un change sans
 * l'autre.
 */
const GRID_COLUMNS = "grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-7";

/** Le dernier palier de `GRID_COLUMNS`, donc la taille d'une rangée sur un écran large. */
const WIDEST_COLUMN_COUNT = 7;

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
    <div className={GRID_COLUMNS}>
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
    </div>
  );
}

/**
 * Le squelette, **aux proportions exactes des cartes** : même grille, même rapport 2:3, même ligne
 * de titre. C'est ce qui évite que la page saute au remplacement — un squelette approximatif
 * déplace ce qu'il annonce.
 */
function MediaGridSkeleton() {
  return (
    <div className={GRID_COLUMNS}>
      {SKELETON_KEYS.map((key) => (
        <div className="flex flex-col gap-2" key={key}>
          <Skeleton className="aspect-2/3 w-full rounded-md" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/**
 * Les clés du squelette, calculées une fois au module.
 *
 * Des identifiants plutôt que l'indice de boucle : le linter refuse l'indice, et il a raison même
 * ici — c'est le genre de code qu'on recopie ensuite sur une vraie liste, où l'indice comme clé
 * fait réutiliser l'état d'une carte par sa voisine au premier réordonnancement. Ces cases-ci ne
 * bougent jamais, donc autant que la forme soit celle qu'on veut voir imitée.
 */
const SKELETON_KEYS = Array.from(
  { length: CATALOGUE_PAGE_SIZE },
  (_, index) => `card-${index}`,
);
