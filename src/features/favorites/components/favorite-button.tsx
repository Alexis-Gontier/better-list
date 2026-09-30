"use client";

import { HeartIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FavoriteTarget } from "@/features/favorites/schemas/favorites.schema";
import { setFavorite } from "@/features/favorites/server/favorites.actions";
import { cn } from "@/lib/utils";

/**
 * Le cœur : une œuvre, un personnage ou un staff dans mes favoris.
 *
 * **`useOptimistic` et pas `useState`**, pour la raison de `volume-board.tsx` : l'état suit le clic
 * tout de suite, puis retombe sur ce que le serveur a rendu après `revalidatePath` — y compris
 * après un échec, où le cœur revient seul à sa place pendant que le toast le dit.
 *
 * Trois appelants dès sa création (fiche, personnage, staff), donc dans `features/favorites/`.
 */
export function FavoriteButton({
  target,
  initial,
}: {
  target: FavoriteTarget;
  /** Ce que la base dit, lu par le parent serveur. */
  initial: boolean;
}) {
  const [favorite, setOptimistic] = useOptimistic(initial);

  const { executeAsync } = useAction(setFavorite, {
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "Le favori n'a pas pu être enregistré. Réessayez.",
      ),
  });

  const label = favorite ? "Retirer de mes favoris" : "Ajouter à mes favoris";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          aria-pressed={favorite}
          onClick={() =>
            startTransition(async () => {
              const next = !favorite;
              setOptimistic(next);
              await executeAsync({ target, favorite: next });
            })
          }
          size="icon"
          variant="outline"
        >
          <HeartIcon className={cn(favorite && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
