import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { routes } from "@/config/routes";
import { auth, type SessionUser } from "@/lib/auth/server";

/**
 * Lecture de session côté serveur.
 *
 * **C'est ici que se fait la vérification qui fait autorité**, pas dans `src/proxy.ts`. Le proxy
 * ne regarde que la présence d'un cookie : il redirige vite, il n'autorise rien. Un cookie peut
 * être expiré, révoqué, ou appartenir à un compte encore en liste d'attente.
 */

/**
 * `cache` de React déduplique l'appel sur un même rendu : le layout, une page et un composant
 * peuvent tous demander la session sans multiplier les lectures.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Exige un compte connecté **et approuvé**.
 *
 * À appeler dans le layout du groupe `(app)`, une seule fois — jamais page par page. Une
 * vérification oubliée sur une seule route ouvrirait tout le reste.
 */
export async function requireApprovedUser(): Promise<SessionUser> {
  const session = await getSession();

  if (!session) redirect(routes.auth.login);
  if (session.user.status !== "APPROVED") redirect(routes.auth.waitlist);

  return session.user;
}
