import "server-only";

import { webhookHint } from "@/features/notifications/lib/discord-episodes";
import type { DiscordWebhookStatus } from "@/features/notifications/schemas/discord.schema";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Le webhook du compte courant, **tel qu'on peut le montrer** : son nom, et un indice.
 *
 * L'URL ne sort jamais d'ici. Elle est le secret — quiconque la lit peut poster dans le salon —, et
 * la page de réglages n'en a pas besoin : on reconnaît son webhook à son nom.
 */
export async function getDiscordWebhookStatus(): Promise<DiscordWebhookStatus> {
  const session = await getSession();
  if (!session) return null;

  const webhook = await prisma.discordWebhook.findUnique({
    where: { userId: session.user.id },
    select: { url: true, name: true },
  });

  return webhook
    ? { name: webhook.name, hint: webhookHint(webhook.url) }
    : null;
}
