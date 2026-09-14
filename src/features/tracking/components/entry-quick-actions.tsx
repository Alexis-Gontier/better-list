"use client";

import { PlusIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ENTRY_UNIT_LABELS,
  type EntryUnit,
} from "@/features/tracking/lib/entry-format";
import { saveEntry } from "@/features/tracking/server/tracking.actions";

/**
 * Les gestes posés sur une jaquette : la fenêtre d'édition, et **un « +1 » qui paraît au-dessus
 * d'elle quand on l'approche**.
 *
 * Avancer d'un cran est le geste le plus fréquent du produit (docs/PRODUCT.md §6) ; le faire passer
 * par la fenêtre d'édition lui coûtait deux clics et un aller-retour modal. Il vit donc à côté du
 * bouton qui l'ouvre, révélé par le même mouvement de souris — et non ajouté en permanence, ce qui
 * mettrait deux boutons concurrents sur chaque jaquette du catalogue.
 *
 * **Il n'apparaît que sur une œuvre déjà suivie** : « +1 » sur une œuvre qu'on ne suit pas ne veut
 * rien dire, c'est « Ajouter » que propose alors la fenêtre.
 *
 * **Sous `sm`, il est posé en permanence** : le survol n'existe pas au doigt, comme pour le bouton
 * d'édition lui-même (`MediaCard`).
 *
 * Il porte **le style du bouton d'édition** — `outline`, même taille, même fond opaque posé sur la
 * jaquette : les deux gestes se lisent comme une seule pile, pas comme une action et sa variante.
 *
 * **Parti du `_components/` de l'accueil, promu ici le 14 septembre 2026, quand `/search` et
 * `/library` l'ont demandé** (décision d'Alexis) : avancer d'un cran ne doit pas dépendre de l'écran
 * où l'on croise une jaquette. Troisième appelant, donc `features/tracking/components/` — la maison
 * d'un composant qui connaît une entité métier —, à côté de la fenêtre d'édition qu'il accompagne.
 */
export function EntryQuickActions({
  mediaId,
  progress,
  total,
  unit,
  tracked,
  children,
}: {
  mediaId: number;
  progress: number;
  total: number | null;
  unit: EntryUnit;
  /** L'œuvre est-elle déjà dans ma bibliothèque. */
  tracked: boolean;
  /** La fenêtre d'édition rapide, rendue par l'appelant. */
  children: React.ReactNode;
}) {
  /*
    Le compteur avance **avant** la réponse du serveur : à cette taille, un bouton qui ne réagit
    qu'au retour réseau se fait cliquer deux fois. En cas d'échec, on revient à la valeur reçue —
    celle que le serveur a, par définition, toujours.
  */
  const [value, setValue] = useState(progress);
  const { execute, isPending } = useAction(saveEntry, {
    onError: ({ error }) => {
      setValue(progress);
      toast.error(
        error.serverError ?? "Impossible d'enregistrer la progression.",
      );
    },
  });

  const ceiling = total && total > 0 ? total : null;
  const done = ceiling !== null && value >= ceiling;
  const { singular } = ENTRY_UNIT_LABELS[unit];

  /*
    **Le plafond n'est qu'un confort d'affichage**, comme dans le pas de progression de la fiche :
    le vrai est relu du miroir par le serveur (`entry-transition.ts`), et c'est lui qui déduira le
    passage en « Terminé » au dernier épisode.
  */
  const step = () => {
    const next = value + 1;
    setValue(next);
    execute({ mediaId, progress: next });
  };

  return (
    /*
      Un groupe **nommé** : `MediaCard` en pose déjà un sur la carte entière pour révéler l'action au
      survol, et un `group-hover` anonyme suivrait celui-là — donc la carte, pas ce bouton-ci.
    */
    <div className="group/quick relative flex">
      {tracked ? (
        /*
          **`bg-overlay` est réaffirmé quatre fois, et chaque répétition couvre un cas du variant
          `outline`** : celui-ci pose un fond translucide au repos sous `dark:` (`dark:bg-input/30`)
          **et au survol** (`hover:bg-muted`, `dark:hover:bg-input/50`). Sur une jaquette, ces fonds
          laissent voir l'image au travers — le bouton paraissait alors s'effacer au moment précis où
          on le vise. Le bouton d'édition n'a pas ce défaut : il repose sur la plaque opaque de
          `MediaCard`, quand celui-ci flotte au-dessus d'elle et porte donc la sienne.
        */
        <Button
          aria-label={`Avancer d'un ${singular}`}
          className="absolute right-0 bottom-full mb-1.5 bg-overlay transition-opacity duration-150 hover:bg-overlay sm:opacity-0 sm:group-hover/quick:opacity-100 sm:group-focus-within/quick:opacity-100 motion-reduce:transition-none dark:bg-overlay dark:hover:bg-overlay"
          disabled={done || isPending}
          onClick={step}
          size="icon-sm"
          title={`${singular} ${value + 1}`}
          variant="outline"
        >
          {isPending ? <Spinner /> : <PlusIcon />}
        </Button>
      ) : null}

      {children}
    </div>
  );
}
