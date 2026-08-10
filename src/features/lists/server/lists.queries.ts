import "server-only";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Lectures des listes (docs/PRODUCT.md §4.4).
 *
 * Toutes closes sur l'utilisateur de la session, comme le reste du domaine utilisateur : aucune
 * signature ne prend d'`ownerId`, pour qu'aucun appelant ne puisse en passer un venu de l'URL.
 *
 * **V1 ne montre que mes listes.** Le partage par lien non listé est du V1.5 : l'`id` de l'URL
 * désigne déjà la liste sans ambiguïté, il restera à décider ce qui autorise à la lire — la
 * visibilité `UNLISTED` seule, ou un jeton. Décision à prendre à ce moment-là, pas maintenant.
 */

/** Les colonnes du miroir dont les vignettes ont besoin. */
const LIST_MEDIA_SELECT = {
  id: true,
  type: true,
  format: true,
  status: true,
  titleRomaji: true,
  titleEnglish: true,
  titleNative: true,
  coverImage: true,
  meanScore: true,
  isAdult: true,
} as const;

/**
 * Mes listes, la plus récemment modifiée en tête.
 *
 * Chaque liste ramène ses **quatre premières jaquettes** pour composer un aperçu, et son nombre
 * total d'œuvres. Quatre, et pas toutes : une page de listes ne doit pas charger le contenu de
 * chacune, et `_count` répond au « 37 œuvres » sans les lire.
 */
export async function getMyLists() {
  const session = await getSession();
  if (!session) return [];

  return prisma.list.findMany({
    where: { ownerId: session.user.id },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      updatedAt: true,
      _count: { select: { items: true } },
      items: {
        orderBy: { rank: "asc" },
        take: 4,
        select: { id: true, media: { select: { coverImage: true } } },
      },
    },
  });
}

/**
 * Une de mes listes, avec son contenu dans l'ordre.
 *
 * Le tri est `rank` croissant — l'index fractionnaire de §4.4. Il est en `String` justement pour
 * que réordonner (V1.5) ne touche qu'une ligne ; en attendant, l'ordre est celui de l'ajout.
 */
export async function getListById(id: string) {
  const session = await getSession();
  if (!session) return null;

  return prisma.list.findFirst({
    // `findFirst` et non `findUnique` : c'est la seule forme qui accepte un `where` non unique, donc
    // la seule qui accepte `ownerId`. Et c'est `ownerId` qui est la garde — l'`id` vient de l'URL,
    // donc une liste d'un autre membre est indiscernable d'une liste inexistante.
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      createdAt: true,
      items: {
        orderBy: { rank: "asc" },
        select: {
          id: true,
          note: true,
          addedAt: true,
          media: { select: LIST_MEDIA_SELECT },
        },
      },
    },
  });
}

/**
 * Mes listes, avec la mention de celles qui contiennent déjà cette œuvre.
 *
 * Sert au dialogue « Ajouter à une liste » de la fiche. Le `items: { where: { mediaId } }` fait le
 * travail en une requête : sans lui, il faudrait lire toutes les listes puis toutes leurs lignes
 * pour savoir cocher trois cases.
 */
export async function getListsForMedia(mediaId: number) {
  const session = await getSession();
  if (!session) return [];

  const lists = await prisma.list.findMany({
    where: { ownerId: session.user.id },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      _count: { select: { items: true } },
      items: { where: { mediaId }, select: { id: true }, take: 1 },
    },
  });

  return lists.map(({ items, ...list }) => ({
    ...list,
    contains: items.length > 0,
  }));
}
