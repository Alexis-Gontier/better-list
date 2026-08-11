"use client";

import { LayoutGridIcon, ListIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ViewMode } from "@/config/catalogue";

/**
 * Bascule grille / liste.
 *
 * **Purement présentationnel** : il reçoit la valeur et le setter, il ne touche pas à l'URL. C'est
 * ce qui lui permet de vivre dans `shared/` alors que la recherche et la bibliothèque n'ont pas les
 * mêmes paramètres d'adresse — chacune l'appelle depuis son propre îlot de filtres, avec ses propres
 * parseurs nuqs, et remet `page` à 1 de son côté si elle en a besoin.
 *
 * Deux options exclusives plutôt qu'un interrupteur : un seul bouton devrait choisir entre montrer
 * l'état actuel et montrer la destination, et les deux lectures sont défendables — donc aucune n'est
 * évidente.
 *
 * **`ToggleGroup` et non deux `Button` avec un `aria-pressed` posé à la main.** C'est le composant
 * fait pour un jeu d'options exclusives, et il apporte ce que la version manuelle n'avait pas : le
 * rôle `radiogroup`, la navigation aux flèches entre les deux options, et un seul arrêt de
 * tabulation au lieu de deux. `type="single"` avec une valeur toujours définie — une bascule de vue
 * n'a pas d'état « aucune des deux », d'où le garde-fou sur la valeur vide.
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
    <ToggleGroup
      onValueChange={(next) => {
        // Radix rend `""` quand on reclique l'option active. Une grille doit rester une grille : on
        // ignore, plutôt que de laisser la page sans disposition.
        if (next) onChange(next as ViewMode);
      }}
      size="sm"
      spacing={0}
      type="single"
      value={value}
      variant="outline"
    >
      {OPTIONS.map(({ value: mode, label, Icon }) => (
        /*
          **Pas de `Tooltip` autour de l'option, et c'est une correction, pas un renoncement.**
          `TooltipTrigger asChild` fusionne ses propriétés dans l'enfant et écrase le `data-state`
          du `ToggleGroupItem` par le sien : mesuré à l'écran, les deux options se retrouvaient en
          `data-state="closed"` et en `tabindex="-1"`, c'est-à-dire ni sélectionnables au clavier ni
          marquées comme actives. Le `title` porte la même information au survol, et l'`aria-label`
          la porte pour tout le reste.
        */
        <ToggleGroupItem
          aria-label={label}
          key={mode}
          title={label}
          value={mode}
        >
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
