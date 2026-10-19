"use client";

import { ListCheckIcon, ListPlusIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListKindGlyph } from "@/features/lists/components/list-kind-glyph";
import {
  itemCountLabel,
  LIST_KIND_LABELS,
} from "@/features/lists/lib/list-labels";
import {
  type ListKind,
  listKindSchema,
} from "@/features/lists/schemas/lists.schema";
import {
  addToList,
  createList,
  removeFromList,
} from "@/features/lists/server/lists.actions";
import type { ListMembership } from "@/features/lists/server/lists.queries";

/**
 * Ranger une œuvre dans mes listes, depuis sa fiche.
 *
 * **Des bascules, et pas un simple ajout** — décision d'Alexis du 6 septembre 2026. Une case cochée
 * veut dire « cette œuvre est dans cette liste » : on voit où elle est déjà rangée, et à quelle
 * place, avant de choisir ; un ajout par erreur se défait en décochant.
 *
 * **La fenêtre ne se referme pas sur un geste.** On range souvent dans deux listes d'affilée.
 *
 * **On crée une liste ici aussi** (D48, qui révise la décision du 6 septembre) : « je veux mettre
 * ça dans une nouvelle liste » est le cas le plus courant, et renvoyer vers `/lists` le cassait en
 * deux visites. La création y reste courte — un nom, un genre — et range l'œuvre d'emblée ; le
 * formulaire complet (description, Top) vit sur `/lists` et dans « Modifier ».
 *
 * **Pas de route handler** : la fiche est un Server Component, elle appelle `getListMembership` et
 * passe le résultat en prop. Rien n'est à aller chercher depuis le navigateur.
 */
export function AddToListDialog({
  mediaId,
  title,
  lists,
}: {
  mediaId: number;
  /** Le titre de l'œuvre — il nomme le bouton pour un lecteur d'écran, pas l'en-tête de la fenêtre. */
  title: string;
  lists: ListMembership[];
}) {
  const containing = lists.filter((list) => list.contains).length;
  const hint =
    containing === 0
      ? "Ajouter à une liste"
      : `Dans ${containing} liste${containing > 1 ? "s" : ""}`;

  return (
    <Dialog>
      {/*
        **Une icône seule depuis le 19 septembre 2026** (décision d'Alexis), à côté du cœur. Elle
        dit maintenant si l'œuvre est déjà rangée, comme le cœur dit si elle est favorite : sans
        ça, il fallait ouvrir la fenêtre pour le savoir.
      */}
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              aria-label={`${hint} — ${title}`}
              className="relative"
              size="icon"
              variant="outline"
            >
              {containing > 0 ? <ListCheckIcon /> : <ListPlusIcon />}
              {containing > 0 ? (
                <span
                  aria-hidden
                  className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-foreground font-medium text-[10px] text-background tabular-nums"
                >
                  {containing}
                </span>
              ) : null}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>

      <DialogContent className="flex max-h-[min(92svh,40rem)] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Ajouter à une liste</DialogTitle>
          <DialogDescription>
            Chaque case est enregistrée aussitôt.
          </DialogDescription>
        </DialogHeader>

        {/*
          `min-h-0` et défilement : quelques dizaines de listes tiendraient sinon plus haut que la
          fenêtre, et la création, en bas, deviendrait inatteignable.
        */}
        {lists.length > 0 ? (
          <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
            {lists.map((list) => (
              <ListToggle key={list.id} list={list} mediaId={mediaId} />
            ))}
          </ul>
        ) : (
          <p className="px-6 pb-2 text-muted-foreground text-sm">
            Aucune liste encore. Créez-en une : l'œuvre y sera rangée d'emblée.
          </p>
        )}

        <div className="border-t px-6 py-4">
          <NewListInline
            defaultOpen={lists.length === 0}
            key={lists.length}
            mediaId={mediaId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Une liste, et la case qui dit si l'œuvre y est.
 *
 * **Chaque ligne porte ses propres actions** : cocher deux listes coup sur coup lance deux écritures
 * qui se chevauchent, et un `isPending` partagé désarmerait toute la fenêtre.
 */
function ListToggle({
  list,
  mediaId,
}: {
  list: ListMembership;
  mediaId: number;
}) {
  const checkboxId = useId();
  const [checked, setChecked] = useState(list.contains);

  // La prop refait autorité quand le serveur a répondu : c'est elle qui fait foi.
  useEffect(() => setChecked(list.contains), [list.contains]);

  const onError = ({ error }: { error: { serverError?: string } }) => {
    toast.error(error.serverError ?? "Le rangement n'a pas abouti. Réessayez.");
    // La case ne doit jamais prétendre une écriture qui n'a pas eu lieu.
    setChecked(list.contains);
  };

  const add = useAction(addToList, { onError });
  const remove = useAction(removeFromList, { onError });
  const pending = add.isPending || remove.isPending;

  // La case bouge avant la réponse ; en cas d'échec, `onError` la remet où elle était.
  const toggle = (next: boolean) => {
    setChecked(next);
    const run = next ? add.execute : remove.execute;
    run({ listId: list.id, mediaId });
  };

  /*
    La place n'est dite que pour une œuvre déjà rangée et confirmée par le serveur : juste après un
    clic, on ne la connaît pas encore, et une place devinée serait fausse dès la suivante.
  */
  const placement =
    checked && list.contains && list.position !== null
      ? ` · n° ${list.position}`
      : "";

  return (
    <li>
      {/* Le libellé enveloppe la case : toute la ligne est une cible, bien au-delà de 16 px. */}
      <Label
        className="flex w-full items-center gap-3 rounded-md px-2 py-2 font-normal hover:bg-muted/50"
        htmlFor={checkboxId}
      >
        <Checkbox
          checked={checked}
          disabled={pending}
          id={checkboxId}
          onCheckedChange={(value) => toggle(value === true)}
        />
        {/* La jaquette de tête fait reconnaître une liste avant d'en lire le nom. */}
        <span className="relative flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted text-muted-foreground">
          {list.cover ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="32px"
              src={list.cover}
            />
          ) : (
            <ListKindGlyph className="h-4 w-7" kind={list.kind} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate" title={list.title}>
            {list.title}
          </span>
          <span className="text-muted-foreground text-xs">
            {LIST_KIND_LABELS[list.kind]} · {itemCountLabel(list.itemCount)}
            {placement}
          </span>
        </span>
        {/* La place du témoin est réservée, sinon le titre sauterait à chaque clic. */}
        <span className="flex size-4 shrink-0 items-center justify-center">
          {pending ? <Spinner /> : null}
        </span>
      </Label>
    </li>
  );
}

/**
 * Créer une liste **et y ranger l'œuvre**, d'un geste (D48).
 *
 * Un nom et un genre, rien d'autre : c'est une création au fil de la lecture d'une fiche, pas un
 * atelier. Elle part en une écriture (`createList` avec `mediaId`), donc une liste ne reste jamais
 * vide sur un second appel raté. La nouvelle liste paraît en tête, cochée, quand la fiche revalide.
 */
function NewListInline({
  mediaId,
  defaultOpen,
}: {
  mediaId: number;
  defaultOpen: boolean;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ListKind>("SELECTION");

  const create = useAction(createList, {
    onSuccess: () => {
      setName("");
      setOpen(false);
      toast.success("Liste créée, l'œuvre y est rangée.");
    },
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "La liste n'a pas été créée. Réessayez.",
      ),
  });
  const titleError = create.result.validationErrors?.fieldErrors?.title?.[0];

  if (!open) {
    return (
      <Button
        className="-ml-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        size="sm"
        variant="ghost"
      >
        <PlusIcon data-icon="inline-start" />
        Nouvelle liste
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        create.execute({ title: name, kind, mediaId });
      }}
    >
      <Label htmlFor={inputId}>Nouvelle liste</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-describedby={titleError ? `${inputId}-error` : undefined}
          aria-invalid={titleError ? true : undefined}
          autoFocus
          className="flex-1"
          id={inputId}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nom de la liste"
          value={name}
        />
        <Select
          onValueChange={(value) => setKind(listKindSchema.parse(value))}
          value={kind}
        >
          <SelectTrigger aria-label="Genre" className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {listKindSchema.options.map((option) => (
              <SelectItem key={option} value={option}>
                {LIST_KIND_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {titleError ? (
        <p className="text-destructive text-sm" id={`${inputId}-error`}>
          {titleError}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          disabled={create.isPending}
          onClick={() => setOpen(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Annuler
        </Button>
        <Button disabled={create.isPending} size="sm" type="submit">
          {create.isPending ? <Spinner /> : null}
          Créer et ranger
        </Button>
      </div>
    </form>
  );
}
