import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { routes } from "@/config/routes";
import { config, proxy } from "@/proxy";

/**
 * Le proxy est la seule pièce d'authentification qui s'exécute avant chaque requête. Ses règles
 * sont courtes, mais une erreur y est invisible en développement et bloquante en production —
 * d'où ces tests.
 */

const SESSION_COOKIE = "better-auth.session_token";

/**
 * L'URL est concaténée, pas construite avec `new URL(pathname, base)` : ce constructeur résout
 * `//evil.com` en un hôte, alors qu'on veut précisément une requête vers *notre* hôte dont le
 * chemin commence par `//`.
 */
function request(pathname: string, { signedIn = false } = {}) {
  const req = new NextRequest(`http://localhost:3000${pathname}`);
  if (signedIn) req.cookies.set(SESSION_COOKIE, "jeton-quelconque");
  return req;
}

describe("proxy", () => {
  it("renvoie un visiteur non connecté vers la connexion", () => {
    const response = proxy(request("/library"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Flibrary",
    );
  });

  it("laisse passer les routes publiques", () => {
    for (const route of [
      routes.auth.login,
      routes.auth.signup,
      routes.auth.waitlist,
    ]) {
      expect(proxy(request(route)).status).toBe(200);
    }
  });

  /**
   * Le lien non listé s'adresse à quelqu'un **qui n'a pas de compte** (docs/PRODUCT.md §2). S'il
   * était renvoyé vers `/login`, le partage ne partagerait rien.
   */
  it("laisse passer une liste partagée sans session", () => {
    expect(proxy(request("/l/jeton-quelconque")).status).toBe(200);
  });

  /**
   * Le pendant du test précédent, et le plus important des deux : le préfixe public ne doit ouvrir
   * **que** ce qu'il annonce. Une comparaison bâclée — `pathname.includes("/l/")`, ou un préfixe
   * réduit à « /l » — ouvrirait `/library` et `/lists` à n'importe qui, c'est-à-dire toute la
   * bibliothèque et toutes les listes.
   */
  it("n'ouvre rien d'autre que le préfixe de partage", () => {
    for (const pathname of [
      "/library",
      "/lists",
      "/lists/abc",
      "/l",
      "/login/l/x",
    ]) {
      expect(proxy(request(pathname)).status).toBe(307);
    }
  });

  /**
   * L'invariant à ne jamais casser. Renvoyer un porteur de cookie hors de `/login` crée une boucle
   * infinie dès que la session est expirée : la garde du layout redirige vers `/login`, le proxy
   * renvoie vers `/`, et un cookie ne peut pas être effacé pendant un rendu.
   */
  it("laisse un porteur de cookie atteindre /login", () => {
    expect(proxy(request(routes.auth.login, { signedIn: true })).status).toBe(
      200,
    );
  });

  it("laisse passer un porteur de cookie sur une route protégée", () => {
    // Le proxy ne vérifie pas le cookie : c'est la garde du layout qui tranche.
    expect(proxy(request("/library", { signedIn: true })).status).toBe(200);
  });

  it("refuse un callbackUrl protocole-relatif", () => {
    // `//evil.com` serait interprété comme une URL absolue par le navigateur : on retombe sur
    // l'accueil plutôt que d'offrir une redirection ouverte.
    const location = proxy(request("//evil.com")).headers.get("location");

    expect(location).toBe(
      `http://localhost:3000/login?callbackUrl=${encodeURIComponent(routes.home)}`,
    );
  });
});

/**
 * Le matcher est de la configuration, pas du code — il n'échoue donc jamais bruyamment. Une erreur
 * dedans ne se voit qu'en production, sur la route qui a cessé d'être traitée (ou qui a commencé à
 * l'être).
 */
describe("config.matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it("s'applique aux pages de l'application", () => {
    for (const pathname of ["/", "/library", "/media/1", "/u/gontier"]) {
      expect(matcher.test(pathname)).toBe(true);
    }
  });

  /**
   * L'invariant de ce bloc. Un route handler porte sa propre garde — jeton porteur pour le cron,
   * session pour Better Auth — et une redirection 307 vers du HTML est une réponse absurde à un appel
   * programmatique. Le cron de rafraîchissement du miroir (docs/PRODUCT.md §4.1) n'a pas de cookie :
   * s'il passait par le proxy, il recevrait la page de connexion au lieu d'être exécuté.
   */
  it("ne s'applique à aucune route d'API", () => {
    for (const pathname of [
      "/api/cron/refresh-media",
      "/api/auth/callback/github",
      "/api/auth/session",
    ]) {
      expect(matcher.test(pathname)).toBe(false);
    }
  });

  it("laisse passer les assets sans exécuter le proxy", () => {
    for (const pathname of [
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/favicon.ico",
      "/cover.png",
      "/inter.woff2",
    ]) {
      expect(matcher.test(pathname)).toBe(false);
    }
  });
});
