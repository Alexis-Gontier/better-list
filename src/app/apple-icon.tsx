import { brandTile } from "@/app/_lib/brand-tile";

/**
 * L'icône d'écran d'accueil iOS — ce qu'on voit quand un membre du cercle ajoute l'app depuis Safari.
 *
 * **Sans arrondi** : iOS applique lui-même son masque de coins. Une tuile déjà arrondie y laisserait
 * des coins transparents, que le système remplit en noir.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandTile({ size, radius: 0 });
}
