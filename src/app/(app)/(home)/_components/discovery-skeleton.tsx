import { DiscoverySectionSkeleton } from "@/app/(app)/(home)/_components/discovery-section";

/**
 * Deux rangées et non quatre : le squelette n'a à couvrir que ce qu'on voit pendant le chargement.
 *
 * Sur l'accueil, ces rangées arrivent **sous** le suivi, donc déjà à demi hors de l'écran. En
 * dessiner quatre allongerait la page de deux écrans que personne ne regarde, et ferait sauter la
 * barre de défilement à l'arrivée des données.
 */

/**
 * Sept vignettes, et le même nombre pour les deux rangées.
 *
 * Depuis le passage au carrousel, une section fait **une** rangée quelle que soit sa longueur : les
 * douze et six d'avant dessinaient deux hauteurs différentes parce que la grille repliait, ce qui
 * n'a plus lieu. Sept est le premier compte qui remplit le palier le plus large (six vignettes et
 * demie) ; au-delà, on dessinerait des squelettes que le débordement masque, et en deçà la rangée
 * s'arrêterait avant le bord alors que la vraie continue.
 */
const VISIBLE_AT_WIDEST = 7;

export function DiscoverySkeleton() {
  return (
    <>
      <DiscoverySectionSkeleton count={VISIBLE_AT_WIDEST} />
      <DiscoverySectionSkeleton count={VISIBLE_AT_WIDEST} />
    </>
  );
}
