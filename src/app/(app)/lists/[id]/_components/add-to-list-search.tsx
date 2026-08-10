"use client";

import { CheckIcon, LibraryIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type CommandResults,
  commandResultsSchema,
} from "@/features/command/schemas/command.schema";
import { addToList } from "@/features/lists/server/lists.actions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { upfetch } from "@/lib/http/fetch";

/**
 * Ajouter une œuvre à une liste sans quitter la liste.
 *
 * Le geste existait déjà, mais seulement sur la fiche d'une œuvre (`AddToListDialog`) : remplir une
 * liste de dix titres demandait dix allers-retours vers dix fiches. Ici l'intention « je remplis
 * **cette** liste » est déjà posée par la page, il ne reste qu'à nommer les œuvres — et le panneau
 * reste ouvert d'un ajout à l'autre, ce qui est tout l'intérêt.
 *
 * **La recherche part vers `/api/command`, la route de la palette ⌘K, sans rien y changer.** Elle
 * cherche déjà les deux sources dont on a besoin — la bibliothèque dans le miroir local, le catalogue
 * chez AniList — et elle porte le plafond de débit par compte qui protège le quota partagé
 * (docs/PRODUCT.md §4.1). Écrire une seconde route de recherche aurait voulu dire écrire un second
 * plafond, et en oublier un le jour où l'autre change.
 *
 * Elle en accepte donc aussi la contrepartie : les résultats sont **déjà mis en forme par le
 * serveur**, titres selon la préférence de langue du compte comprise. Un composant client ne peut pas
 * lire ce réglage, et c'est très bien ainsi.
 */

/** Même valeur que la palette : en dessous, on paie des requêtes pour des mots à moitié tapés. */
const SEARCH_DEBOUNCE_MS = 220;

const EMPTY_RESULTS: CommandResults = { entries: [], media: [] };

export function AddToListSearch({
  listId,
  presentMediaIds,
}: {
  listId: string;
  /**
   * Ce que la liste contient déjà, tel que le serveur vient de le rendre.
   *
   * Sert à **marquer** les résultats, pas à les masquer : les cacher ferait croire que la recherche ne
   * trouve pas l'œuvre, alors que la question qu'on se pose devant un résultat est « est-ce que je
   * l'ai déjà mise ? ». Un « déjà dans la liste » y répond, une absence non.
   */
  presentMediaIds: number[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [results, setResults] = React.useState<CommandResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = React.useState(false);

  /**
   * Les œuvres ajoutées pendant que le panneau est ouvert.
   *
   * `presentMediaIds` vient du rendu serveur et ne bougera qu'à la revalidation ; sans cet ensemble
   * local, une œuvre qu'on vient d'ajouter resterait proposée comme si de rien n'était pendant tout
   * l'aller-retour, et un second clic partirait pour rien.
   */
  const [justAdded, setJustAdded] = React.useState<ReadonlySet<number>>(
    new Set(),
  );

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  const { execute } = useAction(addToList, {
    onError: ({ input }) => {
      toast.error("L'œuvre n'a pas pu être ajoutée.");

      // L'ajout optimiste est repris : laisser la ligne cochée après un échec ferait croire que la
      // liste contient une œuvre qui n'y est pas, et le rechargement suivant la ferait disparaître
      // sans explication.
      setJustAdded((current) => {
        const next = new Set(current);
        next.delete(input.mediaId);

        return next;
      });
    },
  });

  /**
   * Même discipline que la palette : un `GET` annulable plutôt qu'une Server Action.
   *
   * Les actions sont des POST que Next sérialise — la réponse à « fri » arriverait après celle à
   * « frieren ». Le `signal` coupe la requête en vol dès la frappe suivante, ce qui règle la course
   * **et** rend son budget au serveur.
   */
  React.useEffect(() => {
    if (!open) return;

    // Une saisie vide ne cherche rien ici. La palette, elle, répond « voilà où tu en es » — mais on ne
    // remplit pas une liste avec « ce que j'ai commencé cette semaine », on la remplit avec des titres.
    if (!debouncedQuery) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);

      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    upfetch("/api/command", {
      params: { q: debouncedQuery },
      schema: commandResultsSchema,
      signal: controller.signal,
    })
      .then(setResults)
      .catch(() => {
        // Une annulation n'est pas une panne : c'est ce qu'on veut à chaque frappe. Seule une vraie
        // erreur vide la liste, sinon on effacerait des résultats encore valables.
        if (controller.signal.aborted) return;
        setResults(EMPTY_RESULTS);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [open, debouncedQuery]);

  /** Refermer remet la saisie à zéro : rouvrir sur la recherche précédente surprend. */
  function changeOpen(next: boolean) {
    setOpen(next);

    if (!next) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setJustAdded(new Set());
    }
  }

  function add(mediaId: number) {
    setJustAdded((current) => new Set(current).add(mediaId));
    execute({ listId, mediaId });

    /**
     * **Le focus retourne au champ, et c'est la ligne qui rend le geste répétable.**
     *
     * Un clic sur une ligne emporte le focus hors de la saisie : la frappe suivante ne va nulle part,
     * et il faut recliquer dans le champ entre chaque ajout — soit exactement la friction qu'on est
     * venu supprimer. Au clavier le problème n'existe pas, cmdk gardant la saisie active ; c'est donc
     * un défaut qui ne se voit qu'à la souris, c'est-à-dire la plupart du temps.
     */
    inputRef.current?.focus();
  }

  const present = new Set(presentMediaIds);

  /**
   * Les deux sources en un seul jeu de lignes, la bibliothèque d'abord.
   *
   * Ce qu'on range dans une liste, on l'a le plus souvent déjà vu ; et le catalogue est de toute façon
   * dédoublonné côté serveur contre la bibliothèque, donc aucune œuvre n'apparaît deux fois.
   */
  const groups = [
    {
      heading: "Ma bibliothèque",
      icon: LibraryIcon,
      items: results.entries.map((entry) => ({
        mediaId: entry.mediaId,
        title: entry.title,
        meta: entry.status,
      })),
    },
    {
      heading: "Le catalogue",
      icon: SparklesIcon,
      items: results.media.map((item) => ({
        mediaId: item.id,
        title: item.title,
        meta: item.meta,
      })),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <Popover onOpenChange={changeOpen} open={open}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon />
          Ajouter une œuvre
        </Button>
      </PopoverTrigger>

      {/*
        Sans rembourrage propre : `Command` porte le sien, et le champ de recherche doit toucher les
        bords du panneau comme il le fait dans la palette. La largeur est fixe et ne suit pas celle du
        déclencheur — un bouton de deux mots ne dicte pas la place qu'il faut pour lire des titres.
      */}
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <Command
          /**
           * On filtre nous-mêmes, comme la palette : les résultats arrivent **déjà filtrés par le
           * serveur**, et le filtre intégré de cmdk compare les libellés affichés — il masquerait une
           * œuvre trouvée sur son titre anglais mais affichée en romaji.
           */
          shouldFilter={false}
        >
          <CommandInput
            onValueChange={setQuery}
            placeholder="Chercher une œuvre à ajouter…"
            ref={inputRef}
            value={query}
          />

          <CommandList>
            <CommandEmpty>
              {isLoading
                ? "Recherche…"
                : debouncedQuery
                  ? "Aucun résultat."
                  : "Tapez un titre pour chercher."}
            </CommandEmpty>

            {groups.map((group) => (
              <CommandGroup heading={group.heading} key={group.heading}>
                {group.items.map((item) => {
                  const added =
                    present.has(item.mediaId) || justAdded.has(item.mediaId);

                  return (
                    <CommandItem
                      // Une œuvre déjà dans la liste reste **visible et lisible**, mais ne se
                      // sélectionne plus : `addToList` en ferait un non-événement (l'`upsert` de §4.4),
                      // donc le clic ne casserait rien — il ne ferait simplement rien, ce qui est pire
                      // qu'un bouton qui refuse de l'être.
                      disabled={added}
                      key={item.mediaId}
                      onSelect={() => add(item.mediaId)}
                      value={String(item.mediaId)}
                    >
                      {added ? <CheckIcon /> : <group.icon />}

                      <span className="truncate">{item.title}</span>

                      <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                        {added ? "Déjà dans la liste" : item.meta}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
