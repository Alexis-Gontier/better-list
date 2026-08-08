"use client";

import { CheckIcon, ListPlusIcon, PlusIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  addToList,
  createList,
  removeFromList,
} from "@/features/lists/server/lists.actions";
import { cn } from "@/lib/utils";

/**
 * « Ajouter à une liste », depuis la fiche d'une œuvre.
 *
 * C'est **la** porte d'entrée des listes : une liste ne se remplit pas depuis la page des listes,
 * elle se remplit là où l'on regarde une œuvre.
 *
 * Chaque ligne est une bascule, pas une case à cocher dans un formulaire à valider : cocher *est*
 * l'action. Le libellé `aria-pressed` dit l'état, ce qu'une icône seule ne fait pas.
 *
 * La création est **dans le dialogue**, et enchaîne sur l'ajout. Sans elle, le premier usage du
 * produit — « je veux mettre cette œuvre dans une nouvelle liste » — obligerait à quitter la fiche,
 * créer la liste ailleurs, puis revenir.
 */
export function AddToListDialog({
  mediaId,
  lists,
}: {
  mediaId: number;
  lists: Array<{ id: string; title: string; contains: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  /** Contrôlé, pour que la saisie survive à un titre refusé — voir le formulaire plus bas. */
  const [newListTitle, setNewListTitle] = useState("");

  /**
   * L'appartenance est **projetée localement** par-dessus ce que le serveur a renvoyé au rendu.
   * Le dialogue reste ouvert après un clic, donc il doit refléter le geste immédiatement ; les
   * revalidations de l'action mettront la fiche à jour derrière.
   */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const contains = (list: { id: string; contains: boolean }) =>
    toggled[list.id] ?? list.contains;

  const add = useAction(addToList, {
    onError: () => toast.error("L'œuvre n'a pas pu être ajoutée."),
  });
  const remove = useAction(removeFromList, {
    onError: () => toast.error("L'œuvre n'a pas pu être retirée."),
  });

  const create = useAction(createList, {
    onSuccess: ({ data }) => {
      if (!data) return;
      // Créer une liste depuis cet écran n'a qu'un but : y mettre l'œuvre qu'on regarde.
      add.execute({ listId: data.id, mediaId });
      setToggled((state) => ({ ...state, [data.id]: true }));
      setCreating(false);
      // Le champ ne se vide que sur un succès : c'est tout l'intérêt de l'avoir contrôlé.
      setNewListTitle("");
      toast.success(`« ${data.title} » créée`);
    },
    onError: () => toast.error("La liste n'a pas pu être créée."),
  });

  const busy = add.isPending || remove.isPending || create.isPending;

  const toggle = (list: { id: string; contains: boolean }) => {
    const next = !contains(list);
    setToggled((state) => ({ ...state, [list.id]: next }));

    if (next) add.execute({ listId: list.id, mediaId });
    else remove.execute({ listId: list.id, mediaId });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="w-full" size="sm" variant="outline">
          <ListPlusIcon aria-hidden="true" />
          Ajouter à une liste
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter à une liste</DialogTitle>
          <DialogDescription>
            Une œuvre peut appartenir à autant de listes que vous voulez.
          </DialogDescription>
        </DialogHeader>

        {lists.length > 0 ? (
          <ul className="-mx-2 max-h-72 space-y-0.5 overflow-y-auto">
            {lists.map((list) => {
              const inside = contains(list);

              return (
                <li key={list.id}>
                  <button
                    aria-pressed={inside}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-60"
                    disabled={busy}
                    onClick={() => toggle(list)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        inside &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {inside ? <CheckIcon className="size-3" /> : null}
                    </span>

                    <span className="truncate">{list.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Vous n'avez pas encore de liste. Donnez-en un titre ci-dessous.
          </p>
        )}

        {/*
          `onSubmit` et non `action`, et le champ est **contrôlé** — deux décisions liées.

          Passer une fonction à `<form action>` fait posséder le formulaire par React, qui le vide à
          chaque envoi (`requestFormReset`, voir `edit-list-dialog.tsx`). Vider après un succès est
          justement ce qu'on veut ici ; vider après un titre refusé fait perdre la saisie. L'état
          local sépare les deux cas : il survit à l'erreur, et `onSuccess` le remet à zéro.
        */}
        {creating || lists.length === 0 ? (
          <form
            className="flex items-end gap-2 border-t pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.execute({ title: newListTitle });
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-list-title">Nouvelle liste</Label>
              <Input
                autoComplete="off"
                disabled={busy}
                id="new-list-title"
                name="title"
                onChange={(event) => setNewListTitle(event.target.value)}
                placeholder="Mes incontournables"
                required
                value={newListTitle}
              />
            </div>

            <Button disabled={busy} type="submit">
              {create.isPending ? <Spinner /> : null}
              Créer
            </Button>
          </form>
        ) : (
          <Button
            className="justify-start px-2"
            disabled={busy}
            onClick={() => setCreating(true)}
            size="sm"
            variant="ghost"
          >
            <PlusIcon aria-hidden="true" />
            Nouvelle liste
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
