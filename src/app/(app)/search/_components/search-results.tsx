import { SearchXIcon } from "lucide-react";

import { MediaGrid } from "@/components/shared/media-grid";
import { Pagination } from "@/components/shared/pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routes } from "@/config/routes";
import { MediaCard } from "@/features/media/components/media-card";
import {
  formatMediaFormat,
  formatSeason,
} from "@/features/media/lib/media-format";
import {
  loadSearchFilters,
  serializeSearchFilters,
} from "@/features/media/lib/search-params";
import { searchFormSchema } from "@/features/media/schemas/search-media.schema";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Résultats de recherche, rendus côté serveur.
 *
 * Ce composant est celui qu'on suspend : il attend `searchParams` **et** la réponse d'AniList. La
 * page, elle, n'attend rien et part immédiatement.
 *
 * Deux étapes bien distinctes, et l'ordre compte :
 *
 * 1. `loadSearchFilters` décode l'URL avec **les parseurs de la barre de filtres** — pas un
 *    décodage maison qui finirait par diverger de ce que le client écrit.
 * 2. `searchFormSchema` valide le résultat pour AniList. Il **exclut `includeAdult`**, donc un
 *    paramètre forgé à la main ne peut pas désactiver le filtre 18+.
 */
export async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = await loadSearchFilters(searchParams);

  /**
   * Le 18+ vient **de la préférence du compte, pas de l'URL** : `searchFormSchema` exclut
   * `includeAdult` de ce qui se lit dans l'adresse (voir `search-params.ts`), donc un paramètre
   * forgé à la main ne peut pas desserrer le filtre.
   */
  const { includeAdult } = await getPreferences();

  const parsed = searchFormSchema.safeParse({
    search: filters.q || undefined,
    type: filters.type ?? undefined,
    status: filters.status ?? undefined,
    genres: filters.genre.length > 0 ? filters.genre : undefined,
    tags: filters.tag.length > 0 ? filters.tag : undefined,
    sortField: filters.sort,
    sortDirection: filters.dir,
    page: filters.page,
    includeAdult,
  });

  // Le loader a déjà ramené les valeurs invalides à leurs défauts ; ce repli couvre ce qu'il ne
  // connaît pas — un genre de 300 caractères, par exemple. Il passe par le schéma lui-même, pour
  // que les défauts restent définis à un seul endroit.
  const input = parsed.success ? parsed.data : searchFormSchema.parse({});

  const { media, pageInfo } = await searchMedia(input);

  if (media.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>Aucun résultat</EmptyTitle>
          <EmptyDescription>
            {input.search
              ? `Rien ne correspond à « ${input.search} ». Essayez avec moins de mots, ou relâchez un filtre.`
              : "Aucune œuvre ne correspond à ces filtres."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {pageInfo.total ? (
        <p className="text-muted-foreground text-sm">
          {pageInfo.total.toLocaleString("fr-FR")}{" "}
          {pageInfo.total > 1 ? "résultats" : "résultat"}
        </p>
      ) : null}

      <MediaGrid>
        {media.map((item) => (
          <li key={item.id}>
            <MediaCard
              media={item}
              meta={[
                formatMediaFormat(item.format),
                formatSeason(null, item.seasonYear),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </li>
        ))}
      </MediaGrid>

      {/*
        L'adresse est construite par `serializeSearchFilters`, donc avec les parseurs qui ont servi
        à lire l'URL. L'assembler à la main marcherait aujourd'hui et casserait le jour où un filtre
        change de sérialisation.
      */}
      <Pagination
        currentPage={pageInfo.currentPage ?? 1}
        // AniList laisse le champ à `null` quand il ne sait pas : on retombe alors sur le calcul
        // par défaut du composant, plutôt que de traiter « inconnu » comme « il n'y en a pas ».
        hasNextPage={pageInfo.hasNextPage ?? undefined}
        hrefForPage={(page) =>
          serializeSearchFilters(routes.search, { ...filters, page })
        }
        lastPage={pageInfo.lastPage ?? pageInfo.currentPage ?? 1}
      />
    </div>
  );
}
