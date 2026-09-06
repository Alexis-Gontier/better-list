import "server-only";

import { compactFromMirror } from "@/features/media/lib/media-format";
import type {
  MediaCompact,
  MediaDetail,
} from "@/features/media/schemas/media.schema";
import { prisma } from "@/lib/db/prisma";

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

export type MirrorSearchResult = {
  items: MediaCompact[];
  total: number;
  page: number;
  pageCount: number;
  /** Ce que cette recherche a perdu en passant par la copie locale. Vide si elle n'a rien perdu. */
  lost: MirrorSearchLimitation[];
};

/** Les colonnes que `compactFromMirror` consomme, et rien de plus. */
const MIRROR_CARD_SELECT = {
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
    select: MIRROR_CARD_SELECT,
  });

  const lost: MirrorSearchLimitation[] = [];
  if (filters.tag.length > 0) lost.push("tags");
  if (!["TITLE_ROMAJI", "START_DATE", "SCORE"].includes(filters.sort)) {
    lost.push("sort");
  }

  return {
    items: rows.map(compactFromMirror),
    total,
    page: current,
    pageCount,
    lost,
  };
}
