import "server-only";

import { MEDIA_MIRROR_QUERY } from "@/features/media/lib/media-documents";
import {
  isMirrorStale,
  MIRROR_BATCH_SIZE,
  MIRROR_MAX_BATCHES_PER_RUN,
  mirrorStaleCutoffs,
  SETTLED_STATUSES,
  VOLATILE_STATUSES,
} from "@/features/media/lib/media-freshness";
import {
  type MediaDetail,
  type MediaMirror,
  mediaDetailSchema,
  mediaMirrorDataSchema,
} from "@/features/media/schemas/media.schema";
import { getMediaById } from "@/features/media/server/media.queries";
import { prisma } from "@/lib/db/prisma";
import { anilistQuery } from "@/lib/http/anilist";

/**
 * Alimentation du miroir local (docs/PRODUCT.md §4.1).
 *
 * `Entry`, `ListItem` et `Edition` pointent tous vers `Media` par une clé étrangère : **on ne peut
 * rien suivre, lister ni posséder d'une œuvre qui n'existe pas en base.** Or la fiche lit AniList
 * à la volée et n'écrit rien. C'est donc ici, au premier geste qui engage l'utilisateur, que la
 * copie locale naît — puis c'est le cron qui l'entretient.
 *
 * **La distinction avec `media.queries.ts` est la raison d'être de ce fichier.** Là-bas, les lectures
 * d'affichage portent toutes un `"use cache"` ; ici, le rafraîchissement n'en porte aucun, et c'est
 * volontaire : le miroir *est* le cache de ces colonnes. Le remplir depuis une lecture mémorisée
 * réécrirait la donnée périmée par elle-même, indéfiniment. C'est la seule lecture AniList non cachée
 * du projet, et elle n'est jamais déclenchée par un visiteur — seulement par le cron ou par une
 * écriture de l'utilisateur.
 *
 * **On ne fait jamais confiance au client pour ces données.** L'action ne reçoit qu'un identifiant ;
 * le contenu du miroir vient d'AniList, pas du navigateur. Sans quoi n'importe qui pourrait
 * réécrire le catalogue partagé par les quatre comptes.
 */

/**
 * AniList → les colonnes de la table `Media`.
 *
 * Typée sur `MediaMirror`, la forme la plus étroite : la fiche complète (`MediaDetail`) la satisfait
 * structurellement, donc le premier suivi et le cron partagent cette recopie au lieu d'en tenir deux
 * versions qui divergeraient au premier champ ajouté.
 *
 * `syncedAt` est un **paramètre** et non un `new Date()` enfoui : une passe de cron doit horodater
 * toutes ses lignes du même instant, sans quoi deux fiches rafraîchies ensemble se périment
 * séparément.
 */
function toMirrorRow(media: MediaMirror, syncedAt: Date) {
  return {
    type: media.type,
    format: media.format,
    status: media.status,
    // Colonne `Char(2)` : AniList tient la norme ISO, mais une colonne fixe ne pardonne pas.
    countryOfOrigin: media.countryOfOrigin?.slice(0, 2) ?? null,

    titleRomaji: media.title.romaji,
    titleEnglish: media.title.english,
    titleNative: media.title.native,

    coverImage: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
    coverColor: media.coverImage?.color?.slice(0, 9) ?? null,
    bannerImage: media.bannerImage,

    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,

    season: media.season,
    seasonYear: media.seasonYear,

    genres: media.genres,
    meanScore: media.meanScore,
    isAdult: media.isAdult,

    syncedAt,
  };
}

/**
 * Garantit qu'une œuvre existe en base avant qu'on y pointe.
 *
 * Deux cas, et le second est ce que la politique de fraîcheur appelle « paresseux, à la lecture » :
 *
 * - la ligne n'existe pas → on la crée depuis la fiche AniList que la page a sous les yeux ;
 * - la ligne existe et n'est **pas** périmée → on ne fait rien du tout, ni requête ni écriture.
 *
 * Le second cas n'est pas une micro-optimisation. Sans lui, chaque « +1 » réécrivait les dix-huit
 * colonnes du catalogue partagé pour incrémenter un compteur personnel, et le geste le plus fréquent
 * du produit (§6) payait une écriture dont il n'avait aucun besoin.
 *
 * `getMediaById` porte un `"use cache"` de `cacheLife("days")` : sur une création, le coût AniList est
 * donc nul en pratique — la fiche vient d'être lue par la page. C'est aussi pourquoi cette recopie ne
 * suffit pas à entretenir le miroir, et pourquoi le cron existe.
 */
export async function ensureMediaMirror(mediaId: number): Promise<boolean> {
  const existing = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { status: true, syncedAt: true },
  });

  if (existing && !isMirrorStale(existing)) return true;

  const media = await getMediaById(mediaId);

  // `null` = id inconnu d'AniList, ou œuvre adulte alors que la préférence est éteinte. Dans les
  // deux cas la fiche n'existe pas côté API — mais si on en a déjà une copie, elle reste utilisable :
  // c'est exactement la durabilité que le miroir promet (§4.1).
  if (!media) return existing !== null;

  const data = toMirrorRow(media, new Date());

  await prisma.media.upsert({
    where: { id: mediaId },
    create: { id: mediaId, ...data },
    update: data,
  });

  return true;
}

/**
 * Lit un lot d'œuvres chez AniList, **sans cache**.
 *
 * L'absence de `"use cache"` est la décision de ce fichier, pas un oubli : mémoriser la lecture qui
 * remplit le miroir reviendrait à rafraîchir une copie avec une copie. La contrainte du quota est
 * tenue autrement — cinquante fiches par requête (`id_in`), et un plafond de passes côté appelant.
 *
 * Un id absent de la réponse n'est pas une erreur : c'est une œuvre supprimée ou fusionnée chez
 * AniList. L'appelant en tire la conclusion.
 */
async function fetchMediaForMirror(ids: number[]): Promise<MediaMirror[]> {
  if (ids.length === 0) return [];

  const data = await anilistQuery({
    query: MEDIA_MIRROR_QUERY,
    variables: { ids, perPage: ids.length },
    schema: mediaMirrorDataSchema,
  });

  return data.Page.media;
}

export type MirrorRefreshSummary = {
  /** Lignes périmées retenues par cette passe — plafond compris. */
  stale: number;
  /** Lignes effectivement réécrites depuis AniList. */
  refreshed: number;
  /** Ids qu'AniList ne connaît plus : horodatés quand même, pour ne pas les redemander sans fin. */
  vanished: number;
  /** Requêtes AniList consommées. Un lot = une requête. */
  batches: number;
};

/**
 * Rafraîchit les lignes périmées du miroir. **C'est le corps du cron** (docs/PRODUCT.md §4.1).
 *
 * Trois points portent la correction de cette fonction :
 *
 * 1. **La péremption est demandée à PostgreSQL, pas calculée en mémoire.** Les deux bornes de
 *    `mirrorStaleCutoffs` deviennent des `syncedAt < …` servis par l'index `[status, syncedAt]` ;
 *    charger la table pour la filtrer ensuite marcherait aujourd'hui et pas dans deux ans.
 * 2. **Le statut nul a sa propre branche.** En SQL, `status IN (…)` comme `status NOT IN (…)` sont
 *    tous deux faux quand la colonne vaut `NULL` — une ligne sans statut échapperait donc aux deux
 *    conditions et ne serait jamais rafraîchie. Le piège est classique et silencieux.
 * 3. **Les plus anciennes d'abord.** Le plafond de passes laisse forcément du reste sur un gros
 *    miroir ; l'ordre garantit que ce reste est traité à la passe suivante, et qu'aucune ligne ne
 *    peut être indéfiniment sautée.
 *
 * Une écriture par lot, dans une transaction : les cinquante `update` partent en une fois, là où
 * cinquante allers-retours séquentiels dépasseraient le délai d'exécution d'une fonction serverless
 * bien avant d'épuiser le quota AniList.
 */
export async function refreshStaleMirror({
  now = new Date(),
  maxBatches = MIRROR_MAX_BATCHES_PER_RUN,
}: {
  now?: Date;
  maxBatches?: number;
} = {}): Promise<MirrorRefreshSummary> {
  const { volatileBefore, settledBefore } = mirrorStaleCutoffs(now);

  const stale = await prisma.media.findMany({
    where: {
      OR: [
        { status: { in: VOLATILE_STATUSES }, syncedAt: { lt: volatileBefore } },
        // Voir le point 2 : sans cette branche, une ligne sans statut n'est jamais reprise.
        { status: null, syncedAt: { lt: volatileBefore } },
        { status: { in: SETTLED_STATUSES }, syncedAt: { lt: settledBefore } },
      ],
    },
    orderBy: { syncedAt: "asc" },
    take: maxBatches * MIRROR_BATCH_SIZE,
    select: { id: true },
  });

  const summary: MirrorRefreshSummary = {
    stale: stale.length,
    refreshed: 0,
    vanished: 0,
    batches: 0,
  };

  for (let start = 0; start < stale.length; start += MIRROR_BATCH_SIZE) {
    const ids = stale
      .slice(start, start + MIRROR_BATCH_SIZE)
      .map((row) => row.id);

    const media = await fetchMediaForMirror(ids);
    summary.batches += 1;

    const returned = new Set(media.map((item) => item.id));
    const missing = ids.filter((id) => !returned.has(id));

    await prisma.$transaction([
      ...media.map((item) =>
        prisma.media.update({
          where: { id: item.id },
          data: toMirrorRow(item, now),
        }),
      ),
      /**
       * Une œuvre qu'AniList ne renvoie plus garde sa copie — c'est la durabilité promise par §4.1 —
       * mais son `syncedAt` avance quand même. Sans ça, elle resterait périmée pour toujours et
       * chaque passe du cron dépenserait une place de lot à la redemander en vain.
       */
      ...(missing.length > 0
        ? [
            prisma.media.updateMany({
              where: { id: { in: missing } },
              data: { syncedAt: now },
            }),
          ]
        : []),
    ]);

    summary.refreshed += media.length;
    summary.vanished += missing.length;
  }

  return summary;
}

/**
 * La fiche telle que le miroir local peut la raconter, quand AniList ne répond pas.
 *
 * **Pourquoi un repli plutôt qu'un écran vide.** `/media/[id]` porte le « +1 », le geste le plus
 * fréquent du produit (docs/PRODUCT.md §6), et le suivi ne dépend pas d'AniList : il vit dans
 * `Entry`, en base. Rendre la page injoignable pendant une coupure retirerait le geste pour une
 * requête dont il n'a aucun besoin. Le miroir existe précisément pour ça (§4.1).
 *
 * **Une fiche amputée, pas une fiche inventée.** Ce que la table ne stocke pas — le synopsis, les
 * personnages, l'équipe, les œuvres liées, les recommandations, les liens externes — sort en vide,
 * jamais en valeur de remplacement. `mediaDetailSchema` donne un `default` à chacun de ces champs,
 * et `buildTabs` masque déjà tout onglet dont la collection est vide : la fiche dégradée perd donc
 * ses onglets d'elle-même, sans qu'aucun composant d'affichage ait à connaître la panne.
 *
 * Renvoie `null` aux mêmes conditions que `getMediaById` : l'œuvre est inconnue du miroir — elle n'a
 * jamais été suivie, listée ni possédée — ou elle est adulte alors que la préférence est éteinte.
 */
export async function getMediaDetailFromMirror(
  id: number,
  { includeAdult = false }: { includeAdult?: boolean } = {},
): Promise<MediaDetail | null> {
  const row = await prisma.media.findUnique({ where: { id } });

  if (!row) return null;
  if (row.isAdult && !includeAdult) return null;

  /**
   * On repasse par le schéma au lieu de fabriquer l'objet à la main : les champs absents de la
   * table prennent leurs `default`, et le jour où `MediaDetail` en gagne un, ce repli le suit sans
   * qu'on y pense. Les colonnes que la table n'a pas restent `null` — `description`, `averageScore`,
   * `siteUrl` et les deux dates ne sont pas miroitées.
   */
  return mediaDetailSchema.parse({
    id: row.id,
    type: row.type,
    format: row.format,
    status: row.status,
    description: null,
    season: row.season,
    seasonYear: row.seasonYear,
    episodes: row.episodes,
    chapters: row.chapters,
    volumes: row.volumes,
    countryOfOrigin: row.countryOfOrigin,
    isAdult: row.isAdult,
    averageScore: null,
    meanScore: row.meanScore,
    genres: row.genres,
    coverImage: {
      extraLarge: row.coverImage,
      large: row.coverImage,
      medium: row.coverImage,
      color: row.coverColor,
    },
    bannerImage: row.bannerImage,
    title: {
      romaji: row.titleRomaji,
      english: row.titleEnglish,
      native: row.titleNative,
      /**
       * `userPreferred` est le choix fait côté AniList, que le miroir ne stocke pas. Le laisser
       * `null` rend la main à `mediaTitle`, qui applique la préférence du compte — c'est la même
       * règle que partout ailleurs dans l'app.
       */
      userPreferred: null,
    },
    siteUrl: null,
    startDate: null,
    endDate: null,
  });
}

/**
 * Nombre d'unités à parcourir pour finir l'œuvre — épisodes ou chapitres selon le type.
 *
 * `null` quand AniList ne le connaît pas : une série en cours de diffusion n'a pas de total, et
 * inventer un plafond y bloquerait la progression au mauvais endroit.
 */
export function mediaTotalUnits(media: {
  type: "ANIME" | "MANGA";
  episodes: number | null;
  chapters: number | null;
}): number | null {
  return media.type === "ANIME" ? media.episodes : media.chapters;
}
