"use client";

import { XIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { removeFromList } from "@/features/lists/server/lists.actions";

/**
 * Retirer une œuvre d'une liste, depuis sa vignette.
 *
 * Posé dans la fente `action` de `MediaCard`, donc **à côté** du lien et non dedans. Pas de
 * confirmation : l'action est réversible en deux clics — on retrouve l'œuvre et on la remet —, et
 * une boîte de dialogue pour ça serait un péage.
 */
export function RemoveFromListButton({
  listId,
  mediaId,
  title,
}: {
  listId: string;
  mediaId: number;
  /** Sert au libellé : « Retirer X de la liste » plutôt qu'un « Retirer » anonyme répété vingt fois. */
  title: string;
}) {
  const { execute, isPending } = useAction(removeFromList, {
    onError: () => toast.error("L'œuvre n'a pas pu être retirée."),
  });

  const label = `Retirer ${title} de la liste`;

  return (
    <Button
      aria-label={label}
      className="size-7 rounded-full opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
      disabled={isPending}
      onClick={() => execute({ listId, mediaId })}
      size="icon"
      title={label}
      type="button"
      variant="secondary"
    >
      {isPending ? <Spinner /> : <XIcon />}
    </Button>
  );
}
