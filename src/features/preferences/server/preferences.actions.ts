"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import {
  DEFAULT_PREFERENCES,
  updatePreferencesSchema,
} from "@/features/preferences/schemas/preferences.schema";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * L'écriture des préférences d'affichage (docs/conception.md §4.6).
 *
 * Elle vit dans un fichier séparé de `preferences.queries.ts`, qui est en `import "server-only"` :
 * un module ne peut pas être à la fois `"use server"` et lecture server-only, et la convention du
 * dépôt interdit d'exporter les deux depuis le même endroit (CLAUDE.md).
 *
 * `authActionClient` et non `actionClient` : une Server Action est un endpoint POST à part entière,
 * que la garde de `(app)/layout.tsx` ne protège pas. L'utilisateur vient de `ctx`, jamais d'un
 * argument — un `userId` reçu du client serait le moyen de régler les préférences d'un autre compte.
 *
 * next-safe-action est en **v8** : `.metadata()` puis `.inputSchema()`.
 */

/**
 * **Toute l'application, et pas seulement l'écran des réglages.**
 *
 * `titleLanguage` décide du nom sous lequel une œuvre s'affiche *partout* — catalogue, bibliothèque,
 * listes, fiche —, et `includeAdult` entre dans la **requête** de ces mêmes écrans, pas dans un
 * masque d'affichage. Purger route par route obligerait à tenir une liste à jour, et à l'oublier
 * au prochain écran livré : c'est précisément le genre d'omission qui laisse un titre en romaji
 * sur une page qu'on n'a pas pensé à citer.
 *
 * `revalidatePath` en mode `"layout"` depuis la racine plutôt que `revalidateTag` : ces lectures
 * dépendent du visiteur, n'ont donc aucun `"use cache"` à invalider (`preferences.queries.ts` le
 * dit). Ce qu'on vide ici est le cache **client** du routeur, celui qui garde les pages déjà
 * visitées. Le geste est rare — on ne change pas de langue de titres deux fois par jour — donc son
 * coût ne se paie jamais dans un parcours normal.
 */
function revalidateEverySurface() {
  revalidatePath(routes.home, "layout");
}

/**
 * Enregistrer un réglage — **celui qui a changé, jamais l'état complet.**
 *
 * `updatePreferencesSchema` est un `.partial()`, et le schéma dit pourquoi : chaque contrôle
 * enregistre seul, donc envoyer les deux champs à chaque clic ferait qu'un onglet resté ouvert
 * réécrirait, en cochant une case, un réglage modifié ailleurs entre-temps.
 *
 * **`upsert` et non `update`** : un compte qui n'a jamais ouvert cet écran n'a pas de ligne de
 * préférences — c'est l'état normal de tous les comptes du cercle jusqu'à leur premier réglage, et
 * `getPreferences` s'appuie dessus en rendant les valeurs par défaut. Un `update` échouerait donc
 * systématiquement au tout premier clic. La création part de `DEFAULT_PREFERENCES` avant d'appliquer
 * le changement : sans cette base, le champ non touché tomberait sur le défaut de Prisma — le même
 * aujourd'hui, mais rien ne garantit que les deux ne divergeront jamais, et le schéma Zod est la
 * source de vérité que le reste du code lit.
 */
export const updatePreferences = authActionClient
  .metadata({ actionName: "updatePreferences" })
  .inputSchema(updatePreferencesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id, ...DEFAULT_PREFERENCES, ...parsedInput },
      update: parsedInput,
      select: { titleLanguage: true, includeAdult: true },
    });

    revalidateEverySurface();

    /*
      L'état enregistré est renvoyé, et non un simple accusé de réception : c'est la seule valeur
      qui fasse foi, et le client s'en sert pour se recaler si son état optimiste a divergé.
    */
    return preferences;
  });
