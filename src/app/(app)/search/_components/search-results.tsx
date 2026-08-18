import { SearchXIcon } from "lucide-react";

import { MediaGrid, MediaList } from "@/components/shared/media-grid";
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
import { MediaRow } from "@/features/media/components/media-row";
import {
  formatMediaFormat,
  formatMediaStatus,
  formatSeason,
} from "@/features/media/lib/media-format";
import {
  loadSearchFilters,
  resolveSort,
  serializeSearchFilters,
} from "@/features/media/lib/search-params";
import { searchFormSchema } from "@/features/media/schemas/search-media.schema";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryCardActions } from "@/features/tracking/components/entry-card-actions";
import { getEntryStatesFor } from "@/features/tracking/server/tracking.queries";

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
 *
 * Entre les deux, `resolveSort` : une page d'arrivée sans terme de recherche ouvre sur les
 * tendances plutôt que sur l'ordre interne d'AniList. La règle est pure et partagée avec la barre
 * de filtres, pour que le sélecteur affiche le tri qui est réellement servi.
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

  const sortField = resolveSort(filters);

  const parsed = searchFormSchema.safeParse({
    search: filters.q || undefined,
    type: filters.type ?? undefined,
    status: filters.status ?? undefined,
    genres: filters.genre.length > 0 ? filters.genre : undefined,
    tags: filters.tag.length > 0 ? filters.tag : undefined,
    season: filters.season ?? undefined,
    seasonYear: filters.year ?? undefined,
    sortField,
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

  /**
   * Ce que ce compte suit déjà, parmi les résultats affichés.
   *
   * Une requête locale pour toute la page, après AniList et non avant : elle ne porte que sur les
   * ids réellement rendus. Sans elle, la vignette ne pourrait proposer que « suivre », y compris sur
   * une série déjà en cours — où le geste écraserait un statut et une progression.
   */
  const entries = await getEntryStatesFor(media.map((item) => item.id));

  const items = media.map((item) => ({
    key: item.id,
    media: item,
    genres: item.genres,
    /**
     * La même commande dans les deux vues : « suivre » sur une œuvre inconnue, « +1 » et la fenêtre
     * sur une œuvre suivie. C'est `EntryCardActions` qui tranche selon `entry`, et c'est ce qui
     * empêche la bascule grille/liste de perdre un bouton en chemin.
     */
    action: (
      <EntryCardActions
        bannerImage={item.bannerImage}
        entry={entries.get(item.id) ?? null}
        media={item}
        total={mediaTotalUnits(item)}
      />
    ),
    /**
     * La liste a de la place en largeur là où la grille en manque : elle gagne le statut de
     * publication, qui distingue une série en cours d'une série terminée sans ouvrir la fiche.
     */
    listMeta: [
      formatMediaFormat(item.format),
      formatSeason(null, item.seasonYear),
      formatMediaStatus(item.status),
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <div className="space-y-6">
      {/*
        Deux en-têtes, parce qu'il y a deux situations. Un décompte répond à une recherche — « 41
        résultats » dit si le filtre a mordu. Il ne dit rien d'une page d'arrivée : « 24 918
        résultats » sous les tendances est un nombre exact et sans usage. On y met donc ce qui
        manque vraiment, c'est-à-dire ce qu'on regarde et comment en sortir.
      */}
      {sortField === filters.sort ? (
        pageInfo.total ? (
          <p className="text-muted-foreground text-sm">
            {pageInfo.total.toLocaleString("fr-FR")}{" "}
            {pageInfo.total > 1 ? "résultats" : "résultat"}
          </p>
        ) : null
      ) : (
        <div className="space-y-0.5">
          <h2 className="font-semibold text-base">Tendances du moment</h2>
          <p className="text-muted-foreground text-sm">
            Ce que le reste du monde regarde. Tapez un titre pour chercher, ou
            changez le tri.
          </p>
        </div>
      )}

      {filters.view === "list" ? (
        <MediaList>
          {items.map((item) => (
            <MediaRow
              action={item.action}
              genres={item.genres}
              key={item.key}
              media={item.media}
              meta={item.listMeta}
            />
          ))}
        </MediaList>
      ) : (
        <MediaGrid>
          {items.map((item) => (
            <li key={item.key}>
              {/*
                Pas de ligne de contexte en grille : « Série TV · 2026 » se répétait sous vingt-quatre
                jaquettes pour dire ce qu'on ne cherchait pas. Le format et l'année restent en vue
                liste, où la largeur les rend comparables d'une ligne à l'autre, et sur la fiche.
              */}
              {/*
                Le synopsis et les genres ne descendent **que** dans l'encart de survol : le
                document de recherche les rapporte déjà pour la vue liste, donc les passer ne coûte
                aucune requête de plus. C'est le seul écran de l'application où l'on parcourt des
                œuvres qu'on ne connaît pas encore — celui où « de quoi ça parle ? » se pose à
                chaque vignette.
              */}
              <MediaCard
                action={item.action}
                description={item.media.description}
                genres={item.genres}
                media={item.media}
              />
            </li>
          ))}
        </MediaGrid>
      )}

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
