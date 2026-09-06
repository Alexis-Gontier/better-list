"use client";

import { StepButton } from "@/components/shared/step-button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  ENTRY_UNIT_LABELS,
  type EntryUnit,
  UNKNOWN_TOTAL,
} from "@/features/tracking/lib/entry-format";

/**
 * Où j'en suis : un champ de saisie encadré de deux crans.
 *
 * **Un champ et pas seulement deux flèches** : rattraper vingt épisodes se tape, ça ne se clique pas
 * vingt fois. Et deux boutons à part entière plutôt que des icônes posées dans le champ — en
 * `ghost`, elles ne se lisaient pas comme des boutons.
 *
 * **La valeur est une chaîne, comme dans `EntryDraft`** (`entry-draft.ts`). Un champ vidé pour être
 * retapé, ou un « 1 » en route vers « 12 », n'ont pas d'équivalent numérique : les convertir à
 * chaque touche obligerait à choisir une valeur pour l'intermédiaire, et cette valeur finirait
 * enregistrée.
 *
 * **Le plafond passé ici n'est qu'un confort d'affichage.** Le vrai plafond est relu du miroir par
 * le serveur (`entry-transition.ts`) : « épisode 900 » sur une série de 12 est une saisie erronée ou
 * forgée, et le client n'en est jamais juge.
 */

type EntryProgressStepperProps = {
  /** La progression, telle qu'un `<input>` la porte. Chaîne vide = champ en cours de saisie. */
  value: string;
  onValueChange: (value: string) => void;
  /** Ce qu'on compte : des épisodes sur un anime, des chapitres sur tout le reste. */
  unit: EntryUnit;
  /** Le total connu. `null` sur une œuvre en cours, dont AniList ignore le nombre d'épisodes. */
  total: number | null;
  /**
   * La largeur du groupe. Même raison que sur `entry-status-select` : la rangée de la fiche veut
   * une largeur naturelle, une colonne de grille veut `w-full`. Le champ, lui, est déjà `flex-1` —
   * c'est lui qui absorbe la place en plus, pas les deux crans, dont la taille est celle du doigt.
   */
  className?: string;
};

export function EntryProgressStepper({
  value,
  onValueChange,
  unit,
  total,
  className,
}: EntryProgressStepperProps) {
  const unitLabel = ENTRY_UNIT_LABELS[unit];
  const ceiling = total && total > 0 ? total : null;

  const parsed = Number.parseInt(value, 10);
  const current = Number.isNaN(parsed) ? 0 : parsed;

  const step = (by: number) => {
    const next = Math.max(current + by, 0);
    onValueChange(String(ceiling === null ? next : Math.min(next, ceiling)));
  };

  return (
    <ButtonGroup className={className}>
      <StepButton
        direction="decrement"
        disabled={current <= 0}
        label={`Reculer d'un ${unitLabel.singular}`}
        onClick={() => step(-1)}
      />

      <InputGroup className="w-32 flex-1">
        <InputGroupInput
          aria-label={unitLabel.consumed}
          // Sans ça, un gestionnaire de mots de passe propose ses suggestions sur un champ qui ne
          // contient qu'un numéro d'épisode.
          autoComplete="off"
          className="text-right font-mono tabular-nums"
          inputMode="numeric"
          onChange={(event) =>
            // Filtré aux chiffres plutôt que `type="number"` : celui-ci impose ses propres flèches,
            // en doublon des nôtres, et accepte « 1e5 » comme une saisie valide.
            onValueChange(event.target.value.replace(/\D/g, ""))
          }
          value={value}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>/ {ceiling ?? UNKNOWN_TOTAL}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      <StepButton
        direction="increment"
        disabled={ceiling !== null && current >= ceiling}
        label={`Avancer d'un ${unitLabel.singular}`}
        onClick={() => step(1)}
      />
    </ButtonGroup>
  );
}
