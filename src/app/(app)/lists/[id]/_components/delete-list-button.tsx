"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { deleteList } from "@/features/lists/server/lists.actions";

/**
 * Supprimer une liste, **avec confirmation**.
 *
 * L'inverse du retrait d'une œuvre, qui n'en demande aucune : ici le geste est irréversible et
 * emporte tout le contenu, et le compte du nombre d'œuvres dans le texte de la boîte est là pour
 * qu'on mesure ce qu'on perd avant de cliquer.
 */
export function DeleteListButton({
  listId,
  title,
  itemCount,
}: {
  listId: string;
  title: string;
  itemCount: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { execute, isPending } = useAction(deleteList, {
    onSuccess: () => {
      setOpen(false);
      // La page qu'on regarde vient de disparaître : rester dessus afficherait une page introuvable.
      router.push(routes.lists.root);
    },
    onError: () => toast.error("La liste n'a pas pu être supprimée."),
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Trash2Icon aria-hidden="true" />
          Supprimer
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer « {title} » ?</DialogTitle>
          <DialogDescription>
            {itemCount > 0
              ? `La liste et les ${itemCount} œuvres qu'elle rassemble seront perdues. Les œuvres elles-mêmes, et votre suivi, ne sont pas touchés.`
              : "Cette liste est vide : il n'y a rien d'autre à perdre."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => setOpen(false)}
            variant="outline"
          >
            Annuler
          </Button>
          <Button
            disabled={isPending}
            onClick={() => execute({ listId })}
            variant="destructive"
          >
            {isPending ? <Spinner /> : null}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
