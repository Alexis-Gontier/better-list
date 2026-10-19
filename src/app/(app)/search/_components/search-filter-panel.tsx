"use client";

import type { YearBounds } from "@/app/(app)/search/_lib/year-bounds";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  COUNTRY_OPTIONS,
  FORMAT_OPTIONS,
  GENRE_OPTIONS,
  MAX_SCORE,
  SCORE_STEP,
  SEASON_OPTIONS,
  STATUS_OPTIONS,
} from "@/features/media/lib/search-params";
import type {
  MediaSeason,
  MediaStatus,
} from "@/features/media/schemas/media.schema";
import { cn } from "@/lib/utils";

/**
 * Le panneau de facettes — trois colonnes, séparées, et chacune découpée par ce qu'elle règle.
 *
 * La mise en page suit la maquette du 2 septembre : « Type & format », « Genres & tags »,
 * « Année, saison, note ». Les traits ne sont pas décoratifs — ils marquent les endroits où l'on
 * change de question, et sans eux les trois colonnes se lisent comme une seule liste de puces.
 *
 * Le panneau ne décide de rien et ne connaît pas l'URL : il reçoit des valeurs, rend des contrôles
 * et rappelle son appelant. C'est la barre qui tient l'état, pour que l'endroit où l'adresse
 * s'écrit reste unique.
 *
 * **Ce qui est à choix unique l'est parce qu'AniList l'impose ou parce que le document GraphQL
 * n'envoie qu'une valeur**, jamais par choix d'interface : le format, le statut et le pays passent
 * en `format` / `status` / `countryOfOrigin` au singulier. Les genres, eux, partent déjà en
 * `genre_in` — le document les accepte au pluriel depuis toujours, donc ce sont les seuls à être
 * multiples aujourd'hui (.claude/skills/anilist-read/references/recherche-filtres.md §1.3).
 */

/** L'absence de filtre, côté interface. Radix réserve la chaîne vide à « rien de sélectionné ». */
const ANY = "";

/** Les valeurs closes, tirées des listes d'options : c'est l'écran qui décide de ce qu'il propose. */
type FormatValue = (typeof FORMAT_OPTIONS)[number]["value"];
type CountryValue = (typeof COUNTRY_OPTIONS)[number]["value"];

export type PanelFilters = {
  status: MediaStatus | null;
  format: FormatValue[];
  country: CountryValue | null;
  season: MediaSeason | null;
  genre: string[];
  yearMin: number | null;
  yearMax: number | null;
  score: number | null;
};

type SearchFilterPanelProps = {
  filters: PanelFilters;
  onChange: (next: Partial<PanelFilters>) => void;
  /** Les bornes du curseur d'années, calculées et cachées par le serveur — voir `_lib/year-bounds`. */
  yearBounds: YearBounds;
};

/*
  **Pas de pied de panneau.** Il portait « Tout effacer » et « Replier le panneau » ; les deux
  faisaient double emploi — la rangée de puces sous la barre porte déjà son « Tout effacer », et
  elle reste visible panneau replié, ce que le pied ne pouvait pas ; le repli, lui, est le bouton
  « Filtres » qui a servi à ouvrir, à trente pixels de là et déjà dans l'œil.
*/
export function SearchFilterPanel({
  filters,
  onChange,
  yearBounds,
}: SearchFilterPanelProps) {
  /*
    Le curseur a **toujours** deux poignées, même sans filtre : elles reposent alors sur les bornes.
    C'est ce qui rend l'absence de filtre lisible — une plage grande ouverte — plutôt que de laisser
    un contrôle vide qu'il faudrait interpréter. Le retour vers l'URL fait le chemin inverse : une
    poignée en butée veut dire « pas de borne de ce côté », et n'écrit rien.
  */
  const yearRange: [number, number] = [
    filters.yearMin ?? yearBounds.min,
    filters.yearMax ?? yearBounds.max,
  ];

  return (
    <div className="flex flex-col gap-6">
      {/*
        `divide-x` plutôt que des `Separator` verticaux intercalés : le trait naît de la grille, donc
        il disparaît tout seul quand les colonnes s'empilent en dessous de `lg`. Un séparateur posé
        à la main survivrait au repliement et couperait la colonne dans sa longueur.
      */}
      <div className="grid gap-8 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:[&>*]:px-8 lg:[&>*:first-child]:pl-0 lg:[&>*:last-child]:pr-0">
        <FacetColumn label="Type & format">
          <FacetBlock label="Format">
            <CheckboxList
              onValueChange={(format) => onChange({ format })}
              options={FORMAT_OPTIONS}
              value={filters.format}
            />
          </FacetBlock>

          <Separator />

          <FacetBlock label="Statut de parution">
            <ChipGroup
              onValueChange={(status) => onChange({ status })}
              options={STATUS_OPTIONS}
              value={filters.status}
            />
          </FacetBlock>

          <Separator />

          {/*
            Le pays d'origine est la seule façon de chercher un webtoon : AniList ne distingue pas
            manga, manhwa et manhua par un champ dédié — ils sont tous en `MANGA`, et c'est le code
            ISO qui les sépare. D'où la ligne d'aide : sans elle, personne ne devine que « Corée du
            Sud » est le filtre qu'il cherchait.
          */}
          <FacetBlock
            hint="Ce qui sépare manga, manhwa et manhua."
            label="Pays d'origine"
          >
            <ChipGroup
              onValueChange={(country) => onChange({ country })}
              options={COUNTRY_OPTIONS}
              value={filters.country}
            />
          </FacetBlock>
        </FacetColumn>

        <FacetColumn label="Genres & tags">
          <FacetBlock label="Genres">
            <MultiChipGroup
              onValueChange={(genre) => onChange({ genre })}
              options={GENRE_OPTIONS}
              value={filters.genre}
            />
          </FacetBlock>

          <Separator />

          {/*
            Les tags sont le seul vocabulaire de ce panneau qu'on ne peut pas écrire : il y en a
            plus d'un millier, ils changent, et seul `MediaTagCollection` les connaît. Les genres,
            eux, sont dix-huit et stables — leur traduction française était de toute façon à écrire
            (`GENRE_LABELS`), donc la lecture n'aurait rien fait gagner.
          */}
          <FacetBlock
            hint="Plus d'un millier, et seul MediaTagCollection les connaît — ils attendent cette lecture."
            label="Tags"
          >
            <p className="text-muted-foreground text-sm">
              Pas encore branchés.
            </p>
          </FacetBlock>
        </FacetColumn>

        <FacetColumn label="Année, saison, note">
          <FacetBlock label="Année">
            <RangeSlider
              format={(year) => String(year)}
              max={yearBounds.max}
              min={yearBounds.min}
              onValueChange={([yearMin, yearMax]) =>
                onChange({
                  /*
                    Une poignée en butée n'est pas un filtre : elle dit « pas de borne de ce
                    côté ». L'écrire quand même mettrait `?yearMin=1940` dans chaque lien partagé
                    et ferait compter une facette que personne n'a posée.
                  */
                  yearMin: yearMin === yearBounds.min ? null : yearMin,
                  yearMax: yearMax === yearBounds.max ? null : yearMax,
                })
              }
              value={yearRange}
            />
          </FacetBlock>

          <FacetBlock label="Saison">
            <ChipGroup
              onValueChange={(season) => onChange({ season })}
              options={SEASON_OPTIONS}
              value={filters.season}
            />
          </FacetBlock>

          <Separator />

          {/*
            Une seule poignée : « au moins tant » est la question qu'on se pose sur une note, et
            personne n'a jamais cherché les œuvres notées entre 4 et 6. Le plancher à `SCORE_STEP`
            plutôt qu'à zéro dit la même chose — une note minimale de 0 ne filtre rien, donc ce
            n'est pas une position que le curseur doit pouvoir prendre.
          */}
          <FacetBlock label="Note minimale">
            <RangeSlider
              format={formatScore}
              max={MAX_SCORE}
              min={SCORE_STEP}
              onValueChange={([score]) =>
                onChange({ score: score === SCORE_STEP ? null : score })
              }
              step={SCORE_STEP}
              value={[filters.score ?? SCORE_STEP]}
            />
          </FacetBlock>
        </FacetColumn>
      </div>
    </div>
  );
}

/** La note, telle qu'elle se lit : AniList compte sur 100, on la montre sur 10. */
function formatScore(score: number): string {
  return (score / 10).toFixed(1).replace(".", ",");
}

/**
 * Une colonne du panneau : son intitulé en capitales, ses blocs en dessous.
 *
 * L'intitulé est un `h3` — la page a un `h1`, le panneau n'a pas de `h2`, mais l'ordre relatif est
 * ce qui compte pour un lecteur d'écran qui parcourt les titres. Les capitales et la chasse
 * resserrée viennent de la maquette : elles distinguent l'intitulé de colonne du libellé de facette
 * sans avoir à grossir le texte.
 */
function FacetColumn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </h3>
      {children}
    </section>
  );
}

/**
 * Une facette : son nom, sa ligne d'aide éventuelle, ses contrôles.
 *
 * `fieldset` et `legend` plutôt qu'un titre et un `role="group"` : le couple natif porte déjà le
 * groupement et son étiquette, sans identifiant à relier. L'espacement passe par des marges et non
 * par un `flex` sur le `fieldset` — les navigateurs traitent `fieldset` à part, et un
 * `display: flex` déplace la `legend` hors de sa gouttière.
 */
function FacetBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 font-medium text-sm">{label}</legend>
      {hint ? (
        <p className="mb-2 text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {children}
    </fieldset>
  );
}

/**
 * Le rendu commun d'une puce, active ou non.
 *
 * **La puce active est inversée, et ce n'est pas un choix esthétique.** L'état « on » du `toggle`
 * est `bg-muted`, soit oklch(0.21) sur une carte à oklch(0.18) : mesuré à l'écran, un filtre posé
 * était rigoureusement indiscernable d'un filtre disponible. Sur Obsidienne les gris se touchent —
 * il faut un renversement de valeur, pas une nuance.
 *
 * Inversion et non accent : la spec du 2 septembre réserve la couleur, et le principe directeur
 * veut que la jaquette soit la seule chose colorée de l'écran. Le clair sur sombre est franc sans
 * rien emprunter à cette réserve.
 *
 * Les états de survol sont redits pour l'état actif, sinon la règle `hover:bg-muted` de la variante
 * le ferait redevenir sombre au passage de la souris — c'est-à-dire au moment où on le regarde.
 */
const CHIP_CLASSNAME =
  "data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90 data-[state=on]:hover:text-background";

/** Un vocabulaire clos, à choix unique. Recliquer la puce active la retire. */
function ChipGroup<Value extends string>({
  options,
  value,
  onValueChange,
}: {
  options: ReadonlyArray<{ value: Value; label: string }>;
  value: Value | null;
  onValueChange: (value: Value | null) => void;
}) {
  return (
    <ToggleGroup
      className="w-full flex-wrap justify-start"
      onValueChange={(next) =>
        onValueChange(next === ANY ? null : (next as Value))
      }
      type="single"
      value={value ?? ANY}
      variant="outline"
    >
      {options.map((option) => (
        <ToggleGroupItem
          className={CHIP_CLASSNAME}
          key={option.value}
          size="sm"
          value={option.value}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Le même, à choix multiple — pour les genres, que le document envoie déjà en `genre_in`. */
function MultiChipGroup({
  options,
  value,
  onValueChange,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string[];
  onValueChange: (value: string[]) => void;
}) {
  return (
    <ToggleGroup
      className="w-full flex-wrap justify-start"
      onValueChange={onValueChange}
      type="multiple"
      value={value}
      variant="outline"
    >
      {options.map((option) => (
        <ToggleGroupItem
          className={CHIP_CLASSNAME}
          key={option.value}
          size="sm"
          value={option.value}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * Une plage — ou un plancher, quand on ne lui donne qu'une poignée.
 *
 * La valeur courante est affichée **au-dessus du rail, alignée à droite**, et non dans une bulle au
 * survol : un curseur dont on ne lit la valeur qu'en le touchant oblige à le manipuler pour savoir
 * ce qu'il dit déjà. C'est le point le plus important de ce contrôle, et la maquette le fait aussi.
 */
function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  format,
}: {
  min: number;
  max: number;
  step?: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  format: (value: number) => string;
}) {
  const readout = value.map(format).join(" — ");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-right text-sm tabular-nums">{readout}</p>
      <Slider
        max={max}
        min={min}
        onValueChange={onValueChange}
        step={step}
        value={value}
      />
    </div>
  );
}

/**
 * Une liste de cases à cocher, **à choix multiple** : le seul filtre du panneau qui en accepte
 * plusieurs par une vraie case.
 *
 * C'est cohérent de bout en bout depuis que le document envoie `format_in` : l'URL porte une liste
 * (`?format=MOVIE,SPECIAL`), le schéma d'entrée déclare `formats`, et la case à cocher dit ce
 * qu'elle fait. « Film ou spécial » est une question qu'on se pose vraiment.
 *
 * La case est enveloppée dans son `Label` plutôt que reliée par `htmlFor` : le libellé devient
 * cliquable sans identifiant à générer, et la cible tactile passe de 16 px à toute la ligne — le
 * minimum de 44 px n'est pas atteint par la case seule.
 */
function CheckboxList<Value extends string>({
  options,
  value,
  onValueChange,
}: {
  options: ReadonlyArray<{ value: Value; label: string }>;
  value: Value[];
  onValueChange: (value: Value[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {options.map((option) => {
        const checked = value.includes(option.value);

        return (
          <Label
            className={cn(
              "flex cursor-pointer items-center gap-2 py-1 font-normal text-sm",
              !checked && "text-muted-foreground hover:text-foreground",
            )}
            key={option.value}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() =>
                onValueChange(
                  checked
                    ? value.filter((kept) => kept !== option.value)
                    : [...value, option.value],
                )
              }
            />
            {option.label}
          </Label>
        );
      })}
    </div>
  );
}
