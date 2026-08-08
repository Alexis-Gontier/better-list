import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GithubSignInButton } from "@/app/(auth)/login/_components/github-sign-in-button";
import { routes } from "@/config/routes";
import { getSession } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/security/safe-redirect";

export const metadata: Metadata = { title: "Connexion" };

/**
 * Page bloquante, et il n'y a pas d'alternative honnête.
 *
 * Elle lit la session — pour écarter un utilisateur déjà connecté — et `searchParams`, pour la
 * destination d'après connexion. Deux données propres à la requête. On pourrait rendre la coquille
 * instantanée en déplaçant ces lectures dans un `<Suspense>`, mais afficher un bouton de connexion
 * à quelqu'un qui est déjà connecté, le temps que la redirection arrive, serait pire que d'attendre
 * quelques millisecondes.
 *
 * C'est une page vue une fois par session : elle n'a rien à gagner à une navigation instantanée.
 */
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Le proxy laisse passer tout porteur de cookie sur `/login`, sans le vérifier — sinon un cookie
  // périmé provoquerait une boucle de redirection avec la garde du layout `(app)`. C'est donc ici,
  // sur une session réellement validée, qu'un utilisateur déjà connecté est renvoyé.
  if (await getSession()) redirect(routes.home);

  const { callbackUrl } = await searchParams;

  // Désinfecté ici, et pas seulement dans le proxy : rien n'empêche d'ouvrir
  // `/login?callbackUrl=//evil.com` directement. Sans ce filtre, la valeur partirait telle quelle
  // dans `signIn.social({ callbackURL })` et notre page de connexion deviendrait un tremplin.
  const destination = safeRedirectPath(
    typeof callbackUrl === "string" ? callbackUrl : null,
    routes.home,
  );

  return (
    <div className="space-y-6">
      <GithubSignInButton callbackUrl={destination} />

      <p className="text-center text-muted-foreground text-xs leading-relaxed">
        L'accès est réservé aux membres approuvés. Une première connexion crée
        un compte en attente de validation.
      </p>
    </div>
  );
}
