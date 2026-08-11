"use client";

import { EllipsisIcon, PencilIcon, Share2Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { DeleteListDialog } from "@/app/(app)/lists/[id]/_components/delete-list-dialog";
import { EditListDialog } from "@/app/(app)/lists/[id]/_components/edit-list-dialog";
import { ShareListDialog } from "@/app/(app)/lists/[id]/_components/share-list-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Les commandes rares d'une liste, sous un seul bouton.
 *
 * **Elles étaient trois boutons alignés à côté d'« Ajouter une œuvre », et c'était le problème.**
 * Quatre commandes de poids très inégaux se présentaient à égalité : l'une se refait dix fois par
 * séance, une autre expose la liste hors du cercle, la dernière est irréversible et emportait tout
 * — à deux centimètres de la première. Regrouper les trois rares laisse le geste fréquent seul en
 * évidence, et éloigne « Supprimer » du clic distrait.
 *
 * **L'état des trois dialogues vit ici, et pas dans chacun d'eux.** Un menu Radix démonte son
 * contenu à la fermeture : un `DialogTrigger` posé dans un `DropdownMenuItem` emporterait le
 * dialogue au moment même où il s'ouvre. C'est la raison pour laquelle les trois composants ont
 * perdu leur déclencheur et reçoivent `open` / `onOpenChange`.
 *
 * `onSelect` avec `preventDefault` n'est pas nécessaire ici : on **veut** que le menu se ferme, et
 * l'état qui ouvre le dialogue lui survit puisqu'il est stocké au-dessus.
 */

type OpenDialog = "share" | "edit" | "delete" | null;

export function ListActions({
  listId,
  title,
  description,
  itemCount,
  shareToken,
}: {
  listId: string;
  title: string;
  description: string | null;
  itemCount: number;
  shareToken: string | null;
}) {
  const [dialog, setDialog] = useState<OpenDialog>(null);

  /** Referme quel que soit le dialogue ouvert : un seul l'est à la fois. */
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Actions de la liste"
            size="icon-sm"
            variant="ghost"
          >
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setDialog("share")}>
              <Share2Icon />
              {/* Le libellé dit l'état, pas seulement le geste : une liste déjà partagée n'a pas
                  besoin d'un lien de plus, elle a besoin qu'on retrouve le sien. */}
              {shareToken ? "Gérer le partage" : "Partager"}
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => setDialog("edit")}>
              <PencilIcon />
              Modifier
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {/* Le trait sépare ce qui se défait de ce qui ne se défait pas. */}
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => setDialog("delete")}
              variant="destructive"
            >
              <Trash2Icon />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareListDialog
        listId={listId}
        onOpenChange={close}
        open={dialog === "share"}
        shareToken={shareToken}
      />

      <EditListDialog
        description={description}
        listId={listId}
        onOpenChange={close}
        open={dialog === "edit"}
        title={title}
      />

      <DeleteListDialog
        itemCount={itemCount}
        listId={listId}
        onOpenChange={close}
        open={dialog === "delete"}
        title={title}
      />
    </>
  );
}
