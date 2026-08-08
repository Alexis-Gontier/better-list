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
 * Le compte existe, l'accès n'est pas encore ouvert (docs/PRODUCT.md §7.1).
 *
 * La page se garde elle-même dans les deux sens : sans session on n'a rien à y faire, et un
 * compte déjà approuvé serait bloqué sur un écran d'attente qui ne le concerne plus.
 */
export default async function WaitlistPage() {
  const session = await getSession();

  if (!session) redirect(routes.auth.login);
  if (session.user.status === "APPROVED") redirect(routes.home);

  return (
    <div className="space-y-6 text-center">
      <ClockIcon
        aria-hidden="true"
        className="mx-auto size-8 text-muted-foreground"
      />

      <div className="space-y-2">
        <h2 className="font-medium text-lg">Votre compte est en attente</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Bonjour {session.user.name}. L'accès est réservé à un petit cercle :
          votre compte a bien été créé, il doit maintenant être approuvé.
        </p>
      </div>

      <SignOutButton variant="outline" />
    </div>
  );
}
