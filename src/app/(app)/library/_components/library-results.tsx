import { LibraryIcon } from "lucide-react";
import Link from "next/link";

import { MediaGrid } from "@/components/shared/media-grid";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routes } from "@/config/routes";
import { MediaCard } from "@/features/media/components/media-card";
import { compactFromMirror } from "@/features/media/lib/media-format";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { EntryQuickProgress } from "@/features/tracking/components/entry-quick-progress";
import {
  ENTRY_STATUS_LABELS,
  formatEntryProgress,
} from "@/features/tracking/lib/entry-format";
import {
  loadLibraryFilters,
  serializeLibraryFilters,
} from "@/features/tracking/lib/library-params";
import { getLibrary } from "@/features/tracking/server/tracking.queries";

/**
 * La grille de la bibliothèque, rendue côté serveur.
 *
 * C'est lui qu'on suspend : il attend `searchParams` **et** la base. La page, elle, n'attend rien.
 *
 * Les filtres sont décodés par `loadLibraryFilters`, donc avec les parseurs que la barre de filtres
 * utilise pour écrire l'URL. Ils sont clos par construction (`parseAsStringLiteral`) : un statut
 * inventé dans l'adresse retombe sur « tous » et n'atteint jamais la requête.
 */
export async function LibraryResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = await loadLibraryFilters(searchParams);
  const { entries, total, currentPage, lastPage } = await getLibrary(filters);

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LibraryIcon />
          </EmptyMedia>
          <EmptyTitle>
            {filters.status || filters.type
              ? "Rien sous ce filtre"
              : "Bibliothèque vide"}
          </EmptyTitle>
          <EmptyDescription>
            {filters.status || filters.type
              ? "Aucune œuvre suivie ne correspond. Essayez un autre statut."
              : "Les œuvres que vous suivez apparaîtront ici. Commencez par en chercher une."}
          </EmptyDescription>
        </EmptyHeader>

        {/* Un écran vide doit proposer la sortie, pas seulement la constater. */}
        <EmptyContent>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.search}>Chercher une œuvre</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        {total.toLocaleString("fr-FR")} {total > 1 ? "œuvres" : "œuvre"}
      </p>

      <MediaGrid>
        {entries.map((entry) => (
          <li key={entry.id}>
            <MediaCard
              action={
                <EntryQuickProgress
                  mediaId={entry.media.id}
                  progress={entry.progress}
                  total={mediaTotalUnits(entry.media)}
                  unit={entry.media.type === "ANIME" ? "episode" : "chapitre"}
                />
              }
              media={compactFromMirror(entry.media)}
              /**
               * La vignette d'une bibliothèque ne redit pas le format et l'année — ça, c'est le
               * travail de la recherche. Ici la question est « où j'en étais ? », donc statut et
               * progression.
               */
              meta={[
                ENTRY_STATUS_LABELS[entry.status],
                formatEntryProgress(
                  entry.progress,
                  mediaTotalUnits(entry.media),
                ),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </li>
        ))}
      </MediaGrid>

      <Pagination
        currentPage={currentPage}
        hrefForPage={(page) =>
          serializeLibraryFilters(routes.library, { ...filters, page })
        }
        label="Pagination de la bibliothèque"
        lastPage={lastPage}
      />
    </div>
  );
}
