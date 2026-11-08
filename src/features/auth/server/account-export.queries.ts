import "server-only";

import { prisma } from "@/lib/db/prisma";

/** Chaque œuvre est nommée par son id AniList et ses titres : de quoi la retrouver ailleurs. */
const MEDIA = {
  select: {
    id: true,
    type: true,
    titleRomaji: true,
    titleEnglish: true,
    titleNative: true,
  },
} as const;

/** Monte quand la forme du fichier change, pour qu'un futur import sache ce qu'il lit. */
const EXPORT_VERSION = 1;

/**
 * Tout ce qu'un membre a écrit dans l'application, en un objet (D75).
 *
 * **Ce qui n'y est pas, et pourquoi** : les jetons de session et d'OAuth, l'adresse du webhook
 * Discord (c'est le secret du salon), le jeton de partage des listes (c'est la clé d'un lien), et
 * les likes des autres. Le reste part tel qu'en base : la note sur 0–100, les dates en ISO.
 */
export async function getAccountExport(userId: string) {
  const [user, preferences, entries, favorites, lists, volumes] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { username: true, name: true, email: true, createdAt: true },
      }),
      prisma.userPreferences.findUnique({
        where: { userId },
        omit: { userId: true },
      }),
      prisma.entry.findMany({
        where: { userId },
        omit: { userId: true, mediaId: true },
        include: {
          media: MEDIA,
          events: {
            omit: { userId: true, entryId: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.favorite.findMany({
        where: { userId },
        omit: { userId: true, mediaId: true },
        include: { media: MEDIA },
        orderBy: { createdAt: "asc" },
      }),
      prisma.list.findMany({
        where: { ownerId: userId },
        omit: { ownerId: true, shareToken: true },
        include: {
          items: {
            omit: { listId: true, mediaId: true, readyNotifiedAt: true },
            include: { media: MEDIA },
            orderBy: { rank: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.ownedVolume.findMany({
        where: { userId },
        omit: { userId: true, editionId: true, lentToId: true },
        include: {
          edition: {
            select: { label: true, publisher: true, media: MEDIA },
          },
          // Le prêteur voit à qui il a prêté, par son identifiant public — jamais par son email.
          lentTo: { select: { username: true } },
        },
        orderBy: [{ editionId: "asc" }, { number: "asc" }],
      }),
    ]);

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    account: user,
    preferences,
    entries,
    favorites,
    lists,
    collection: volumes,
  };
}
