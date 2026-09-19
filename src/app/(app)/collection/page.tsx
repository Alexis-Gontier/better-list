import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ShelfRows } from "@/app/(app)/collection/_components/shelf-rows";
import { ShelfStateRow } from "@/app/(app)/collection/_components/shelf-state-row";
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
import { loadCollectionFilters } from "@/features/collection/lib/collection-params";
import {
  getShelf,
  summarizeShelf,
} from "@/features/collection/server/collection.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export const metadata: Metadata = {
  title: "Ma collection",
  description:
    "Mon étagère : les séries que je possède en papier, et les tomes qui manquent.",
};

/**
 * `/collection` — mon étagère : une rangée par série, la réglette des tomes, les manquants écrits.
 *
 * Trois formes ont été dessinées côte à côte le 19 septembre 2026 ; celle-ci a été retenue parce
 * qu'elle est la seule à répondre à « il me manque lesquels ? » **sans qu'on ouvre une série**.
 * Une grille de jaquettes montre ce qu'on possède déjà ; l'écran doit montrer ce qui manque
 * (docs/PRODUCT.md §8 item 8). Les deux autres sont décrites dans le journal.
 *
 * **Tout vient de la base, rien d'AniList** : il n'a aucune donnée au niveau du tome (§9). C'est
 * le seul écran du produit sans quota ni repli de panne à prévoir.
 *
 * La page **n'attend rien elle-même** : elle passe la promesse des `searchParams` à ses enfants.
 * Lire l'adresse ici rendrait la route dynamique en entier et ferait perdre le titre au prérendu.
 */
export default function CollectionPage({
  searchParams,
}: PageProps<"/collection">) {
  return (
    <div className="flex flex-col gap-6">
      {/*
        L'écart est porté par la colonne, pas par le trait — même règle que `/search`, `/library`
        et la fiche : une marge posée sur un séparateur lui ferait dicter l'espacement de ses deux
        voisins.
      */}
      <div className="flex flex-col gap-4">
        <PageHeading
          description="Les séries que je possède en papier, et les tomes qu'il me manque."
          title="Ma collection"
        />
        <Separator />

        <Suspense fallback={<ShelfControlsSkeleton />}>
          <ShelfControls searchParams={searchParams} />
        </Suspense>

        <Separator />
      </div>

      <Suspense fallback={<ShelfRowsSkeleton />}>
        <Shelf searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * La tête de l'écran : les chiffres de l'étagère, puis la rangée d'états.
 *
 * Les deux viennent de la **même** lecture — l'étagère entière — et sont donc sous la même
 * frontière : les séparer ferait compter deux fois la même chose, et laisserait un jour les
 * quatre chiffres contredire les trois onglets.
 */
async function ShelfControls({
  searchParams,
}: {
  searchParams: PageProps<"/collection">["searchParams"];
}) {
  const [filters, shelf] = await Promise.all([
    loadCollectionFilters(searchParams),
    getShelf("all"),
  ]);

  const summary = summarizeShelf(shelf);

  return (
    <div className="flex flex-col gap-4">
      {/*
        Les statistiques d'étagère de PRODUCT.md §8 item 12, dans leur forme la plus courte :
        quatre nombres sur une ligne. **Le budget cumulé n'y est pas** — `price` n'est plus rempli
        par aucun écran depuis le 19 septembre 2026, et une somme toujours nulle serait un chiffre
        faux.
      */}
      <p className="text-muted-foreground text-sm tabular-nums">
        {summary.volumeCount} tomes · {summary.seriesCount} séries ·{" "}
        {summary.completeCount} complètes · {summary.missingCount} tomes
        manquants
      </p>

      {/*
        Les décomptes des onglets se déduisent du résumé : `all` est le nombre de séries,
        `complete` celui des complètes, et `incomplete` la différence. Une seconde lecture pour
        les obtenir compterait la même étagère deux fois, et les deux finiraient par diverger.
      */}
      <ShelfStateRow
        counts={{
          all: summary.seriesCount,
          incomplete: summary.seriesCount - summary.completeCount,
          complete: summary.completeCount,
        }}
        filters={filters}
      />
    </div>
  );
}

/**
 * L'étagère filtrée.
 *
 * Elle relit `searchParams` de son côté plutôt que de recevoir un filtre déjà décodé : lire
 * l'adresse au niveau de la page annulerait toutes les frontières posées dessous.
 */
async function Shelf({
  searchParams,
}: {
  searchParams: PageProps<"/collection">["searchParams"];
}) {
  const { titleLanguage } = await getPreferences();
  const filters = await loadCollectionFilters(searchParams);
  const shelf = await getShelf(filters.state);

  /*
    Deux vides, et ils ne se ressemblent pas. Une étagère neuve n'a rien à desserrer : le seul
    geste utile est d'aller chercher une série au catalogue. Un filtre sans réponse, lui, se
    desserre — et « aucune série incomplète » est une bonne nouvelle, pas une panne, d'où le
    libellé qui le dit.

    Les deux se séparent sans lecture de plus : si aucun filtre n'est posé et qu'il n'y a rien,
    l'étagère est vide ; sinon c'est cette question-là qui n'a pas de réponse.
  */
  if (shelf.length === 0) {
    const filtered = filters.state !== "all";

    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            {filtered
              ? filters.state === "incomplete"
                ? "Aucune série incomplète"
                : "Aucune série complète"
              : "Votre étagère est vide"}
          </EmptyTitle>
          <EmptyDescription>
            {filtered
              ? "Rien ne manque sous ce filtre. Voir toute l'étagère pour retrouver vos séries."
              : "Ouvrez un manga du catalogue, puis « Ma collection » depuis sa fiche, et cochez les tomes que vous possédez : la série apparaîtra ici avec ce qu'il vous reste à acheter."}
          </EmptyDescription>
        </EmptyHeader>

        <Button asChild variant="outline">
          <Link href={filtered ? routes.collection.root : routes.search}>
            {filtered ? "Voir toute l'étagère" : "Parcourir le catalogue"}
          </Link>
        </Button>
      </Empty>
    );
  }

  return <ShelfRows shelf={shelf} titleLanguage={titleLanguage} />;
}

/**
 * Le repli des contrôles : la ligne de chiffres, puis les trois onglets.
 *
 * Les largeurs suivent les intitulés de `COLLECTION_STATE_OPTIONS`, compteur compris — trois cases
 * identiques se replieraient autrement que trois cases inégales sur un écran étroit.
 */
function ShelfControlsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* `h-5` : la ligne de chiffres est en `text-sm`, dont l'interligne fait 20 px. */}
      <Skeleton className="h-5 w-80 max-w-full" />
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-26 rounded-md" />
        <Skeleton className="h-8 w-34 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Le repli de l'étagère, **aux proportions exactes d'une rangée** : la vignette en 2:3 sur 48 px,
 * le titre en `text-sm` (donc `h-5`), la ligne d'édition en `text-xs` (`h-4`), la réglette à sa
 * hauteur de case (`h-3.5`) et la phrase des manquants en `text-xs`.
 *
 * Six rangées : c'est ce qu'un écran de 1000 px montre, et annoncer plus ferait remonter la page
 * au remplacement.
 */
function ShelfRowsSkeleton() {
  return (
    <div className="flex flex-col">
      {SKELETON_KEYS.map((key) => (
        <div className="flex gap-4 border-b py-4 last:border-b-0" key={key}>
          <Skeleton className="aspect-2/3 w-12 shrink-0 self-start rounded-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <Skeleton className="h-5 w-52 max-w-full" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

const SKELETON_KEYS = Array.from({ length: 6 }, (_, index) => `row-${index}`);
