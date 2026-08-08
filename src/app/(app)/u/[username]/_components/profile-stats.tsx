import Link from "next/link";

import { LOCALE } from "@/config/locale";
import { routes } from "@/config/routes";
import type { ScoreFormat } from "@/features/preferences/schemas/preferences.schema";
import type { getProfileStats } from "@/features/profile/server/profile.queries";
import {
  ENTRY_STATUS_LABELS,
  formatScore,
} from "@/features/tracking/lib/entry-format";
import {
  LIBRARY_STATUS_ORDER,
  serializeLibraryFilters,
} from "@/features/tracking/lib/library-params";

/**
 * Les chiffres du membre.
 *
 * **Épisodes et chapitres restent séparés** : les additionner donnerait un nombre qui ne veut rien
 * dire — un chapitre n'est pas un épisode. C'est la même raison qui fait que `Entry.progress` est un
 * curseur par œuvre et non un total (docs/PRODUCT.md §4.2).
 *
 * La répartition par statut n'est affichée que **chez soi** en lien vers la bibliothèque filtrée :
 * la bibliothèque d'un autre membre n'a pas encore d'écran, et un lien qui ramènerait à la sienne
 * propre serait un mensonge poli.
 */

type Stats = Awaited<ReturnType<typeof getProfileStats>>;

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="font-semibold text-lg tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

export function ProfileStats({
  stats,
  isSelf,
  scoreFormat,
}: {
  stats: Stats;
  isSelf: boolean;
  /**
   * L'échelle est celle **du visiteur**, pas celle du membre consulté : c'est une préférence de
   * lecture, et un chiffre doit se lire dans l'unité de qui le regarde.
   */
  scoreFormat: ScoreFormat;
}) {
  const count = (value: number) => value.toLocaleString(LOCALE);

  return (
    <section aria-labelledby="statistiques" className="space-y-3">
      <h2 className="font-semibold text-base" id="statistiques">
        En chiffres
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="œuvres suivies" value={count(stats.total)} />
        <Tile label="épisodes vus" value={count(stats.episodes)} />
        <Tile label="chapitres lus" value={count(stats.chapters)} />
        <Tile
          label="note moyenne"
          value={
            stats.averageScore === null
              ? "—"
              : formatScore(stats.averageScore, scoreFormat)
          }
        />
      </div>

      {/*
        La répartition par statut : une ligne de puces plutôt que quatre tuiles de plus. Un statut
        sans œuvre ne s'affiche pas — « 0 abandonné » n'est pas une information.
      */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-sm">
        {LIBRARY_STATUS_ORDER.filter((status) => stats.byStatus[status]).map(
          (status) => {
            const label = `${ENTRY_STATUS_LABELS[status]} · ${count(
              stats.byStatus[status] ?? 0,
            )}`;

            return (
              <li key={status}>
                {isSelf ? (
                  <Link
                    className="hover:text-foreground hover:underline"
                    href={serializeLibraryFilters(routes.library, {
                      status,
                      type: null,
                      sort: "recent",
                      page: 1,
                    })}
                  >
                    {label}
                  </Link>
                ) : (
                  label
                )}
              </li>
            );
          },
        )}
      </ul>
    </section>
  );
}
