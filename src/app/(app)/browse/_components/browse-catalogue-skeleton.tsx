import { BrowseSectionSkeleton } from "@/app/(app)/browse/_components/browse-section";

/**
 * Trois rangées et non cinq : le squelette n'a à couvrir que ce qu'on voit pendant le chargement. En
 * dessiner cinq allongerait la page d'un écran et demi que personne ne regarde, et ferait sauter la
 * barre de défilement à l'arrivée des données.
 */
export function BrowseCatalogueSkeleton() {
  return (
    <div className="space-y-10">
      <BrowseSectionSkeleton count={12} />
      <BrowseSectionSkeleton count={12} />
      <BrowseSectionSkeleton count={6} />
    </div>
  );
}
