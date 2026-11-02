import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** La petite croix posée aux intersections des rails (d'après Firecrawl). */
function Cross({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("absolute size-[11px] text-muted-foreground", className)}
      fill="none"
      viewBox="0 0 11 11"
    >
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" />
    </svg>
  );
}

/**
 * Une bande de la landing, **entre deux rails** : la page est un cadre de lignes fines, chaque
 * section s'ouvre par un filet horizontal marqué d'une croix à chaque bout.
 */
export function LandingBand({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      className={cn("relative scroll-mt-4 border-border border-t", className)}
      id={id}
    >
      <Cross className="-top-[6px] -left-[6px]" />
      <Cross className="-top-[6px] -right-[6px]" />
      {children}
    </section>
  );
}
