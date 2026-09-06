import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/**
 * La pagination d'un catalogue — **des liens, comme la rangée de statuts de `/library`.**
 *
 * Chaque cran est une adresse : on peut l'ouvrir dans un onglet, l'envoyer, la mettre en favori. Un
 * bouton qui écrirait la même chose en JavaScript coûterait un îlot client pour un comportement que
 * le navigateur fait déjà. Composant **serveur**, donc, comme tout ce qui n'est pas interactif ici.
 *
 * Elle a démarré dans le `_components/` de `/library` et **a été promue ici quand `/search` a
 * paginé à son tour** : deuxième appelant, donc `components/shared/`. Elle rejoint la carte, la
 * grille et la coquille de filtres — la troisième pièce que les deux écrans se partagent au lieu de
 * l'écrire deux fois.
 *
 * **Elle ne connaît aucun contrat d'URL**, et c'est ce qui lui permet de vivre ici : elle reçoit
 * `hrefFor` et ne sait pas ce qu'il y a dans l'adresse qu'il fabrique. Chaque écran la bâtit avec
 * *ses* parseurs — `serializeSearchFilters` d'un côté, `serializeLibraryFilters` de l'autre —, donc
 * l'aller-retour est garanti par les mêmes modules qui reliront l'URL, et tous les autres filtres
 * sont conservés. Changer de page ne change que la page.
 */

type CataloguePaginationProps = {
  page: number;
  pageCount: number;
  /**
   * L'adresse d'un cran. **Elle reçoit toujours un numéro dans les bornes** : le serrage est fait
   * ici, pas chez l'appelant, pour qu'aucun écran n'ait à se souvenir de le refaire.
   */
  hrefFor: (page: number) => string;
};

export function CataloguePagination({
  page,
  pageCount,
  hrefFor,
}: CataloguePaginationProps) {
  // Une seule page n'a pas de pagination : afficher « 1 » tout seul sous la grille annoncerait un
  // découpage qui n'existe pas.
  if (pageCount <= 1) return null;

  /**
   * L'adresse d'un cran, **ramenée dans les bornes**.
   *
   * Sans ce serrage, « Précédent » sur la première page écrivait `?page=0` : la requête le
   * corrigeait bien à l'arrivée, mais l'adresse restait fausse — et un lien neutralisé reste
   * ouvrable par un raccourci du navigateur ou copiable par le menu contextuel. Une page qui
   * n'existe pas n'a pas à exister dans un `href`.
   */
  const boundedHref = (target: number) =>
    hrefFor(Math.min(Math.max(target, 1), pageCount));

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            {...boundProps(page === 1)}
            href={boundedHref(page - 1)}
            text="Précédent"
          />
        </PaginationItem>

        {pageWindow(page, pageCount).map((slot) =>
          typeof slot === "number" ? (
            <PaginationItem key={slot}>
              <PaginationLink href={boundedHref(slot)} isActive={slot === page}>
                {slot}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={slot}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            {...boundProps(page === pageCount)}
            href={boundedHref(page + 1)}
            text="Suivant"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/**
 * « Précédent » sur la première page : présent, éteint, et injoignable.
 *
 * Le retirer ferait sauter toute la rangée d'un demi-bouton vers la gauche au premier changement de
 * page — le seul endroit de l'écran qu'on est en train de regarder. Il reste donc en place, sorti
 * du parcours au clavier et du pointeur, et `aria-disabled` le dit à qui ne voit pas qu'il est pâle.
 */
function boundProps(atBound: boolean) {
  return atBound
    ? {
        "aria-disabled": true as const,
        className: cn("pointer-events-none opacity-50"),
        tabIndex: -1,
      }
    : {};
}

/** Un cran de la rangée : un numéro de page, ou l'ellipse qui en cache plusieurs. */
type PageSlot = number | "gap-start" | "gap-end";

/**
 * Les crans à afficher : les deux bouts, la page courante et ses voisines, des ellipses au milieu.
 *
 * Sur dix-neuf pages, les montrer toutes donne une rangée plus large que la grille et illisible.
 * Sept crans au plus suffisent à répondre aux deux questions qu'on se pose vraiment — « où suis-je »
 * et « combien reste-t-il ».
 *
 * **Une ellipse qui ne cache qu'une seule page est remplacée par cette page.** Elle occuperait
 * exactement la même largeur tout en donnant moins : autant afficher le numéro, qui est alors
 * cliquable.
 */
function pageWindow(page: number, pageCount: number): PageSlot[] {
  const anchors = [1, pageCount, page - 1, page, page + 1];
  const kept = [
    ...new Set(anchors.filter((value) => value >= 1 && value <= pageCount)),
  ].sort((a, b) => a - b);

  const slots: PageSlot[] = [];
  let previous: number | null = null;

  for (const value of kept) {
    if (previous !== null && value - previous > 1) {
      slots.push(
        value - previous === 2
          ? previous + 1
          : value <= page
            ? "gap-start"
            : "gap-end",
      );
    }

    slots.push(value);
    previous = value;
  }

  return slots;
}
