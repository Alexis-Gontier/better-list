import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SearchFilterBar } from "@/app/(app)/search/_components/search-filter-bar";
import { getYearBounds } from "@/app/(app)/search/_lib/year-bounds";
import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
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
import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import { routes } from "@/config/routes";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import {
  EMPTY_FILTERS,
  loadSearchFilters,
  mostSelectiveFacet,
  resolveSort,
  serializeSearchFilters,
} from "@/features/media/lib/search-params";
import { searchMediaInMirror } from "@/features/media/server/media.mirror";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";

export const metadata: Metadata = {
  title: "Rechercher",
  description: "Chercher un anime, un manga, un webtoon ou un light novel.",
};

/**
 * La recherche — la barre, ses facettes, la grille et sa pagination.
 *
 * C'est le même écran que `/library`, et c'est le sujet : les deux étaient écrits deux fois avant
 * la mise à blanc (voir l'historique git). Ils partagent la carte, la grille, la coquille de la barre et la
 * pagination (`components/shared/`), et ne diffèrent que par ce qui les distingue réellement — la
 * source. Ici AniList et ses trente requêtes par minute ; là-bas mes lignes `Entry`, en base.
 *
 * **Le repli sur le miroir local est branché**, et ce n'est pas théorique : AniList a coupé son API
 * en pleine journée le 15 août puis le 5 septembre 2026. Quand elle ne répond pas, la grille est
 * servie depuis la copie locale et l'écran dit ce qu'il y perd — un repli muet laisse croire à un
 * résultat.
 */
export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
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
        <PageHeading
          description="Tout le catalogue AniList — animes, mangas, webtoons et light novels. Ce qui est déjà dans ma bibliothèque porte sa pastille."
          title="Rechercher"
        />
        <Separator />
        <SearchFilterBar yearBounds={yearBounds} />
        <Separator />
      </div>

      {/*
        La grille est **suspendue** et la coquille ne l'attend pas : la barre de filtres est du HTML
        statique, elle n'a aucune raison d'attendre AniList pour s'afficher. Une frontière par zone,
        jamais de `loading.tsx` de segment (CLAUDE.md).
      */}
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
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const { includeAdult, titleLanguage } = await getPreferences();
  const filters = await loadSearchFilters(searchParams);

  /*
    Le tri **effectif**, pas celui de l'URL : sans terme de recherche, `SEARCH_MATCH` n'a rien à
    comparer et `resolveSort` bascule sur les tendances. C'est la même fonction qu'appelle la barre
    pour afficher sa valeur, donc le sélecteur annonce exactement ce que la grille sert.
  */
  const sort = resolveSort({ q: filters.q, sort: filters.sort });

  const result = await searchMedia({
    search: filters.q.trim() || undefined,
    type: filters.type ?? undefined,
    formats: filters.format.length > 0 ? filters.format : undefined,
    countryOfOrigin: filters.country ?? undefined,
    status: filters.status ?? undefined,
    genres: filters.genre.length > 0 ? filters.genre : undefined,
    tags: filters.tag.length > 0 ? filters.tag : undefined,
    season: filters.season ?? undefined,
    seasonYear: filters.year ?? undefined,
    yearMin: filters.yearMin ?? undefined,
    yearMax: filters.yearMax ?? undefined,
    minimumScore: filters.score ?? undefined,
    page: filters.page,
    perPage: CATALOGUE_PAGE_SIZE,
    sortField: sort,
    sortDirection: filters.dir,
    includeAdult,
  });

  /*
    `null` veut dire « AniList n'a pas répondu » — et rien d'autre : une recherche sans résultat
    rend une page vide, pas un échec. C'est la distinction que `tryAniList` préserve, et c'est elle
    qui permet de ne se replier que sur une vraie panne.
  */
  const fallback = result
    ? null
    : await searchMediaInMirror({
        filters,
        includeAdult,
        page: filters.page,
        perPage: CATALOGUE_PAGE_SIZE,
      });

  const { items, page, pageCount } = result ?? fallback ?? EMPTY_RESULT;

  /*
    **Trois vides, trois messages** (.claude/skills/anilist-read/references/recherche-filtres.md §5). Rendre `null`, ce que cet écran
    faisait jusqu'au 7 septembre 2026, laissait une page blanche sous la barre — et une page blanche
    se lit comme une panne, pas comme une recherche sans réponse.

    Le cas « aucun terme, aucune facette » n'est pas ici : sans terme, `resolveSort` bascule sur les
    tendances et la grille est pleine. S'il n'y a malgré tout rien à montrer, c'est qu'AniList et le
    miroir sont muets tous les deux — le troisième message le dit, sans prétendre que la question
    était mauvaise.
  */
  if (items.length === 0) {
    const facet = mostSelectiveFacet(filters);
    const term = filters.q.trim();

    return (
      /*
        Le rapport est ici **aussi**, et pas seulement sur la branche pleine : une panne qui ne
        ramène rien est précisément le moment où le bandeau doit apparaître. L'oublier ici l'aurait
        réservé aux recherches qui trouvent quelque chose.
      */
      <>
        <ReportAniListStatus down={fallback !== null} />

        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {term ? `Rien pour « ${term} »` : "Rien à montrer"}
            </EmptyTitle>

            <EmptyDescription>
              {facet
                ? `Aucune œuvre ne réunit tout ce qui est demandé. Essayez sans ${facet.label}.`
                : term
                  ? "Aucune œuvre ne porte ce titre. Vérifiez l'orthographe, ou cherchez le titre original."
                  : "Le catalogue n'a rien renvoyé. Réessayez dans un moment."}
            </EmptyDescription>
          </EmptyHeader>

          {/*
          Un lien et non un bouton : retirer une facette est une adresse, comme chaque cran de la
          pagination. Il se copie, il s'ouvre dans un onglet, et il traverse le rechargement.

          `next/link` et non `<a>`, pour la raison écrite dans `ui/pagination.tsx` : l'ancre nue
          rejouerait la coquille entière là où seule la grille change.

          `page: 1` parce qu'on élargit : rester à la page 4 d'une recherche qu'on vient de changer
          rendrait un second vide, et donnerait à croire que le geste n'a rien fait.
        */}
          {facet ? (
            <Button asChild variant="outline">
              <Link
                href={serializeSearchFilters(routes.search, {
                  ...filters,
                  ...Object.fromEntries(
                    facet.keys.map((key) => [key, EMPTY_FILTERS[key]]),
                  ),
                  page: 1,
                })}
              >
                Retirer {facet.label}
              </Link>
            </Button>
          ) : null}
        </Empty>
      </>
    );
  }

  /*
    **La pastille de suivi sur les résultats du catalogue — « annoter plutôt que filtrer ».**

    C'est l'issue 1 de .claude/skills/anilist-read/references/recherche-filtres.md §2, celle que le document recommande comme « la
    seule qui ne coûte rien et ne mente jamais ». Filtrer `/search` sur nos propres lignes trouerait
    une page qu'AniList a déjà découpée : grille à trous, page 2 qui répète la page 1, compteur
    faux. La pastille répond à la même question — « est-ce que je l'ai déjà, et où j'en suis ? » —
    sans toucher à la pagination.

    **Elle part après les résultats et pas en parallèle**, parce qu'elle a besoin de leurs ids : on
    ne sait pas quoi annoter avant de savoir ce qu'on affiche. Une seule requête pour les vingt et
    un, en base, sur l'index d'unicité `[userId, mediaId]` — elle ne pèse pas sur le quota AniList,
    qui est la seule ressource comptée ici.
  */
  const entries = await getLibraryEntriesFor(items.map((item) => item.id));

  return (
    <div className="flex flex-col gap-8">
      {/*
        **Ce que cette recherche vient d'apprendre de la santé d'AniList.**

        Le layout ne lit `isAniListDown()` qu'au rendu **serveur** : une navigation client ne le
        rejoue pas. Sans ce rapport, `/media/[id]` était le seul écran à tenir le bandeau à jour —
        arriver ici depuis une fiche saine, qui vient de rapporter « tout va bien », laissait donc
        le bandeau masqué en pleine panne. Et `/search` est justement l'autre écran qui interroge
        AniList : il a de quoi répondre.

        Il se pose **dans les deux sens**, comme la fiche : `fallback` non nul veut dire qu'on a
        constaté la panne, `null` qu'AniList a répondu — et fait disparaître le bandeau.
      */}
      <ReportAniListStatus down={fallback !== null} />

      {/*
        Le bandeau de panne, lui, est global et vient du layout : ce mot-ci dit ce que **cette
        recherche** a perdu, ce que le bandeau ne peut pas savoir. Les deux ne font pas doublon —
        l'un annonce l'incident, l'autre ses conséquences sur la question posée.
      */}
      {fallback && fallback.lost.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Résultats servis depuis la copie locale
          {fallback.lost.includes("tags") ? ", sans le filtre par tags" : ""}
          {fallback.lost.includes("sort")
            ? ", et sans le tri demandé — le miroir ne connaît ni les tendances ni la popularité"
            : ""}
          .
        </p>
      ) : null}

      <CatalogueGrid>
        {items.map((item, index) => {
          const entry = entries.get(item.id) ?? null;

          return (
            <MediaCard
              key={item.id}
              /*
                **La même fenêtre que sur `/library`**, et le catalogue est son deuxième appelant —
                c'est ce qui l'a fait monter dans `features/tracking/components/`.

                `entry` vaut `null` quand l'œuvre n'est pas encore suivie, et la fenêtre le sait :
                elle part alors de l'entrée neuve, et son bouton dit « Ajouter » au lieu de
                « Modifier ». C'est le seul écart entre les deux écrans, et il est dans le
                vocabulaire, pas dans la mécanique.
              */
              action={
                <EntryQuickEdit
                  banner={item.bannerImage}
                  cover={item.coverImage?.large ?? null}
                  compact
                  entry={entry}
                  mediaId={item.id}
                  title={mediaTitle(item.title, titleLanguage)}
                  total={item.type === "ANIME" ? item.episodes : item.chapters}
                  unit={item.type === "ANIME" ? "episode" : "chapitre"}
                />
              }
              /*
                **Rien du tout quand l'œuvre n'est pas suivie**, et c'est la moitié de
                l'information. Sur un catalogue, la plupart des résultats ne sont dans aucune
                bibliothèque : une pastille neutre sur chaque carte ferait du marqueur un ornement,
                et il faudrait la lire pour apprendre qu'elle ne dit rien. L'absence se remarque
                justement parce qu'elle est le cas courant.
              */
              marker={
                entry ? <EntryStatusDot status={entry.status} /> : undefined
              }
              media={item}
              priority={index < WIDEST_COLUMN_COUNT}
              titleLanguage={titleLanguage}
            />
          );
        })}
      </CatalogueGrid>

      <CataloguePagination
        hrefFor={(target) =>
          serializeSearchFilters(routes.search, { ...filters, page: target })
        }
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}

/**
 * Ce qu'on rend quand ni AniList ni le miroir n'ont donné quoi que ce soit.
 *
 * Une constante plutôt qu'un troisième `if` : les deux chemins produisent déjà la même forme, et le
 * cas « les deux ont échoué » n'a pas besoin d'une branche à lui. Le repli sur le miroir ne peut
 * pas rendre `null`, donc cette valeur n'est atteinte que si le calcul change un jour — elle est là
 * pour que ce jour-là le type le dise, pas pour couvrir un cas d'aujourd'hui.
 */
const EMPTY_RESULT = { items: [], page: 1, pageCount: 1 } as const;
