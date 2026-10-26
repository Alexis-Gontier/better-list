"use client";

import { HeartIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { mediaFavoriteStateSchema } from "@/features/favorites/schemas/favorites.schema";
import { setFavorite } from "@/features/favorites/server/favorites.actions";
import { upfetch } from "@/lib/http/fetch";
import { cn } from "@/lib/utils";

/**
 * Le cœur d'une œuvre **dans la fenêtre d'édition rapide d'une vignette** (D53).
 *
 * Pas `FavoriteButton` : celui-ci reçoit son état du serveur et compte sur `revalidatePath` pour le
 * corriger, ce qui suppose qu'une page l'a lu. Sur une grille, personne ne l'a lu — il est
 * demandé à l'ouverture (`api/favorites/media`), et c'est donc ce composant qui tient l'état et le
 * remet en place si l'écriture échoue.
 *
 * **Désarmé tant que l'état n'est pas connu** : un cœur vide qu'on cliquerait avant la réponse
 * enverrait « favori : oui » sur une œuvre qui l'est peut-être déjà — sans dommage, l'action pose un
 * état et non une bascule, mais le cœur aurait menti le temps du trajet.
 */
export function MediaFavoriteToggle({ mediaId }: { mediaId: number }) {
  const [favorite, setFavoriteState] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    upfetch(routes.api.mediaFavorite(mediaId), {
      schema: mediaFavoriteStateSchema,
      signal: controller.signal,
    })
      .then((state) => setFavoriteState(state.favorite))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // Le cœur reste désarmé : mieux vaut pas de geste qu'un geste sur un état inconnu.
        console.error(error);
      });

    return () => controller.abort();
  }, [mediaId]);

  const { execute, isPending } = useAction(setFavorite, {
    onError: ({ error }) => {
      setFavoriteState((current) => (current === null ? null : !current));
      toast.error(
        error.serverError ?? "Le favori n'a pas pu être enregistré. Réessayez.",
      );
    },
  });

  const label = favorite ? "Retirer de mes favoris" : "Ajouter à mes favoris";

  return (
    <Button
      aria-label={label}
      aria-pressed={favorite ?? false}
      disabled={favorite === null || isPending}
      onClick={() => {
        if (favorite === null) return;
        const next = !favorite;
        setFavoriteState(next);
        execute({
          target: { kind: "MEDIA", anilistId: mediaId },
          favorite: next,
        });
      }}
      size="icon"
      title={label}
      variant="outline"
    >
      <HeartIcon className={cn(favorite && "fill-current")} />
    </Button>
  );
}
