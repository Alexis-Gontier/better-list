import type { NextRequest } from "next/server";

import { episodeCardSchema } from "@/features/notifications/schemas/episode-card.schema";
import { renderEpisodeCard } from "@/features/notifications/server/episode-card";
import { isValidEpisodeCardSignature } from "@/features/notifications/server/episode-card-signature";

/**
 * L'image d'un épisode sorti, que le message Discord affiche en grand.
 *
 * **Sans session, par nécessité** : c'est le serveur de Discord qui la demande. Sa garde est la
 * signature que le cron a posée dans l'URL (`episode-card-signature.ts`) — une adresse qu'on n'a
 * pas émise répond 404, exactement comme une œuvre absente du miroir, pour ne rien laisser deviner.
 *
 * Le handler ne contient aucune logique : il valide, il vérifie, il appelle
 * `features/notifications/server/`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string; episode: string }> },
) {
  const { searchParams } = request.nextUrl;
  const parsed = episodeCardSchema.safeParse({
    ...(await params),
    lang: searchParams.get("lang"),
  });
  const signature = searchParams.get("sig") ?? "";

  if (!parsed.success || !isValidEpisodeCardSignature(parsed.data, signature))
    return new Response(null, { status: 404 });

  return (
    (await renderEpisodeCard(parsed.data)) ??
    new Response(null, { status: 404 })
  );
}
