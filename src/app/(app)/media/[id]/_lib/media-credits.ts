import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Qui signe l'œuvre — la cinquième colonne de la ligne de faits de la fiche.
 *
 * **Le libellé change avec le type, parce que la donnée n'existe pas des deux côtés.** AniList
 * renseigne `studios` sur les animes et le laisse vide sur les mangas, pour lesquels il ne fournit
 * **aucun éditeur** (docs/PRODUCT.md §9). Afficher « Éditeur » reviendrait donc à promettre une
 * colonne vide sur toute la moitié manga du catalogue. L'auteur, lui, est toujours au staff.
 *
 * Fonction pure, testée (`media-credits.test.ts`), et posée dans le `_lib/` de la route : elle n'a
 * qu'un consommateur, et on ne promeut qu'au deuxième appelant (docs/ARCHITECTURE.md).
 */

/** Ce que la fonction lit de la fiche, et rien de plus — pour que le test tienne en trois lignes. */
export type CreditSource = Pick<MediaDetail, "type" | "studios" | "staff">;

export type MediaCredit = {
  label: string;
  value: string;
};

/**
 * Les rôles qui désignent l'auteur chez AniList : « Story & Art », mais aussi « Story » et « Art »
 * séparés quand deux personnes se partagent la série. Le libellé est en anglais côté API, quel que
 * soit le compte qui interroge.
 */
const AUTHOR_ROLE = /story|art/i;

export function mediaCredit(media: CreditSource): MediaCredit | null {
  if (media.type === "ANIME") {
    const studios = media.studios.edges;
    // Une œuvre en crédite plusieurs — le producteur, le distributeur — et un seul l'a animée.
    const main = studios.find((edge) => edge.isMain) ?? studios[0];

    return main ? { label: "Studio", value: main.node.name } : null;
  }

  // Un nom absent est ignoré plutôt que rendu : une colonne vide se lit comme une donnée perdue.
  const credits = media.staff.edges.filter((edge) => edge.node.name.full);
  const author =
    credits.find((edge) => edge.role && AUTHOR_ROLE.test(edge.role)) ??
    credits[0];

  // `full` est non nul par construction du filtre ci-dessus, mais le type l'ignore.
  return author?.node.name.full
    ? { label: "Auteur", value: author.node.name.full }
    : null;
}
