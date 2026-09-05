"use client";

import {
  ChevronDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { debounce } from "nuqs";

import { SearchFilterPanel } from "@/app/(app)/search/_components/search-filter-panel";
import type { YearBounds } from "@/app/(app)/search/_lib/year-bounds";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { SortField } from "@/features/media/schemas/search-media.schema";
import { useUrlFilters } from "@/hooks/use-url-filters";

/**
 * Le type d'œuvre, dérivé de la liste d'options plutôt que recopié.
 *
 * `onValueChange` d'un `Select` rend une chaîne : Radix ne sait pas que les seules valeurs
 * possibles sont celles des `SelectItem` qu'on lui a passés. On restreint donc à la sortie, comme
 * le fait déjà `entry-status-select` — et en tirant le type de la liste elle-même, qui reste la
 * seule à décider de ce qui est proposé.
 */
type MediaKind = (typeof TYPE_OPTIONS)[number]["value"];

/**
 * La barre de la recherche — **première passe : le terme, le type, le tri.**
 *
 * Trois contrôles, et rien d'autre : le panneau de facettes avancées, les puces de filtres actifs
 * et la densité viennent aux passes suivantes (docs/recherche-filtres.md §3). La mise en page se
 * valide écran par écran avant qu'on empile.
 *
 * **Elle écrit dans l'URL, et c'est tout ce qu'elle fait.** Aucune requête AniList n'est déclenchée
 * ici : la grille n'existe pas encore. Ce n'est pas de la logique posée d'avance — l'URL *est* le
 * contrat, gelé par la mise à blanc (`features/media/lib/search-params.ts`), et il vaut mieux le
 * brancher tout de suite que dessiner trois contrôles morts.
 *
 * Les parseurs viennent de ce contrat plutôt que d'être redéclarés ici : c'est le même module que
 * lira le composant de résultats côté serveur, donc ce que la barre écrit est exactement ce que la
 * grille relira.
 */

/**
 * « Tous les types », côté interface seulement.
 *
 * L'absence de filtre s'écrit `null` dans l'URL — le paramètre disparaît. Mais un `SelectItem` ne
 * peut pas porter une valeur vide : Radix réserve la chaîne vide à « rien de sélectionné », et une
 * option qui la porte devient impossible à choisir. D'où ce jeton, qui ne quitte jamais ce fichier
 * et n'apparaît jamais dans une adresse.
 */
const ANY_TYPE = "ANY";

/**
 * Le contenu d'un déclencheur de facette : « Type : Tous ».
 *
 * Un sélecteur qui n'affiche que sa valeur oblige à deviner ce qu'elle règle — « Tous » et
 * « Tendances » côte à côte ne disent ni l'un ni l'autre de quoi ils parlent. Le nom de la facette
 * est donc **toujours** visible, en atténué, et la valeur garde la couleur du texte : on lit la
 * ligne d'un coup d'œil sans ouvrir les listes.
 *
 * C'est aussi pour ça que ce n'est pas un `placeholder` : un placeholder disparaît dès qu'une
 * valeur est choisie, or ces deux sélecteurs en ont **toujours** une — l'absence de filtre est
 * elle-même une option (« Tous »). L'étiquette doit survivre au choix.
 *
 * Les deux enfants sont enveloppés dans un seul élément parce que `SelectTrigger` est en
 * `justify-between` : passés à plat, l'étiquette et la valeur se seraient repoussées aux deux
 * bouts du bouton, avec un trou au milieu.
 */
function SelectFacetValue({ label }: { label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="text-muted-foreground">{label} :</span>
      <SelectValue />
    </span>
  );
}

/**
 * Ce que la barre et son panneau pilotent. `genre`, `tag`, `dir` et `view` attendent leur contrôle.
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
  page: EMPTY_FILTERS.page,
};

/**
 * Le libellé d'une valeur, cherché dans la liste qui l'a proposée.
 *
 * Les listes d'options sont la seule source de libellés : recopier « Corée du Sud » dans la puce
 * active en ferait une deuxième, et c'est celle-là qui resterait fausse après un renommage.
 * Le repli sur la valeur brute ne se déclenche que sur une adresse forgée avec une valeur qu'aucun
 * parseur n'accepte — donc jamais, mais il vaut mieux afficher `KR` qu'une puce vide.
 */
function labelOf(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

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

  /*
    Les facettes posées, **une entrée par puce à retirer**. C'est la même liste qui alimente le
    compte du bouton et la rangée de puces : les dériver deux fois, c'est se garantir qu'un jour le
    bouton dira « 3 » au-dessus de quatre puces.

    Le terme et le tri n'y sont pas : le premier est lisible dans son champ, le second a toujours
    une valeur. Une puce « Tri : Tendances » qu'on ne peut pas retirer n'est pas un filtre actif.

    La plage d'années compte pour **une** puce même quand ses deux bornes sont posées : c'est un
    seul geste à l'écran, donc un seul geste pour le défaire.
  */
  /*
    Le type est déclaré ici et non au module : `clear` doit être exactement ce que `update` accepte,
    et cette forme n'existe qu'une fois les parseurs résolus. L'écrire dehors obligerait à la
    recopier, donc à la voir diverger au premier parseur ajouté.
  */
  type ActiveChip = { label: string; clear: Partial<typeof filters> };
  const activeChips: ActiveChip[] = [];

  if (filters.type)
    activeChips.push({
      label: labelOf(TYPE_OPTIONS, filters.type),
      clear: { type: null },
    });
  for (const format of filters.format) {
    activeChips.push({
      label: labelOf(FORMAT_OPTIONS, format),
      clear: { format: filters.format.filter((kept) => kept !== format) },
    });
  }
  if (filters.status)
    activeChips.push({
      label: labelOf(STATUS_OPTIONS, filters.status),
      clear: { status: null },
    });
  if (filters.country)
    activeChips.push({
      label: labelOf(COUNTRY_OPTIONS, filters.country),
      clear: { country: null },
    });
  if (filters.season)
    activeChips.push({
      label: labelOf(SEASON_OPTIONS, filters.season),
      clear: { season: null },
    });
  for (const genre of filters.genre) {
    activeChips.push({
      label: formatGenre(genre),
      clear: { genre: filters.genre.filter((kept) => kept !== genre) },
    });
  }
  if (filters.yearMin !== null || filters.yearMax !== null) {
    const from = filters.yearMin ?? yearBounds.min;
    const to = filters.yearMax ?? yearBounds.max;
    activeChips.push({
      label: `${from} — ${to}`,
      clear: { yearMin: null, yearMax: null },
    });
  }
  if (filters.score !== null)
    activeChips.push({
      label: `Note ≥ ${formatScore(filters.score)}`,
      clear: { score: null },
    });

  return (
    /*
      Le panneau enveloppe la rangée entière plutôt que de vivre à côté d'elle : le bouton qui
      l'ouvre est dans la barre, le panneau se déplie **sous** elle, et `Collapsible` veut son
      déclencheur et son contenu sous la même racine. Le bouton reçoit son `aria-expanded` sans
      qu'on l'écrive ; seule la valeur d'ouverture est à nous, parce que le pied du panneau la
      referme aussi.
    */
    <Collapsible className="flex flex-col gap-3">
      {/*
        Deux groupes, pas cinq contrôles alignés : à gauche ce qui **compose la requête** — le
        terme, le type, le tri —, à droite ce qui **l'élargit**. L'écart entre les deux (`gap-6`)
        est plus large que celui qui sépare les contrôles d'un même groupe (`gap-2`), et c'est lui
        qui fait lire la rangée comme deux blocs plutôt que comme une suite.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
          {/*
            Le champ garde `flex-1` pour se réduire quand la place manque, mais il est **borné** :
            sans plafond il mangeait toute la largeur restante et la rangée n'avait plus qu'un
            bloc, celui de gauche, étalé jusqu'au bouton. Un champ de recherche n'a de toute façon
            pas besoin de six cents pixels — on n'y tape jamais une phrase.
          */}
          <InputGroup className="sm:max-w-md sm:flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Rechercher une œuvre"
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Un titre d'anime, de manga, de webtoon…"
              type="search"
              value={filters.q}
            />
          </InputGroup>

          <div className="flex gap-2">
            <Select
              onValueChange={(value) =>
                update({
                  type: value === ANY_TYPE ? null : (value as MediaKind),
                })
              }
              value={filters.type ?? ANY_TYPE}
            >
              <SelectTrigger aria-label="Type d'œuvre" className="w-40">
                <SelectFacetValue label="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ANY_TYPE}>Tous</SelectItem>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/*
              La valeur affichée est le tri **effectif**, pas celui de l'URL : sans terme de
              recherche, `SEARCH_MATCH` n'a rien à comparer et `resolveSort` bascule sur les
              tendances. Afficher l'URL brute annoncerait « Pertinence » au-dessus de résultats
              classés par tendance.
            */}
            <Select
              onValueChange={(value) => update({ sort: value as SortField })}
              value={resolveSort({ q: filters.q, sort: filters.sort })}
            >
              <SelectTrigger aria-label="Trier par" className="w-52">
                <SelectFacetValue label="Tri" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/*
          « Filtres · 3 » (spec du 2 septembre) : le compte dit ce que le panneau replié cache. Il
          ne s'affiche qu'à partir de un — un « · 0 » permanent serait du bruit, et l'absence de
          pastille dit déjà « rien de posé ».

          Le chevron tourne à l'ouverture : c'est la seule chose qui distingue un bouton qui déplie
          d'un bouton qui navigue, et `Collapsible` pose déjà `data-state` sur son déclencheur — il
          n'y a rien à tenir pour l'obtenir.
        */}
        <CollapsibleTrigger asChild>
          <Button className="group w-full sm:w-auto">
            <SlidersHorizontalIcon data-icon="inline-start" />
            Filtres
            <ChevronDownIcon
              className="transition-transform group-data-[state=open]:rotate-180"
              data-icon="inline-end"
            />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <Card>
          <CardContent>
            <SearchFilterPanel
              filters={filters}
              onChange={update}
              yearBounds={yearBounds}
            />
          </CardContent>
        </Card>
      </CollapsibleContent>

      {/*
        La rangée de puces actives, **sous la barre et hors du panneau**.

        C'est tout son intérêt : elle dit ce qui filtre la page alors même que le panneau est
        replié. Un compte sur un bouton annonce *combien* de facettes sont posées ; seules ces
        puces disent **lesquelles**, et permettent d'en retirer une sans rouvrir le panneau ni
        chercher dans quelle colonne elle se trouvait.

        Chaque croix ne retire que sa facette. « Tout effacer » les emporte toutes, et double
        volontairement celui du pied de panneau : celui-ci est hors de portée quand le panneau est
        fermé, ce qui est justement le cas le plus courant.
      */}
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm transition-colors hover:border-foreground/30 hover:bg-muted"
              key={chip.label}
              onClick={() => update(chip.clear)}
              type="button"
            >
              {chip.label}
              <XIcon className="size-3.5 text-muted-foreground" />
              <span className="sr-only">Retirer ce filtre</span>
            </button>
          ))}

          <button
            className="ml-1 text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
            onClick={() => setFilters(RESET_FILTERS)}
            type="button"
          >
            Tout effacer
          </button>
        </div>
      ) : null}
    </Collapsible>
  );
}
