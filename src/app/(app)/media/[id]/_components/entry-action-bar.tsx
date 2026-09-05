"use client";

import {
  CalendarIcon,
  CheckIcon,
  ListPlusIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntryProgressStepper } from "@/features/tracking/components/entry-progress-stepper";
import { EntryScoreRating } from "@/features/tracking/components/entry-score-rating";
import { EntryStatusSelect } from "@/features/tracking/components/entry-status-select";
import type { EntryUnit } from "@/features/tracking/lib/entry-format";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

/**
 * La barre de suivi de la fiche — **l'assemblage seul, sans aucune logique.**
 *
 * Rien de ce qui se passe ici n'est enregistré : l'état vit dans ce composant, le temps d'une
 * visite, et disparaît au rechargement. C'est un choix de séance, pas un oubli — la forme se valide
 * avant que les Server Actions ne soient écrites, pour ne pas avoir à défaire une mécanique posée
 * sur une mise en page qui bouge encore.
 *
 * **Les trois contrôles vivent dans `features/tracking/components/`, pas ici.** Ils connaissent des
 * entités métier — le statut de suivi, le plafond de progression, l'échelle de note — et ils
 * serviront à d'autres écrans : la bibliothèque, la recherche, la vignette qui porte un « +1 ». Ce
 * fichier ne garde que ce qui est propre à la fiche : la composition, et les deux actions qui
 * n'existent qu'ici.
 *
 * Ce qui manque, et qu'on saura où poser : la lecture de l'`Entry` existante, `saveEntry` /
 * `removeEntry` via `authActionClient`, et l'ajout à une liste.
 *
 * **Aucun accent sur cette barre, et c'est une décision d'Alexis du 6 septembre 2026.** Le « +1 »
 * le portait — la spec du 2 septembre réserve l'accent à l'action principale, une par écran — mais
 * un bouton plein au milieu d'une rangée de contrôles neutres tirait l'œil plus que la jaquette.
 * L'écran n'a donc plus qu'une seule chose colorée, ce qui est exactement le principe directeur de
 * la refonte ; l'emploi de l'accent reste disponible pour l'écran qui en aura vraiment besoin.
 */

type EntryActionBarProps = {
  /** Ce qu'on compte : des épisodes sur un anime, des chapitres sur tout le reste. */
  unit: EntryUnit;
  /** Le plafond connu. `null` sur une œuvre en cours, dont AniList ignore le total. */
  total: number | null;
};

export function EntryActionBar({ unit, total }: EntryActionBarProps) {
  const [status, setStatus] = useState<EntryStatus>("PLANNING");
  const [progress, setProgress] = useState("0");
  const [score, setScore] = useState<number | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <EntryStatusSelect onValueChange={setStatus} value={status} />

      <EntryProgressStepper
        onValueChange={setProgress}
        total={total}
        unit={unit}
        value={progress}
      />

      <EntryScoreRating onScoreChange={setScore} score={score} />

      <Button variant="outline">
        <ListPlusIcon data-icon="inline-start" />
        Ajouter à une liste
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Autres actions" size="icon" variant="outline">
            <MoreVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <CheckIcon />
            Marquer comme terminé
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CalendarIcon />
            Modifier les dates
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2Icon />
            Retirer de ma bibliothèque
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
