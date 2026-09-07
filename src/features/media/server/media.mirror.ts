import "server-only";

import {
  compactFromMirror,
  MIRRORED_MEDIA_SELECT,
} from "@/features/media/lib/media-format";
import {
  isMirrorStale,
  MIRROR_BATCH_SIZE,
  MIRROR_MAX_BATCHES_PER_RUN,
  mirrorStaleCutoffs,
  SETTLED_STATUSES,
  VOLATILE_STATUSES,
} from "@/features/media/lib/media-freshness";
import {
  type MediaCompact,
  type MediaDetail,
  type MediaMirror,
  mediaMirrorDataSchema,
} from "@/features/media/schemas/media.schema";
import { MEDIA_MIRROR_QUERY } from "@/features/media/server/media.documents";
import { getMediaById } from "@/features/media/server/media.queries";
import { prisma } from "@/lib/db/prisma";
import { anilistQuery, tryAniList } from "@/lib/http/anilist";

/**
 * La fiche servie depuis le **miroir local**, quand AniList ne répond pas.
 *
 * Le miroir ne stocke que de quoi afficher une carte et trier (docs/PRODUCT.md §4.1) : ni synopsis,
 * ni personnages, ni relations, ni liens de streaming. Une fiche reconstruite ici est donc
 * **volontairement pauvre** — c'est le prix d'un écran qui reste debout un jour de coupure, et
 * l'appelant doit le dire au visiteur plutôt que de le laisser croire à une œuvre sans contenu.
 *
 * Ce fichier ne porte **aucun** `"use cache"` : c'est une lecture PostgreSQL, elle coûte une
 * milliseconde, et la mémoriser reviendrait à figer la copie de secours au moment le plus
 * mouvementé de la vie du produit.
 */

/**
 * Une œuvre absente du miroir n'a **jamais été suivie par personne** : on n'a strictement rien à
 * en dire pendant la coupure. C'est le seul cas où la fiche reste injoignable.
 */
export async function getMediaDetailFromMirror(
  id: number,
  { includeAdult }: { includeAdult: boolean },
): Promise<MediaDetail | null> {
  const media = await prisma.media.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      format: true,
      status: true,
      countryOfOrigin: true,
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      coverImage: true,
      coverColor: true,
      bannerImage: true,
      episodes: true,
      chapters: true,
      volumes: true,
      season: true,
      seasonYear: true,
      genres: true,
      meanScore: true,
      isAdult: true,
    },
  });

  if (!media) return null;
  if (media.isAdult && !includeAdult) return null;

  return {
    id: media.id,
    type: media.type,
    format: media.format,
    status: media.status,
    countryOfOrigin: media.countryOfOrigin,
    title: {
      romaji: media.titleRomaji,
      english: media.titleEnglish,
      native: media.titleNative,
      /*
        `userPreferred` est le titre choisi par AniList d'après les réglages du compte qui interroge
        l'API — une notion qui n'existe pas en base. Nul, `mediaTitle` retombe sur le romaji, ce
        qu'on veut afficher.
      */
      userPreferred: null,
    },
    coverImage: {
      /*
        Une seule URL en base — la plus grande — remplit les trois tailles. Le hero lit
        `extraLarge`, les vignettes `large` : la même image évite un champ vide selon l'appelant.
      */
      extraLarge: media.coverImage,
      large: media.coverImage,
      medium: media.coverImage,
      color: media.coverColor,
    },
    bannerImage: media.bannerImage,
    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,
    season: media.season,
    seasonYear: media.seasonYear,
    genres: media.genres,
    meanScore: media.meanScore,
    isAdult: media.isAdult,

    /*
      Tout ce qui suit n'est **pas** mirroité, et les valeurs vides ne sont pas des trous à combler
      un jour : ce sont exactement les champs que §4.1 a décidé de ne pas stocker, parce qu'ils ne
      servent qu'ici et qu'on les paierait sur cinquante fiches à chaque passe du cron.

      Les composants les traitent déjà comme facultatifs — une œuvre sans synopsis ni personnages
      existe chez AniList aussi. Rien de spécial à prévoir de leur côté.
    */
    description: null,
    averageScore: null,
    siteUrl: null,
    startDate: null,
    endDate: null,
    idMal: null,
    duration: null,
    source: null,
    popularity: null,
    favourites: null,
    synonyms: [],
    stats: null,
    streamingEpisodes: [],
    trailer: null,
    nextAiringEpisode: null,
    rankings: [],
    tags: [],
    externalLinks: [],
    studios: { edges: [] },
    characters: { edges: [] },
    staff: { edges: [] },
    relations: { edges: [] },
    recommendations: { nodes: [] },
  };
}

/**
 * Les dix-huit colonnes de `Media`, telles qu'AniList les rend.
 *
 * **Une seule fonction pour les deux écrivains du miroir**, et c'est ce que `mediaMirrorSchema`
 * annonçait : `MediaDetail` satisfait structurellement `MediaMirror`, donc le garde-fou du premier
 * suivi — qui part de la fiche déjà chargée — et le cron — qui lit cinquante fiches d'un coup —
 * recopient par le même chemin. Deux mappings jumeaux dans le même fichier auraient divergé à la
 * première colonne ajoutée au schéma.
 *
 * `syncedAt` est un **paramètre** et non un `new Date()` enfoui : une passe de cron horodate toutes
 * ses lignes du même instant, celui sur lequel elle a calculé ses bornes de péremption. Les prendre
 * une par une ferait porter à la table l'heure de fin de passe plutôt que celle de son début.
 */
function toMirrorRow(media: MediaMirror, syncedAt: Date) {
  return {
    type: media.type,
    format: media.format,
    status: media.status,
    countryOfOrigin: media.countryOfOrigin,
    titleRomaji: media.title.romaji,
    titleEnglish: media.title.english,
    titleNative: media.title.native,
    coverImage: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
    // `coverColor` est un `@db.VarChar(9)` : une valeur plus longue ferait échouer toute la
    // transaction du lot pour une couleur de dégradé. AniList rend `#rrggbb`, mais rien ne nous le
    // garantit, et un lot de cinquante n'est pas l'endroit où le découvrir.
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
    /*
      `syncedAt` avance **même quand rien d'autre ne change**, sinon la ligne resterait périmée pour
      toujours et chaque passage dépenserait une requête à la redemander en vain. C'est la même
      règle que pour une œuvre qu'AniList ne renvoie plus (§4.1).
    */
    syncedAt,
  };
}

/**
 * Copier l'œuvre dans le miroir **avant toute écriture qui y pointe** — et ne rien faire si elle y
 * est déjà et n'est pas périmée.
 *
 * C'est le garde-fou de PRODUCT.md §4.1, reposé avec la première Server Action. Il est
 * **obligatoire** et pas optimiste : `Entry.mediaId` porte une clé étrangère vers `Media`, donc
 * suivre depuis `/search` une œuvre que personne n'a jamais croisée échouerait au niveau de la base.
 * Le miroir n'est pas un index du catalogue, c'est la mémoire de ce que ce cercle a rencontré : il
 * se remplit exactement ici, au moment où quelqu'un s'intéresse à une œuvre.
 *
 * **Ce qui reste du rafraîchissement paresseux abandonné, c'est ce garde-fou et rien d'autre.** La
 * lecture ne réécrit plus jamais (§4.1 : une requête `GET` ne doit pas être coûteuse ni non
 * idempotente) ; ici on est déjà dans une écriture, donc le reproche tombe. Sans le test de
 * fraîcheur, chaque « +1 » recopierait dix-huit colonnes du catalogue partagé pour incrémenter un
 * compteur personnel.
 *
 * **Une ligne périmée est rafraîchie au passage, mais son échec n'arrête rien** : le suivi de
 * l'utilisateur ne doit pas dépendre de la disponibilité d'AniList. Une copie un peu vieille vaut
 * infiniment mieux qu'un « +1 » refusé parce qu'un tiers est en panne — c'est la même règle que
 * partout ailleurs, la panne se rattrape et ne remonte pas.
 */
export async function ensureMediaMirror(mediaId: number): Promise<void> {
  const existing = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { status: true, syncedAt: true },
  });

  if (existing && !isMirrorStale(existing)) return;

  /*
    **`includeAdult: true` ici, et ce n'est pas un contournement de la garde.** Ce qu'on écrit est
    une ligne du catalogue **partagé par les quatre comptes** (§4.1), pas une décision d'affichage.
    Passer la préférence du visiteur ferait renvoyer `null` sur une œuvre classée adulte, et donc
    échouer l'écriture — alors que la question « est-ce que je montre cette œuvre à *ce* compte ? »
    est déjà tranchée en amont, à la lecture, et l'est dans la requête plutôt que par un masque
    (docs/recherche-filtres.md §2.5). Quelqu'un qui arrive ici a forcément déjà vu la fiche.
  */
  const media = await tryAniList(() =>
    getMediaById(mediaId, { includeAdult: true }),
  );

  if (!media) {
    /*
      AniList ne répond pas, ou ne connaît pas cette œuvre.

      Si on a déjà une copie, elle fera l'affaire — elle est seulement périmée. Sinon il n'y a rien
      à écrire, et laisser l'appelant continuer ferait échouer sa clé étrangère avec un message que
      personne ne saurait lire. On le dit ici, où l'on sait pourquoi.
    */
    if (existing) return;

    throw new Error(
      `L'œuvre ${mediaId} est inconnue du miroir et AniList ne répond pas.`,
    );
  }

  const row = toMirrorRow(media, new Date());

  await prisma.media.upsert({
    where: { id: mediaId },
    create: { id: mediaId, ...row },
    update: row,
  });
}

/**
 * Lit un lot d'œuvres chez AniList, **sans cache**.
 *
 * L'absence de `"use cache"` est une décision et pas un oubli : mémoriser la lecture qui *remplit*
 * le miroir reviendrait à rafraîchir une copie avec une copie. La contrainte de quota est tenue
 * autrement — cinquante fiches par requête (`id_in`), et un plafond de lots côté appelant.
 *
 * Un id absent de la réponse n'est pas une erreur, c'est l'information utile : voir
 * `refreshStaleMirror`.
 */
async function fetchMediaForMirror(ids: number[]): Promise<MediaMirror[]> {
  if (ids.length === 0) return [];

  const { Page } = await anilistQuery({
    query: MEDIA_MIRROR_QUERY,
    variables: { ids, perPage: ids.length },
    schema: mediaMirrorDataSchema,
  });

  return Page.media;
}

/** Ce qu'une passe de cron a fait, tel que les journaux Vercel le montreront. */
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
 * Quatre points portent la correction de cette fonction.
 *
 * 1. **La péremption est demandée à PostgreSQL, pas calculée en mémoire.** Les deux bornes de
 *    `mirrorStaleCutoffs` deviennent des `syncedAt < …` servis par l'index `[status, syncedAt]`.
 *    C'est exactement pourquoi `media-freshness.ts` rend des bornes plutôt qu'un prédicat : charger
 *    la table pour la filtrer ensuite marcherait aujourd'hui, et plus dans deux ans.
 * 2. **Le statut nul a sa propre branche.** En SQL, `status IN (…)` comme `status NOT IN (…)` sont
 *    tous deux faux quand la colonne vaut `NULL` — une ligne sans statut échapperait donc aux deux
 *    conditions et ne serait *jamais* rafraîchie. Le piège est classique, silencieux, et il vise
 *    précisément les fiches que `mirrorTtlMs` range du côté volatile par prudence.
 * 3. **Les plus anciennes d'abord.** Le plafond laisse forcément du reste sur un gros miroir ;
 *    l'ordre garantit que ce reste passe en tête à la passe suivante, et donc qu'aucune ligne ne
 *    peut être indéfiniment sautée. Sans `orderBy`, PostgreSQL est libre de rendre les mêmes
 *    cinquante lignes à chaque fois.
 * 4. **Les deux plafonds protègent le quota, et eux seuls.** `MIRROR_BATCH_SIZE` fiches par
 *    requête, `MIRROR_MAX_BATCHES_PER_RUN` requêtes par passe : au pire vingt crédits sur les
 *    trente que la minute partage avec les visiteurs. C'est la raison d'être de ces deux
 *    constantes, et celle pour laquelle la passe préfère laisser du travail derrière elle plutôt
 *    que de finir.
 *
 * Une écriture **par lot, dans une transaction** : les cinquante `update` partent en une fois, là
 * où cinquante allers-retours séquentiels dépasseraient le délai d'exécution de la fonction
 * serverless bien avant d'épuiser le quota AniList. Chaque lot étant committé séparément, une passe
 * coupée en route ne laisse rien d'incohérent — seulement du travail pour la suivante.
 *
 * **La panne n'est pas rattrapée ici, et c'est voulu** : `tryAniList` sert un écran qui doit rester
 * debout, or il n'y a pas d'écran ici. Une passe qui échoue doit apparaître **en échec** dans les
 * journaux Vercel plutôt que de rendre un compte rendu vert et vide ; le cron repassera demain, et
 * l'ordre du point 3 fait que rien n'aura été perdu entre-temps.
 *
 * `now` et `maxBatches` sont des paramètres pour que la fonction soit testable sans horloge ni base
 * de mille lignes — le handler n'en passe aucun.
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
      /*
        **Une œuvre qu'AniList ne renvoie plus garde sa copie, et son `syncedAt` avance quand même.**

        Garder la copie est la durabilité promise par §4.1 : une fiche supprimée ou fusionnée chez
        AniList reste suivie, listée, parfois possédée en volumes chez nous. La supprimer ferait
        tomber les `Entry`, les `ListItem` et les `OwnedVolume` qui y pointent — `onDelete: Cascade`
        —, c'est-à-dire effacer le travail de quelqu'un parce qu'un tiers a réorganisé son
        catalogue. C'est exactement la panne contre laquelle le miroir a été construit.

        Avancer `syncedAt` est l'autre moitié, et elle est moins évidente : sans ça la ligne reste
        périmée pour toujours, remonte en tête du tri « les plus anciennes d'abord » à **chaque**
        passe, et occupe une place de lot à se faire redemander en vain — une poignée de fiches
        disparues suffirait à monopoliser la passe et à laisser le reste du miroir sans
        rafraîchissement. On horodate donc la tentative, pas la réponse.

        Ce qu'on ne fait pas : marquer la ligne d'un quelconque `deletedAt`. Rien ici ne distingue
        une œuvre supprimée d'une œuvre temporairement absente de la réponse, et une colonne qu'on
        ne saurait pas remplir juste vaut moins que pas de colonne du tout.
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
 * Ce que le miroir **ne sait pas** faire d'une recherche, et qu'il faut donc dire au visiteur.
 *
 * Deux manques, et ils ne sont pas du même ordre. Les **tags** n'existent pas en base : §4.1 a
 * décidé de ne pas les stocker, donc un filtre par tag n'a rien à quoi s'appliquer et serait
 * silencieusement ignoré. Les tris par **tendance, popularité et favoris** portent sur des chiffres
 * qu'AniList recalcule en continu et que le miroir ne copie pas : on retombe sur la note moyenne,
 * qui est une autre question.
 *
 * La liste est renvoyée à l'appelant plutôt qu'affichée ici : c'est l'écran qui sait où poser un
 * avis, et un repli muet vaut moins qu'une page d'erreur — il laisse croire à un résultat.
 */
export type MirrorSearchLimitation = "tags" | "sort";

/**
 * Une carte de catalogue servie par le miroir, **et ce qu'il faut en plus pour l'éditer**.
 *
 * `MediaCompact` décrit une vignette et rien d'autre ; la fenêtre d'édition rapide veut la bannière
 * et le plafond de progression. Les trois colonnes voyagent donc à côté plutôt que d'entrer dans
 * `MediaCompact`, qui sert partout ailleurs — sur la fiche, dans les relations, dans les
 * recommandations — et n'a aucune raison de s'alourdir pour un écran.
 *
 * **Elles sont là pour que le repli reste équivalent.** Le document GraphQL de recherche ramène
 * déjà ces trois champs (`mediaSchema`) : sans elles, une panne d'AniList ferait discrètement
 * disparaître la bannière et le plafond de la fenêtre, ce qui est exactement le genre de repli muet
 * que `lost` existe pour éviter.
 */
export type MirrorSearchItem = MediaCompact & {
  bannerImage: string | null;
  episodes: number | null;
  chapters: number | null;
};

export type MirrorSearchResult = {
  items: MirrorSearchItem[];
  total: number;
  page: number;
  pageCount: number;
  /** Ce que cette recherche a perdu en passant par la copie locale. Vide si elle n'a rien perdu. */
  lost: MirrorSearchLimitation[];
};

/**
 * La recherche servie depuis le **miroir local**, quand AniList ne répond pas.
 *
 * Elle remplace l'échantillon qui tenait lieu de grille pendant qu'on dessinait la carte : ce n'est
 * plus un aperçu, c'est un vrai repli, paginé en base et filtré par ce que les colonnes du miroir
 * permettent — le terme, le type, le format, le statut, le pays, la saison, les genres, la plage
 * d'années et la note. C'est-à-dire presque tout, parce que §4.1 avait justement retenu de quoi
 * « afficher une carte et trier ».
 *
 * **Le miroir ne contient que ce que quelqu'un a déjà consulté ou suivi.** Une recherche y trouve
 * donc beaucoup moins qu'AniList, et c'est irréductible : ce n'est pas un index du catalogue, c'est
 * la mémoire de ce que ce cercle a croisé.
 *
 * `includeAdult` est appliqué **dans la requête**, jamais par un masque d'affichage — la règle vaut
 * ici comme ailleurs (docs/recherche-filtres.md §2.5).
 */
export async function searchMediaInMirror({
  filters,
  includeAdult,
  page,
  perPage,
}: {
  filters: {
    q: string;
    type: string | null;
    format: string[];
    country: string | null;
    status: string | null;
    season: string | null;
    genre: string[];
    tag: string[];
    yearMin: number | null;
    yearMax: number | null;
    score: number | null;
    sort: string;
  };
  includeAdult: boolean;
  page: number;
  perPage: number;
}): Promise<MirrorSearchResult> {
  const where: Record<string, unknown> = {};

  if (!includeAdult) where.isAdult = false;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.country) where.countryOfOrigin = filters.country;
  if (filters.season) where.season = filters.season;
  if (filters.format.length > 0) where.format = { in: filters.format };
  // `hasEvery` et non `hasSome` : cocher deux genres restreint, il n'élargit pas. C'est aussi ce
  // que fait `genre_in` chez AniList, donc le repli ne change pas le sens de la question.
  if (filters.genre.length > 0) where.genres = { hasEvery: filters.genre };
  if (filters.score !== null) where.meanScore = { gte: filters.score };

  if (filters.yearMin !== null || filters.yearMax !== null) {
    where.seasonYear = {
      ...(filters.yearMin !== null ? { gte: filters.yearMin } : {}),
      ...(filters.yearMax !== null ? { lte: filters.yearMax } : {}),
    };
  }

  const term = filters.q.trim();
  if (term) {
    where.OR = [
      { titleRomaji: { contains: term, mode: "insensitive" } },
      { titleEnglish: { contains: term, mode: "insensitive" } },
      { titleNative: { contains: term, mode: "insensitive" } },
    ];
  }

  const total = await prisma.media.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(page, 1), pageCount);

  const rows = await prisma.media.findMany({
    where,
    // La note moyenne fait l'ordre par défaut, et `id` le départage : sans second critère, deux
    // œuvres de même note changeraient de place entre deux pages et l'une d'elles disparaîtrait.
    orderBy:
      filters.sort === "TITLE_ROMAJI"
        ? [{ titleRomaji: "asc" as const }, { id: "asc" as const }]
        : filters.sort === "START_DATE"
          ? [{ seasonYear: "desc" as const }, { id: "asc" as const }]
          : [{ meanScore: "desc" as const }, { id: "asc" as const }],
    skip: (current - 1) * perPage,
    take: perPage,
    select: MIRRORED_MEDIA_SELECT,
  });

  const lost: MirrorSearchLimitation[] = [];
  if (filters.tag.length > 0) lost.push("tags");
  if (!["TITLE_ROMAJI", "START_DATE", "SCORE"].includes(filters.sort)) {
    lost.push("sort");
  }

  return {
    items: rows.map((row) => ({
      ...compactFromMirror(row),
      bannerImage: row.bannerImage,
      episodes: row.episodes,
      chapters: row.chapters,
    })),
    total,
    page: current,
    pageCount,
    lost,
  };
}
