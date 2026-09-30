import { mirroredTitle } from "@/features/media/lib/media-format";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * Les favoris d'un membre, rangés comme AniList les montre : anime, manga, personnages, staff.
 *
 * Pure et testée à part : la lecture (`favorites.queries.ts`) ne fait que ramener les lignes dans
 * l'ordre voulu, et c'est ici que se décide dans quel bloc chacune tombe. L'ordre reçu est gardé
 * tel quel — c'est la requête qui trie, les plus récents d'abord.
 */

export type FavoriteRow = {
  kind: "MEDIA" | "CHARACTER" | "STAFF";
  anilistId: number;
  name: string | null;
  image: string | null;
  media: {
    type: "ANIME" | "MANGA";
    titleRomaji: string | null;
    titleEnglish: string | null;
    titleNative: string | null;
    coverImage: string | null;
  } | null;
};

/** Une vignette du profil : de quoi afficher une image, un nom, et construire le lien. */
export type FavoriteTile = { id: number; name: string; image: string | null };

export type FavoriteGroups = {
  anime: FavoriteTile[];
  manga: FavoriteTile[];
  characters: FavoriteTile[];
  staff: FavoriteTile[];
};

export function groupFavorites(
  rows: FavoriteRow[],
  titleLanguage: TitleLanguage,
): FavoriteGroups {
  const groups: FavoriteGroups = {
    anime: [],
    manga: [],
    characters: [],
    staff: [],
  };

  for (const row of rows) {
    if (row.kind === "MEDIA") {
      // Une clé étrangère en cascade rend le cas impossible en base ; on le traite quand même
      // plutôt que d'afficher une vignette sans titre.
      if (!row.media) continue;

      const tile = {
        id: row.anilistId,
        name: mirroredTitle(row.media, titleLanguage),
        image: row.media.coverImage,
      };
      (row.media.type === "ANIME" ? groups.anime : groups.manga).push(tile);
      continue;
    }

    const tile = {
      id: row.anilistId,
      name: row.name ?? "Sans nom",
      image: row.image,
    };
    (row.kind === "CHARACTER" ? groups.characters : groups.staff).push(tile);
  }

  return groups;
}

export function isEmptyFavorites(groups: FavoriteGroups): boolean {
  return Object.values(groups).every((tiles) => tiles.length === 0);
}
