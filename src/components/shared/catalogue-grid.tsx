import { Skeleton } from "@/components/ui/skeleton";
import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";

/**
 * La grille d'un catalogue — **la disposition seule, sans rien savoir de ce qu'elle range.**
 *
 * Elle a démarré dans le `page.tsx` de `/search` et a été promue ici le 6 septembre 2026, quand
 * `/library` a demandé la même : deuxième appelant, donc la règle de promotion d'ARCHITECTURE.md
 * s'applique. Elle atterrit dans `components/shared/` et pas dans `features/media/` parce qu'elle
 * ne connaît **aucune** entité — elle pose des colonnes autour de ses enfants, et ce sont ses
 * appelants qui décident si ce sont des œuvres, des entrées de suivi ou autre chose.
 *
 * C'est la fusion qui motivait toute la refonte : `/search` et `/library` étaient le même écran
 * écrit deux fois (docs/STATE.md), et une grille dupliquée est exactement l'endroit où les deux
 * recommencent à diverger.
 *
 * Composant **serveur** : il ne fait que poser des classes. Le rendre client embarquerait toute la
 * grille dans le bundle pour aucun interactif.
 */

/**
 * Les paliers de colonnes — **3 et 7, les deux seuls diviseurs utiles de 21**.
 *
 * `CATALOGUE_PAGE_SIZE` vaut trois rangées de sept (`config/catalogue.ts`), et une page dont la
 * taille n'est pas un multiple du nombre de colonnes se termine par une rangée incomplète. D'où le
 * saut direct de 3 à 7 : les paliers intermédiaires habituels — 4, 5, 6 — laisseraient tous un trou
 * en bas d'écran, qui se lit comme un chargement raté plutôt que comme une fin de page.
 *
 * `search-media.schema.test.ts` tient le lien entre les deux : il casse si l'un change sans
 * l'autre.
 */
const GRID_COLUMNS = "grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-7";

/**
 * Le dernier palier de `GRID_COLUMNS`, donc la taille d'une rangée sur un écran large.
 *
 * Exporté parce que c'est l'appelant qui sait quelles cartes sont au-dessus de la ligne de
 * flottaison, et donc lesquelles méritent un chargement prioritaire. La grille, elle, ne regarde
 * pas ses enfants.
 */
export const WIDEST_COLUMN_COUNT = 7;

export function CatalogueGrid({ children }: { children: React.ReactNode }) {
  return <div className={GRID_COLUMNS}>{children}</div>;
}

/**
 * Le squelette, **aux proportions exactes des cartes** : même grille, même rapport 2:3, même ligne
 * de titre. C'est ce qui évite que la page saute au remplacement — un squelette approximatif
 * déplace ce qu'il annonce.
 */
export function CatalogueGridSkeleton() {
  return (
    <CatalogueGrid>
      {SKELETON_KEYS.map((key) => (
        <div className="flex flex-col gap-2" key={key}>
          <Skeleton className="aspect-2/3 w-full rounded-md" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </CatalogueGrid>
  );
}

/**
 * Les clés du squelette, calculées une fois au module.
 *
 * Des identifiants plutôt que l'indice de boucle : le linter refuse l'indice, et il a raison même
 * ici — c'est le genre de code qu'on recopie ensuite sur une vraie liste, où l'indice comme clé
 * fait réutiliser l'état d'une carte par sa voisine au premier réordonnancement. Ces cases-ci ne
 * bougent jamais, donc autant que la forme soit celle qu'on veut voir imitée.
 */
const SKELETON_KEYS = Array.from(
  { length: CATALOGUE_PAGE_SIZE },
  (_, index) => `card-${index}`,
);
