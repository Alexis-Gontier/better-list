import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { publicRoutePrefixes, publicRoutes } from "@/config/navigation";
import { routes } from "@/config/routes";
import { safeRedirectPath } from "@/lib/security/safe-redirect";

/**
 * Proxy — anciennement `middleware.ts`, renommé dans Next.js 16 (la fonctionnalité est la même).
 *
 * **Ce fichier ne fait qu'une redirection optimiste, et n'autorise rien.** La documentation Next
 * est explicite : le proxy « ne doit pas servir de solution complète de gestion de session ou
 * d'autorisation ». Il s'exécute avant chaque requête correspondant au matcher, donc tout ce
 * qu'on y met est payé par tout le monde, tout le temps.
 *
 * Il regarde donc **la présence d'un cookie de session**, rien d'autre :
 *
 * - pas d'appel à `auth.api.getSession()` ici — ce serait un aller-retour base de données sur
 *   chaque navigation, y compris pour servir une page publique ;
 * - un cookie présent ne prouve rien. Il peut être expiré, révoqué, ou appartenir à un compte
 *   encore `PENDING` sur la liste d'attente.
 *
 * **La vérification qui fait autorité est dans `app/(app)/layout.tsx`** : session réellement
 * validée, et statut `APPROVED` contrôlé (`docs/PRODUCT.md` §7.1). Le proxy évite juste un
 * aller-retour visible à l'utilisateur non connecté.
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // `getSessionCookie` de Better Auth plutôt qu'un nom de cookie codé en dur : il connaît les
  // préfixes (`__Secure-` en HTTPS) et le découpage en morceaux des gros cookies. Il **lit** le
  // cookie, il ne le vérifie pas — d'où le rappel ci-dessus.
  const isAuthenticated = getSessionCookie(request) !== null;

  // Le proxy ne renvoie **jamais** un porteur de cookie hors des routes publiques, et c'est
  // volontaire : avec un cookie présent mais une session expirée en base, la garde du layout
  // redirigerait vers `/login`, le proxy renverrait vers `/`, et ainsi de suite — une boucle
  // infinie, puisqu'un cookie ne peut pas être effacé pendant un rendu. C'est `/login` qui écarte
  // un utilisateur déjà connecté, sur une session réellement validée.
  // Les listes partagées passent par le préfixe et non par l'égalité : leur dernier segment est un
  // jeton, donc leur chemin ne peut pas figurer dans une liste écrite à l'avance. C'est la seule
  // route publique de ce genre, et `publicRoutePrefixes` la garde visible plutôt que de la diluer
  // dans une expression régulière du matcher.
  const isPublic =
    publicRoutes.includes(pathname) ||
    publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isAuthenticated || isPublic) {
    return NextResponse.next();
  }

  const loginUrl = new URL(routes.auth.login, request.url);

  // On mémorise la destination pour y revenir après connexion. Désinfectée ici **et** à la
  // consommation dans `/login` : ce paramètre peut aussi arriver dans une URL forgée à la main,
  // sans jamais passer par cette branche.
  loginUrl.searchParams.set(
    "callbackUrl",
    safeRedirectPath(pathname, routes.home),
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  /**
   * Tout, sauf ce qui n'a jamais besoin d'être protégé : `api/`, les assets de Next, et les fichiers
   * servis à la racine.
   *
   * **`api/` en entier, et pas seulement `api/auth`.** Ce proxy ne sait faire qu'une chose : renvoyer
   * vers `/login`. Or une redirection 307 vers une page HTML est une réponse absurde à un appel
   * programmatique — le cron de rafraîchissement (`/api/cron/*`) n'a pas de cookie de session et se
   * verrait répondre du HTML au lieu d'être exécuté. Un route handler porte sa propre garde : jeton
   * porteur pour le cron, session pour Better Auth. Verrouillé par `proxy.test.ts`.
   *
   * Les images et polices sont exclues volontairement — les faire passer par le proxy coûterait
   * une exécution par requête pour aucun contrôle utile.
   *
   * **`icon` est nommée à part, et il a fallu la production pour s'en apercevoir.** C'est une route
   * de métadonnées Next : elle rend un PNG mais s'adresse **sans extension**, donc la liste des
   * extensions ci-dessous ne l'attrapait pas. Le proxy renvoyait l'icône d'onglet vers `/login`, et
   * elle manquait à tout visiteur déconnecté — sur les écrans d'authentification comme sur
   * `/l/<jeton>`, la seule page prévue pour des gens sans compte. Rien à protéger ici : c'est un
   * carré de 32 pixels que le dépôt montre à tout le monde. **`apple-icon` est nommée pour la même
   * raison** : elle ne commence pas par `icon`, l'exclusion précédente ne la couvre donc pas.
   */
  matcher: [
    "/((?!api/|_next/static|_next/image|icon|apple-icon|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$).*)",
  ],
};
