"use client";

import { Trash2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { removeEntry } from "@/features/tracking/server/tracking.actions";

/**
 * Retirer une œuvre de ma bibliothèque — **sous confirmation**.
 *
 * Le geste manquait depuis le 6 septembre 2026 : le menu à trois points de la fiche l'emportait en
 * partant, et `removeEntry` attendait au gel de `knip.jsonc`. Il revient **dans la fenêtre
 * d'édition du suivi**, qui est le seul endroit ouvert à la fois depuis la fiche et depuis chaque
 * vignette : un seul bouton, et il est partout où l'on voit une œuvre suivie.
 *
 * **Une confirmation simple, pas la dictée de la suppression d'une liste.** Recopier un nom est
 * réservé à ce geste-là (`delete-list-dialog.tsx`) pour garder sa force. Mais la fenêtre dit en
 * toutes lettres ce qui part : `EntryEvent` tombe en cascade, et le journal n'est pas rétroactif —
 * suivre l'œuvre de nouveau repart d'une page blanche.
 */
export function EntryRemoveButton({
  mediaId,
  title,
  disabled = false,
  onRemoved,
}: {
  mediaId: number;
  title: string;
  /** Désarmé pendant qu'une autre écriture de la même fenêtre est en vol. */
  disabled?: boolean;
  /** Prévenu une fois le serveur d'accord — la fenêtre parente se referme alors. */
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false);

  const { execute, isPending } = useAction(removeEntry, {
    onSuccess: () => {
      setOpen(false);
      onRemoved();
      toast.success(`« ${title} » a été retirée de votre bibliothèque.`);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Le retrait n'a pas abouti. Réessayez."),
  });

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        {/*
          Poussé à gauche du pied : il ne doit pas se lire comme la suite logique d'« Enregistrer ».

          `destructive` est un fond rouge pâle, pas un aplat : la forme d'un bouton, sans être celui
          que l'œil trouve en premier à côté d'« Enregistrer ».
        */}
        <Button
          className="sm:mr-auto"
          disabled={disabled || isPending}
          variant="destructive"
        >
          <Trash2Icon />
          Retirer de ma bibliothèque
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer « {title} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Son statut, sa progression, sa note, ses dates et vos notes
            disparaissent, et son journal avec eux, sans retour possible.
            L'œuvre reste dans le catalogue et dans vos listes.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          {/*
            `preventDefault` : sans lui, Radix referme la fenêtre au clic, avant la réponse du
            serveur — l'attente ne se verrait pas, et un échec afficherait son toast sur une fenêtre
            déjà fermée. Même raison que dans `delete-list-dialog.tsx`.
          */}
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              execute({ mediaId });
            }}
          >
            {isPending ? <Spinner /> : null}
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
