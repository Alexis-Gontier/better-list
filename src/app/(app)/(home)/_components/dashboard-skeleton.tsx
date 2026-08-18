import { MediaCarouselSkeleton } from "@/components/shared/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Attente de la part personnelle de l'accueil.
 *
 * Une rangée de vignettes et une rangée de cartes : les proportions des sections réelles, pour que
 * l'arrivée du contenu ne pousse pas la page. On ne dessine pas les trois sections — une
 * bibliothèque jeune n'en aura qu'une, et un squelette trop long ment plus qu'il n'aide.
 *
 * La première rangée est un squelette de **carrousel** depuis qu'« En cours » en est un : une grille
 * de six vignettes y laissait deux rangées d'écran que le contenu ne remplissait plus, donc un saut
 * de mise en page à chaque fin de chargement — exactement ce qu'un squelette existe pour éviter.
 *
 * Comme `Dashboard`, il rend des sections sœurs et non un conteneur : l'espacement appartient à la
 * page, sans quoi le squelette et son contenu ne se remplaceraient pas au même endroit.
 */
export function DashboardSkeleton() {
  return (
    <>
      <section className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <MediaCarouselSkeleton count={6} />
      </section>

      <section className="space-y-3">
        <Skeleton className="h-5 w-32" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton className="h-40 rounded-lg" key={index} />
          ))}
        </div>
      </section>
    </>
  );
}
