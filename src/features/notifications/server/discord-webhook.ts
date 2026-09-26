import "server-only";

import { isResponseError } from "up-fetch";

import { site } from "@/config/site";
import {
  type DiscordEmbed,
  discordMessageSchema,
  discordWebhookInfoSchema,
} from "@/features/notifications/schemas/discord.schema";
import { upfetch } from "@/lib/http/fetch";

/**
 * Les deux appels qu'on fait à Discord : lire un webhook, y poster.
 *
 * **L'URL arrive toujours validée** (`discordWebhookUrlSchema`) — à l'enregistrement par l'action,
 * et la base ne contient que ce qui y est passé. C'est ce qui empêche ce fichier d'appeler autre
 * chose que Discord.
 */

/**
 * Le webhook existe-t-il, et comment s'appelle-t-il ?
 *
 * Un `GET` sur l'URL d'un webhook avec son jeton rend l'objet sans rien poster : c'est la
 * vérification qui ne dérange personne dans le salon.
 */
export async function fetchWebhookInfo(url: string) {
  return upfetch(url, { schema: discordWebhookInfoSchema });
}

/**
 * Poster un message.
 *
 * `?wait=true` fait rendre le message créé plutôt qu'un 204 vide : l'envoi est alors confirmé par
 * un corps qu'on valide, et non par l'absence d'erreur.
 */
export async function postToWebhook(
  url: string,
  message: { content?: string; embeds?: DiscordEmbed[] },
) {
  return upfetch(`${url}?wait=true`, {
    method: "POST",
    body: {
      username: site.name,
      // Aucune mention, jamais : un titre d'œuvre qui contiendrait `@everyone` pingerait le salon.
      allowed_mentions: { parse: [] },
      ...message,
    },
    schema: discordMessageSchema,
  });
}

/**
 * **Le webhook n'existe plus** — supprimé dans Discord, ou son jeton régénéré.
 *
 * Discord répond alors 404 (webhook inconnu) ou 401 (jeton invalide), et ça ne se corrigera pas
 * tout seul : réessayer toutes les heures ne ferait que remplir les journaux.
 */
export function isGoneWebhook(error: unknown): boolean {
  return (
    isResponseError(error) && (error.status === 404 || error.status === 401)
  );
}
