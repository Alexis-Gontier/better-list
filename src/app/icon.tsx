import { brandTile } from "@/app/_lib/brand-tile";

/**
 * L'icône d'onglet, **dessinée par le code plutôt que déposée en binaire**.
 *
 * Un `.ico` dans `public/` aurait fait l'affaire, mais il faudrait un outil hors du dépôt pour le
 * produire et un autre pour le relire : personne ne sait ce que contient un favicon avant de
 * l'ouvrir. Ici la couleur et le tracé sont dans le dépôt, versionnés, modifiables en une ligne et
 * relisibles en diff — et Next met le résultat en cache, donc ça ne coûte rien à l'exécution.
 *
 * Le BL-signet vient de `components/layout/logo.tsx`, **la seule géométrie du dépôt** : l'onglet et
 * l'en-tête ne peuvent pas se désaccorder. La tuile et ses couleurs sont dans `_lib/brand-tile.tsx`,
 * partagées avec `apple-icon.tsx`.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  // 7 px sur 32 : l'arrondi d'une tuile d'app, sans aller jusqu'à la pastille.
  return brandTile({ size, radius: 7 });
}
