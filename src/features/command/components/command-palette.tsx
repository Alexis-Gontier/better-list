"use client";

import type { LucideIcon } from "lucide-react";
import {
  CompassIcon,
  LibraryIcon,
  ListPlusIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { routes } from "@/config/routes";
import {
  type CommandEntry,
  type CommandResults,
  commandResultsSchema,
} from "@/features/command/schemas/command.schema";
import { ENTRY_UNIT_LABELS } from "@/features/tracking/lib/entry-format";
import { saveEntry } from "@/features/tracking/server/tracking.actions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { upfetch } from "@/lib/http/fetch";

/**
 * La palette de commandes — `⌘K` (docs/PRODUCT.md §6, V1).
 *
 * Elle a démarré dans `components/layout/` comme une simple table de raccourcis. Elle connaît
 * maintenant des entrées de suivi et des œuvres du catalogue, donc elle a changé de maison : la règle
 * des quatre dossiers de `docs/ARCHITECTURE.md` dit qu'un composant qui manipule une entité métier
 * descend dans `features/`.
 *
 * **Elle ne se contente plus de naviguer, elle agit** — c'est la moitié de la promesse de V1 qui
 * manquait. Deux verbes, et leur ordre est un choix :
 *
 * - **saisie vide** → « Reprendre », les séries en cours, et `Entrée` avance d'un épisode. Ouvrir la
 *   palette et valider suffit à enregistrer le geste le plus fréquent du produit : deux touches.
 * - **saisie remplie** → la bibliothèque d'abord (`Entrée` **ouvre**, c'est-à-dire ne fait rien
 *   d'irréversible), l'avancement ensuite, le catalogue en dernier. Une frappe distraite suivie
 *   d'`Entrée` navigue ; elle n'écrit pas.
 *
 * Le risque assumé : ouvrir la palette et valider par réflexe enregistre un « +1 ». D'où le toast qui
 * nomme l'œuvre et l'épisode — une erreur se voit tout de suite, et se défait depuis la fiche.
 */

const EMPTY_RESULTS: CommandResults = { entries: [], media: [] };

/**
 * Le délai avant de partir en requête.
 *
 * Autour de 200 ms, l'interface est encore perçue comme immédiate, et une frappe rapide cesse de
 * déclencher une requête par caractère. Plus court, on paie le quota AniList pour des résultats que
 * personne ne lit ; plus long, la palette traîne.
 */
const SEARCH_DEBOUNCE_MS = 220;

/**
 * Une ligne de la palette.
 *
 * Les sections sont **construites en données avant d'être rendues**, et ce n'est pas une coquetterie :
 * c'est ce qui permet de désigner la première ligne (`sections[0].items[0]`) sans réécrire l'ordre
 * d'affichage une deuxième fois. La version précédente calculait les deux séparément, et cmdk
 * sélectionnait « Rechercher » au lieu du premier « +1 » — donc `⌘K` puis `Entrée` naviguait au lieu
 * d'avancer, ce qui retirait à la palette la seule chose qui la rend utile.
 */
type PaletteItem = {
  /** Identifiant de la ligne pour cmdk. Doit être unique dans toute la palette. */
  value: string;
  icon: LucideIcon;
  label: string;
  /** Aligné à droite : statut, progression, format. */
  meta?: string;
  run: () => void;
};

type PaletteSection = {
  heading: string;
  items: PaletteItem[];
};

/**
 * Aucun chemin en dur : tout vient de `routes` (docs/ARCHITECTURE.md). Une palette qui pointe une
 * URL périmée envoie sur une 404 sans que rien ne le signale au build.
 */
const navigation = [
  { href: routes.search, label: "Rechercher", icon: SearchIcon },
  { href: routes.browse, label: "Parcourir", icon: CompassIcon },
  { href: routes.library, label: "Bibliothèque", icon: LibraryIcon },
  { href: routes.lists.root, label: "Mes listes", icon: ListPlusIcon },
  { href: routes.collection.root, label: "Ma collection", icon: LibraryIcon },
  { href: routes.settings, label: "Paramètres", icon: SettingsIcon },
];

/** « épisode 3 sur 24 », ou « épisode 3 » quand AniList ne connaît pas le total. */
function nextUnitLabel(entry: CommandEntry) {
  const unit = ENTRY_UNIT_LABELS[entry.unit].singular;
  const next = entry.progress + 1;

  return entry.total ? `${unit} ${next} sur ${entry.total}` : `${unit} ${next}`;
}

/** « En cours · 2/24 » — le statut, et où j'en suis quand il y a quelque chose à en dire. */
function entryMeta(entry: CommandEntry) {
  if (entry.total) return `${entry.status} · ${entry.progress}/${entry.total}`;
  if (entry.progress > 0) return `${entry.status} · ${entry.progress}`;

  return entry.status;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CommandResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = React.useState(false);
  /** Ligne survolée. `""` = « celle que la palette choisirait », voir `selectedValue` plus bas. */
  const [highlighted, setHighlighted] = React.useState("");
  const router = useRouter();

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  const { execute: advance } = useAction(saveEntry, {
    onError: () => toast.error("La progression n'a pas pu être enregistrée."),
  });

  /**
   * La lecture part vers `/api/command`, pas vers une Server Action : celles-ci sont des POST que Next
   * sérialise, donc la réponse à « fri » arriverait après celle à « frieren ». Le `signal` annule la
   * requête en vol dès la frappe suivante, ce qui règle la course **et** rend le quota au serveur.
   */
  React.useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setIsLoading(true);

    upfetch("/api/command", {
      params: { q: debouncedQuery },
      schema: commandResultsSchema,
      signal: controller.signal,
    })
      .then((next) => {
        setResults(next);
        // La liste vient de changer sous le curseur : le laisser où il était le poserait sur une autre
        // œuvre que celle qu'on visait, et `Entrée` écrirait au mauvais endroit.
        setHighlighted("");
      })
      .catch(() => {
        // Une annulation n'est pas une panne : c'est le comportement voulu à chaque frappe. Seule une
        // vraie erreur doit vider la liste, sinon on effacerait des résultats encore valables.
        if (controller.signal.aborted) return;
        setResults(EMPTY_RESULTS);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [open, debouncedQuery]);

  useHotkeys(
    "mod+k",
    () => setOpen((current) => !current),
    { preventDefault: true, enableOnFormTags: true },
    [],
  );

  /** Refermer remet la saisie à zéro : réouvrir la palette sur la requête précédente surprend. */
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function runCommand(command: () => void) {
    changeOpen(false);
    command();
  }

  /**
   * Le « +1 », qui n'envoie **que la progression** — comme le panneau de la fiche et le bouton des
   * vignettes. La transition serveur en déduit le reste : passer une œuvre prévue en cours, terminer
   * la série au dernier épisode, dater le début.
   *
   * La palette se referme sans attendre le serveur : c'est un endroit de passage, et l'y retenir
   * pendant un aller-retour la ferait paraître bloquée. Le toast rend compte après coup, et il
   * **nomme l'œuvre et l'épisode** pour qu'un geste involontaire se voie.
   */
  function advanceEntry(entry: CommandEntry) {
    advance({ mediaId: entry.mediaId, progress: entry.progress + 1 });
    toast.success(`${entry.title} · ${nextUnitLabel(entry)}`);
  }

  const visibleNavigation = trimmedQuery
    ? navigation.filter((item) =>
        item.label.toLowerCase().includes(trimmedQuery.toLowerCase()),
      )
    : navigation;

  const advanceable = results.entries.filter((entry) => entry.canAdvance);

  const sections: PaletteSection[] = [];

  /**
   * Sans saisie, la bibliothèque n'apparaît qu'une fois — dans « Reprendre ». Deux groupes qui
   * répètent les mêmes titres avec deux verbes différents feraient douter de lequel est le bon.
   *
   * Avec une saisie, la navigation passe **avant** l'avancement : `Entrée` sur une frappe distraite
   * doit ouvrir une fiche, pas écrire dans le journal.
   */
  if (debouncedQuery && results.entries.length > 0) {
    sections.push({
      heading: "Ma bibliothèque",
      items: results.entries.map((entry) => ({
        value: `open-${entry.mediaId}`,
        icon: LibraryIcon,
        label: entry.title,
        meta: entryMeta(entry),
        run: () => router.push(routes.media(entry.mediaId)),
      })),
    });
  }

  if (advanceable.length > 0) {
    sections.push({
      heading: debouncedQuery ? "Avancer" : "Reprendre",
      items: advanceable.map((entry) => ({
        value: `advance-${entry.mediaId}`,
        icon: PlusIcon,
        label: entry.title,
        meta: nextUnitLabel(entry),
        run: () => advanceEntry(entry),
      })),
    });
  }

  if (trimmedQuery) {
    sections.push({
      heading: "Catalogue",
      items: [
        ...results.media.map((item) => ({
          value: `media-${item.id}`,
          icon: SearchIcon,
          label: item.title,
          meta: item.meta || undefined,
          run: () => router.push(routes.media(item.id)),
        })),
        // L'échappatoire vers la recherche complète, en fin de groupe : c'est un « voir plus », donc sa
        // place est après les résultats, pas avant.
        {
          value: "recherche-catalogue",
          icon: SearchIcon,
          label: `Tout chercher pour « ${trimmedQuery} »`,
          run: () =>
            router.push(
              `${routes.search}?q=${encodeURIComponent(trimmedQuery)}`,
            ),
        },
      ],
    });
  }

  if (visibleNavigation.length > 0) {
    sections.push({
      heading: "Navigation",
      items: visibleNavigation.map((item) => ({
        value: `nav-${item.href}`,
        icon: item.icon,
        label: item.label,
        run: () => router.push(item.href),
      })),
    });
  }

  /**
   * La sélection est **pilotée**, et c'est ce qui corrige le défaut décrit sur `PaletteItem` : cmdk
   * choisit la première ligne au montage et ne revient pas sur son choix quand la liste s'allonge. Les
   * résultats arrivant après l'ouverture, il restait accroché à « Rechercher ».
   */
  const selectedValue = highlighted || (sections[0]?.items[0]?.value ?? "");

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden font-normal text-muted-foreground sm:flex border-px"
      >
        <SearchIcon data-icon="inline-start" />
        <span className="hidden md:inline">Rechercher</span>
        <KbdGroup className="hidden lg:inline-flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Rechercher"
        className="text-muted-foreground sm:hidden"
      >
        <SearchIcon />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={changeOpen}
        title="Palette de commandes"
        description="Chercher une œuvre, avancer d'un épisode, aller à une page."
      >
        <Command
          onValueChange={setHighlighted}
          /**
           * On filtre nous-mêmes. Le filtre intégré de cmdk compare les libellés affichés, or les
           * résultats arrivent **déjà filtrés par le serveur** : le laisser faire masquerait une œuvre
           * trouvée sur son titre anglais ou japonais mais dont le titre romaji ne contient pas la
           * saisie. Il masquerait aussi « tout chercher », qui doit rester visible quoi qu'on tape.
           */
          shouldFilter={false}
          value={selectedValue}
        >
          <CommandInput
            onValueChange={setQuery}
            placeholder="Chercher une œuvre, avancer d'un épisode…"
            value={query}
          />

          <CommandList>
            <CommandEmpty>
              {isLoading ? "Recherche…" : "Aucun résultat."}
            </CommandEmpty>

            {sections.map((section, index) => (
              <React.Fragment key={section.heading}>
                {/* La navigation est un registre à part : le trait la sépare du contenu métier. */}
                {section.heading === "Navigation" && index > 0 ? (
                  <CommandSeparator />
                ) : null}

                <CommandGroup heading={section.heading}>
                  {section.items.map((item) => (
                    <CommandItem
                      key={item.value}
                      onSelect={() => runCommand(item.run)}
                      value={item.value}
                    >
                      <item.icon />
                      <span className="truncate">{item.label}</span>
                      {item.meta ? (
                        <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                          {item.meta}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
