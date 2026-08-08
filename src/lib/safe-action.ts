import "server-only";

import { createSafeActionClient } from "next-safe-action";
import * as z from "zod";

import { env } from "@/config/env";
import { getSession } from "@/lib/auth/session";

/**
 * Client de base pour toutes les Server Actions.
 *
 * Une action écrite avec ce client valide son entrée, attrape ses erreurs, et renvoie au
 * client un objet typé (`data`, `validationErrors`, `serverError`) au lieu de faire remonter
 * une exception brute — dont le message finirait dans le bundle client en production.
 */
export const actionClient = createSafeActionClient({
  /**
   * Le message d'erreur brut ne traverse jamais la frontière serveur/client : il peut
   * contenir un fragment de requête SQL, un chemin de fichier ou un identifiant interne.
   */
  handleServerError(error) {
    console.error("[action]", error.message);

    if (env.NODE_ENV === "development") {
      return error.message;
    }
    return "Une erreur est survenue. Réessayez.";
  },

  /** Rend `.metadata()` obligatoire et typé sur chaque action. */
  defineMetadataSchema() {
    return z.object({
      actionName: z.string(),
    });
  },

  /** `flattened` donne `fieldErrors` / `formErrors`, ce que les formulaires consomment. */
  defaultValidationErrorsShape: "flattened",
});

/**
 * Client des actions qui exigent une session.
 *
 * **La garde du layout `(app)` ne protège pas les Server Actions** : une action est un endpoint
 * POST à part entière, appelable directement, sans jamais passer par le rendu d'une page. Toute
 * action qui écrit des données utilisateur passe donc par ce client, et reçoit l'utilisateur dans
 * `ctx` plutôt que de le relire — ce qui rend l'oubli impossible plutôt qu'improbable.
 *
 * Le statut `APPROVED` est revérifié ici pour la même raison : un compte peut être remis en
 * attente entre la connexion et l'action.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession();

  if (!session || session.user.status !== "APPROVED") {
    throw new Error("Session absente ou compte non approuvé.");
  }

  return next({ ctx: { user: session.user } });
});
