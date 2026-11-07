import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { mediaTitle } from "@/features/media/lib/media-format";
import type { Media } from "@/features/media/schemas/media.schema";
import {
  getMediaById,
  searchMedia,
} from "@/features/media/server/media.queries";
import { tryAniList } from "@/lib/http/anilist";

export type Showcase = {
  banner: { src: string; title: string } | null;
  covers: { id: number; src: string; title: string }[];
  /** Les mêmes tendances, entières : la landing en tire ses fragments d'interface (D71). */
  media: Media[];
};

/**
 * La vitrine des pages d'entrée (landing et `/login`) : **une bannière et des jaquettes du moment**,
 * à la manière de Letterboxd.
 *
 * Aucune requête de plus au quota pour les jaquettes : ce sont exactement les paramètres de la
 * rangée « Tendances » de l'accueil sans contenu adulte, donc la même entrée de cache. La bannière
 * coûte une fiche par jour (`getMediaById`, `cacheLife("days")`).
 *
 * Lue à la requête, jamais au build (D52) ; une panne d'AniList rend une vitrine vide, pas une
 * erreur : ces pages doivent toujours s'afficher. `cache` de React : la bannière et la rangée la
 * demandent chacune, dans leur propre frontière.
 */
export const getShowcase = cache(async (): Promise<Showcase> => {
  await connection();

  const trending = await searchMedia({
    page: 1,
    perPage: 20,
    sortDirection: "DESC",
    includeAdult: false,
    type: "ANIME",
    sortField: "TRENDING",
  });

  const media = (trending?.items ?? []).filter(
    (item) => item.coverImage?.extraLarge ?? item.coverImage?.large,
  );
  const covers = media.flatMap((item) => {
    const src = item.coverImage?.extraLarge ?? item.coverImage?.large;
    return src ? [{ id: item.id, src, title: mediaTitle(item.title) }] : [];
  });

  // La première tendance qui a une bannière : toutes n'en ont pas.
  for (const cover of covers.slice(0, 3)) {
    const detail = await tryAniList(() =>
      getMediaById(cover.id, { includeAdult: false }),
    );
    // `null` : AniList est en panne, inutile d'essayer la suivante.
    if (detail === null) break;
    if (detail?.bannerImage) {
      return {
        banner: { src: detail.bannerImage, title: cover.title },
        covers,
        media,
      };
    }
  }

  return { banner: null, covers, media };
});
