"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import {
  COMMAND_SEARCH_MIN_LENGTH,
  type CommandSearchItem,
  type CommandSearchResult,
  commandSearchResultSchema,
} from "@/features/command/schemas/command-search.schema";
import {
  addToList,
  removeFromList,
} from "@/features/lists/server/lists.actions";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { upfetch } from "@/lib/http/fetch";

/** Le délai de la palette : en dessous, chaque lettre partirait en requête sur le quota du cercle. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Remplir une liste **depuis elle-même** (D46) : chercher, ranger, recommencer, sans quitter
 * l'écran.
 *
 * La fenêtre reste ouverte et chaque ligne est une bascule, comme celle de la fiche. `Entrée` range
 * la ligne surlignée puis sélectionne le terme : la frappe suivante le remplace, donc on enchaîne
 * au clavier. Vider le champ démonterait la ligne pendant son écriture, et un échec ne pourrait
 * plus remettre la case en place.
 *
 * La recherche est celle de la palette (`/api/search`) : un GET annulé à chaque frappe, sous le
 * cache d'une heure de `searchMedia`.
 */
export function AddMediaDialog({
  initialOpen = false,
  listId,
  memberIds,
  suggestions,
}: {
  /** Ouverte d'emblée : la liste vient d'être créée, et la remplir est le geste suivant. */
  initialOpen?: boolean;
  listId: string;
  /** Les œuvres déjà dans la liste : la page les connaît, la recherche n'a pas à les savoir. */
  memberIds: number[];
  suggestions: CommandSearchItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);

  /*
    Refermer une fenêtre ouverte par l'adresse retire le paramètre : sinon un rechargement, ou un
    retour arrière, la rouvrirait sans qu'on l'ait demandé.
  */
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next && initialOpen) {
      router.replace(routes.lists.detail(listId), { scroll: false });
    }
  };
  const [query, setQuery] = useState("");
  /** Le dernier résultat, **avec le terme qui l'a produit** : c'est ce qui dit s'il vaut encore. */
  const [searched, setSearched] = useState<{
    term: string;
    result: CommandSearchResult;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const searchable = term.length >= COMMAND_SEARCH_MIN_LENGTH;
  const members = new Set(memberIds);

  /* Une requête par terme stabilisé, la précédente annulée. */
  useEffect(() => {
    if (!open || !searchable) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    upfetch(routes.api.search, {
      params: { q: term },
      schema: commandSearchResultSchema,
      signal: controller.signal,
    })
      .then((result) => {
        setSearched({ term, result });
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setLoading(false);
        toast.error("La recherche n'a pas abouti. Réessayez.");
      });

    return () => controller.abort();
  }, [open, searchable, term]);

  /*
    **On ne montre que ce qui répond au champ tel qu'il est.** Les suggestions disparaissent dès la
    première lettre, et un résultat périmé n'est jamais affiché : pendant le délai de frappe,
    `Entrée` rangeait sinon la suggestion surlignée, ou le premier résultat du terme d'avant, à la
    place de l'œuvre qu'on venait de taper.
  */
  const typed = query.trim();
  const current = searched?.term === typed ? searched.result : null;
  const items = typed === "" ? suggestions : (current?.items ?? []);

  /*
    **Le surlignage retombe sur le premier élément dès qu'il ne vise plus rien.** Laissé à cmdk, il
    garde la suggestion surlignée à l'ouverture, que les résultats ont remplacée : `Entrée` ne
    rangeait rien. Calculé au rendu et non dans un effet, sinon une touche frappée à l'arrivée des
    résultats tombe entre les deux et se perd.
  */
  const [highlighted, setHighlighted] = useState("");
  const highlightedValue = items.some((item) => String(item.id) === highlighted)
    ? highlighted
    : String(items[0]?.id ?? "");

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label="Ajouter des œuvres" size="sm">
          <PlusIcon data-icon="inline-start" />
          {/* Sur téléphone, la barre d'actions n'a de place que pour l'icône. */}
          <span className="hidden sm:inline">Ajouter des œuvres</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>Ajouter des œuvres</DialogTitle>
          <DialogDescription>
            Entrée range l'œuvre surlignée ; tapez la suivante aussitôt.
          </DialogDescription>
        </DialogHeader>

        {/* `shouldFilter={false}` : l'ordre est celui d'AniList, cmdk n'a rien à refiltrer. */}
        <Command
          className="rounded-none bg-transparent"
          onValueChange={setHighlighted}
          shouldFilter={false}
          value={highlightedValue}
        >
          <div className="relative px-3">
            <CommandInput
              onValueChange={setQuery}
              placeholder="Chercher une œuvre…"
              ref={inputRef}
              value={query}
            />
            {loading ? (
              <Spinner className="absolute top-1/2 right-6 -translate-y-1/2" />
            ) : null}
          </div>

          <CommandList className="max-h-96 px-3 pt-2 pb-3">
            <CommandEmpty>
              {typed === ""
                ? "Tapez un titre pour chercher dans le catalogue."
                : typed.length < COMMAND_SEARCH_MIN_LENGTH
                  ? "Encore une lettre."
                  : current
                    ? `Rien ne correspond à « ${typed} ».`
                    : "Recherche…"}
            </CommandEmpty>

            {current?.fromMirror ? (
              <p className="px-2 py-1.5 text-muted-foreground text-xs">
                AniList ne répond pas : résultats de la copie locale.
              </p>
            ) : null}

            {items.length > 0 ? (
              <CommandGroup
                heading={typed === "" ? "Dans ma bibliothèque" : undefined}
              >
                {items.map((item) => (
                  <ResultRow
                    inList={members.has(item.id)}
                    item={item}
                    key={item.id}
                    listId={listId}
                    onAdded={() => inputRef.current?.select()}
                  />
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Une œuvre, et la bascule qui la range ou la retire.
 *
 * Chaque ligne tient ses propres actions, comme `ListToggle` sur la fiche : deux ajouts coup sur
 * coup ne doivent pas partager un `isPending`.
 */
function ResultRow({
  item,
  listId,
  inList: inListFromServer,
  onAdded,
}: {
  item: CommandSearchItem;
  listId: string;
  inList: boolean;
  onAdded: () => void;
}) {
  const [inList, setInList] = useState(inListFromServer);

  // La revalidation de la page renvoie l'état réel ; c'est lui qui fait foi.
  useEffect(() => setInList(inListFromServer), [inListFromServer]);

  const onError = ({ error }: { error: { serverError?: string } }) => {
    toast.error(error.serverError ?? "Le rangement n'a pas abouti. Réessayez.");
    setInList(inListFromServer);
  };

  const add = useAction(addToList, { onError });
  const remove = useAction(removeFromList, { onError });
  const pending = add.isPending || remove.isPending;

  const toggle = () => {
    if (pending) return;
    const next = !inList;
    setInList(next);
    (next ? add.execute : remove.execute)({ listId, mediaId: item.id });
    if (next) onAdded();
  };

  const meta = [item.format, item.year].filter(Boolean).join(" · ");

  return (
    <CommandItem className="gap-3" onSelect={toggle} value={String(item.id)}>
      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
        {item.cover ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="32px"
            src={item.cover}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          {item.status ? <EntryStatusDot status={item.status} /> : null}
          <span className="truncate" title={item.title}>
            {item.title}
          </span>
        </span>
        {meta ? (
          <span className="text-muted-foreground text-xs">{meta}</span>
        ) : null}
      </div>

      {/* La place du témoin est fixe : le libellé ne doit pas sauter au clic. */}
      <span className="flex w-28 shrink-0 items-center justify-end gap-1.5 text-muted-foreground text-xs">
        {pending ? (
          <Spinner />
        ) : inList ? (
          <span className="flex items-center gap-1.5 text-foreground">
            <CheckIcon />
            Dans la liste
          </span>
        ) : (
          <>
            <PlusIcon />
            Ajouter
          </>
        )}
      </span>
    </CommandItem>
  );
}
