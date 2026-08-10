import "server-only";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Lectures des listes (docs/PRODUCT.md §4.4).
 *
 * Toutes closes sur l'utilisateur de la session, comme le reste du domaine utilisateur : aucune
 * signature ne prend d'`ownerId`, pour qu'aucun appelant ne puisse en passer un venu de l'URL.
 *
 * **Sauf une : `getSharedList`.** C'est la seule lecture du projet qui réponde sans session, et
 * c'est ce qui fait exister le lien non listé. Sa garde n'est pas l'identité du lecteur — il n'en a
 * pas — mais la possession du jeton, et elle est écrite à côté d'elle.
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
      shareToken: true,
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
      shareToken: true,
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
 * Une liste partagée, lue **par son jeton et sans session**.
 *
 * C'est la seule lecture du projet qui ne demande à personne qui il est : le lien non listé
 * s'adresse à quelqu'un qui n'a pas de compte (docs/PRODUCT.md §2), donc exiger une session
 * reviendrait à ne pas partager du tout.
 *
 * **Le jeton est la garde, et il est aussi l'identifiant.** Un jeton inconnu et une liste qui n'est
 * plus partagée donnent le même `null`, donc la même page introuvable : c'est la règle qui vaut déjà
 * pour les listes d'un autre membre, appliquée ici. Rien dans la réponse ne dit si la liste a existé,
 * ce qui retire tout intérêt à essayer des jetons au hasard.
 *
 * Ce qui sort d'ici sort du cercle : on ne rend donc que ce qu'une page publique affiche —
 * titre, description, œuvres, et le nom du propriétaire. Pas d'`id` de liste (il ouvrirait l'adresse
 * privée), pas de date de modification, pas de note personnelle sur les lignes.
 */
export async function getSharedList(token: string) {
  return prisma.list.findUnique({
    // `findUnique` sur `shareToken`, qui est unique : un jeton désigne au plus une liste. Le `null`
    // couvre les deux cas — jeton faux, ou partage révoqué —, et c'est voulu qu'ils soient
    // indistinguables.
    where: { shareToken: token },
    select: {
      title: true,
      description: true,
      owner: { select: { username: true, name: true } },
      items: {
        orderBy: { rank: "asc" },
        select: { id: true, media: { select: LIST_MEDIA_SELECT } },
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
