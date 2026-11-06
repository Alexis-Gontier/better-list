"use client";

import { HeartIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleListLike } from "@/features/social/server/social.actions";
import { cn } from "@/lib/utils";

const UNAVAILABLE = "Cette liste n'est plus disponible.";

/**
 * Le ♥ d'une liste et son compteur, optimiste (lot 3, §3) : le serveur confirme, il ne fait pas
 * attendre. Plein en accent quand je l'aime : c'est l'emploi « élément actif » de D33.
 *
 * `compact` : la version posée sur une carte de la Communauté, sans bordure.
 */
export function LikeButton({
  listId,
  liked: initialLiked,
  count: initialCount,
  compact = false,
}: {
  listId: string;
  liked: boolean;
  count: number;
  compact?: boolean;
}) {
  const [state, setState] = useState({
    liked: initialLiked,
    count: initialCount,
  });
  const before = { liked: initialLiked, count: initialCount };

  const { execute, isPending } = useAction(toggleListLike, {
    onSuccess: ({ data }) => {
      if (data?.status === "ok") return;
      setState(before);
      toast.error(UNAVAILABLE);
    },
    onError: () => {
      setState(before);
      toast.error("Le like n'a pas pu être enregistré. Réessayez.");
    },
  });

  const label = state.liked ? "Ne plus aimer cette liste" : "Aimer cette liste";

  return (
    <Button
      aria-label={label}
      aria-pressed={state.liked}
      className={cn(compact && "relative z-10")}
      disabled={isPending}
      onClick={() => {
        setState(({ liked, count }) => ({
          liked: !liked,
          count: count + (liked ? -1 : 1),
        }));
        execute({ listId });
      }}
      size={compact ? "xs" : "sm"}
      title={label}
      variant={compact ? "ghost" : "outline"}
    >
      <HeartIcon
        className={cn(state.liked && "fill-primary text-primary")}
        data-icon="inline-start"
      />
      {state.count}
    </Button>
  );
}
