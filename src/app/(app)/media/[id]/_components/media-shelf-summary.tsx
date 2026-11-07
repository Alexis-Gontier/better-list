import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { getSeriesShelf } from "@/features/collection/server/collection.queries";

/**
 * Où j'en suis de la série en tomes (D70) : un résumé et la porte de `/collection/[id]`, où l'on
 * coche. Sans tome possédé, la porte seule — c'est souvent ici qu'on se décide à commencer.
 */
export async function MediaShelfSummary({ mediaId }: { mediaId: number }) {
  const shelf = await getSeriesShelf(mediaId);
  if (!shelf) return null;

  const owned = shelf.ownedCount;

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-xl">Ma collection</h2>
      {owned > 0 ? <p className="text-sm">{shelfSentence(shelf)}</p> : null}
      <Link
        className="w-fit text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
        href={routes.collection.detail(mediaId)}
      >
        {owned > 0 ? "Gérer ma collection" : "Ajouter à ma collection"}
      </Link>
    </section>
  );
}

type Shelf = NonNullable<Awaited<ReturnType<typeof getSeriesShelf>>>;

function shelfSentence(shelf: Shelf): string {
  const total = shelf.edition.volumesTotal;
  const count = `${shelf.ownedCount} ${shelf.ownedCount > 1 ? "tomes" : "tome"}`;

  // Sans total connu (série en cours, §9), seul le dernier tome possédé a un sens.
  if (total === null) return `${count}, jusqu'au tome ${shelf.lastOwned}`;
  if (shelf.isComplete) {
    return `${count} sur ${total} · ${shelf.isReleasing ? "à jour" : "complète"}`;
  }
  return `${count} sur ${total} · il manque ${shelf.missingLabel}`;
}

/** Le titre (28 px), la phrase et le lien (20 px chacun). */
export function MediaShelfSummarySkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-5 w-40" />
    </div>
  );
}
