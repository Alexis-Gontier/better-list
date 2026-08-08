import "server-only";

import { cache } from "react";

import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from "@/features/preferences/schemas/preferences.schema";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Les préférences du compte courant.
 *
 * **Mémorisée par `cache` de React**, et c'est ce qui rend le reste possible : chaque vignette, la
 * fiche, le journal et la barre de filtres peuvent la demander sans que ça coûte plus d'une requête
 * par rendu. Sans cette déduplication, il aurait fallu faire descendre les réglages en propriétés à
 * travers cinq niveaux de composants — ou pire, ne pas les brancher du tout.
 *
 * Pas de `"use cache"` : ces valeurs dépendent de l'utilisateur. C'est la même règle que pour le
 * suivi (`features/tracking/server/tracking.queries.ts`).
 *
 * **Ne renvoie jamais `null`.** Un compte sans ligne de préférences — c'est le cas de tous tant
 * qu'ils n'ont rien réglé — reçoit les valeurs par défaut, identiques à celles du schéma Prisma.
 * Un appelant n'a donc aucune raison d'écrire son propre repli, et aucune occasion d'en inventer un
 * qui diverge.
 */
export const getPreferences = cache(async (): Promise<Preferences> => {
  const session = await getSession();
  if (!session) return DEFAULT_PREFERENCES;

  const preferences = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { scoreFormat: true, titleLanguage: true, includeAdult: true },
  });

  return preferences ?? DEFAULT_PREFERENCES;
});
