import Link from "next/link";

import { MainNav } from "@/components/layout/main-nav";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { CommandPalette } from "@/features/command/components/command-palette";
import type { SessionUser } from "@/lib/auth/server";

/**
 * L'utilisateur est **passé en propriété**, pas relu ici.
 *
 * Le layout `(app)` vient de l'obtenir de `requireApprovedUser()` : le redemander en dessous
 * masquerait le fait que l'en-tête ne s'affiche jamais sans garde, et rendrait ce composant
 * dépendant d'une session qu'il ne contrôle pas.
 */
export function Header({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href={routes.home}
              className="font-extrabold text-lg uppercase tracking-tight"
            >
              {site.name}
            </Link>

            <MainNav />
          </div>

          <div className="flex items-center gap-2">
            <CommandPalette />
            <NotificationsMenu />
            <ThemeToggle />
            <UserMenu
              email={user.email}
              image={user.image ?? undefined}
              name={user.name}
              username={user.username}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
