/**
 * Désinfection des destinations de redirection.
 *
 * Une valeur qui vient de l'URL (`?callbackUrl=…`) finit par être donnée à un `location` ou à
 * `signIn.social({ callbackURL })`. Si on l'accepte telle quelle, une adresse forgée transforme
 * notre page de connexion en tremplin vers un site tiers — l'utilisateur voit notre domaine, clique,
 * et atterrit ailleurs.
 *
 * Isomorphe à dessein : la même fonction sert au proxy, aux Server Components et aux îlots
 * clients. Une seule règle, appliquée partout — c'est justement parce que la règle n'était posée
 * qu'à un seul endroit que le trou existait.
 */

/**
 * Renvoie `path` s'il désigne une destination interne, sinon `fallback`.
 *
 * Est rejeté tout ce qui n'est pas un chemin absolu de ce site :
 * - `//evil.com` — protocole-relatif, interprété comme un domaine par le navigateur ;
 * - `https://evil.com`, `javascript:…` — toute forme portant un schéma ;
 * - `\\evil.com`, `/\evil.com` — les antislashs, que certains navigateurs normalisent en `/`.
 */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path) return fallback;

  const candidate = path.trim();

  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  // `/\evil.com` : le second caractère est un antislash, normalisé en `/` par certains navigateurs.
  if (candidate[1] === "\\") return fallback;
  if (candidate.includes("\\")) return fallback;

  return candidate;
}
