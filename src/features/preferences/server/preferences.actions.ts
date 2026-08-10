"use server";

import { revalidatePath } from "next/cache";

import { updatePreferencesSchema } from "@/features/preferences/schemas/preferences.schema";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Enregistrement d'un réglage.
 *
 * `upsert` et non `update` : la ligne de préférences n'existe pas tant que le compte n'a rien
 * réglé — c'est ce qui permet à `getPreferences` de servir les valeurs par défaut sans écrire en
 * base à la première lecture.
 *
 * **`revalidatePath("/", "layout")` et non trois chemins.** Un changement d'échelle de notes ou de
 * langue des titres touche potentiellement chaque page rendue : la fiche, la recherche, la
 * bibliothèque, le tableau de bord, le profil. Les énumérer serait un oubli en puissance, et à
 * quatre comptes le coût d'une invalidation large est nul.
 */
export const updatePreferences = authActionClient
  .metadata({ actionName: "updatePreferences" })
  .inputSchema(updatePreferencesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id, ...parsedInput },
      update: parsedInput,
      select: { titleLanguage: true, includeAdult: true },
    });

    revalidatePath("/", "layout");

    return preferences;
  });
