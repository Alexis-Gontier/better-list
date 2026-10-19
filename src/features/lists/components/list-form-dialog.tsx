"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  LIST_KIND_HINTS,
  LIST_KIND_LABELS,
} from "@/features/lists/lib/list-labels";
import {
  type ListKind,
  listKindSchema,
} from "@/features/lists/schemas/lists.schema";

/**
 * Le formulaire d'une liste — **son nom et ce qu'elle dit d'elle**, et rien d'autre.
 *
 * Il sert à créer comme à renommer, parce que les deux posent exactement les mêmes règles :
 * `createListSchema` et `updateListSchema` partagent leurs bornes, définies une seule fois dans
 * `lists.schema.ts` précisément pour qu'un titre accepté à la création ne soit pas refusé à la
 * modification. Deux formulaires auraient fini par diverger de la même façon.
 *
 * **Il ne connaît aucune action**, et c'est ce qui lui permet d'en servir deux : l'appelant tient
 * son `useAction` et passe `onSubmit`, `pending` et `fieldErrors`. Le composant ne fait que
 * recueillir deux chaînes.
 *
 * Il a démarré dans le `_components/` de `/lists` et **a été promu ici le 6 septembre 2026**, quand
 * la barre d'actions de `/lists/[id]` en a eu besoin pour renommer : deuxième route, donc
 * `features/lists/components/`, la maison d'un composant qui connaît une entité métier et sert
 * plusieurs écrans (CLAUDE.md).
 *
 * **Le partage n'y figure pas**, et `lists.schema.ts` dit pourquoi : publier une liste et la
 * renommer n'ont ni la même portée ni le même défaire. Les mêler ferait d'« Enregistrer » un bouton
 * dont on ne mesure plus les conséquences.
 */

export type ListFormValues = {
  title: string;
  description: string;
  kind: ListKind;
  /** Du texte tant qu'on tape : l'appelant le convertit avec `parseCutoff`. */
  cutoff: string;
};

/** Vide devient `null` ; le reste part tel quel, et c'est Zod qui refuse un nombre hors bornes. */
export function parseCutoff(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

type ListFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** L'intitulé de la fenêtre — « Nouvelle liste » ou « Renommer la liste ». */
  heading: string;
  /** Ce que fait le bouton d'envoi, en un mot : « Créer », « Enregistrer ». */
  submitLabel: string;
  /**
   * Les valeurs de départ. **Relues à chaque ouverture**, jamais une seule fois au montage : sans
   * ça, annuler un renommage puis rouvrir la fenêtre montrerait le texte qu'on venait d'abandonner,
   * et l'envoyer au geste suivant.
   */
  initialValues?: ListFormValues;
  pending: boolean;
  /** Ce que le serveur a refusé, par champ. `defaultValidationErrorsShape: "flattened"`. */
  fieldErrors?: {
    title?: string[];
    description?: string[];
    cutoff?: string[];
  };
  onSubmit: (values: ListFormValues) => void;
};

const EMPTY: ListFormValues = {
  title: "",
  description: "",
  kind: "SELECTION",
  cutoff: "",
};

export function ListFormDialog({
  open,
  onOpenChange,
  heading,
  submitLabel,
  initialValues,
  pending,
  fieldErrors,
  onSubmit,
}: ListFormDialogProps) {
  const [values, setValues] = useState<ListFormValues>(initialValues ?? EMPTY);

  /*
    La remise à l'état de départ se fait **à l'ouverture** et pas à la fermeture : une fenêtre Radix
    reste montée le temps de son animation de sortie, et remettre les champs à zéro en sortant ferait
    voir le formulaire se vider pendant qu'il disparaît.
  */
  useEffect(() => {
    if (open) setValues(initialValues ?? EMPTY);
  }, [open, initialValues]);

  const titleError = fieldErrors?.title?.[0];
  const descriptionError = fieldErrors?.description?.[0];
  const cutoffError = fieldErrors?.cutoff?.[0];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            Le nom est le seul champ nécessaire. Le genre décide de l'affichage
            : rangs, progression, œuvres prêtes.
          </DialogDescription>
        </DialogHeader>

        {/*
          Un vrai `<form>` : c'est lui qui fait marcher la touche Entrée dans le champ de nom, sans
          quoi il faudrait viser le bouton à la souris pour un formulaire de deux lignes.
        */}
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="list-title">Nom</Label>
            <Input
              /*
                **Pas de `required` ni de `maxLength` posés ici.** Les bornes vivent dans le schéma
                Zod, qui est ce que le serveur applique réellement ; les redire dans le champ
                donnerait deux endroits à tenir d'accord, dont un qui ne protège rien.
              */
              aria-describedby={titleError ? "list-title-error" : undefined}
              aria-invalid={titleError ? true : undefined}
              autoFocus
              id="list-title"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Top 2026, À faire découvrir…"
              value={values.title}
            />
            {titleError ? (
              <p className="text-destructive text-sm" id="list-title-error">
                {titleError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="list-description">Description</Label>
            <Textarea
              aria-describedby={
                descriptionError ? "list-description-error" : undefined
              }
              aria-invalid={descriptionError ? true : undefined}
              id="list-description"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Facultatif."
              rows={3}
              value={values.description}
            />
            {descriptionError ? (
              <p
                className="text-destructive text-sm"
                id="list-description-error"
              >
                {descriptionError}
              </p>
            ) : null}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium text-sm">Genre</legend>
            <RadioGroup
              className="grid gap-2 sm:grid-cols-2"
              onValueChange={(kind) =>
                setValues((current) => ({
                  ...current,
                  kind: listKindSchema.parse(kind),
                }))
              }
              value={values.kind}
            >
              {listKindSchema.options.map((kind) => (
                <Label
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary"
                  htmlFor={`list-kind-${kind}`}
                  key={kind}
                >
                  <RadioGroupItem
                    className="mt-0.5"
                    id={`list-kind-${kind}`}
                    value={kind}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {LIST_KIND_LABELS[kind]}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {LIST_KIND_HINTS[kind]}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          {/*
            La ligne de coupe ne se montre que pour un classement, mais sa valeur reste dans l'état :
            changer de genre puis revenir retrouve son Top 10.
          */}
          {values.kind === "RANKING" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="list-cutoff">Top</Label>
              <Input
                aria-describedby={
                  cutoffError ? "list-cutoff-error" : "list-cutoff-hint"
                }
                aria-invalid={cutoffError ? true : undefined}
                className="w-24"
                id="list-cutoff"
                inputMode="numeric"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    cutoff: event.target.value,
                  }))
                }
                placeholder="10"
                value={values.cutoff}
              />
              {cutoffError ? (
                <p className="text-destructive text-sm" id="list-cutoff-error">
                  {cutoffError}
                </p>
              ) : (
                <p
                  className="text-muted-foreground text-xs"
                  id="list-cutoff-hint"
                >
                  Facultatif. Les œuvres suivantes deviennent les prétendants.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            {/*
              `type="button"` explicite : dans un `<form>`, un bouton sans type est un bouton
              d'envoi, et « Annuler » enverrait le formulaire qu'il est censé abandonner.
            */}
            <Button
              disabled={pending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? <Spinner /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
