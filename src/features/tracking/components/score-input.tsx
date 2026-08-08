"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScoreFormat } from "@/features/preferences/schemas/preferences.schema";
import { ScoreStars } from "@/features/tracking/components/score-stars";
import {
  scaleToScore,
  scoreScaleMax,
  scoreToScale,
} from "@/features/tracking/lib/entry-format";

/**
 * La saisie d'une note, dans l'échelle choisie par le compte (docs/PRODUCT.md §4.6).
 *
 * **Le stockage ne bouge pas** : la note part toujours sur 0–100. Ce composant n'est qu'un
 * convertisseur d'aller-retour, et c'est pour ça que changer d'échelle dans les réglages ne perd
 * rien — une note saisie « 8/10 » se relit « 4/5 » sans avoir été réécrite en base.
 *
 * Cinq étoiles gardent leur composant : à cette granularité, le geste juste est de viser une étoile,
 * pas de taper un chiffre. Au-delà, un champ numérique est plus rapide qu'une rangée de dix ou cent
 * cibles — et sur 100, la rangée n'existe pas.
 */
export function ScoreInput({
  value,
  format,
  onChange,
  disabled,
}: {
  /** Note sur 0–100, ou `null` quand l'œuvre n'est pas notée. */
  value: number | null;
  format: ScoreFormat;
  onChange: (next: number | null) => void;
  disabled?: boolean;
}) {
  if (format === "POINT_5") {
    return <ScoreStars disabled={disabled} onChange={onChange} value={value} />;
  }

  const max = scoreScaleMax(format);

  return (
    <div className="flex items-center gap-1.5">
      <Input
        aria-label={`Ma note sur ${max}`}
        className="w-20 text-center tabular-nums"
        disabled={disabled}
        inputMode="numeric"
        /**
         * Non contrôlé, remonté par `key` quand le serveur renvoie autre chose : un champ contrôlé
         * effacerait la frappe en cours à chaque aller-retour. Même choix que les dates du panneau.
         */
        key={value ?? "vide"}
        defaultValue={value === null ? "" : scoreToScale(value, format)}
        max={max}
        min={0}
        // `onBlur` et non `onChange` : « 85 » passerait par « 8 », et le journal enregistrerait deux
        // notes pour une seule intention.
        onBlur={(event) => {
          const raw = event.target.value.trim();
          if (raw === "") {
            if (value !== null) onChange(null);
            return;
          }

          const parsed = Number.parseInt(raw, 10);
          if (Number.isNaN(parsed)) return;

          const next = scaleToScore(parsed, format);
          if (next !== value) onChange(next);
        }}
        type="number"
      />

      <span className="text-muted-foreground text-sm">/ {max}</span>

      {value !== null ? (
        <Button
          aria-label="Retirer la note"
          className="size-7 text-muted-foreground"
          disabled={disabled}
          onClick={() => onChange(null)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
