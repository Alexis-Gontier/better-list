"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteListDialog } from "@/app/(app)/lists/[id]/_components/delete-list-dialog";
import { ShareListDialog } from "@/app/(app)/lists/[id]/_components/share-list-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ListFormDialog,
  parseCutoff,
} from "@/features/lists/components/list-form-dialog";
import { updateList } from "@/features/lists/server/lists.actions";
import type { ListDetail } from "@/features/lists/server/lists.queries";

/**
 * Les gestes qu'on porte sur une liste : la modifier (nom, description, genre), la partager, la supprimer.
 *
 * **Il vit sur la fiche d'une liste, et non sur la grille** — décision d'Alexis du 6 septembre
 * 2026, prise à l'écran. Posé dans le coin d'une carte de `/lists`, il tombait sur la quatrième
 * jaquette et donnait à un écran de consultation deux façons d'agir au lieu d'une. Ici, il est dans
 * la barre d'actions de la liste qu'on regarde : on décide de son sort en l'ayant sous les yeux.
 *
 * L'effet de bord est que la grille de `/lists` n'a plus un octet de JavaScript.
 *
 * **Ce composant ne fait qu'ouvrir.** La modification a son formulaire (`ListFormDialog`, partagé avec
 * la création) et la suppression sa fenêtre à part (`DeleteListDialog`, qui fait recopier le nom) :
 * garder les trois ici en aurait fait un fichier où l'on cherche.
 */
export function ListActionsMenu({ list }: { list: ListDetail }) {
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const edit = useAction(updateList, {
    onSuccess: () => setEditing(false),
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "La modification n'a pas abouti. Réessayez.",
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
            className="max-sm:size-10"
            size="icon"
            variant="outline"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>

        {/* Les items dans leur groupe — la composition qu'attend `DropdownMenu`. */}
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <PencilIcon />
              Modifier
            </DropdownMenuItem>
            {/*
              Le libellé dit **l'état**, pas seulement le geste : « Lien de partage » quand la liste
              est déjà partagée, « Partager » sinon. Sans ça, on rouvre la fenêtre pour savoir si un
              lien existe — ou pire, on croit en créer un alors qu'on va le remplacer.
            */}
            <DropdownMenuItem onSelect={() => setSharing(true)}>
              <Share2Icon />
              {list.shareToken ? "Lien de partage" : "Partager"}
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
        Nom, description, genre et Top d'un même geste : ce sont les champs du même formulaire que la
        création, et `updateListSchema` les demande ensemble.

        `initialValues` est reconstruit à chaque rendu, et c'est voulu — `ListFormDialog` les relit à
        l'ouverture, donc rouvrir après avoir annulé remet le texte de la base, pas celui qu'on
        venait d'abandonner.
      */}
      <ListFormDialog
        fieldErrors={edit.result.validationErrors?.fieldErrors}
        heading="Modifier la liste"
        initialValues={{
          title: list.title,
          description: list.description ?? "",
          kind: list.kind,
          cutoff: list.cutoff === null ? "" : String(list.cutoff),
        }}
        onOpenChange={setEditing}
        onSubmit={({ title, description, kind, cutoff }) =>
          edit.execute({
            listId: list.id,
            title,
            description: description.trim() || null,
            kind,
            cutoff: parseCutoff(cutoff),
          })
        }
        open={editing}
        pending={edit.isPending}
        submitLabel="Enregistrer"
      />

      <ShareListDialog list={list} onOpenChange={setSharing} open={sharing} />

      <DeleteListDialog
        list={list}
        onOpenChange={setDeleting}
        open={deleting}
      />
    </>
  );
}
