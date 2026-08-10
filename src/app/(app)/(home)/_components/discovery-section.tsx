import { DashboardSection } from "@/app/(app)/(home)/_components/dashboard-section";
import { MediaGrid, MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaCard } from "@/features/media/components/media-card";
import { formatMediaFormat } from "@/features/media/lib/media-format";
import type { MediaBrowse } from "@/features/media/schemas/media.schema";

/**
 * Une rangée de découverte : le catalogue AniList, éditorialisé.
 *
 * Elle vivait dans `/browse` ; la page a disparu et ses rangées sont descendues sur l'accueil, qui
 * est le seul endroit où l'on arrive sans savoir ce qu'on cherche (docs/PRODUCT.md §5).
 *
 * L'en-tête est celui du reste de la page (`DashboardSection`) et non le sien : ces rangées
 * cohabitent maintenant avec « En cours » et « Mes listes », et deux styles de titre sur le même
 * écran se liraient comme deux pages cousues.
 *
 * La section et son squelette vivent dans le **même fichier**, pour la raison qui a déjà fait
 * cohabiter `MediaGrid` et `MediaGridSkeleton` : c'est la seule façon de garantir qu'ils ne
 * divergent pas, et un squelette qui n'a pas la hauteur de la section décale la page à chaque fin
 * de chargement.
 */

/** Une rangée vide ne s'affiche pas du tout — même règle que les sections de suivi. */
export function DiscoverySection({
  title,
  description,
  media,
  href,
}: {
  title: string;
  description: string;
  media: MediaBrowse[];
  /**
   * Vers la recherche préfiltrée, quand elle sait exprimer le même ensemble.
   *
   * Volontairement facultatif : la recherche n'a pas de paramètre de saison, donc les rangées
   * saisonnières n'ont pas de « Tout voir ». Un lien qui perdrait le filtre en chemin serait pire
   * que pas de lien — il enverrait sur une page qui ne montre pas ce qu'on a cliqué.
   */
  href?: string;
}) {
  if (media.length === 0) return null;

  return (
    <DashboardSection description={description} href={href} title={title}>
      <MediaGrid>
        {media.map((item) => (
          <li key={item.id}>
            <MediaCard
              media={item}
              meta={[formatMediaFormat(item.format), item.seasonYear]
                .filter(Boolean)
                .join(" · ")}
            />
          </li>
        ))}
      </MediaGrid>
    </DashboardSection>
  );
}

export function DiscoverySectionSkeleton({ count }: { count: number }) {
  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <MediaGridSkeleton count={count} />
    </section>
  );
}
