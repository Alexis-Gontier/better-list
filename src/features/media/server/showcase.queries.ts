import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { mediaTitle } from "@/features/media/lib/media-format";
import {
  getMediaById,
  searchMedia,
} from "@/features/media/server/media.queries";
import { tryAniList } from "@/lib/http/anilist";

export type Showcase = {
  banner: { src: string; title: string } | null;
  covers: { id: number; src: string; title: string }[];
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

  const covers = (trending?.items ?? []).flatMap((media) => {
    const src = media.coverImage?.extraLarge ?? media.coverImage?.large;
    return src ? [{ id: media.id, src, title: mediaTitle(media.title) }] : [];
  });

  // La première tendance qui a une bannière : toutes n'en ont pas.
  for (const cover of covers.slice(0, 3)) {
    const media = await tryAniList(() =>
      getMediaById(cover.id, { includeAdult: false }),
    );
    // `null` : AniList est en panne, inutile d'essayer la suivante.
    if (media === null) break;
    if (media?.bannerImage) {
      return {
        banner: { src: media.bannerImage, title: cover.title },
        covers,
      };
    }
  }

  return { banner: null, covers };
});
