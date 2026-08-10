"use client";

import { LayoutGridIcon, ListIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ViewMode } from "@/config/catalogue";

/**
 * Bascule grille / liste.
 *
 * **Purement présentationnel** : il reçoit la valeur et le setter, il ne touche pas à l'URL. C'est
 * ce qui lui permet de vivre dans `shared/` alors que la recherche et la bibliothèque n'ont pas les
 * mêmes paramètres d'adresse — chacune l'appelle depuis son propre îlot de filtres, avec ses propres
 * parseurs nuqs, et remet `page` à 1 de son côté si elle en a besoin.
 *
 * Deux boutons plutôt qu'un interrupteur à bascule : un seul bouton devrait choisir entre montrer
 * l'état actuel et montrer la destination, et les deux lectures sont défendables — donc aucune n'est
 * évidente. Deux boutons dont un `aria-pressed` ne pose pas la question.
 */

const OPTIONS = [
  { value: "grid", label: "Vue en grille", Icon: LayoutGridIcon },
  { value: "list", label: "Vue en liste", Icon: ListIcon },
] as const satisfies ReadonlyArray<{
  value: ViewMode;
  label: string;
  Icon: typeof ListIcon;
}>;

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div className="flex items-center rounded-md border p-0.5">
      {OPTIONS.map(({ value: mode, label, Icon }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              aria-label={label}
              aria-pressed={value === mode}
              className="size-7"
              onClick={() => onChange(mode)}
              size="icon-sm"
              type="button"
              variant={value === mode ? "secondary" : "ghost"}
            >
              <Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
