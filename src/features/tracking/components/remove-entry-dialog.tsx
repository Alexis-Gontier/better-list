"use client";

import { Trash2Icon } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { removeEntry } from "@/features/tracking/server/tracking.actions";
import { cn } from "@/lib/utils";

/**
 * Supprimer un suivi, avec confirmation.
 *
 * **C'est la destruction la plus lourde du produit, et elle ne se voyait pas.** `EntryEvent` est
 * en `onDelete: Cascade` derrière `Entry` : effacer un suivi emporte tout le journal daté de
 * l'œuvre — la « mémoire » que docs/PRODUCT.md §4.3 sépare précisément de l'état pour qu'elle
 * survive aux écrasements. Le geste partait pourtant d'un clic unique, à deux endroits, sous deux
 * libellés différents, quand supprimer une liste — qui ne détruit aucun événement — passait déjà
 * par un `AlertDialog`.
 *
 * `AlertDialog` et non `Dialog`, pour la même raison que `DeleteListDialog` : il ne se ferme ni au
 * clic à côté ni par une croix, et le focus s'ouvre sur « Annuler ».
 *
 * **Le composant porte l'action et son déclencheur**, là où `DeleteListDialog` reçoit `open` en
 * propriété. La différence tient à l'appelant : celui-là s'ouvre depuis un menu Radix, qui démonte
 * son contenu à la fermeture ; ici les deux déclencheurs sont des boutons posés dans un formulaire,
 * que rien ne démonte. Tenir l'action ici est aussi ce qui garantit qu'un seul texte décrit ce
 * qu'on perd — c'est la divergence des deux anciens libellés qui a motivé le regroupement.
 *
 * Les appelants n'ont donc plus à désactiver leurs champs pendant la suppression : le dialogue est
 * modal, ce qu'il recouvre est déjà hors d'atteinte.
 */
export function RemoveEntryDialog({
  mediaId,
  title,
  className,
  variant = "destructive",
  onRemoved,
}: {
  mediaId: number;
  /** Le titre déjà résolu dans la langue du compte : le dialogue ne relit pas les préférences. */
  title: string;
  className?: string;
  /**
   * L'aspect du déclencheur, pas celui du dialogue.
   *
   * Le panneau de la fiche le veut discret — il vit sous un séparateur, au bas d'une colonne qu'on
   * consulte pour tout autre chose. La fenêtre d'une vignette le veut rouge : on l'ouvre pour
   * corriger, et la suppression y côtoie « Enregistrer ».
   */
  variant?: "ghost" | "destructive";
  onRemoved?: () => void;
}) {
  const { execute, isPending } = useAction(removeEntry, {
    onSuccess: () => onRemoved?.(),
    onError: () => toast.error("Le suivi n'a pas pu être supprimé."),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className={cn(
            variant === "ghost" && "text-muted-foreground",
            className,
          )}
          size="sm"
          type="button"
          variant={variant}
        >
          <Trash2Icon />
          Supprimer le suivi
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Supprimer le suivi de « {title} » ?
          </AlertDialogTitle>
          {/*
            Le texte nomme le journal, parce que c'est la seule chose que rien ne reconstitue : une
            progression et une note se retapent en dix secondes, une année d'événements datés non.
            Il dit aussi ce qui **n'est pas** touché — sans quoi « supprimer » se lit comme un
            retrait du catalogue ou des listes, et l'hésitation porte sur la mauvaise question.
          */}
          <AlertDialogDescription>
            Votre progression, votre note et tout le journal daté de cette œuvre
            seront perdus. L'œuvre reste au catalogue et vos listes n'y touchent
            pas — mais le journal, lui, ne se reconstitue pas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>

          {/*
            `preventDefault`, comme sur la suppression d'une liste : sans lui `AlertDialogAction`
            referme au clic, et la roue de chargement disparaîtrait avant la réponse du serveur.
          */}
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              execute({ mediaId });
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
