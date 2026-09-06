"use client";

import {
  ChevronDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";

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

/**
 * La coquille d'une barre de filtres — **la mise en page, et rien du métier.**
 *
 * Elle a démarré dans `search/_components/search-filter-bar.tsx` et a été promue ici le 6 septembre
 * 2026, quand `/library` a demandé la même rangée : deuxième appelant, donc la règle de promotion
 * d'ARCHITECTURE.md s'applique. Elle atterrit dans `components/shared/` et non dans une feature
 * parce qu'elle ne connaît **aucune** entité — ni œuvre, ni entrée de suivi. Ce sont ses appelants
 * qui posent le vocabulaire : `search-filter-bar` parle de formats et de saisons,
 * `library-filter-bar` de statuts de suivi, et tous deux se ressemblent parce qu'ils composent les
 * mêmes pièces, pas parce que quelqu'un a recopié l'autre.
 *
 * C'est le premier gain de la refonte : `/search` et `/library` étaient le même écran écrit deux
 * fois (docs/STATE.md), et une barre dupliquée est l'endroit exact où les deux divergent au premier
 * correctif appliqué d'un seul côté.
 *
 * **Ce qui n'est pas ici** : le panneau de facettes de `/search` et ses primitives — colonnes,
 * blocs, puces, curseurs. Elles n'ont qu'un seul consommateur, et le règle dit qu'on ne promeut
 * qu'au deuxième. `/library` filtre par un contrat plus court (`library-params.ts`) et n'a pas de
 * panneau du tout ; le jour où elle en aura un, ces primitives monteront ici à leur tour.
 */

/**
 * L'absence de filtre, côté interface.
 *
 * Elle s'écrit `null` dans l'URL — le paramètre disparaît. Mais un `SelectItem` ne peut pas porter
 * une valeur vide : Radix réserve la chaîne vide à « rien de sélectionné », et une option qui la
 * porte devient impossible à choisir. D'où ce jeton, qui ne quitte jamais ce fichier et n'apparaît
 * jamais dans une adresse.
 */
const ANY_VALUE = "__any__";

/** Le couple que se passent tous les contrôles de filtre : ce qui part dans l'URL, ce qui se lit. */
export type FacetOption<Value extends string = string> = {
  value: Value;
  label: string;
  /**
   * Une option proposée mais **pas choisissable en l'état**.
   *
   * Elle reste dans la liste plutôt que d'en disparaître : un tri qui s'absente selon ce qu'on a
   * tapé donne une liste dont la longueur change sous l'œil, et on cherche l'option qu'on a vue la
   * fois d'avant. Grisée, elle dit qu'elle existe et qu'elle n'est pas disponible **maintenant** —
   * à condition d'être accompagnée d'un `hint`, sans quoi le grisé est une énigme.
   */
  disabled?: boolean;
  /** La raison, en trois mots, affichée en atténué à côté du libellé. */
  hint?: string;
};

/**
 * Le libellé d'une valeur, cherché dans la liste qui l'a proposée.
 *
 * Les listes d'options sont la seule source de libellés : recopier « Corée du Sud » dans la puce
 * active en ferait une deuxième, et c'est celle-là qui resterait fausse après un renommage. Le
 * repli sur la valeur brute ne se déclenche que sur une adresse forgée avec une valeur qu'aucun
 * parseur n'accepte — donc jamais, mais il vaut mieux afficher `KR` qu'une puce vide.
 */
export function labelOf(
  options: ReadonlyArray<FacetOption>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Le champ de recherche de la barre.
 *
 * **Borné** (`max-w-md`) tout en gardant `flex-1` : sans plafond il mange toute la largeur restante
 * et la rangée n'a plus qu'un bloc, celui de gauche, étalé jusqu'au bord. Un champ de recherche n'a
 * de toute façon pas besoin de six cents pixels — on n'y tape jamais une phrase.
 *
 * **L'anti-rebond n'est pas ici, et c'est délibéré** : il ne se règle pas pareil selon la source.
 * Sur `/search` chaque frappe coûte une requête AniList et doit être espacée ; sur `/library` elle
 * tape en base et ne coûte rien. Le réglage vit donc chez l'appelant, au niveau de l'URL
 * (`useUrlFilters`), là où le trajet qu'on veut espacer se décide.
 */
export function FilterSearchField({
  value,
  onValueChange,
  label,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /** Le nom accessible du champ — il n'a pas d'étiquette visible. */
  label: string;
  placeholder: string;
}) {
  return (
    <InputGroup className="sm:max-w-md sm:flex-1">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={label}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </InputGroup>
  );
}

/**
 * Le contenu d'un déclencheur de facette : « Type : Tous ».
 *
 * Un sélecteur qui n'affiche que sa valeur oblige à deviner ce qu'elle règle — « Tous » et
 * « Tendances » côte à côte ne disent ni l'un ni l'autre de quoi ils parlent. Le nom de la facette
 * est donc **toujours** visible, en atténué, et la valeur garde la couleur du texte : on lit la
 * ligne d'un coup d'œil sans ouvrir les listes.
 *
 * C'est aussi pour ça que ce n'est pas un `placeholder` : un placeholder disparaît dès qu'une
 * valeur est choisie, or ces sélecteurs en ont **toujours** une — l'absence de filtre est
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
 * Une facette en sélecteur, avec son étiquette toujours visible.
 *
 * Le type se dédouble selon que la facette accepte ou non « tous » : c'est `anyLabel` qui décide,
 * et il décide **des deux côtés à la fois** — l'option apparaît dans la liste, et le rappel peut
 * rendre `null`. Sans lui, l'appelant n'a aucun cas nul à traiter, ce qui est exactement le cas du
 * tri : il a toujours une valeur.
 */
type FilterSelectProps<Value extends string> = {
  /** Le nom de la facette, affiché en atténué devant la valeur. */
  label: string;
  /** Le nom accessible du bouton, plus explicite que l'étiquette courte. */
  ariaLabel: string;
  options: ReadonlyArray<FacetOption<Value>>;
  /** La largeur du déclencheur — elle dépend de la longueur des libellés proposés. */
  className?: string;
} & (
  | {
      /** Le libellé de l'option « pas de filtre » — « Tous », « Tous les genres ». */
      anyLabel: string;
      value: Value | null;
      onValueChange: (value: Value | null) => void;
    }
  | {
      anyLabel?: undefined;
      value: Value;
      onValueChange: (value: Value) => void;
    }
);

export function FilterSelect<Value extends string>(
  props: FilterSelectProps<Value>,
) {
  const { label, ariaLabel, options, className, anyLabel, value } = props;

  return (
    <Select
      onValueChange={(next) => {
        /*
          Radix rend une chaîne : il ne sait pas que les seules valeurs possibles sont celles des
          `SelectItem` qu'on lui a passés. On restreint donc à la sortie, comme le fait déjà
          `entry-status-select`.

          Le cast du rappel est sûr par construction : `null` ne peut sortir d'ici que si un item
          porte `ANY_VALUE`, donc seulement quand `anyLabel` est fourni — et dans ce cas le type
          public déclare précisément un rappel qui l'accepte.
        */
        const resolved = next === ANY_VALUE ? null : (next as Value);
        (props.onValueChange as (value: Value | null) => void)(resolved);
      }}
      value={value ?? ANY_VALUE}
    >
      <SelectTrigger aria-label={ariaLabel} className={className}>
        <SelectFacetValue label={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {anyLabel ? (
            <SelectItem value={ANY_VALUE}>{anyLabel}</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
              {option.hint ? (
                <span className="text-muted-foreground text-xs">
                  {option.hint}
                </span>
              ) : null}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Une facette posée, telle qu'elle se retire : son libellé, et le geste qui l'enlève. */
export type ActiveFilterChip = {
  label: string;
  onRemove: () => void;
};

type FilterBarProps = {
  /** Les contrôles de la barre : le champ, puis les sélecteurs. */
  children: React.ReactNode;
  /**
   * Le panneau de facettes avancées, quand l'écran en a un.
   *
   * Il est passé **ici** plutôt que rendu par l'appelant à côté de la barre parce que l'ordre
   * vertical compte : la rangée, puis le panneau déplié, puis les puces. Un appelant qui possède
   * son `Collapsible` ne pourrait pas glisser le contenu entre les deux. Absent, le bouton
   * « Filtres » disparaît avec lui et la barre n'est plus dépliante du tout.
   */
  panel?: React.ReactNode;
  /** Les facettes posées, une entrée par puce à retirer. */
  chips: ActiveFilterChip[];
  /**
   * L'écran s'écarte-t-il de son état par défaut **par autre chose qu'une puce**.
   *
   * Les puces ne disent pas tout : le terme est lisible dans son champ, le tri a toujours une
   * valeur, la page ne s'affiche que dans la pagination — aucun des trois n'a de puce, et à eux
   * trois ils suffisent à se retrouver sur une page 8 triée par titre sans aucun moyen visible de
   * revenir. La rangée s'affiche donc dès qu'il y a **quelque chose à défaire**, puces ou non, et
   * « Tout effacer » redevient le seul geste à connaître.
   */
  canClear?: boolean;
  onClearAll: () => void;
};

export function FilterBar({
  children,
  panel,
  chips,
  canClear = false,
  onClearAll,
}: FilterBarProps) {
  return (
    <BarRoot collapsible={panel !== undefined}>
      {/*
        Deux groupes, pas cinq contrôles alignés : à gauche ce qui **compose la requête** — le
        terme, le type, le tri —, à droite ce qui **l'élargit**. L'écart entre les deux (`gap-6`)
        est plus large que celui qui sépare les contrôles d'un même groupe (`gap-2`), et c'est lui
        qui fait lire la rangée comme deux blocs plutôt que comme une suite.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
          {children}
        </div>

        {/*
          **Pas de compte de facettes sur le bouton** (« Filtres · 3 »), retiré après l'avoir posé :
          la rangée de puces dit *lesquelles* sont posées, pas seulement *combien*, et elle reste
          visible panneau replié. Un compte à côté d'une liste est un doublon qui peut mentir.

          Le chevron tourne à l'ouverture : c'est la seule chose qui distingue un bouton qui déplie
          d'un bouton qui navigue, et `Collapsible` pose déjà `data-state` sur son déclencheur — il
          n'y a rien à tenir pour l'obtenir.
        */}
        {panel === undefined ? null : (
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
        )}
      </div>

      {panel === undefined ? null : (
        <CollapsibleContent>
          <Card>
            <CardContent>{panel}</CardContent>
          </Card>
        </CollapsibleContent>
      )}

      {/*
        La rangée de puces actives, **sous la barre et hors du panneau**.

        C'est tout son intérêt : elle dit ce qui filtre la page alors même que le panneau est
        replié. Un compte sur un bouton annonce *combien* de facettes sont posées ; seules ces
        puces disent **lesquelles**, et permettent d'en retirer une sans rouvrir le panneau ni
        chercher dans quelle colonne elle se trouvait.

        Chaque croix ne retire que sa facette ; **« Tout effacer » va plus loin qu'elles** — il
        emporte aussi ce qu'aucune puce ne montre : le terme saisi, le tri, sa direction, et la
        page où l'on se trouve. C'est le seul geste qui ramène l'écran à son état d'arrivée.
      */}
      {chips.length > 0 || canClear ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm transition-colors hover:border-foreground/30 hover:bg-muted"
              key={chip.label}
              onClick={chip.onRemove}
              type="button"
            >
              {chip.label}
              <XIcon className="size-3.5 text-muted-foreground" />
              <span className="sr-only">Retirer ce filtre</span>
            </button>
          ))}

          <button
            className="ml-1 text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
            onClick={onClearAll}
            type="button"
          >
            Tout effacer
          </button>
        </div>
      ) : null}
    </BarRoot>
  );
}

/**
 * La racine de la barre : dépliante ou non.
 *
 * `Collapsible` veut son déclencheur et son contenu sous la même racine, d'où l'enveloppe. Un écran
 * sans panneau n'a rien à déplier : lui poser quand même une racine `Collapsible` ajouterait un
 * état et des attributs ARIA que rien ne pilote.
 */
function BarRoot({
  collapsible,
  children,
}: {
  collapsible: boolean;
  children: React.ReactNode;
}) {
  const className = "flex flex-col gap-3";

  return collapsible ? (
    <Collapsible className={className}>{children}</Collapsible>
  ) : (
    <div className={className}>{children}</div>
  );
}
