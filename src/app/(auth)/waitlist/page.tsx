import { ClockIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { routes } from "@/config/routes";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "En attente d'approbation" };

/**
 * Page bloquante : tout son contenu dépend de la session — le nom affiché, et la décision même de
 * l'afficher plutôt que de rediriger. Elle n'a pas de coquille statique à produire.
 */
export const instant = false;

/**
 * Le compte existe, l'accès n'est pas encore ouvert (docs/conception.md §7.1).
 *
 * La page se garde elle-même dans les deux sens : sans session on n'a rien à y faire, et un
 * compte déjà approuvé serait bloqué sur un écran d'attente qui ne le concerne plus.
 */
export default async function WaitlistPage() {
  const session = await getSession();

  if (!session) redirect(routes.auth.login);
  if (session.user.status === "APPROVED") redirect(routes.home);

  return (
    <div className="flex flex-col items-start gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading font-medium text-[32px] leading-tight tracking-tight">
          Vous y êtes presque
        </h1>
        <p className="text-pretty text-lg">
          Bonjour {session.user.name}. Votre compte est créé : un membre doit
          maintenant l'approuver.
        </p>
      </div>
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <ClockIcon aria-hidden="true" className="size-4" />
        En attente d'approbation
      </p>

      <SignOutButton variant="outline" />
    </div>
  );
}
