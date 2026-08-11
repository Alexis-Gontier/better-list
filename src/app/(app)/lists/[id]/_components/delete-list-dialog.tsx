"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { deleteList } from "@/features/lists/server/lists.actions";
import { cn } from "@/lib/utils";

/**
 * Supprimer une liste, avec confirmation.
 *
 * **`AlertDialog` et non `Dialog`, et la différence n'est pas cosmétique.** Un dialogue d'alerte
 * interrompt : il ne se ferme pas au clic à côté ni par la croix, et le focus s'ouvre sur
 * « Annuler ». C'est exactement ce qu'on veut d'un geste irréversible qui emporte tout le contenu —
 * là où un `Dialog` ordinaire se referme d'un clic distrait, ce qui est sans conséquence pour un
 * formulaire et trompeur pour une destruction.
 *
 * L'inverse du retrait d'une œuvre, qui ne demande aucune confirmation : celui-là se refait en un
 * clic. Le compte du nombre d'œuvres est dans le texte pour qu'on mesure ce qu'on perd.
 */
export function DeleteListDialog({
  listId,
  title,
  itemCount,
  open,
  onOpenChange,
}: {
  listId: string;
  title: string;
  itemCount: number;
  /** Contrôlé depuis `ListActions` — voir `EditListDialog` pour la raison. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const { execute, isPending } = useAction(deleteList, {
    onSuccess: () => {
      onOpenChange(false);
      // La page qu'on regarde vient de disparaître : rester dessus afficherait une page introuvable.
      router.push(routes.lists.root);
    },
    onError: () => toast.error("La liste n'a pas pu être supprimée."),
  });

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {title} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            {itemCount > 0
              ? `La liste et les ${itemCount} œuvres qu'elle rassemble seront perdues. Les œuvres elles-mêmes, et votre suivi, ne sont pas touchés.`
              : "Cette liste est vide : il n'y a rien d'autre à perdre."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>

          {/*
            `preventDefault` sur l'action : sans lui, `AlertDialogAction` ferme la boîte au clic, et
            la roue de chargement disparaîtrait avant que le serveur ait répondu. C'est `onSuccess`
            qui referme, une fois la suppression réellement faite.
          */}
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              execute({ listId });
            }}
          >
            {isPending ? <Spinner /> : null}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
