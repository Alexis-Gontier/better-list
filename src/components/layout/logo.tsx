/**
 * Le monogramme de Better-List : un « B » majuscule — hampe à gauche, panses à droite — dont la
 * hampe sert aussi de verticale au « L » accolé. Le pied prolonge la barre du bas vers la gauche.
 * Deux lettres, un seul tracé.
 *
 * **Le tracé a été retourné en miroir le 6 septembre 2026**, décision d'Alexis. Il partait de
 * l'autre sens — hampe à droite, panses à gauche —, ce qui donnait un B renversé et un L à
 * l'endroit ; il donne maintenant l'inverse. Aucun des deux ne rend les deux lettres lisibles à la
 * fois : la hampe est partagée, donc elle ne peut pas être à la fois la barre droite du B et la
 * barre gauche du L. C'est un arbitrage entre les deux, pas un défaut à corriger, et il tombe
 * désormais du côté du B — la première lettre du nom, et celle qu'on lit en premier.
 *
 * Le tracé est **exporté à part du composant** parce qu'il a deux consommateurs qui ne rendent pas
 * du DOM de la même façon : ce `<svg>`, et `app/icon.tsx`, dessiné par Satori. Deux copies de la
 * géométrie divergeraient au premier ajustement — et c'est ce qui fait que ce retournement-ci n'a
 * demandé qu'une seule modification.
 *
 * Il tient sur une grille de 24 où **chaque trait fait exactement 4 unités** : les panses sont deux
 * demi-anneaux concentriques (rayons 7 et 3, centrés en (17,7) et (17,17)), la hampe occupe x 8→12,
 * le pied va de x 8 à x 0. Le pincement à mi-hauteur — les deux cercles extérieurs se croisent en
 * (21.899, 12) — est ce qui empêche la forme de se lire comme un rectangle percé de deux trous :
 * sans lui, il n'y a plus de taille de lettre, donc plus de B.
 *
 * Le miroir est une symétrie `x → 24 − x`, et **les drapeaux de balayage des arcs s'inversent avec**
 * (`1` → `0`) : une symétrie renverse le sens de parcours, et le seul oubli possible ici est de
 * laisser les arcs bomber du mauvais côté — la silhouette se referme quand même, mais les panses
 * rentrent dans la lettre au lieu d'en sortir.
 *
 * Trois sous-tracés dans un seul `d`, refermés par `fill-rule="evenodd"` : la silhouette, puis les
 * deux contrepoinçons qui s'y soustraient.
 */
export const logoPath =
  "M17 0H8V20H0V24H17A7 7 0 0 0 21.899 12A7 7 0 0 0 17 0Z" +
  "M17 4H12V10H17A3 3 0 0 0 17 4Z" +
  "M17 14H12V20H17A3 3 0 0 0 17 14Z";

/**
 * La marque est **décorative partout où elle est posée** : le nom du site l'accompagne à chaque
 * fois, et `aria-hidden` évite de faire annoncer deux fois la même chose.
 *
 * Dans l'en-tête, ce nom est en `sr-only` depuis le 6 septembre 2026 — il n'est plus affiché, mais
 * il est toujours là. **C'est la condition de cet `aria-hidden`** : un appelant qui poserait ce
 * logo seul, sans nom d'aucune sorte à côté, obtiendrait un élément invisible pour un lecteur
 * d'écran — et si c'est un lien ou un bouton, il serait annoncé vide.
 *
 * Pas de couleur en dur : `currentColor` la fait hériter du texte voisin, donc elle suit le thème
 * clair/sombre sans une ligne de CSS de plus.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={logoPath} fillRule="evenodd" />
    </svg>
  );
}
