import { LibraryIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";

import { MediaGrid, MediaList } from "@/components/shared/media-grid";
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
import { MediaRow } from "@/features/media/components/media-row";
import {
  compactFromMirror,
  formatMediaFormat,
} from "@/features/media/lib/media-format";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { EntryCardActions } from "@/features/tracking/components/entry-card-actions";
import {
  ENTRY_STATUS_LABELS,
  formatEntryProgress,
  formatScore,
} from "@/features/tracking/lib/entry-format";
import {
  loadLibraryFilters,
  serializeLibraryFilters,
} from "@/features/tracking/lib/library-params";
import { getLibrary } from "@/features/tracking/server/tracking.queries";

/**
 * La grille — ou la liste — de la bibliothèque, rendue côté serveur.
 *
 * C'est lui qu'on suspend : il attend `searchParams` **et** la base. La page, elle, n'attend rien.
 *
 * Les filtres sont décodés par `loadLibraryFilters`, donc avec les parseurs que la barre de filtres
 * utilise pour écrire l'URL. Ils sont clos par construction (`parseAsStringLiteral`) : un statut
 * inventé dans l'adresse retombe sur « tous » et n'atteint jamais la requête.
 *
 * **Les deux dispositions montrent exactement les mêmes données** — même titre, même statut, même
 * progression, mêmes genres, même bouton « +1 ». Seul l'agencement change. Une information qui
 * n'existerait que dans l'une des deux ferait de la bascule un piège, et l'utilisateur finirait par
 * ne plus oser en changer.
 */
export async function LibraryResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = await loadLibraryFilters(searchParams);
  const { entries, total, currentPage, lastPage } = await getLibrary(filters);

  const search = filters.q.trim();

  if (entries.length === 0) {
    const filtered = Boolean(search || filters.status || filters.type);

    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {search ? <SearchXIcon /> : <LibraryIcon />}
          </EmptyMedia>
          <EmptyTitle>
            {search
              ? `Rien ne correspond à « ${search} »`
              : filtered
                ? "Rien sous ce filtre"
                : "Bibliothèque vide"}
          </EmptyTitle>
          <EmptyDescription>
            {/*
              Trois vides distincts, parce qu'ils appellent trois gestes différents : élargir la
              recherche, relâcher un filtre, ou commencer à suivre quelque chose. Un message unique
              enverrait les deux tiers des visiteurs vers la mauvaise sortie.
            */}
            {search
              ? "Cette recherche ne porte que sur les œuvres que vous suivez. Le titre est peut-être dans le catalogue."
              : filtered
                ? "Aucune œuvre suivie ne correspond. Essayez un autre statut."
                : "Les œuvres que vous suivez apparaîtront ici. Commencez par en chercher une."}
          </EmptyDescription>
        </EmptyHeader>

        {/* Un écran vide doit proposer la sortie, pas seulement la constater. */}
        <EmptyContent>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.search}>
              {search
                ? `Chercher « ${search} » dans le catalogue`
                : "Chercher une œuvre"}
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  /**
   * Un décompte à la fois exact et situé : « 3 œuvres pour « frieren » » confirme que le champ a
   * bien mordu, là où un « 3 œuvres » nu laisse croire à une bibliothèque de trois titres.
   */
  const summary = [
    `${total.toLocaleString("fr-FR")} ${total > 1 ? "œuvres" : "œuvre"}`,
    search ? `pour « ${search} »` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const items = entries.map((entry) => {
    const media = compactFromMirror(entry.media);
    const totalUnits = mediaTotalUnits(entry.media);

    return {
      key: entry.id,
      media,
      genres: entry.media.genres,
      progress: {
        value: entry.progress,
        total: totalUnits,
        label: formatEntryProgress(entry.progress, totalUnits),
      },
      score: entry.score === null ? null : formatScore(entry.score),
      /**
       * La vignette d'une bibliothèque ne redit pas le format et l'année — ça, c'est le travail de
       * la recherche. Ici la question est « où j'en étais ? », et la progression y répond
       * elle-même, sous la jaquette : la ligne de contexte n'a plus qu'à porter le statut, que rien
       * d'autre ne dit.
       */
      gridMeta: ENTRY_STATUS_LABELS[entry.status],
      /**
       * En liste, la progression a sa propre colonne : la répéter dans la ligne de méta la
       * dédoublerait à dix centimètres d'écart. La place libérée sert au format, qui devient
       * comparable d'une ligne à l'autre.
       */
      listMeta: [
        ENTRY_STATUS_LABELS[entry.status],
        formatMediaFormat(entry.media.format),
      ]
        .filter(Boolean)
        .join(" · "),
      action: (
        <EntryCardActions
          bannerImage={entry.media.bannerImage}
          entry={entry}
          media={media}
          total={totalUnits}
        />
      ),
    };
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{summary}</p>

      {filters.view === "list" ? (
        <MediaList>
          {items.map((item) => (
            <MediaRow
              action={item.action}
              genres={item.genres}
              key={item.key}
              media={item.media}
              meta={item.listMeta}
              progress={item.progress}
              score={item.score}
            />
          ))}
        </MediaList>
      ) : (
        <MediaGrid>
          {items.map((item) => (
            <li key={item.key}>
              <MediaCard
                action={item.action}
                media={item.media}
                meta={item.gridMeta}
                progress={item.progress}
                score={item.score}
              />
            </li>
          ))}
        </MediaGrid>
      )}

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
