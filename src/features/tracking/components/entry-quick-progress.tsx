"use client";

import { PlusIcon } from "lucide-react";
import { useOptimisticAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ENTRY_UNIT_LABELS,
  type EntryUnit,
} from "@/features/tracking/lib/entry-format";
import { saveEntry } from "@/features/tracking/server/tracking.actions";

/**
 * Le « +1 » posé sur une vignette.
 *
 * C'est le geste le plus fréquent du produit (docs/PRODUCT.md §6, V1) : le sortir de la fiche et le
 * mettre là où l'on voit déjà ses séries, c'est lui retirer deux navigations.
 *
 * Il n'envoie **que la progression**, comme le panneau de la fiche : la transition serveur en
 * déduit le reste — passer une œuvre prévue en cours, terminer la série au dernier épisode, dater
 * le début. Rien de tout cela n'est réécrit ici.
 *
 * L'affichage est optimiste sur le compteur du bouton, mais **le texte sous la vignette vient du
 * serveur** : il se met à jour quand l'action revalide la page. C'est voulu — le serveur est seul
 * juge du plafond, et voir le compteur s'arrêter à 12/12 est plus juste que de laisser l'interface
 * promettre un treizième épisode qui n'existe pas.
 */
export function EntryQuickProgress({
  mediaId,
  progress,
  total,
  unit,
}: {
  mediaId: number;
  progress: number;
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: number | null;
  unit: EntryUnit;
}) {
  const { execute, optimisticState, isPending } = useOptimisticAction(
    saveEntry,
    {
      currentState: { progress },
      updateFn: (state) => ({ progress: state.progress + 1 }),
      onError: () => toast.error("La progression n'a pas pu être enregistrée."),
    },
  );

  const value = optimisticState.progress;

  // Rien à avancer sur une œuvre finie : le bouton disparaît plutôt que de rester grisé, pour ne
  // pas encombrer une grille de commandes mortes.
  if (total !== null && value >= total) return null;

  const label = `Avancer d'un ${ENTRY_UNIT_LABELS[unit].singular} — ${value + 1}${
    total ? ` sur ${total}` : ""
  }`;

  return (
    <Button
      aria-label={label}
      className="size-7 rounded-full opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
      disabled={isPending}
      onClick={() => execute({ mediaId, progress: value + 1 })}
      size="icon"
      title={label}
      type="button"
    >
      {/*
        Le bouton reste à la même taille pendant l'attente : une icône remplacée par une roue de
        chargement de dimensions différentes ferait sauter la grille à chaque clic.
      */}
      {isPending ? <Spinner /> : <PlusIcon />}
    </Button>
  );
}
