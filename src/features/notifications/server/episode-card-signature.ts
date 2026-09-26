import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env";
import type { EpisodeCard } from "@/features/notifications/schemas/episode-card.schema";

/**
 * La signature des URL de carte d'épisode.
 *
 * **La route est publique, et ne peut pas faire autrement** : c'est Discord qui va chercher l'image,
 * sans cookie. Sans signature, n'importe qui pourrait l'interroger id par id et apprendre quelles
 * œuvres le cercle suit — le miroir `Media` ne contient que celles-là. Avec, seules les cartes que
 * le cron a émises s'affichent.
 *
 * La clé est `BETTER_AUTH_SECRET`, **séparée par un préfixe de domaine** : le même secret signe
 * autre chose chez Better Auth, et un message qui commence par `og-episode:` ne peut être confondu
 * avec aucun des siens.
 *
 * La langue du titre est signée avec le reste : sans elle, on pourrait réclamer une variante que le
 * cron n'a jamais émise — sans danger, mais sans raison de le permettre.
 *
 * Seize caractères hexadécimaux, soit 64 bits : infalsifiables en pratique pour une image, et une
 * URL qui reste lisible dans les journaux.
 */
export function signEpisodeCard(card: EpisodeCard): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`og-episode:${card.mediaId}:${card.episode}:${card.lang}`)
    .digest("hex")
    .slice(0, 16);
}

/** Comparaison en temps constant, pour la même raison que la garde des crons. */
export function isValidEpisodeCardSignature(
  card: EpisodeCard,
  signature: string,
): boolean {
  const expected = signEpisodeCard(card);
  if (signature.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
