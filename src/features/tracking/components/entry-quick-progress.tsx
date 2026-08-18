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
  appearance = "overlay",
}: {
  mediaId: number;
  progress: number;
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: number | null;
  unit: EntryUnit;
  /**
   * Où le bouton est posé, ce qui change ce qu'il doit montrer.
   *
   * `overlay` est le cas d'origine et reste le défaut : une pastille ronde sur une jaquette, qui se
   * découvre au survol pour ne pas encombrer une grille de vingt-quatre.
   *
   * `inline` est le bandeau d'ouverture de l'accueil, où le raisonnement s'inverse point par point.
   * Le bouton y est **seul** au lieu d'être un parmi vingt-quatre, donc il n'a personne à qui céder
   * la place ; il est l'action principale d'une diapositive qui occupe la moitié de l'écran, donc le
   * révéler au survol le rendrait invisible à qui ne survole pas — et le survol n'existe pas au
   * doigt. Il porte donc son intitulé en toutes lettres et ne se cache jamais.
   *
   * `compact` est la carte de reprise, qui tient des deux : le bouton y a une place réservée dans
   * la mise en page — donc il ne mange le coin de rien et n'a aucune raison de se cacher — mais la
   * carte en aligne plusieurs par rangée, où l'intitulé complet prendrait le tiers de la largeur.
   * Il garde donc l'icône et le seul chiffre qui compte : « +1 ». C'est aussi le geste que la
   * section entière sert à faire, et une commande principale ne se découvre pas au survol.
   */
  appearance?: "overlay" | "inline" | "compact";
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

  const unitLabel = ENTRY_UNIT_LABELS[unit].singular;
  const label = `Avancer d'un ${unitLabel} — ${value + 1}${
    total ? ` sur ${total}` : ""
  }`;

  const inline = appearance === "inline";
  const compact = appearance === "compact";

  return (
    <Button
      aria-label={label}
      className={
        inline || compact
          ? undefined
          : "size-7 rounded-full opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
      }
      disabled={isPending}
      onClick={() => execute({ mediaId, progress: value + 1 })}
      size={inline ? "default" : compact ? "sm" : "icon"}
      title={label}
      type="button"
    >
      {/*
        Le bouton reste à la même taille pendant l'attente : une icône remplacée par une roue de
        chargement de dimensions différentes ferait sauter la grille à chaque clic.
      */}
      {isPending ? <Spinner /> : <PlusIcon />}

      {/*
        L'intitulé annonce **le geste**, pas l'état : « épisode 13 » se lirait comme l'endroit où
        l'on en est, alors que le bouton fait passer à l'épisode suivant. La progression, elle, est
        déjà écrite au-dessus dans la diapositive.
      */}
      {inline ? <span>Un {unitLabel} de plus</span> : null}

      {/*
        Le chiffre seul, sans son unité : à côté d'un « Chapitre 165 » écrit en gras juste à gauche,
        « 1 » ne peut vouloir dire qu'une chose. L'`aria-label` porte la phrase entière, qui est ce
        qu'un lecteur d'écran annonce.
      */}
      {compact ? <span>1</span> : null}
    </Button>
  );
}
