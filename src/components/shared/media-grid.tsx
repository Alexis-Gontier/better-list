import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * La grille de vignettes, et son squelette.
 *
 * Les deux vivent dans le **même fichier** pour une raison précise : c'est la seule façon de
 * garantir qu'ils ne divergent pas. Une grille en six colonnes et un squelette resté en cinq
 * produiraient un décalage à chaque fin de chargement — le défaut que le squelette est justement là
 * pour éviter.
 *
 * Aucune notion de métier ici : la grille ne sait pas ce qu'elle range. D'où `shared/` et non
 * `features/media/` — la recherche y met des résultats AniList, la bibliothèque des œuvres suivies.
 */

/**
 * **Chaque palier divise `CATALOGUE_PAGE_SIZE`, et c'est la contrainte qui les a choisis.**
 *
 * Une page de 24 dans une grille à 5 colonnes se termine par une rangée de 4 ; une page de 20 dans
 * une grille à 6 se termine par une rangée de 2. Ce trou en bas d'écran se lit comme un défaut de
 * chargement — on croit qu'il manque des résultats. Les seuls diviseurs de 24 qui donnent une
 * vignette lisible sont donc 2, 3, 4 et 6, et il n'y a pas de palier au-delà : le `main` de
 * l'application est plafonné à `max-w-6xl`, où six colonnes font déjà des jaquettes de ~170 px.
 *
 * Deux colonnes sur mobile et non trois : la carte porte des pastilles (note, 18+) et un bouton de
 * progression, qui deviennent illisibles sous ~150 px de large.
 */
const GRID =
  "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

export function MediaGrid({ children }: { children: ReactNode }) {
  return <ul className={GRID}>{children}</ul>;
}

export function MediaGridSkeleton({ count }: { count: number }) {
  return (
    <ul className={GRID}>
      {Array.from({ length: count }, (_, index) => index).map((index) => (
        <li className="space-y-2" key={index}>
          <Skeleton className="aspect-2/3 w-full rounded-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-16" />
        </li>
      ))}
    </ul>
  );
}

/**
 * La liste dense — même contenu, une ligne par œuvre.
 *
 * Elle n'est pas une variante décorative de la grille : au-delà de quelques dizaines de titres, une
 * jaquette n'aide plus à retrouver une œuvre dont on connaît le nom, alors qu'une ligne montre
 * titre, statut, progression et note **sur le même axe de lecture**, comparables d'une ligne à
 * l'autre. La grille sert à parcourir, la liste à retrouver.
 *
 * Le `divide-y` plutôt qu'un espacement : à cette densité, la séparation doit être une règle fine,
 * pas du vide — sinon les colonnes de droite (progression, note) cessent de se lire en colonne.
 *
 * **Elle n'a pas de squelette**, contrairement à la grille, et c'est délibéré : les deux pages
 * transmettent `searchParams` sans l'attendre, donc elles ne connaissent pas la disposition
 * demandée au moment de rendre le repli d'un `<Suspense>`. Un squelette de liste ne serait jamais
 * choisi — le laisser là ferait croire au lecteur suivant qu'il l'est.
 */
const LIST = "divide-y divide-border/60 rounded-lg border";

export function MediaList({ children }: { children: ReactNode }) {
  return <ul className={LIST}>{children}</ul>;
}
