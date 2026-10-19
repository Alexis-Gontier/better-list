import type { ListKind } from "@/features/lists/schemas/lists.schema";

/** Le nom d'un genre, tel que le formulaire et les en-têtes le disent. */
export const LIST_KIND_LABELS: Record<ListKind, string> = {
  SELECTION: "Sélection",
  RANKING: "Classement",
  WATCHLIST: "À voir",
  WAIT_FOR_END: "Quand c'est fini",
};

/** Ce que le formulaire dit de chaque genre, sous son nom. */
export const LIST_KIND_HINTS: Record<ListKind, string> = {
  SELECTION: "Des œuvres, sans ordre.",
  RANKING: "L'ordre compte.",
  WATCHLIST: "Une file à vider.",
  WAIT_FOR_END: "J'attends la fin de parution.",
};

/** « Aucune œuvre » plutôt que « 0 œuvre » : un zéro se lit comme une panne de chargement. */
export function itemCountLabel(count: number): string {
  if (count === 0) return "Aucune œuvre";
  return count === 1 ? "1 œuvre" : `${count} œuvres`;
}

/**
 * L'en-tête d'une liste : son genre, puis son décompte. Le genre est omis quand le décompte le dit
 * déjà (« Top 10 ») ou qu'il n'apporte rien (« Sélection »).
 */
export function listHeadline(
  kind: ListKind,
  cutoff: number | null,
  countsLine: string,
): string {
  const implicit =
    kind === "SELECTION" ||
    (kind === "RANKING" && cutoff !== null && countsLine.startsWith("Top "));
  return implicit ? countsLine : `${LIST_KIND_LABELS[kind]} · ${countsLine}`;
}

/** Un intitulé de section avec son décompte, sauf pour le Top, dont l'intitulé porte déjà le chiffre. */
export function sectionHeading(
  key: string,
  label: string,
  count: number,
): string {
  return key === "top" ? label : `${label} (${count})`;
}

/** La ligne de décompte d'une liste, propre à son genre : sa carte et son en-tête la partagent. */
export function listCountsLine(
  kind: ListKind,
  cutoff: number | null,
  { total, ready, seen }: { total: number; ready: number; seen: number },
): string {
  if (total === 0) return itemCountLabel(0);

  switch (kind) {
    case "RANKING":
      return cutoff !== null
        ? `Top ${cutoff} · ${itemCountLabel(total)}`
        : itemCountLabel(total);
    case "WATCHLIST":
      // « 5 œuvres » et non « 5 à voir » : l'en-tête dit déjà « À voir · ».
      return seen === 0
        ? itemCountLabel(total)
        : `${seen} vue${seen > 1 ? "s" : ""} sur ${total}`;
    case "WAIT_FOR_END":
      if (ready === 0) return `Aucune prête sur ${total}`;
      return `${ready} prête${ready > 1 ? "s" : ""} sur ${total}`;
    default:
      return itemCountLabel(total);
  }
}
