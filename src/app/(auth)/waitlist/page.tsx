import { ClockIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthTitle } from "@/app/(auth)/_components/auth-title";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex flex-col items-start gap-5">
        <Badge variant="outline">
          <ClockIcon data-icon="inline-start" />
          En attente d'approbation
        </Badge>
        <AuthTitle>Vous y êtes presque</AuthTitle>
        <p className="max-w-md text-pretty text-lg text-muted-foreground">
          Bonjour {session.user.name}. L'accès est réservé à un petit cercle :
          votre compte a bien été créé, il doit maintenant être approuvé.
        </p>
      </div>

      <SignOutButton variant="outline" />
    </div>
  );
}
