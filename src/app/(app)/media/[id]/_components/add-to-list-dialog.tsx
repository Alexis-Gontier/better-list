"use client";

import { ListCheckIcon, ListPlusIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListPicker } from "@/features/lists/components/list-membership";
import type { ListMembership } from "@/features/lists/schemas/lists.schema";

/**
 * Ranger une œuvre dans mes listes, depuis sa fiche.
 *
 * **Des bascules, et pas un simple ajout** — décision d'Alexis du 6 septembre 2026. Une case cochée
 * veut dire « cette œuvre est dans cette liste » : on voit où elle est déjà rangée, et à quelle
 * place, avant de choisir ; un ajout par erreur se défait en décochant.
 *
 * **La fenêtre ne se referme pas sur un geste.** On range souvent dans deux listes d'affilée.
 *
 * **On crée une liste ici aussi** (D48) : un nom seul, tapé dans le champ de recherche, et l'œuvre y
 * est rangée d'emblée. Le genre vaut « Sélection » (D53) ; le formulaire complet vit sur `/lists`.
 *
 * **Pas de route handler** : la fiche est un Server Component, elle appelle `getListMembership` et
 * passe le résultat en prop. Rien n'est à aller chercher depuis le navigateur.
 *
 * Les cases et la création viennent de `features/lists/components/list-membership.tsx`, qu'elles
 * partagent avec la fenêtre d'édition rapide des vignettes (D53).
 */
export function AddToListDialog({
  mediaId,
  title,
  cover,
  lists,
}: {
  mediaId: number;
  /** Le titre de l'œuvre — il nomme le bouton pour un lecteur d'écran, et sous-titre la fenêtre. */
  title: string;
  /** La jaquette de l'en-tête : on voit ce qu'on range. */
  cover: string | null;
  lists: ListMembership[];
}) {
  const router = useRouter();
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

      {/*
        Le même sélecteur que la fenêtre d'une vignette (D53) : une œuvre se range de la même façon
        où qu'on l'ouvre. L'en-tête dit **quelle** œuvre on range, jaquette et titre.
      */}
      <DialogContent className="flex max-h-[min(92svh,42rem)] flex-col gap-0 p-0 sm:max-w-md">
        {/* `pr-12` : la croix de fermeture est posée en absolu dans ce coin. */}
        <div className="flex items-center gap-3 px-5 pt-5 pr-12 pb-4">
          {cover ? (
            <div
              aria-hidden
              className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border"
            >
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="48px"
                src={cover}
              />
            </div>
          ) : null}
          <DialogHeader className="min-w-0 gap-0.5 text-left">
            <DialogTitle>Ajouter à une liste</DialogTitle>
            <DialogDescription className="truncate" title={title}>
              {title}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/*
          Le sélecteur prend le reste de la hauteur et défile seul : quelques dizaines de listes
          pousseraient sinon le champ hors de la fenêtre.
        */}
        <ListPicker
          className="min-h-0 flex-1 px-4"
          lists={lists}
          mediaId={mediaId}
          /*
            La revalidation de l'action renvoie normalement la fiche à jour ; sous la charge des E2E
            en parallèle, la fenêtre restait parfois sur « Aucune liste encore ». Un rafraîchissement
            explicite garantit que la nouvelle liste paraît, cochée.
          */
          onChanged={router.refresh}
        />
        <p className="px-5 pt-2 pb-5 text-muted-foreground text-xs">
          {lists.length > 0 ? `Dans ${containing} sur ${lists.length} · ` : ""}
          Chaque choix est enregistré aussitôt.
        </p>
      </DialogContent>
    </Dialog>
  );
}
