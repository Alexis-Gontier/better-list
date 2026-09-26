import * as z from "zod";

/**
 * Ce qui désigne une carte d'épisode : l'œuvre, le numéro, la langue du titre.
 *
 * Il vient d'une URL (`/api/og/episode/...`), donc de n'importe qui : tout est revalidé ici avant
 * de toucher la base. `NATIVE` n'est pas proposé — la police par défaut de `next/og` ne dessine ni
 * kana ni hangul, et un titre en carrés vides vaut moins que le même en romaji.
 */
export const episodeCardSchema = z.object({
  mediaId: z.coerce.number().int().positive(),
  episode: z.coerce.number().int().positive().max(9999),
  lang: z.enum(["ROMAJI", "ENGLISH"]),
});
export type EpisodeCard = z.infer<typeof episodeCardSchema>;
