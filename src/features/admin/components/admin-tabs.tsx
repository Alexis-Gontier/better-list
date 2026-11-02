import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

export const ADMIN_TABS = [
  { value: "attente", label: "En attente" },
  { value: "membres", label: "Membres" },
  { value: "bannis", label: "Bannis" },
] as const;
export type AdminTab = (typeof ADMIN_TABS)[number]["value"];

/**
 * Les onglets de `/admin/users`, **dans l'URL** (`?onglet=`) : un lien se partage et le retour
 * arrière ramène au bon onglet. Des liens stylés comme les `Tabs` de shadcn, pas des `Tabs`.
 */
export function AdminTabs({
  active,
  counts,
}: {
  active: AdminTab;
  counts: Record<AdminTab, number>;
}) {
  return (
    <nav className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
      {ADMIN_TABS.map((tab) => (
        <Link
          aria-current={tab.value === active ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md px-3 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground",
            tab.value === active && "bg-background text-foreground shadow-sm",
          )}
          href={`${routes.admin.users}?onglet=${tab.value}`}
          key={tab.value}
        >
          {tab.label}
          <Badge variant="secondary">{counts[tab.value]}</Badge>
        </Link>
      ))}
    </nav>
  );
}
