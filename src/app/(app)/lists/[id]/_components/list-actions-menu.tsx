"use client";

import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteListDialog } from "@/app/(app)/lists/[id]/_components/delete-list-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListFormDialog } from "@/features/lists/components/list-form-dialog";
import { updateList } from "@/features/lists/server/lists.actions";
import type { ListDetail } from "@/features/lists/server/lists.queries";

/**
 * Les deux gestes qu'on porte sur une liste : la renommer, la supprimer.
 *
 * **Il vit sur la fiche d'une liste, et non sur la grille** — décision d'Alexis du 6 septembre
 * 2026, prise à l'écran. Posé dans le coin d'une carte de `/lists`, il tombait sur la quatrième
 * jaquette et donnait à un écran de consultation deux façons d'agir au lieu d'une. Ici, il est dans
 * la barre d'actions de la liste qu'on regarde : on décide de son sort en l'ayant sous les yeux.
 *
 * L'effet de bord est que la grille de `/lists` n'a plus un octet de JavaScript.
 *
 * **Ce composant ne fait qu'ouvrir.** Le renommage a son formulaire (`ListFormDialog`, partagé avec
 * la création) et la suppression sa fenêtre à part (`DeleteListDialog`, qui fait recopier le nom) :
 * garder les trois ici en aurait fait un fichier où l'on cherche.
 */
export function ListActionsMenu({ list }: { list: ListDetail }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rename = useAction(updateList, {
    onSuccess: () => setRenaming(false),
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "Le renommage n'a pas abouti. Réessayez.",
      ),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/*
            Le nom accessible porte celui de la liste : « Actions » seul ne dit pas sur quoi, et
            c'est la seule chose qu'un lecteur d'écran entendrait d'un bouton à trois points.

            `size="icon"` — 36 px, la taille normale du dépôt. Le format réduit qu'il portait avant
            existait pour tenir dans un coin de jaquette ; ici il est dans un en-tête, où rien ne
            justifie de rétrécir une cible.
          */}
          <Button
            aria-label={`Actions sur la liste ${list.title}`}
            size="icon"
            variant="outline"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>

        {/* Les items dans leur groupe — la composition qu'attend `DropdownMenu`. */}
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              <PencilIcon />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleting(true)}
              variant="destructive"
            >
              <Trash2Icon />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/*
        Renommer et redécrire d'un même geste : ce sont les deux champs du même formulaire que la
        création, et `updateListSchema` les demande ensemble.

        `initialValues` est reconstruit à chaque rendu, et c'est voulu — `ListFormDialog` les relit à
        l'ouverture, donc rouvrir après avoir annulé remet le texte de la base, pas celui qu'on
        venait d'abandonner.
      */}
      <ListFormDialog
        fieldErrors={rename.result.validationErrors?.fieldErrors}
        heading="Renommer la liste"
        initialValues={{
          title: list.title,
          description: list.description ?? "",
        }}
        onOpenChange={setRenaming}
        onSubmit={({ title, description }) =>
          rename.execute({
            listId: list.id,
            title,
            description: description.trim() || null,
          })
        }
        open={renaming}
        pending={rename.isPending}
        submitLabel="Enregistrer"
      />

      <DeleteListDialog
        list={list}
        onOpenChange={setDeleting}
        open={deleting}
      />
    </>
  );
}
