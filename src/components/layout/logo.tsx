/**
 * La marque de Better-List, **le BL-signet** : le monogramme d'origine — un « B » dont la hampe sert
 * aussi de verticale au « L » accolé, le pied prolongeant la barre du bas vers la gauche — dont le
 * pied **s'achève en queue d'aronde**, comme le ruban qu'on laisse dans un livre. C'est « là où tu
 * t'es arrêté » : la mémoire de visionnage, ce qui distingue l'app d'AniList.
 *
 * **Le 16 octobre 2026, le pied a été raccourci de 8 à 5 unités et taillé en signet**, décision
 * d'Alexis, après une exploration de huit pistes (B-signet à ruban vertical, tier list, étagère…)
 * qui a fini par revenir à cette silhouette-ci. Le kit et les pistes écartées sont dans
 * `docs/brand/`. Le pied plus court est un compromis assumé : le L se lit moins, mais le pied
 * n'est plus une barre qui traîne, c'est une languette — et à 5 unités, l'encoche de 2 en laisse
 * encore 3 de plein, assez pour qu'elle se voie à 32 px. **À 16 px elle se referme** : il reste un B.
 *
 * La lecture du B l'emporte sur celle du L depuis le retournement en miroir du 6 septembre 2026 :
 * la hampe est partagée, elle ne peut pas être à la fois la barre droite du B et la barre gauche du
 * L. C'est un arbitrage, pas un défaut à corriger, et il tombe du côté de la première lettre du nom.
 *
 * Le tracé est **exporté à part du composant** parce qu'il a plusieurs consommateurs qui ne rendent
 * pas du DOM de la même façon : ce `<svg>`, et les images dessinées par Satori (`app/icon.tsx`,
 * `app/apple-icon.tsx`, les cartes Open Graph et Discord). Deux copies de la géométrie
 * divergeraient au premier ajustement.
 *
 * Il tient sur une grille de 24 où **chaque trait fait exactement 4 unités** : les panses sont deux
 * demi-anneaux concentriques (rayons 7 et 3, centrés en (14,7) et (14,17)), la hampe occupe x 5→9,
 * le pied va de x 5 à x 0, et son bout est entaillé d'un chevron de 2 unités à 45° (0,20 → 2,22 →
 * 0,24). Le pincement à mi-hauteur — les deux cercles extérieurs se croisent en (18.899, 12) — est
 * ce qui empêche la forme de se lire comme un rectangle percé de deux trous.
 *
 * **La silhouette est collée à gauche de son carré de 24** (x 0 → 21), comme l'était le
 * monogramme : dans l'en-tête, le bout du signet s'aligne sur le bord de la colonne de texte au lieu
 * d'en être décollé de 3 unités. Ce qui doit être centré — les tuiles d'icône — se cadre sur
 * `logoWidth`, la largeur réelle, plutôt que sur le carré.
 *
 * Trois sous-tracés dans un seul `d`, refermés par `fill-rule="evenodd"` : la silhouette, puis les
 * deux contrepoinçons qui s'y soustraient.
 */
export const logoPath =
  "M14 0H5V20H0L2 22L0 24H14A7 7 0 0 0 18.899 12A7 7 0 0 0 14 0Z" +
  "M14 4H9V10H14A3 3 0 0 0 14 4Z" +
  "M14 14H9V20H14A3 3 0 0 0 14 14Z";

/**
 * La largeur de la silhouette dans la grille de 24 : de x 0 au flanc des panses (centre 14, rayon 7).
 * Pas le pincement (18.899) — les panses bombent au-delà, et une boîte cadrée dessus les rogne.
 */
export const logoWidth = 21;

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
