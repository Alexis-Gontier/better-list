import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import type { FranchiseItem } from "@/features/media/lib/franchise-order";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { Franchise } from "@/features/media/server/franchise.queries";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { CatalogueMediaCard } from "@/features/tracking/components/catalogue-media-card";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";
import { cn } from "@/lib/utils";

/**
 * L'ordre de la franchise, **dans la grille d'« Œuvres liées »** : la fiche garde une seule forme de
 * carte pour ses deux onglets d'œuvres, et la grille se lit dans l'ordre de lecture. L'étiquette
 * sous la carte dit l'étape à la place du type de lien.
 */
export async function MediaFranchise({
  franchise,
  type,
  titleLanguage,
}: {
  franchise: Franchise;
  type: MediaCompact["type"];
  titleLanguage: TitleLanguage;
}) {
  const entries = await getLibraryEntriesFor(
    franchise.items.map((item) => item.media.id),
  );

  return (
    <MediaSection
      title={type === "ANIME" ? "Ordre de visionnage" : "Ordre de lecture"}
    >
      <ol className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-7">
        {franchise.items.map((item) => (
          <li className="flex min-w-0 flex-col gap-1" key={item.media.id}>
            <CatalogueMediaCard
              entry={entries.get(item.media.id) ?? null}
              media={item.media}
              titleLanguage={titleLanguage}
            />
            <p
              className={cn(
                "truncate text-[0.6875rem] font-medium tracking-[0.12em] uppercase",
                item.current ? "text-primary" : "text-muted-foreground",
              )}
              title={stepLabel(item)}
            >
              {stepLabel(item)}
            </p>
          </li>
        ))}
      </ol>
      {franchise.incomplete ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Liste incomplète : AniList n'a pas tout rendu. Réessayez dans une
          minute.
        </p>
      ) : franchise.truncated ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Franchise tronquée : seules les premières œuvres ont été parcourues.
        </p>
      ) : null}
    </MediaSection>
  );
}

function stepLabel(item: FranchiseItem): string {
  if (item.position === null) return "Facultatif";
  return item.current
    ? `N° ${item.position} · Vous êtes ici`
    : `N° ${item.position}`;
}
