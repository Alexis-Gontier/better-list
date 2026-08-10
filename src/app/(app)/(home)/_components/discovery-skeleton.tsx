import { DiscoverySectionSkeleton } from "@/app/(app)/(home)/_components/discovery-section";

/**
 * Deux rangées et non cinq : le squelette n'a à couvrir que ce qu'on voit pendant le chargement.
 *
 * Sur l'accueil, ces rangées arrivent **sous** le suivi, donc déjà à demi hors de l'écran. En
 * dessiner cinq allongerait la page de deux écrans que personne ne regarde, et ferait sauter la
 * barre de défilement à l'arrivée des données.
 */
export function DiscoverySkeleton() {
  return (
    <>
      <DiscoverySectionSkeleton count={12} />
      <DiscoverySectionSkeleton count={6} />
    </>
  );
}
