"use client";

import { PlusIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { routes } from "@/config/routes";
import { createList } from "@/features/lists/server/lists.actions";

/**
 * Création d'une liste.
 *
 * Un vrai `<form>` avec un bouton d'envoi, là où les réglages et le suivi enregistrent au fil des
 * clics : ici les champs n'ont de sens qu'ensemble, et une liste à demi créée n'existe pas.
 *
 * **On navigue vers la liste créée** au lieu de rester sur l'index. Créer une liste n'est jamais le
 * but : on la crée pour y mettre quelque chose.
 */
export function CreateListDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { execute, isPending, result } = useAction(createList, {
    onSuccess: ({ data }) => {
      setOpen(false);
      if (data) router.push(routes.lists.detail(data.slug));
    },
    onError: () => toast.error("La liste n'a pas pu être créée."),
  });

  const titleError = result.validationErrors?.fieldErrors?.title?.[0];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon aria-hidden="true" />
          Nouvelle liste
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle liste</DialogTitle>
          <DialogDescription>
            Un classement, une sélection, une envie de saison. Vous pourrez la
            réarranger plus tard.
          </DialogDescription>
        </DialogHeader>

        {/*
          `onSubmit` et non `action` : passer une fonction à `<form action>` fait posséder le
          formulaire par React, qui l'enveloppe en `requestFormReset(form); action(formData)`. Il est
          donc vidé à **chaque** envoi, y compris quand la validation refuse le titre — et la
          description qu'on venait d'écrire disparaît. `preventDefault` garde la soumission au clavier
          sans céder le formulaire. Même raisonnement, en plus long, dans `edit-list-dialog.tsx`.
        */}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            execute({
              title: String(formData.get("title") ?? ""),
              description: String(formData.get("description") ?? "") || null,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="list-title">Titre</Label>
            <Input
              aria-describedby={titleError ? "list-title-error" : undefined}
              aria-invalid={titleError ? true : undefined}
              autoComplete="off"
              disabled={isPending}
              id="list-title"
              name="title"
              placeholder="Mes incontournables"
              required
            />
            {titleError ? (
              <p className="text-destructive text-sm" id="list-title-error">
                {titleError}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="list-description">
              Description
              <span className="ml-1 font-normal text-muted-foreground">
                facultative
              </span>
            </Label>
            <Textarea
              disabled={isPending}
              id="list-description"
              name="description"
              placeholder="Ce que cette liste rassemble."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button disabled={isPending} type="submit">
              {isPending ? <Spinner /> : null}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
