// `server-only`, et ici ce n'est pas une hygiène mais une garde : ce fichier fabrique le secret
// dont dépend toute la confidentialité d'une liste partagée. Il ne doit jamais atteindre un bundle
// client, ni par import direct ni par transitivité — le marqueur en fait une erreur de build.
import "server-only";

import { randomBytes } from "node:crypto";

/**
 * Le jeton d'un lien non listé (docs/conception.md §4.4).
 *
 * **C'est un secret, pas un identifiant lisible.** Toute la protection d'une liste partagée tient à
 * l'impossibilité de deviner ce jeton : il n'y a ni session à valider ni compte à reconnaître
 * derrière `/l/<jeton>`. Il est donc tiré du générateur cryptographique de Node, jamais de
 * `Math.random()` — dont la suite se rejoue depuis quelques valeurs observées.
 *
 * **18 octets, soit 144 bits**, rendus en base64url : 24 caractères, sans `+`, `/` ni `=` à
 * échapper dans une URL. C'est très au-dessus du nécessaire, et c'est gratuit — le coût d'un jeton
 * long est un lien un peu plus long, celui d'un jeton court est une liste qui s'ouvre par hasard.
 *
 * Pas de collision à gérer : `shareToken` est unique en base, et la probabilité d'en produire deux
 * identiques sur quelques dizaines de listes est hors de portée du raisonnement. Si l'insertion
 * échouait malgré tout, l'action remonterait l'erreur plutôt que de réessayer en silence.
 */
export function generateShareToken(): string {
  return randomBytes(18).toString("base64url");
}
