import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/**
 * Une ligne de réglage : à gauche ce qu'on règle, à droite le contrôle.
 *
 * **Empilée sur téléphone, en ligne à partir de `sm`.** Côte à côte sous 640 px, le groupe à trois
 * crans écraserait l'explication en une colonne de trois lignes — le même arbitrage que la tête de
 * `/lists`.
 *
 * `labelId` ou `htmlFor`, jamais les deux : un `Switch` est un vrai contrôle, qu'un `<label for>`
 * active au clic ; un `ToggleGroup` est un groupe de boutons, qui se décrit par `aria-labelledby`
 * et n'a rien à activer.
 */
export function SettingRow({
  title,
  description,
  htmlFor,
  labelId,
  children,
}: {
  title: string;
  description: string;
  htmlFor?: string;
  labelId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-1">
        <Label className="font-medium text-sm" htmlFor={htmlFor} id={labelId}>
          {title}
        </Label>
        <p className="text-pretty text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      {/* `shrink-0` : une explication longue ne doit pas comprimer le contrôle qu'elle décrit. */}
      <div className="shrink-0">{children}</div>
    </div>
  );
}
