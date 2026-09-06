import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
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
          <div className="flex items-center gap-2 md:gap-6">
            {/*
              Le tiroir est **avant** le monogramme, et il ne paraît que sous `md`. À gauche parce
              que c'est là qu'on va le chercher, et parce que le mettre à droite l'aurait jeté au
              milieu des trois boutons de compte — trois gestes de réglage et une porte de
              navigation ne se rangent pas ensemble.
            */}
            <MobileNav />

            {/*
              **Le monogramme seul** — décision d'Alexis du 6 septembre 2026. Le nom en toutes
              lettres doublait une marque qui le dit déjà, et il poussait la navigation vers la
              droite pour rien.

              Mais il ne **disparaît** pas : `Logo` porte `aria-hidden` précisément parce que le nom
              l'accompagnait, et un lien dont le seul contenu est masqué aux lecteurs d'écran est
              annoncé vide. Le nom reste donc en `sr-only`, ce qui garde le lien nommé sans le
              montrer. Un `aria-label` aurait fait la même chose ; du texte réel se lit aussi par
              les outils qui n'écoutent pas ARIA.
            */}
            <Link className="flex items-center" href={routes.home}>
              <Logo className="size-5" />
              <span className="sr-only">{site.name}</span>
            </Link>

            <MainNav />
          </div>

          {/*
            La palette `⌘K` manque ici depuis la mise à blanc du 5 septembre 2026 : elle vivait dans
            `features/command/`, et son route handler `api/command` est parti avec elle. Son schéma
            (`features/command/schemas/command.schema.ts`) est épargné — il porte la règle du « +1 »,
            seul endroit où elle survive. La remonter est le premier geste de la reconstruction du
            chrome.
          */}
          <div className="flex items-center gap-2">
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
