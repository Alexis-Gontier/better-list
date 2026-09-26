"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { routes } from "@/config/routes";
import { webhookHint } from "@/features/notifications/lib/discord-episodes";
import { saveDiscordWebhookSchema } from "@/features/notifications/schemas/discord.schema";
import {
  fetchWebhookInfo,
  isGoneWebhook,
  postToWebhook,
} from "@/features/notifications/server/discord-webhook";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Brancher, tester, débrancher le webhook Discord du compte.
 *
 * `authActionClient` : le compte vient de `ctx`, jamais d'un argument — un `userId` reçu du client
 * permettrait de brancher son salon sur les séries d'un autre.
 *
 * **Les échecs attendus sont des valeurs de retour, pas des exceptions.** `handleServerError`
 * remplace tout message par « Une erreur est survenue » en production, ce qui est juste pour une
 * panne et inutile pour « ce webhook n'existe pas » — la seule chose que l'écran a besoin de dire.
 */

type Outcome = { ok: true } | { ok: false; message: string };

const GONE_MESSAGE =
  "Discord ne connaît pas ce webhook. Il a peut-être été supprimé : recopiez son adresse depuis les paramètres du salon.";
const UNREACHABLE_MESSAGE =
  "Discord n'a pas répondu. Réessayez dans un instant.";

export const saveDiscordWebhook = authActionClient
  .metadata({ actionName: "saveDiscordWebhook" })
  .inputSchema(saveDiscordWebhookSchema)
  .action(async ({ parsedInput, ctx }): Promise<Outcome> => {
    /*
      On demande à Discord **avant** d'écrire : une adresse bien formée peut désigner un webhook
      supprimé, et l'enregistrer quand même ferait croire à un branchement qui n'enverra jamais rien.
    */
    let name: string;
    try {
      const info = await fetchWebhookInfo(parsedInput.url);
      name = info.name ?? "Webhook Discord";
    } catch (error) {
      return {
        ok: false,
        message: isGoneWebhook(error) ? GONE_MESSAGE : UNREACHABLE_MESSAGE,
      };
    }

    /*
      `notifiedUntil` part de **maintenant**, y compris quand on remplace un webhook : brancher un
      salon ne doit pas y déverser la semaine passée. Ce qui sort à partir d'ici sera annoncé.
    */
    const now = new Date();
    await prisma.discordWebhook.upsert({
      where: { userId: ctx.user.id },
      create: {
        userId: ctx.user.id,
        url: parsedInput.url,
        name,
        notifiedUntil: now,
      },
      update: { url: parsedInput.url, name, notifiedUntil: now },
    });

    revalidatePath(routes.settings);
    return { ok: true };
  });

export const removeDiscordWebhook = authActionClient
  .metadata({ actionName: "removeDiscordWebhook" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }): Promise<Outcome> => {
    // `deleteMany` et non `delete` : débrancher deux fois — deux onglets — n'est pas une erreur.
    await prisma.discordWebhook.deleteMany({ where: { userId: ctx.user.id } });

    revalidatePath(routes.settings);
    return { ok: true };
  });

export const sendDiscordTest = authActionClient
  .metadata({ actionName: "sendDiscordTest" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }): Promise<Outcome> => {
    const webhook = await prisma.discordWebhook.findUnique({
      where: { userId: ctx.user.id },
      select: { url: true },
    });

    if (!webhook) return { ok: false, message: "Aucun webhook n'est branché." };

    try {
      await postToWebhook(webhook.url, {
        content: `C'est branché. Les épisodes des animes que vous suivez arriveront ici, une fois par heure au plus (${webhookHint(webhook.url)}).`,
      });
    } catch (error) {
      return {
        ok: false,
        message: isGoneWebhook(error) ? GONE_MESSAGE : UNREACHABLE_MESSAGE,
      };
    }

    return { ok: true };
  });
