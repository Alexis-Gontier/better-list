"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ENTRY_STATUS_LABELS } from "@/features/tracking/lib/entry-format";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

/**
 * Le statut de suivi d'une œuvre (docs/PRODUCT.md §4.2).
 *
 * **L'ordre des options n'est pas celui de l'énumération**, et c'est délibéré : `EntryStatus`
 * commence par `CURRENT` parce qu'il recopie `MediaListStatus` d'AniList, mais on choisit ici dans
 * l'ordre où l'on avance — je prévois, je regarde, je termine —, les trois sorties de route
 * ensuite. C'est la liste qu'on déroule dix fois par semaine.
 *
 * Le composant ne décide de rien : il reçoit une valeur et rend un choix. Les déductions — passer
 * en « En cours » au premier épisode, dater la fin au dernier — vivent dans `entry-transition.ts`,
 * côté serveur, parce qu'elles doivent valoir aussi pour un « +1 » cliqué depuis une vignette.
 */

const STATUS_ORDER: EntryStatus[] = [
  "PLANNING",
  "CURRENT",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
  "REPEATING",
];

type EntryStatusSelectProps = {
  value: EntryStatus;
  onValueChange: (value: EntryStatus) => void;
  disabled?: boolean;
};

export function EntryStatusSelect({
  value,
  onValueChange,
  disabled,
}: EntryStatusSelectProps) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => onValueChange(next as EntryStatus)}
      value={value}
    >
      <SelectTrigger aria-label="Statut de suivi" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((status) => (
          <SelectItem key={status} value={status}>
            {ENTRY_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
