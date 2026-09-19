"use client";

import { EllipsisIcon, HashIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { MAX_VOLUME_NUMBER } from "@/features/collection/schemas/collection.schema";
import { setEditionVolumesTotal } from "@/features/collection/server/collection.actions";

/**
 * La porte de l'édition — **la seule, et c'est pour ça qu'elle existe.**
 *
 * PRODUCT.md §4.5 veut qu'on n'ait rien à remplir dans le cas courant : une édition par défaut est
 * créée en silence à la première saisie, et l'écran n'en dit rien tant qu'il n'y en a qu'une
 * (décision du 19 septembre 2026). Mais « ne rien dire » ne peut pas vouloir dire « ne rien
 * offrir » : le `volumesTotal` — que **seul l'utilisateur connaît**, AniList ne le donnant que
 * pour les séries terminées et sans notion d'édition (§9) — n'aurait sinon aucun endroit où se
 * saisir, et sans lui l'écran ne sait pas ce qui manque.
 *
 * D'où un menu plutôt qu'un bouton : trois points en bout de ligne ne pèsent rien tant qu'on n'en
 * a pas besoin. **Il n'a qu'une entrée**, et c'est délibéré : « Ajouter une édition… » n'y est pas
 * tant que le cas multi-éditions n'a pas d'écran (sélecteur en tête de série, une rangée par
 * édition sur `/collection`). Une entrée de menu qui n'ouvre rien est pire qu'une entrée absente
 * — c'est la même règle qui avait retiré « Ma collection » de la nav (docs/STATE.md).
 */
export function EditionMenu({
  mediaId,
  volumesTotal,
}: {
  mediaId: number;
  volumesTotal: number | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Gérer l'édition"
            className="size-8"
            size="icon"
            variant="ghost"
          >
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>

        {/*
          Une largeur posée : sans elle, le menu se cale sur son déclencheur — trois points de
          32 px — et l'intitulé se coupe sur deux lignes.
        */}
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <HashIcon />
            {volumesTotal === null
              ? "Nombre de tomes…"
              : `Nombre de tomes (${volumesTotal})`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/*
        La fenêtre est **sœur du menu, pas son enfant** : un `DialogTrigger` dans un
        `DropdownMenuItem` se referme avec le menu au moment où Radix rend le focus, et la fenêtre
        ne s'ouvre jamais. L'état `open` est donc porté ici, et l'entrée ne fait que le lever.
      */}
      {/*
        La `key` remonte la fenêtre quand le serveur renvoie un autre total, après
        `revalidatePath`. Sans elle, le champ garde la valeur de son premier rendu : on saisirait
        25, et la fenêtre rouverte afficherait encore 23 — le défaut classique d'un `useState`
        initialisé sur une prop.
      */}
      <VolumesTotalDialog
        key={String(volumesTotal)}
        mediaId={mediaId}
        onOpenChange={setOpen}
        open={open}
        volumesTotal={volumesTotal}
      />
    </>
  );
}

/**
 * Combien de tomes compte cette édition.
 *
 * Champ vide = « je ne sais pas encore », ce que l'action accepte (`null`) : une série en cours de
 * parution n'a pas de fin connue, et `volumeGaps` sait alors ne signaler que les creux internes
 * plutôt que d'inventer une fin de série.
 */
function VolumesTotalDialog({
  mediaId,
  volumesTotal,
  open,
  onOpenChange,
}: {
  mediaId: number;
  volumesTotal: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState(
    volumesTotal === null ? "" : String(volumesTotal),
  );

  const { execute, isPending } = useAction(setEditionVolumesTotal, {
    onSuccess: () => onOpenChange(false),
    onError: () =>
      toast.error("Le nombre de tomes n'a pas pu être enregistré."),
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nombre de tomes</DialogTitle>
          <DialogDescription>
            Laisser vide pour suivre AniList — qui ne compte les volumes qu'une
            fois la parution terminée, et ignore les éditions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="volumes-total">Tomes parus dans cette édition</Label>
          <Input
            id="volumes-total"
            max={MAX_VOLUME_NUMBER}
            min={1}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Vide : on suit AniList"
            type="number"
            value={value}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Annuler</Button>
          </DialogClose>
          <Button
            disabled={isPending}
            onClick={() => {
              const trimmed = value.trim();
              execute({
                mediaId,
                volumesTotal: trimmed === "" ? null : Number(trimmed),
              });
            }}
          >
            {isPending ? <Spinner /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
