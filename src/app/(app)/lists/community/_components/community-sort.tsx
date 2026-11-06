import Link from "next/link";

import { routes } from "@/config/routes";
import type { CommunitySort as Sort } from "@/features/lists/server/community.queries";
import { cn } from "@/lib/utils";

const SORTS: { value: Sort; label: string }[] = [
  { value: "aimees", label: "Les plus aimées" },
  { value: "recentes", label: "Récentes" },
];

/** Le tri de la Communauté, en liens : il vit dans l'URL, et revenir en arrière le rejoue. */
export function CommunitySort({ active }: { active: Sort }) {
  return (
    <nav
      aria-label="Trier"
      className="flex w-fit gap-0.5 rounded-lg bg-muted p-[3px]"
    >
      {SORTS.map(({ value, label }) => (
        <Link
          aria-current={value === active ? "true" : undefined}
          className={cn(
            "rounded-md px-3 py-1 font-medium text-sm transition-colors",
            value === active
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          href={routes.lists.communityPage(value)}
          key={value}
          replace
          scroll={false}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
