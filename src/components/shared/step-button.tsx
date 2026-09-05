"use client";

import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Le bouton d'un cran, en plus ou en moins.
 *
 * **Il vit dans `shared/` et pas dans `features/` parce qu'il ne connaît rien du métier** : ni
 * épisode, ni note, ni entrée de suivi. Il reçoit un libellé et un geste. Deux contrôles s'en
 * servent aujourd'hui — le compteur de progression et la note — et il n'y a aucune raison qu'un
 * troisième ait à redécider ce qui suit.
 *
 * Ce qu'il porte, et qui justifie qu'il existe plutôt qu'un `Button` recopié deux fois :
 * `disabled:opacity-50`, le défaut du bouton shadcn, fait pâlir la bordure en même temps que le
 * contenu. Dans un `ButtonGroup`, dont les segments partagent leurs arêtes, le cadre se met alors à
 * changer d'intensité d'un segment à l'autre et le groupe cesse de se lire comme un seul objet. On
 * rend donc au bouton son opacité pleine, et c'est **la couleur du contenu** qui dit
 * l'indisponibilité — la bordure n'a jamais été le bon canal pour ça.
 */

type StepButtonProps = {
  direction: "decrement" | "increment";
  /** Nom accessible, écrit en entier : « Avancer d'un épisode », pas « Plus ». */
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export function StepButton({
  direction,
  label,
  disabled,
  onClick,
}: StepButtonProps) {
  const Icon = direction === "increment" ? PlusIcon : MinusIcon;

  return (
    <Button
      aria-label={label}
      className="disabled:text-muted-foreground/50 disabled:opacity-100"
      disabled={disabled}
      onClick={onClick}
      size="icon"
      variant="outline"
    >
      <Icon />
    </Button>
  );
}
