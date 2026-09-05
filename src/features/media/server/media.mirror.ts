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
 * Un échantillon du miroir, pour **voir des cartes** avant que la recherche n'en serve.
 *
 * Ce n'est pas la grille de résultats : elle lira AniList par `searchMedia` et honorera les
 * filtres. Celle-ci ne lit que la copie locale et ignore tout ce qui est dans l'URL — son seul
 * rôle est de mettre de vraies jaquettes et de vrais titres sous les yeux pendant qu'on dessine la
 * carte. **Elle disparaît avec la vraie grille**, et c'est le seul appelant qui la garde en vie.
 *
 * De vraies données plutôt que des rectangles gris : c'est la longueur réelle des titres qui casse
 * une carte, pas une maquette où ils font tous deux mots.
 *
 * `includeAdult` est appliqué **dans la requête**, jamais par un masque d'affichage — la règle vaut
 * ici comme ailleurs (docs/recherche-filtres.md §2.5).
 */
export async function getMediaSampleFromMirror({
  take,
  includeAdult,
}: {
  take: number;
  includeAdult: boolean;
}): Promise<MediaCompact[]> {
  const rows = await prisma.media.findMany({
    take,
    where: includeAdult ? {} : { isAdult: false },
    // Les mieux notées d'abord : un échantillon pris au hasard tombe sur des œuvres sans jaquette
    // et sans titre anglais, ce qui donne une idée fausse de la carte.
    orderBy: [{ meanScore: "desc" }, { id: "asc" }],
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

  return rows.map(compactFromMirror);
}
