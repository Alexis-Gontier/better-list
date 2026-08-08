"use client";

import { PencilIcon } from "lucide-react";
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
import { updateList } from "@/features/lists/server/lists.actions";

/**
 * Renommer et redécrire une liste.
 *
 * Même forme que la création : un vrai `<form>` avec un bouton d'envoi, là où les réglages
 * enregistrent au fil des clics. Deux champs qui décrivent la même chose se valident ensemble, et un
 * titre changé sans sa description ne veut rien dire.
 *
 * **On ne navigue nulle part après coup**, contrairement à la création : la page qu'on regarde est
 * déjà la bonne, et son adresse ne change pas — le `slug` reste celui du titre d'origine (voir
 * `lists.schema.ts`). C'est aussi pourquoi le dialogue **affiche l'adresse** : renommer « Top 2026 »
 * en « Mes tops » laisse l'URL sur `/lists/top-2026`, et mieux vaut le dire que le laisser découvrir.
 *
 * Les champs sont **non contrôlés**, avec `defaultValue`. Radix démonte le contenu du dialogue à la
 * fermeture, donc rouvrir remonte le formulaire et reprend les valeurs fraîchement revalidées — un
 * état local dupliqué n'apporterait qu'une occasion de le voir diverger.
 */
export function EditListDialog({
  listId,
  slug,
  title,
  description,
}: {
  listId: string;
  slug: string;
  title: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);

  const { execute, isPending, result } = useAction(updateList, {
    onSuccess: () => {
      setOpen(false);
      toast.success("Liste modifiée.");
    },
    onError: () => toast.error("La liste n'a pas pu être modifiée."),
  });

  const titleError = result.validationErrors?.fieldErrors?.title?.[0];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <PencilIcon aria-hidden="true" />
          Modifier
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la liste</DialogTitle>
          <DialogDescription>
            Le titre et la description. L'ordre des œuvres se règle depuis la
            liste elle-même.
          </DialogDescription>
        </DialogHeader>

        {/*
          `onSubmit` et non `action`, et la nuance coûte une description perdue.

          Passer une fonction à `<form action>` fait **posséder le formulaire par React**, qui
          l'enveloppe en `requestFormReset(form); action(formData)` — vérifiable dans la source de
          `react-dom`. Le formulaire est donc vidé à **chaque** envoi, avant même que l'action ne
          réponde : sur une erreur de validation du titre, la description qu'on vient de taper est
          effacée sous les yeux de son auteur, qui n'a plus qu'à la retrouver.

          `onSubmit` avec `preventDefault` garde exactement le même confort — `Entrée` dans un champ
          déclenche la soumission native, donc le handler — sans céder le formulaire.
        */}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            execute({
              listId,
              title: String(formData.get("title") ?? ""),
              description: String(formData.get("description") ?? "") || null,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-list-title">Titre</Label>
            <Input
              aria-describedby={
                titleError ? "edit-list-title-error" : "edit-list-slug"
              }
              aria-invalid={titleError ? true : undefined}
              autoComplete="off"
              defaultValue={title}
              disabled={isPending}
              id="edit-list-title"
              name="title"
              required
            />

            {titleError ? (
              <p
                className="text-destructive text-sm"
                id="edit-list-title-error"
              >
                {titleError}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs" id="edit-list-slug">
                L'adresse reste{" "}
                <code className="font-mono">{routes.lists.detail(slug)}</code> —
                renommer ne casse pas un lien déjà ouvert.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-list-description">
              Description
              <span className="ml-1 font-normal text-muted-foreground">
                facultative
              </span>
            </Label>
            <Textarea
              defaultValue={description ?? ""}
              disabled={isPending}
              id="edit-list-description"
              name="description"
              placeholder="Ce que cette liste rassemble."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? <Spinner /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
