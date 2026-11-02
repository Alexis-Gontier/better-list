"use client";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { routes } from "@/config/routes";
import { authClient } from "@/lib/auth/client";

/**
 * Supprimer son compte. Le bouton reste éteint tant que l'identifiant n'est pas recopié, comme pour
 * une liste (D40) : le geste est irréversible. Le dernier administrateur est refusé par
 * `deleteUser.beforeDelete` (`src/lib/auth/server.ts`), et le message arrive dans le toast.
 */
export function DeleteAccount({ username }: { username: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const { error } = await authClient.deleteUser({ callbackURL: routes.home });

    if (error) {
      toast.error(error.message ?? "La suppression a échoué.");
      setPending(false);
      return;
    }

    // Le cookie est effacé : `/` sert désormais la landing.
    window.location.assign(routes.home);
  }

  return (
    <AlertDialog onOpenChange={() => setConfirmation("")}>
      <AlertDialogTrigger asChild>
        <Button className="w-fit" variant="destructive">
          Supprimer mon compte
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
          <AlertDialogDescription>
            Votre suivi, votre journal, vos listes, votre collection et vos
            favoris partent avec lui. On ne peut pas revenir en arrière.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmation-suppression">
            Recopiez « {username} » pour confirmer
          </Label>
          <Input
            autoComplete="off"
            id="confirmation-suppression"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmation !== username || pending}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
            variant="destructive"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
