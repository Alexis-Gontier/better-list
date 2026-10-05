"use client";

import {
  ArrowRightIcon,
  CalendarDaysIcon,
  LibraryBigIcon,
  LibraryIcon,
  ListIcon,
  SearchIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { highlightMatch } from "@/features/command/lib/highlight-match";
import {
  COMMAND_SEARCH_MIN_LENGTH,
  type CommandSearchResult,
  commandSearchResultSchema,
} from "@/features/command/schemas/command-search.schema";
import { serializeSearchFilters } from "@/features/media/lib/search-params";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { upfetch } from "@/lib/http/fetch";
import { cn } from "@/lib/utils";

/**
 * La recherche du catalogue au clavier — le bouton de l'en-tête et la palette qu'il ouvre.
 *
 * **La lecture passe par un route handler** (`app/api/search/route.ts`) et non par une Server
 * Action : une recherche à la frappe doit pouvoir s'annuler, et la réponse à « fri » ne doit pas
 * écraser celle à « frieren » (CLAUDE.md, docs/STATE.md § les route handlers).
 */

/**
 * Le délai entre la dernière frappe et la requête.
 *
 * Assez court pour que la palette réponde pendant qu'on regarde encore le champ, assez long pour
 * qu'un mot tapé d'une traite ne parte qu'une fois : « frieren » coûterait sinon six requêtes sur un
 * quota de trente par minute partagé par tout le cercle.
 */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Ce que chaque ligne de la palette ajoute à `CommandItem`.
 *
 * **Le fond de sélection est `accent` et non `muted`** : dans le thème sombre, `--muted` et
 * `--popover` ont exactement la même valeur, si bien que la ligne survolée ou atteinte au clavier
 * ne se distinguait pas des autres — vu le 13 septembre 2026. `--accent` est le cran au-dessus, dans
 * les deux thèmes.
 *
 * `cursor-pointer` : chaque ligne mène à une page, et le curseur doit le dire comme un lien.
 */
const ITEM_CLASS = "cursor-pointer data-[selected=true]:bg-accent";

/** La valeur cmdk de la ligne « Rechercher … » — distincte de tout id AniList, qui est numérique. */
const SEARCH_ALL_VALUE = "search-all";

/**
 * Où en est la recherche du terme courant.
 *
 * `query` accompagne chaque état : c'est ce qui permet d'ignorer, au rendu, un résultat arrivé pour
 * un terme qu'on a déjà effacé — l'annulation couvre la requête, pas le rendu qui la suit.
 */
type SearchState =
  | { phase: "idle" }
  | { phase: "loading"; query: string }
  | { phase: "done"; query: string; result: CommandSearchResult }
  | { phase: "error"; query: string };

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ phase: "idle" });
  /*
    **La ligne sélectionnée est pilotée.** Dès qu'un terme est tapé, elle se pose sur « Rechercher
    … », la première ligne : Entrée mène à `/search` avec le terme (décision d'Alexis du 5 octobre
    2026), et les flèches descendent vers les œuvres. Sans ce pilotage, cmdk laissait la sélection
    sur « Aller à » pendant le chargement — et Entrée ouvrait « Ma bibliothèque ». Vu au navigateur
    le 13 septembre 2026.
  */
  const [selected, setSelected] = useState("");

  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const searchable = term.length >= COMMAND_SEARCH_MIN_LENGTH;

  /*
    `⌘K` sur Mac, `Ctrl K` ailleurs — les deux ouvrent, et referment si la palette est déjà là.
    `preventDefault` parce que `Ctrl K` est, dans Chrome et Firefox, le raccourci de la barre de
    recherche du navigateur.
  */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /*
    **Une requête par terme stabilisé, et la précédente annulée.** Le nettoyage de l'effet abandonne
    la requête en vol dès que le terme change : sa réponse, si elle arrive, n'est jamais lue.

    Rien ne part tant que la palette est fermée — un terme resté dans le champ ne doit pas dépenser
    le quota en arrière-plan — ni sous deux caractères, où le route handler répondrait 400.
  */
  useEffect(() => {
    if (!open || !searchable) {
      setState({ phase: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ phase: "loading", query: term });

    upfetch(routes.api.search, {
      params: { q: term },
      schema: commandSearchResultSchema,
      signal: controller.signal,
    })
      .then((result) => {
        setState({ phase: "done", query: term, result });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ phase: "error", query: term });
      });

    return () => controller.abort();
  }, [open, searchable, term]);

  /** Fermer, puis aller ailleurs : la palette ne doit pas rester ouverte sur la page d'arrivée. */
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  /*
    « Tout voir » emmène le terme tapé jusqu'à `/search`, par le même sérialiseur que la page
    relit : la recherche complète reprend exactement là où la palette s'arrête.
  */
  const searchHref = serializeSearchFilters(routes.search, { q: query.trim() });

  const result =
    state.phase === "done" && state.query === term ? state.result : null;

  return (
    <>
      {/*
        **Un faux champ au palier large, une loupe seule en dessous.** Le champ dit ce qu'on peut
        faire avant qu'on clique, et son raccourci l'apprend sans documentation ; sur un téléphone,
        où l'en-tête n'a de place que pour des icônes et où le clavier physique n'existe pas, il ne
        reste que la loupe.
      */}
      <Button
        className="hidden text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
        size="sm"
        variant="ghost"
      >
        <SearchIcon data-icon="inline-start" />
        Rechercher…
        <KbdGroup className="ml-2">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <Button
        aria-label="Rechercher une œuvre"
        className="text-muted-foreground md:hidden"
        onClick={() => setOpen(true)}
        size="icon-sm"
        variant="ghost"
      >
        <SearchIcon />
      </Button>

      {/*
        **Plus large et plus haute que le défaut** (décision d'Alexis du 13 septembre 2026) : les
        titres d'œuvres sont longs, et la palette doit montrer cinq résultats et « Aller à » sans
        défiler. Remontée vers le haut de l'écran en conséquence — posée au tiers comme le défaut,
        une fenêtre de cette taille déborderait par le bas.
      */}
      <CommandDialog
        className="top-[10dvh] sm:max-w-2xl"
        description="Chercher un anime, un manga ou un webtoon par son titre."
        onOpenChange={setOpen}
        open={open}
        title="Rechercher une œuvre"
      >
        {/*
          `CommandDialog` ne pose pas le contexte de cmdk lui-même : sans ce `Command`, le premier
          `CommandInput` plante en lisant un store absent (« reading 'subscribe' »).

          `shouldFilter={false}` : le tri et le filtrage sont ceux d'AniList. Laisser cmdk refiltrer
          sur le texte des lignes masquerait un résultat trouvé par un titre alternatif — chercher
          « Sousou no » ramène *Frieren*, dont le titre affiché ne contient pas ces mots.
        */}
        <Command
          onValueChange={setSelected}
          shouldFilter={false}
          value={selected}
        >
          <CommandInput
            onValueChange={(value) => {
              setQuery(value);
              if (value.trim()) setSelected(SEARCH_ALL_VALUE);
            }}
            placeholder="Rechercher un titre…"
            value={query}
          />

          {/*
            **Le nombre de résultats et « Tout voir »** (décision d'Alexis du 13 septembre 2026) —
            la même rangée que les sections de la fiche : le compte à gauche, la porte vers la
            liste complète à droite. La palette n'en montre que cinq ; le compte dit ce qu'on laisse
            derrière.

            **Hors de `CommandGroup`, et ce n'est pas un choix de mise en page** : cmdk pose
            `aria-hidden` sur l'en-tête d'un groupe. Un lien placé là serait cliquable mais absent
            pour un lecteur d'écran. Ici, c'est un vrai lien, qu'on atteint aussi par Tab.

            Elle n'apparaît qu'une fois un terme tapé : sans terme, il n'y a rien à compter, et
            « Tout voir » mènerait aux tendances plutôt qu'à une recherche.
          */}
          {query.trim() ? (
            <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs text-muted-foreground">
              <span aria-live="polite" className="tabular-nums">
                {resultLabel(state, result)}
              </span>
              <Link
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                href={searchHref}
                onClick={() => setOpen(false)}
              >
                Tout voir
                {/* La flèche dit « on quitte la palette pour une page », là où un résultat ouvre une fiche. */}
                <ArrowRightIcon aria-hidden className="size-3" />
              </Link>
            </div>
          ) : null}

          {/*
            Plus haute que les 18 rem par défaut : cinq résultats et le groupe « Aller à » doivent
            tenir sans défiler au palier large. Bornée à 75 % de l'écran pour qu'un téléphone garde
            le champ visible.
          */}
          <CommandList className="max-h-[min(36rem,75dvh)]">
            {/*
              **Entrée lance la recherche complète.** La ligne est en tête et sélectionnée dès la
              frappe : taper un titre puis Entrée mène à `/search`, comme dans un champ de
              recherche ordinaire. Ouvrir une œuvre demande une flèche de plus.
            */}
            {query.trim() ? (
              <CommandGroup>
                <CommandItem
                  className={ITEM_CLASS}
                  onSelect={() => go(searchHref)}
                  value={SEARCH_ALL_VALUE}
                >
                  <SearchIcon />
                  <span className="truncate">
                    Rechercher « {query.trim()} »
                  </span>
                  {/*
                    `CommandShortcut` et non un `span` en `ml-auto` : `CommandItem` porte une coche
                    invisible, elle aussi en `ml-auto`, qui partageait l'espace libre — le libellé
                    s'arrêtait au milieu de la ligne. Le raccourci la masque.
                  */}
                  <CommandShortcut className="tracking-normal">
                    Tout le catalogue
                  </CommandShortcut>
                </CommandItem>
              </CommandGroup>
            ) : null}

            {result && result.items.length > 0 ? (
              <CommandGroup heading="Œuvres">
                {result.items.map((item) => (
                  <CommandItem
                    /*
                      `items-start` : le titre se cale sur le haut de la jaquette au lieu de flotter
                      au milieu (décision d'Alexis du 13 septembre 2026) — il se lit d'abord, et une
                      ligne de format absente ne le fait plus bouger.
                    */
                    className={cn(ITEM_CLASS, "items-start")}
                    key={item.id}
                    onSelect={() => go(routes.media(item.id))}
                    value={String(item.id)}
                  >
                    {/*
                      La jaquette en vignette, au format d'une jaquette : c'est elle qui fait
                      reconnaître une œuvre avant qu'on ait lu le titre (spec du 2 septembre — la
                      jaquette est la seule chose colorée de l'écran).
                    */}
                    <div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded-sm bg-muted-foreground/20">
                      {item.cover ? (
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="40px"
                          src={item.cover}
                        />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {/*
                        **La pastille avant le titre**, et non plus au bout de la ligne : à
                        l'extrémité droite d'une fenêtre de 672 px, elle était trop loin du titre
                        pour qu'on sache à quelle ligne elle appartenait.
                      */}
                      <span className="flex min-w-0 items-center gap-2">
                        {item.status ? (
                          <EntryStatusDot status={item.status} />
                        ) : null}
                        <span className="truncate">
                          {/*
                            Les caractères qui reprennent le terme tapé sont marqués : on voit
                            **pourquoi** la ligne est là. Le terme est celui de la réponse (`term`, stabilisé), pas
                            celui du champ — le champ peut déjà avoir changé.
                          */}
                          {highlightMatch(item.title, term).map(
                            (part, index) =>
                              part.match ? (
                                <mark
                                  className="rounded-xs bg-muted-foreground/30 text-foreground"
                                  // biome-ignore lint/suspicious/noArrayIndexKey: les morceaux d'un titre n'ont pas d'identité propre, et leur ordre ne change pas.
                                  key={index}
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                // biome-ignore lint/suspicious/noArrayIndexKey: idem.
                                <span key={index}>{part.text}</span>
                              ),
                          )}
                        </span>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[item.format, item.year].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            <SearchNotice
              result={result}
              searchable={searchable}
              state={state}
            />

            {result && result.items.length > 0 ? <CommandSeparator /> : null}

            <CommandGroup heading="Aller à">
              <CommandItem
                className={ITEM_CLASS}
                onSelect={() => go(routes.library)}
                value="library"
              >
                <LibraryIcon />
                Ma bibliothèque
              </CommandItem>
              <CommandItem
                className={ITEM_CLASS}
                onSelect={() => go(routes.lists.root)}
                value="lists"
              >
                <ListIcon />
                Mes listes
              </CommandItem>
              {/*
                « Ma collection » est revenue le 19 septembre 2026, avec son écran — elle avait
                quitté la palette en même temps que la nav, pour la même raison : une commande qui
                répond 404 se lit comme une panne.
              */}
              <CommandItem
                className={ITEM_CLASS}
                onSelect={() => go(routes.collection.root)}
                value="collection"
              >
                <LibraryBigIcon />
                Ma collection
              </CommandItem>
              <CommandItem
                className={ITEM_CLASS}
                onSelect={() => go(routes.calendar)}
                value="calendar"
              >
                <CalendarDaysIcon />
                Planning
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

/**
 * Le compte de la rangée du haut.
 *
 * **Aucun chiffre au plafond.** AniList plafonne `pageInfo.total` à 5000
 * (`ANILIST_TOTAL_CAP`, `media.queries.ts`), et mesuré le 13 septembre 2026 : **toute recherche
 * par titre** y touche — « frieren », « one piece », « sousou no frieren » répondent tous 5000. Au
 * plafond le chiffre ne compte donc rien, pas même « plus de 5000 », qui serait faux pour
 * *Frieren*. On dit ce qu'on montre plutôt que ce qu'on ignore.
 */
function resultLabel(
  state: SearchState,
  result: CommandSearchResult | null,
): string {
  if (result) {
    if (result.items.length === 0) return "Aucun résultat";
    if (result.totalIsCapped) return "Meilleurs résultats";
    return result.total === 1 ? "1 résultat" : `${result.total} résultats`;
  }
  if (state.phase === "loading") return "Recherche…";
  return "";
}

/**
 * Ce que la liste dit quand elle n'a pas de résultats à montrer — ou qu'elle en montre de dégradés.
 *
 * `CommandEmpty` ne sert pas ici : il ne s'affiche que quand **aucun** élément n'est rendu, et le
 * groupe « Aller à » est toujours là. Les messages sont donc posés à la main, un par cas.
 */
function SearchNotice({
  state,
  result,
  searchable,
}: {
  state: SearchState;
  result: CommandSearchResult | null;
  searchable: boolean;
}) {
  const className =
    "flex items-center justify-center gap-2 px-3 py-6 text-center text-sm text-muted-foreground";

  if (result?.fromMirror && result.items.length > 0) {
    return (
      <p className="px-3 pb-2 text-xs text-muted-foreground">
        AniList ne répond pas : ces résultats viennent de la copie locale.
      </p>
    );
  }
  if (result && result.items.length === 0) {
    return <p className={className}>Aucune œuvre ne correspond.</p>;
  }
  if (!result && searchable && state.phase === "loading") {
    return (
      <p className={className}>
        <Spinner />
        Recherche…
      </p>
    );
  }
  if (state.phase === "error") {
    return <p className={className}>La recherche n'a pas abouti. Réessayez.</p>;
  }
  return null;
}
