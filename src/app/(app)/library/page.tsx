import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LibraryFilterBar } from "@/app/(app)/library/_components/library-filter-bar";
import { LibraryStatusRow } from "@/app/(app)/library/_components/library-status-row";
import {
  CatalogueGrid,
  CatalogueGridSkeleton,
  WIDEST_COLUMN_COUNT,
} from "@/components/shared/catalogue-grid";
import {
  CataloguePagination,
  CataloguePaginationSkeleton,
} from "@/components/shared/catalogue-pagination";
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
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryQuickActions } from "@/features/tracking/components/entry-quick-actions";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import {
  loadLibraryFilters,
  serializeLibraryFilters,
} from "@/features/tracking/lib/library-params";
import {
  getLibrary,
  getLibraryStatusCounts,
} from "@/features/tracking/server/library.queries";

export const metadata: Metadata = {
  title: "Ma bibliothèque",
  description: "Ce que je regarde, ce que je lis, et où j'en suis.",
};

/**
 * Ma bibliothèque — la rangée de statuts, la barre, la grille et sa pagination.
 *
 * C'est le même écran que `/search`, et c'est le sujet : les deux étaient écrits deux fois avant la
 * mise à blanc (docs/STATE.md). Ils partagent désormais la carte, la grille et la coquille de la
 * barre (`components/shared/`), et ne diffèrent que par ce qui les distingue réellement — la
 * source. Là-bas AniList et son quota ; ici mes lignes `Entry`, en base, où la pagination se fait.
 *
 * **Deux zones suspendues, et elles ne demandent pas la même chose.** Les contrôles ont besoin des
 * décomptes par statut ; la grille, d'une page de résultats. Les séparer laisse
 * la barre s'afficher pendant que la grille arrive — une frontière par zone, jamais de
 * `loading.tsx` de segment (docs/ARCHITECTURE.md).
 *
 * Les deux relisent `searchParams` chacune de leur côté plutôt que de recevoir des filtres déjà
 * décodés : lire l'adresse au niveau de la page la rendrait dynamique en entier, et la coquille
 * statique de l'écran — le titre, les traits — serait perdue pour deux entiers.
 */
export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <div className="flex flex-col gap-6">
      {/*
        L'écart est porté par la colonne, pas par les traits : une marge posée sur un séparateur lui
        ferait dicter l'espacement de ses deux voisins, et la prochaine section ajoutée ici
        arriverait avec un rythme différent selon qu'elle suit un trait ou non. Même raison que sur
        `/search` et sur la fiche.
      */}
      <div className="flex flex-col gap-4">
        <PageHeading
          description="Ce que je regarde, ce que je lis, et où j'en suis. Choisir un statut, ou chercher un titre que je suis déjà."
          title="Ma bibliothèque"
        />
        <Separator />

        <Suspense fallback={<LibraryControlsSkeleton />}>
          <LibraryControls searchParams={searchParams} />
        </Suspense>

        <Separator />
      </div>

      <Suspense
        fallback={
          /*
            La grille **et sa pagination** : les deux viennent de la même lecture, donc de la même
            frontière. Un squelette qui s'arrête à la grille annonce une page trop courte, et le
            pied de page descend d'un cran au remplacement.
          */
          <div className="flex flex-col gap-8">
            <CatalogueGridSkeleton />
            <CataloguePaginationSkeleton />
          </div>
        }
      >
        <LibraryResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * La tête de l'écran : le statut d'abord, le reste ensuite.
 *
 * L'ordre n'est pas neutre. Un catalogue se parcourt par ce qu'on cherche, une bibliothèque par où
 * on en est : le statut est l'axe de l'écran, pas une facette parmi d'autres. Il est donc au-dessus
 * de la barre, en toutes lettres et avec ses comptes, plutôt que replié dans un sélecteur.
 */
async function LibraryControls({
  searchParams,
}: {
  searchParams: PageProps<"/library">["searchParams"];
}) {
  const { includeAdult } = await getPreferences();
  const filters = await loadLibraryFilters(searchParams);

  /*
    Une seule lecture désormais : le vocabulaire des genres partait avec elle, et il n'a plus de
    sélecteur à remplir depuis que le filtre a quitté la barre (`library-filter-bar.tsx`).
  */
  const counts = await getLibraryStatusCounts({ filters, includeAdult });

  return (
    <div className="flex flex-col gap-4">
      <LibraryStatusRow counts={counts} filters={filters} />
      <LibraryFilterBar />
    </div>
  );
}

/**
 * Le squelette des contrôles, aux proportions de ce qu'il annonce : sept onglets, puis la barre.
 *
 * **La charpente est celle de `FilterBar`, classe pour classe** — `gap-3` entre les rangées,
 * `sm:flex-1` sur le champ, et surtout `flex-wrap` sur les sélecteurs. Sans ce dernier, le
 * squelette tenait ses deux sélecteurs sur une ligne de 376 px là où la vraie barre les replie en
 * dessous de `sm` : en 390, la barre gagnait une rangée au remplacement et toute la grille
 * descendait.
 */
function LibraryControlsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_SKELETON_WIDTHS.map(({ key, className }) => (
          <Skeleton className={className} key={key} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
            <Skeleton className="h-9 w-full sm:max-w-md sm:flex-1" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-9 w-52" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sept onglets — « Tout » et les six statuts — **à la largeur de leur intitulé**.
 *
 * Sept cases identiques se replient autrement que sept cases inégales : c'est le nombre de rangées
 * de la bande, donc sa hauteur, qui en dépend sur un écran étroit. Les largeurs suivent l'ordre de
 * `LIBRARY_STATUS_OPTIONS`, pastille et compteur compris.
 */
const STATUS_SKELETON_WIDTHS = [
  { key: "tout", className: "h-8 w-20 rounded-md" },
  { key: "en-cours", className: "h-8 w-32 rounded-md" },
  { key: "termine", className: "h-8 w-30 rounded-md" },
  { key: "en-pause", className: "h-8 w-30 rounded-md" },
  { key: "abandonne", className: "h-8 w-32 rounded-md" },
  { key: "prevu", className: "h-8 w-24 rounded-md" },
  { key: "relecture", className: "h-8 w-32 rounded-md" },
];

/**
 * La grille, et la pagination qui en dépend.
 *
 * Les deux viennent de la **même** lecture : la pagination a besoin du total pour savoir combien de
 * crans afficher, et la page réellement servie peut différer de celle demandée quand l'adresse en
 * réclame une qui n'existe plus. Les séparer en deux requêtes ferait compter la base deux fois pour
 * répondre à la même question, et laisserait les deux se contredire le jour où l'une changerait.
 */
async function LibraryResults({
  searchParams,
}: {
  searchParams: PageProps<"/library">["searchParams"];
}) {
  const { includeAdult, titleLanguage } = await getPreferences();
  const filters = await loadLibraryFilters(searchParams);
  const { items, page, pageCount } = await getLibrary({
    filters,
    includeAdult,
  });

  /*
    **Les deux vides sont maintenant distingués** (7 septembre 2026), et l'écran ne rend plus `null`
    — une page blanche sous la barre se lisait comme une panne.

    Ils se séparent sans requête de plus : si aucun filtre n'est posé et qu'il n'y a rien, c'est que
    la bibliothèque est neuve ; sinon c'est cette question-là qui n'a pas de réponse, et le geste à
    proposer est de la desserrer. Compter les lignes pour trancher aurait coûté une seconde lecture
    à chaque affichage pour n'apprendre que ce que l'adresse dit déjà.

    Le terme compte comme un filtre : chercher « frieren » dans une bibliothèque qui n'en contient
    pas est un vide de recherche, pas une bibliothèque neuve.
  */
  if (items.length === 0) {
    const term = filters.q.trim();
    const filtered =
      term !== "" || filters.status !== null || filters.type !== null;

    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            {filtered
              ? term
                ? `Rien pour « ${term} »`
                : "Rien sous ce filtre"
              : "Votre bibliothèque est vide"}
          </EmptyTitle>

          <EmptyDescription>
            {filtered
              ? "Aucune œuvre suivie ne correspond. Élargissez le filtre, ou cherchez dans le catalogue."
              : "Suivez une première œuvre depuis le catalogue : elle apparaîtra ici avec sa progression."}
          </EmptyDescription>
        </EmptyHeader>

        {/*
          Deux sorties différentes pour deux vides différents. Sur une bibliothèque neuve, il n'y a
          rien à desserrer : le seul geste utile est d'aller au catalogue. Sur un filtre trop
          étroit, `serializeLibraryFilters` omet les défauts, donc repartir d'un objet vide rend
          exactement `/library`.
        */}
        <Button asChild variant="outline">
          <Link
            href={
              filtered
                ? serializeLibraryFilters(routes.library, {
                    q: "",
                    status: null,
                    type: null,
                    sort: filters.sort,
                    view: filters.view,
                    page: 1,
                  })
                : routes.search
            }
          >
            {filtered ? "Voir toute ma bibliothèque" : "Parcourir le catalogue"}
          </Link>
        </Button>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CatalogueGrid>
        {items.map((item, index) => (
          <MediaCard
            /*
              L'action posée sur la jaquette, remplie par l'appelant — même contrat que `marker`
              juste en dessous. `MediaCard` ne connaît ni `EntryStatus` ni la notion de suivi : elle
              pose l'emplacement et le geste, et laisse `/library` décider de ce qu'il porte.

              C'est aussi ce qui garde la grille hors du bundle client : seul ce bouton et sa
              fenêtre y partent, pas les vingt et une cartes qui les entourent.
            */
            action={
              /*
                **Le « +1 » accompagne la fenêtre depuis le 14 septembre 2026**, ici comme sur
                l'accueil et `/search`. C'est l'écran où il paie le plus : chaque ligne de cette
                grille est une œuvre suivie, donc chaque carte le porte.
              */
              <EntryQuickActions
                mediaId={item.media.id}
                progress={item.entry.progress}
                total={item.total}
                tracked
                unit={item.unit}
              >
                <EntryQuickEdit
                  banner={item.banner}
                  compact
                  entry={item.entry}
                  mediaId={item.media.id}
                  title={mediaTitle(item.media.title, titleLanguage)}
                  total={item.total}
                  unit={item.unit}
                />
              </EntryQuickActions>
            }
            key={item.media.id}
            /*
              La pastille de statut, à gauche du titre. C'est sur l'onglet « Tout » qu'elle paie :
              les six statuts y sont mêlés, et sans elle il faut ouvrir une fiche pour savoir si
              une œuvre est en cours ou abandonnée depuis trois ans.

              `labelled` reste à sa valeur par défaut : ici la pastille est **seule**, donc elle
              porte son nom en texte caché — une couleur ne se lit ni au lecteur d'écran, ni quand
              on ne distingue pas le vert du rouge.
            */
            marker={<EntryStatusDot status={item.entry.status} />}
            media={item.media}
            // La première rangée au palier le plus large : c'est tout ce qui est au-dessus de la
            // ligne de flottaison, et la première de ces jaquettes porte la mesure de LCP.
            priority={index < WIDEST_COLUMN_COUNT}
            titleLanguage={titleLanguage}
          />
        ))}
      </CatalogueGrid>

      {/*
        L'adresse est bâtie avec les parseurs qui la reliront : l'aller-retour est garanti, les
        valeurs par défaut sont omises, et tous les autres filtres sont conservés. La pagination,
        elle, ne sait rien de ce contrat — c'est ce qui lui permet de servir aussi `/search`.
      */}
      <CataloguePagination
        hrefFor={(target) =>
          serializeLibraryFilters(routes.library, { ...filters, page: target })
        }
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
