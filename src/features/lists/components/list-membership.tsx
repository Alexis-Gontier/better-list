"use client";

import {
  HourglassIcon,
  type LucideIcon,
  PlusIcon,
  SparklesIcon,
  TelescopeIcon,
  TrophyIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import {
  itemCountLabel,
  LIST_KIND_LABELS,
} from "@/features/lists/lib/list-labels";
import type {
  ListKind,
  ListMembership,
} from "@/features/lists/schemas/lists.schema";
import {
  addToList,
  createList,
  removeFromList,
} from "@/features/lists/server/lists.actions";
import { cn } from "@/lib/utils";

/**
 * Ranger une œuvre dans mes listes — **le sélecteur d'étiquettes**, sur le `Command` de shadcn.
 *
 * - **un seul champ cherche et crée** : un nom qui n'existe pas devient « Créer « … » » (D53) ;
 * - **une ligne par liste, coche à droite** : celle que `CommandItem` dessine (`data-checked`) ;
 * - **le menu reste ouvert** : on range souvent dans deux listes d'affilée.
 *
 * Créer pose le genre « Sélection » (D53) : un choix de genre à côté du champ en ferait un
 * formulaire, et il se change sur `/lists`.
 *
 * **`onChanged` est appelé après chaque écriture réussie.** La fenêtre d'une vignette, qui a lu ses
 * listes par `fetch`, les y relit : la revalidation du serveur ne l'atteint pas.
 */
export function ListPicker({
  lists,
  mediaId,
  onChanged,
  heading = "Mes listes",
  className,
}: {
  lists: ListMembership[];
  mediaId: number;
  /** Facultatif sur la fiche : la revalidation de l'action la renvoie déjà à jour. */
  onChanged?: () => void;
  /** L'intitulé du groupe ; `null` quand l'appelant pose déjà le sien juste au-dessus. */
  heading?: string | null;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const name = query.trim();

  const create = useAction(createList, {
    onSuccess: () => {
      setQuery("");
      onChanged?.();
      toast.success(`Liste « ${name} » créée, l'œuvre y est rangée.`);
    },
    onError: ({ error }) =>
      toast.error(
        error.validationErrors?.fieldErrors?.title?.[0] ??
          error.serverError ??
          "La liste n'a pas été créée. Réessayez.",
      ),
  });

  /*
    « Créer » ne paraît que pour un nom **nouveau** : proposer de créer « À voir » à côté de la
    liste « À voir » ferait deux listes du même nom au premier Entrée distrait.
  */
  const exists = lists.some(
    (list) =>
      list.title.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"),
  );
  const canCreate = name.length > 0 && !exists;

  return (
    /*
      `bg-transparent p-0` : le `Command` pose un fond de menu flottant, et il vit ici **dans** une
      surface (la fenêtre, ou le panneau de la vignette) qui a déjà le sien.
    */
    <Command className={cn("bg-transparent p-0", className)} loop>
      <CommandInput
        onValueChange={setQuery}
        placeholder={
          lists.length > 0
            ? "Chercher ou créer une liste…"
            : "Nom de la nouvelle liste…"
        }
        value={query}
      />
      <CommandList className="max-h-none min-h-0 flex-1">
        {/* Pas de « rien trouvé » quand « Créer » est juste dessous : il dirait le contraire. */}
        {canCreate ? null : (
          <CommandEmpty className="px-2 py-4 text-muted-foreground">
            {lists.length > 0
              ? "Aucune liste à ce nom."
              : "Aucune liste encore. Tapez un nom : l'œuvre y sera rangée d'emblée."}
          </CommandEmpty>
        )}

        {lists.length > 0 ? (
          <CommandGroup heading={heading ?? undefined}>
            {lists.map((list) => (
              <ListPickerItem
                key={list.id}
                list={list}
                mediaId={mediaId}
                onChanged={onChanged}
              />
            ))}
          </CommandGroup>
        ) : null}

        {canCreate ? (
          <>
            {lists.length > 0 ? <CommandSeparator /> : null}
            <CommandGroup forceMount>
              {/*
                `forceMount` et une `value` qui contient la saisie : sans eux, cmdk filtrerait cette
                ligne comme les autres, et elle disparaîtrait au moment précis où on la cherche.
              */}
              <CommandItem
                disabled={create.isPending}
                forceMount
                onSelect={() =>
                  create.execute({ title: name, kind: "SELECTION", mediaId })
                }
                value={`__create__ ${name}`}
              >
                {create.isPending ? <Spinner /> : <PlusIcon />}
                <span className="truncate">
                  Créer « <span className="font-medium">{name}</span> »
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </Command>
  );
}

/**
 * Une icône par genre de liste (D47), au trait comme le reste de l'interface (D33).
 *
 * Pas la miniature de `ListKindGlyph` : dessinée pour une carte de 64 px, elle se réduit ici à des
 * traits illisibles. Une icône se lit à 16 px — la sélection, le podium, la longue-vue de ce qu'on
 * guette, le sablier de ce qu'on attend.
 */
const LIST_KIND_ICONS: Record<ListKind, LucideIcon> = {
  SELECTION: SparklesIcon,
  RANKING: TrophyIcon,
  WATCHLIST: TelescopeIcon,
  WAIT_FOR_END: HourglassIcon,
};

/**
 * Une liste du sélecteur.
 *
 * **Chaque ligne porte ses propres actions** : cocher deux listes coup sur coup lance deux écritures
 * qui se chevauchent, et un `isPending` partagé désarmerait tout le sélecteur.
 */
function ListPickerItem({
  list,
  mediaId,
  onChanged,
}: {
  list: ListMembership;
  mediaId: number;
  onChanged?: () => void;
}) {
  const [checked, setChecked] = useState(list.contains);

  // La prop refait autorité quand le serveur a répondu : c'est elle qui fait foi.
  useEffect(() => setChecked(list.contains), [list.contains]);

  const onError = ({ error }: { error: { serverError?: string } }) => {
    toast.error(error.serverError ?? "Le rangement n'a pas abouti. Réessayez.");
    // La coche ne doit jamais prétendre une écriture qui n'a pas eu lieu.
    setChecked(list.contains);
  };

  const add = useAction(addToList, {
    onError,
    onSuccess: () => onChanged?.(),
  });
  const remove = useAction(removeFromList, {
    onError,
    onSuccess: () => onChanged?.(),
  });
  const pending = add.isPending || remove.isPending;
  const KindIcon = LIST_KIND_ICONS[list.kind];

  // La coche bouge avant la réponse ; en cas d'échec, `onError` la remet où elle était.
  const toggle = () => {
    if (pending) return;
    const next = !checked;
    setChecked(next);
    const run = next ? add.execute : remove.execute;
    run({ listId: list.id, mediaId });
  };

  /*
    La place n'est dite que pour une œuvre déjà rangée et confirmée par le serveur : juste après un
    clic, on ne la connaît pas encore, et une place devinée serait fausse dès la suivante.
  */
  const placement =
    checked && list.contains && list.position !== null
      ? ` · n° ${list.position}`
      : "";

  return (
    <CommandItem
      /*
        `aria-checked` pour le lecteur d'écran — cmdk réserve `aria-selected` à la ligne survolée —,
        `data-checked` pour la coche que `CommandItem` dessine lui-même à droite.
      */
      aria-checked={checked}
      data-checked={checked}
      keywords={[list.title, LIST_KIND_LABELS[list.kind]]}
      onSelect={toggle}
      value={list.id}
    >
      {/*
        L'icône du genre et non une jaquette : une jaquette fait lire la ligne comme une œuvre, le
        genre dit ce que la liste fera de celle-ci.
      */}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <KindIcon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium" title={list.title}>
          {list.title}
        </span>
        <span className="truncate text-muted-foreground text-xs">
          {LIST_KIND_LABELS[list.kind]} · {itemCountLabel(list.itemCount)}
          {placement}
        </span>
      </span>
      {/* Le sablier passe devant la coche pendant l'écriture, sans décaler la ligne. */}
      {pending ? <Spinner /> : null}
    </CommandItem>
  );
}
