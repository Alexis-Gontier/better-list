import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server";

/**
 * Le contrat d'URL des pages Personnage et Staff.
 *
 * Les onglets du staff sont **dans l'adresse**, comme ceux de la fiche (`media-tab-params.ts`) :
 * c'est le serveur qui décide quelle liste demander à AniList, et un lien peut pointer
 * directement les rôles d'équipe de quelqu'un. Valeurs en français sans accent, pour les URL.
 *
 * `onglet` n'a **pas** de défaut : sans lui, la page prend le premier onglet non vide, ce que le
 * parseur ne peut pas savoir.
 */
export const STAFF_TABS = ["doublage", "anime", "manga"] as const;
export type StaffTab = (typeof STAFF_TABS)[number];

export const STAFF_TAB_LABELS: Record<StaffTab, string> = {
  doublage: "Doublage",
  anime: "Anime",
  manga: "Manga",
};

const peopleParsers = {
  page: parseAsInteger.withDefault(1),
  onglet: parseAsStringLiteral(STAFF_TABS),
};

export const loadPeopleParams = createLoader(peopleParsers);
export const serializePeopleParams = createSerializer(peopleParsers);

/** `parseAsInteger` ne borne rien : `?page=-2` traverserait le parseur. */
export function toPage(page: number): number {
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
