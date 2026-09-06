import "server-only";

import { cache } from "react";

import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from "@/features/preferences/schemas/preferences.schema";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Les préférences d'affichage du compte courant (docs/PRODUCT.md §4.6).
 *
 * **Pas de `"use cache"` ici, et ce n'est pas un oubli** : la fonction dépend de l'identité du
 * visiteur. Une entrée mémorisée servirait la préférence d'un compte à un autre — un titre en
 * japonais chez qui a choisi le romaji, et surtout un filtre 18+ éteint qui laisse passer.
 *
 * `cache` de React, lui, est le bon outil : il déduplique l'appel **à l'intérieur d'un seul
 * rendu**. `generateMetadata` et le contenu de la page demandent tous deux les préférences ; sans
 * lui, la même ligne serait lue deux fois par affichage de fiche.
 *
 * Un visiteur sans session — la page de liste partagée s'ouvre sans compte — reçoit les valeurs
 * par défaut plutôt qu'une erreur : il n'a pas de préférence, ce n'est pas une anomalie.
 */
export const getPreferences = cache(async (): Promise<Preferences> => {
  const session = await getSession();
  if (!session) return DEFAULT_PREFERENCES;

  const preferences = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { titleLanguage: true, includeAdult: true },
  });

  // Un compte qui n'a jamais ouvert les réglages n'a pas de ligne : les défauts du schéma Zod
  // sont alignés sur ceux de `prisma/schema.prisma`, donc les deux chemins disent la même chose.
  return preferences ?? DEFAULT_PREFERENCES;
});
