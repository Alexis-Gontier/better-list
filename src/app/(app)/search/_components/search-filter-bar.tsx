"use client";

import { debounce } from "nuqs";

import { SearchFilterPanel } from "@/app/(app)/search/_components/search-filter-panel";
import type { YearBounds } from "@/app/(app)/search/_lib/year-bounds";
import {
  type ActiveFilterChip,
  type FacetOption,
  FilterBar,
  FilterSearchField,
  FilterSelect,
  labelOf,
} from "@/components/shared/filter-bar";
import { SortDirectionButton } from "@/components/shared/sort-direction-button";
import { formatGenre } from "@/features/media/lib/media-format";
import {
  COUNTRY_OPTIONS,
  EMPTY_FILTERS,
  FORMAT_OPTIONS,
  resolveSort,
  SEASON_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  searchFilterParsers,
  TYPE_OPTIONS,
} from "@/features/media/lib/search-params";
import {
  type SortField,
  sortFieldHasDirection,
} from "@/features/media/schemas/search-media.schema";
import { useUrlFilters } from "@/hooks/use-url-filters";

/**
 * La barre de la recherche — le terme, le type, le tri, et le panneau de facettes qu'elle déplie.
 *
 * **Elle écrit dans l'URL, et c'est tout ce qu'elle fait.** Aucune requête n'est déclenchée ici :
 * c'est la page qui relit l'adresse et interroge AniList. L'URL *est* le contrat
 * (`features/media/lib/search-params.ts`), et les parseurs viennent de lui plutôt que d'être
 * redéclarés — c'est le même module que lit le composant de résultats côté serveur, donc ce que la
 * barre écrit est exactement ce que la grille relira.
 *
 * **La mise en page, elle, n'est plus ici** : la rangée, le champ, les sélecteurs étiquetés, le
 * bouton dépliant et les puces actives vivent dans `components/shared/filter-bar.tsx` depuis que
 * `/library` a demandé la même coquille. Ce fichier ne garde que ce qui connaît le catalogue —
 * quelles facettes existent, comment elles se nomment, et laquelle est posée.
 */

/**
 * Le type d'œuvre, dérivé de la liste d'options plutôt que recopié.
 *
 * `FilterSelect` restreint déjà sa sortie aux valeurs qu'on lui passe ; ce type nomme le résultat
 * pour que `update` le reçoive tel que le parseur l'attend, sans cast au point d'appel.
 */
type MediaKind = (typeof TYPE_OPTIONS)[number]["value"];

/**
 * Ce que la barre et son panneau pilotent. Seul `view` attend encore son contrôle.
 *
 * `tag` y figure sans être piloté par rien : aucun contrôle ne l'écrit — il attend
 * `MediaTagCollection` —, mais une adresse peut le porter, et « Tout effacer » doit pouvoir
 * l'emporter. Un paramètre qu'on sait poser et qu'on ne sait pas retirer est un piège.
 *
 * Un seul `useQueryStates` pour les deux : le panneau est un enfant, pas un écran. Lui donner son
 * propre branchement sur l'URL ferait deux écritures concurrentes sur la même adresse, et la
 * remise à la page 1 devrait être répétée des deux côtés.
 */
const barParsers = {
  q: searchFilterParsers.q,
  type: searchFilterParsers.type,
  status: searchFilterParsers.status,
  format: searchFilterParsers.format,
  country: searchFilterParsers.country,
  season: searchFilterParsers.season,
  genre: searchFilterParsers.genre,
  yearMin: searchFilterParsers.yearMin,
  yearMax: searchFilterParsers.yearMax,
  score: searchFilterParsers.score,
  sort: searchFilterParsers.sort,
  /** La direction du tri — le contrat la portait déjà, aucun contrôle ne l'écrivait. */
  dir: searchFilterParsers.dir,
  tag: searchFilterParsers.tag,
  page: searchFilterParsers.page,
};

/**
 * Les valeurs de remise à zéro, prises dans `EMPTY_FILTERS` et non réécrites.
 *
 * Les clés sont énumérées à la main parce que le contrat en porte plus que la barre n'en pilote :
 * y passer `EMPTY_FILTERS` entier ferait écrire à nuqs des paramètres dont il n'a pas les
 * parseurs. C'est la liste qui grandira avec les contrôles, et le compilateur la tient — une clé
 * ajoutée ici sans parseur ne compile pas.
 *
 * `year` n'y est pas et n'est plus piloté par rien : le curseur l'a remplacé par `yearMin` /
 * `yearMax`. Son parseur reste au contrat pour qu'une adresse déjà partagée continue de se relire
 * (STATE.md, « les contrats d'URL »), mais aucun contrôle ne l'écrit plus.
 */
const RESET_FILTERS = {
  q: EMPTY_FILTERS.q,
  type: EMPTY_FILTERS.type,
  status: EMPTY_FILTERS.status,
  format: EMPTY_FILTERS.format,
  country: EMPTY_FILTERS.country,
  season: EMPTY_FILTERS.season,
  genre: EMPTY_FILTERS.genre,
  yearMin: EMPTY_FILTERS.yearMin,
  yearMax: EMPTY_FILTERS.yearMax,
  score: EMPTY_FILTERS.score,
  sort: EMPTY_FILTERS.sort,
  dir: EMPTY_FILTERS.dir,
  tag: EMPTY_FILTERS.tag,
  page: EMPTY_FILTERS.page,
};

/** La note, telle qu'elle se lit : AniList compte sur 100, on la montre sur 10. */
function formatScore(score: number): string {
  return (score / 10).toFixed(1).replace(".", ",");
}

type SearchFilterBarProps = {
  /** Les bornes du curseur d'années, calculées par le serveur — voir `_lib/year-bounds`. */
  yearBounds: YearBounds;
};

export function SearchFilterBar({ yearBounds }: SearchFilterBarProps) {
  const [filters, setFilters] = useUrlFilters(barParsers, {
    /*
      Sans anti-rebond, une frappe coûte une requête AniList : « frieren » en dépenserait sept, dont
      six dont personne ne verra le résultat, sur les trente que la minute partage entre tous les
      visiteurs (docs/recherche-filtres.md). Il est posé maintenant, avant que la grille n'existe,
      parce que c'est le jour où elle arrivera qu'on aurait oublié de le mettre.

      Il est posé **au niveau de l'URL** et non sur la valeur du champ : `useUrlFilters` demande
      `shallow: false`, donc chaque écriture d'adresse ré-exécute le Server Component. C'est ce
      trajet-là qu'il faut espacer, pas une valeur dérivée — et c'est ce qui distingue ce réglage
      du hook `use-debounced-value`, qui retarde un état sans rien savoir de l'aller-retour.

      C'est aussi la seule différence de comportement entre cette barre et celle de `/library`, qui
      cherche en base et n'a donc rien à espacer.
    */
    limitUrlUpdates: debounce(300),
  });

  /**
   * Toute facette qui change ramène à la première page.
   *
   * La pagination n'existe pas encore, et c'est justement pour ça : sans cette remise à zéro, le
   * jour où elle arrive, filtrer depuis la page 7 atterrit sur une page 7 vide. `page` valant 1 par
   * défaut, nuqs le retire de l'adresse au lieu d'y écrire `?page=1`.
   */
  const update = (next: Partial<typeof filters>) =>
    setFilters({ ...next, page: 1 });

  /** Le tri **effectif** : celui de l'URL, sauf quand `resolveSort` le remplace faute de terme. */
  const sort = resolveSort({ q: filters.q, sort: filters.sort });

  /**
   * « Pertinence » est **grisée tant qu'aucun terme n'est saisi**, et c'est un correctif, pas une
   * précaution.
   *
   * Sans terme, `SEARCH_MATCH` n'a rien à comparer : `resolveSort` bascule sur les tendances, et
   * comme c'est aussi la valeur par défaut du parseur, nuqs la retire de l'adresse au moment même
   * où on la choisit. L'option se laissait donc cliquer et **revenait aussitôt à « Tendances »**,
   * sans que rien n'explique pourquoi. Un contrôle qui annule le geste de l'utilisateur en silence
   * est pire qu'un contrôle absent.
   *
   * Grisée plutôt que retirée : une liste dont la longueur change selon ce qu'on a tapé oblige à
   * chercher l'option qu'on y avait vue. Et la mention dit la condition, sans laquelle le grisé
   * serait une énigme.
   */
  const hasTerm = filters.q.trim().length > 0;
  const sortOptions: FacetOption<SortField>[] = SORT_OPTIONS.map((option) =>
    option.value === "SEARCH_MATCH" && !hasTerm
      ? { ...option, disabled: true, hint: "— avec un terme" }
      : option,
  );

  /**
   * Y a-t-il quelque chose à défaire que les puces ne montrent pas.
   *
   * Le terme, le tri, sa direction et la page n'ont pas de puce — le premier est lisible dans son
   * champ, les deux suivants ont toujours une valeur, la dernière ne vit que dans la pagination. À
   * eux quatre ils suffisent pourtant à se retrouver page 8, trié par titre, sans aucun moyen
   * visible de revenir : c'est exactement le cas que « Tout effacer » doit couvrir, et il ne
   * s'affichait pas.
   *
   * Comparé à `EMPTY_FILTERS` plutôt qu'à des littéraux : c'est déjà lui qui définit l'état
   * d'arrivée, et deux définitions du mot « défaut » finissent par diverger.
   */
  const canClear =
    filters.q !== EMPTY_FILTERS.q ||
    filters.sort !== EMPTY_FILTERS.sort ||
    filters.dir !== EMPTY_FILTERS.dir ||
    filters.page !== EMPTY_FILTERS.page ||
    filters.tag.length > 0;

  /*
    Les facettes posées, **une entrée par puce à retirer**.

    Le terme et le tri n'y sont pas : le premier est lisible dans son champ, le second a toujours
    une valeur. Une puce « Tri : Tendances » qu'on ne peut pas retirer n'est pas un filtre actif.

    La plage d'années compte pour **une** puce même quand ses deux bornes sont posées : c'est un
    seul geste à l'écran, donc un seul geste pour le défaire.
  */
  const chips: ActiveFilterChip[] = [];

  if (filters.type)
    chips.push({
      label: labelOf(TYPE_OPTIONS, filters.type),
      onRemove: () => update({ type: null }),
    });
  for (const format of filters.format) {
    chips.push({
      label: labelOf(FORMAT_OPTIONS, format),
      onRemove: () =>
        update({ format: filters.format.filter((kept) => kept !== format) }),
    });
  }
  if (filters.status)
    chips.push({
      label: labelOf(STATUS_OPTIONS, filters.status),
      onRemove: () => update({ status: null }),
    });
  if (filters.country)
    chips.push({
      label: labelOf(COUNTRY_OPTIONS, filters.country),
      onRemove: () => update({ country: null }),
    });
  if (filters.season)
    chips.push({
      label: labelOf(SEASON_OPTIONS, filters.season),
      onRemove: () => update({ season: null }),
    });
  for (const genre of filters.genre) {
    chips.push({
      label: formatGenre(genre),
      onRemove: () =>
        update({ genre: filters.genre.filter((kept) => kept !== genre) }),
    });
  }
  if (filters.yearMin !== null || filters.yearMax !== null) {
    const from = filters.yearMin ?? yearBounds.min;
    const to = filters.yearMax ?? yearBounds.max;
    chips.push({
      label: `${from} — ${to}`,
      onRemove: () => update({ yearMin: null, yearMax: null }),
    });
  }
  if (filters.score !== null)
    chips.push({
      label: `Note ≥ ${formatScore(filters.score)}`,
      onRemove: () => update({ score: null }),
    });

  return (
    <FilterBar
      canClear={canClear}
      chips={chips}
      onClearAll={() => setFilters(RESET_FILTERS)}
      panel={
        <SearchFilterPanel
          filters={filters}
          onChange={update}
          yearBounds={yearBounds}
        />
      }
    >
      <FilterSearchField
        label="Rechercher une œuvre"
        onValueChange={(q) => update({ q })}
        placeholder="Un titre d'anime, de manga, de webtoon…"
        value={filters.q}
      />

      <div className="flex gap-2">
        <FilterSelect
          anyLabel="Tous"
          ariaLabel="Type d'œuvre"
          className="w-40"
          label="Type"
          onValueChange={(type: MediaKind | null) => update({ type })}
          options={TYPE_OPTIONS}
          value={filters.type}
        />

        {/*
          La valeur affichée est le tri **effectif**, pas celui de l'URL : sans terme de recherche,
          `SEARCH_MATCH` n'a rien à comparer et `resolveSort` bascule sur les tendances. Afficher
          l'URL brute annoncerait « Pertinence » au-dessus de résultats classés par tendance.

          Pas d'`anyLabel` : le tri a toujours une valeur, donc aucun cas nul à traiter ici.
        */}
        <FilterSelect
          ariaLabel="Trier par"
          className="w-56"
          label="Tri"
          onValueChange={(next: SortField) => update({ sort: next })}
          options={sortOptions}
          value={sort}
        />

        <SortDirectionButton
          available={sortFieldHasDirection(sort)}
          direction={filters.dir}
          onToggle={(dir) => update({ dir })}
        />
      </div>
    </FilterBar>
  );
}
