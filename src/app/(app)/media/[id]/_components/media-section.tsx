import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Section titrée de la fiche.
 *
 * L'`id` est obligatoire et pas dérivé du titre : c'est lui qui relie le `<h2>` à son `<section>`
 * via `aria-labelledby`, et un slug calculé à partir d'un libellé traduit se casserait au premier
 * accent. Il sert aussi d'ancre.
 */
export function MediaSection({
  id,
  title,
  aside,
  className,
  children,
}: {
  id: string;
  title: string;
  /** Contenu aligné à droite du titre : un compte, un lien « tout voir ». */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-medium text-sm" id={id}>
          {title}
        </h2>
        {aside ? (
          <div className="text-muted-foreground text-xs">{aside}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
