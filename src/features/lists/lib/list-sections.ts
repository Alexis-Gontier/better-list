import type { ListKind } from "@/features/lists/schemas/lists.schema";
import type { MediaStatus } from "@/features/media/schemas/media.schema";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

/**
 * Répartir les œuvres d'une liste selon son genre (D47).
 *
 * **Un seul ordre** : les sections filtrent l'ordre de la liste sans le changer, et chaque œuvre
 * garde son rang dans la liste entière. Réorganiser garde donc son sens quel que soit le genre.
 *
 * Fonction pure : la page, la carte de `/lists` et la page partagée la partagent, et c'est ici que
 * vivent les cas qui se trompent en silence — une œuvre annulée, un abandon pris pour une lecture.
 */

export type SectionKey =
  | "all"
  | "top"
  | "contenders"
  | "todo"
  | "ready"
  | "releasing"
  | "seen";

export type SectionInput<T> = {
  item: T;
  mediaStatus: MediaStatus | null;
  /** Mon suivi. `null` hors bibliothèque, et partout sur la page partagée. */
  entryStatus: EntryStatus | null;
};

export type ListSection<T> = {
  key: SectionKey;
  label: string | null;
  collapsed: boolean;
  items: { item: T; rank: number }[];
};

/**
 * Une œuvre annulée n'aura pas de suite : elle est aussi prête à lire qu'une œuvre terminée.
 * Exportée pour que l'affichage, les actions et l'annonce Discord partagent la même définition.
 */
export const READY_MEDIA_STATUSES = [
  "FINISHED",
  "CANCELLED",
] as const satisfies readonly MediaStatus[];
const READY_STATUSES: ReadonlySet<MediaStatus> = new Set(READY_MEDIA_STATUSES);

/** Seul « terminé » vaut vu : en pratique, un abandon veut souvent dire « en attendant la fin ». */
const isSeen = (status: EntryStatus | null) => status === "COMPLETED";
const isReady = (status: MediaStatus | null) =>
  status !== null && READY_STATUSES.has(status);

export function listSections<T>(
  kind: ListKind,
  cutoff: number | null,
  inputs: SectionInput<T>[],
): ListSection<T>[] {
  const ranked = inputs.map((input, index) => ({ ...input, rank: index + 1 }));

  const section = (
    key: SectionKey,
    label: string | null,
    keep: (entry: (typeof ranked)[number]) => boolean,
    collapsed = false,
  ): ListSection<T> => ({
    key,
    label,
    collapsed,
    items: ranked.filter(keep).map(({ item, rank }) => ({ item, rank })),
  });

  const sections = ((): ListSection<T>[] => {
    switch (kind) {
      case "RANKING":
        return cutoff !== null && ranked.length > cutoff
          ? [
              section("top", `Top ${cutoff}`, ({ rank }) => rank <= cutoff),
              section("contenders", "Prétendants", ({ rank }) => rank > cutoff),
            ]
          : [section("all", null, () => true)];
      case "WATCHLIST":
        return [
          section("todo", "À voir", (e) => !isSeen(e.entryStatus)),
          section("seen", "Déjà vues", (e) => isSeen(e.entryStatus), true),
        ];
      case "WAIT_FOR_END":
        return [
          section(
            "ready",
            "Prêtes",
            (e) => !isSeen(e.entryStatus) && isReady(e.mediaStatus),
          ),
          section(
            "releasing",
            "En parution",
            (e) => !isSeen(e.entryStatus) && !isReady(e.mediaStatus),
          ),
          section("seen", "Déjà vues", (e) => isSeen(e.entryStatus), true),
        ];
      default:
        return [section("all", null, () => true)];
    }
  })();

  // Une section vide n'a rien à annoncer.
  return sections.filter(({ items }) => items.length > 0);
}

/**
 * La barre de progression d'une file ou d'une attente, ou `null` pour les genres qui n'en ont pas.
 *
 * Une file avance par ce qu'on a vu ; une attente, par ce qui est prêt parmi ce qu'il reste à lire.
 */
export function listProgress(
  kind: ListKind,
  { total, ready, seen }: { total: number; ready: number; seen: number },
): { ratio: number; label: string } | null {
  if (total === 0) return null;
  if (kind === "WATCHLIST") {
    return { ratio: seen / total, label: `${seen} sur ${total} vues` };
  }
  if (kind === "WAIT_FOR_END") {
    const left = total - seen;
    return left === 0
      ? null
      : { ratio: ready / left, label: `${ready} sur ${left} prêtes` };
  }
  return null;
}

/** Ce que la ligne de décompte annonce : les prêtes et les vues, hors œuvres déjà vues pour les premières. */
export function sectionCounts(sections: ListSection<unknown>[]) {
  const count = (key: SectionKey) =>
    sections.find((section) => section.key === key)?.items.length ?? 0;
  return { ready: count("ready"), seen: count("seen") };
}
