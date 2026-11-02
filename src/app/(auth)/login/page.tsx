import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { ProviderButtons } from "@/features/auth/components/provider-buttons";
import { getLastLoginMethod } from "@/lib/auth/last-login-method";
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
    <div className="flex flex-col gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading font-semibold text-2xl tracking-tight">
          Connexion à Better-List
        </h1>
        <p className="text-muted-foreground">
          Avec le compte que vous utilisez déjà.
        </p>
      </div>
      <ProviderButtons
        callbackUrl={destination}
        lastUsed={await getLastLoginMethod()}
      />
      <p className="text-muted-foreground text-sm">
        Première connexion ? Votre compte est créé, puis un membre le valide.
      </p>
    </div>
  );
}
