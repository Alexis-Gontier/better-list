import {
  type LibraryFilterValues,
  resolveLibraryDirection,
} from "@/features/tracking/lib/library-params";

/**
 * Les morceaux du `where` et de l'`orderBy` de ma bibliothèque — **des objets, pas des requêtes.**
 *
 * Ils vivent hors de `server/library.queries.ts` pour une seule raison : être testés sans base.
 * Ce sont eux qui portent les règles qu'on peut casser sans erreur de compilation — le 18+ qui
 * saute, une pagination sans ordre total —, et c'est donc eux qu'on vérifie.
 */

/**
 * Les conditions qui portent sur l'œuvre plutôt que sur mon suivi.
 *
 * Elles sont rassemblées en un seul objet et pas empilées au fur et à mesure : `media` est une
 * clé unique du `where`, et deux `media: {…}` écrits à la suite dans un littéral se remplacent
 * silencieusement. C'est exactement comme ça qu'on perd le filtre 18+ en ajoutant une facette de
 * plus — sans erreur de compilation, et sans que rien ne se voie à la relecture.
 *
 * **`includeAdult` est appliqué dans la requête**, jamais par un masque d'affichage : la règle vaut
 * ici comme sur la fiche et sur la recherche (docs/recherche-filtres.md §2.5). Une ligne écartée à
 * l'affichage a quand même traversé le réseau, fausse les décomptes et compte dans la pagination.
 */
export function mediaConditions({
  filters,
  includeAdult,
}: {
  filters: Pick<LibraryFilterValues, "q" | "type" | "adult">;
  includeAdult: boolean;
}) {
  const media: Record<string, unknown> = {};

  /*
    La préférence d'abord, et sans elle le filtre n'est pas lu : la barre ne l'affiche pas, et un
    `adult=only` resté dans une URL ne doit pas ouvrir ce que les réglages ferment.
  */
  if (!includeAdult) media.isAdult = false;
  else if (filters.adult) media.isAdult = filters.adult === "only";

  if (filters.type) media.type = filters.type;

  /*
    Le terme cherche dans **tous** les titres du miroir — les trois langues et les synonymes —,
    c'est-à-dire là où cherche AniList : on tape « Attack on Titan », « Shingeki » ou « SNK » selon
    l'humeur. `insensitive` parce qu'on ne capitalise pas une recherche, et `contains` parce qu'on
    tape un morceau du titre — jamais son début.

    Il ne part jamais chez AniList : c'est ce qui rend la saisie à la volée acceptable ici alors
    qu'elle est anti-rebondie sur le catalogue.
  */
  const term = filters.q.trim();
  if (term) {
    media.OR = [
      { titleRomaji: { contains: term, mode: "insensitive" } },
      { titleEnglish: { contains: term, mode: "insensitive" } },
      { titleNative: { contains: term, mode: "insensitive" } },
      { synonyms: { contains: term, mode: "insensitive" } },
    ];
  }

  return Object.keys(media).length > 0 ? { media } : {};
}

type Order = "asc" | "desc";

/** Une colonne nullable : les vides **toujours à la fin**, quel que soit le sens. */
const nullsLast = (sort: Order) => ({ sort, nulls: "last" as const });

/**
 * Le tri, traduit en `orderBy`.
 *
 * **Tout tri finit par l'activité récente puis par l'id** : sans ce départage, deux œuvres de même
 * note ou de même année changeraient d'ordre d'une page à l'autre, et un résultat pourrait
 * apparaître deux fois — ou jamais. **Une pagination sans ordre total est une pagination qui perd
 * des lignes.** Le départage ne suit pas le sens choisi : il n'est pas la question posée.
 *
 * `nulls: "last"` sur toute colonne qui peut manquer : « pas encore noté » n'est pas zéro
 * (docs/PRODUCT.md §4.2), et une œuvre jamais commencée n'a pas commencé « il y a très longtemps ».
 * Les remonter en tête quand on renverse le sens serait le contraire de la question posée.
 *
 * Le tri par titre suit le romaji et **pas encore `titleLanguage`** : c'est le manque relevé au
 * §1.10 de docs/recherche-filtres.md, et il vaut ici aussi. L'ordre alphabétique lui-même — la
 * casse et les accents à leur place — vient de la collation ICU des colonnes de titre (migration
 * `20261011130000_title_collation`), pas d'une option de tri : Prisma n'en a pas.
 */
export function libraryOrderBy(
  filters: Pick<LibraryFilterValues, "sort" | "dir" | "type">,
) {
  const order: Order =
    resolveLibraryDirection(filters.sort, filters.dir) === "ASC"
      ? "asc"
      : "desc";
  const tieBreak = [{ updatedAt: "desc" as const }, { id: "asc" as const }];

  switch (filters.sort) {
    case "added":
      return [{ createdAt: order }, { id: "asc" as const }];
    case "title":
      return [{ media: { titleRomaji: nullsLast(order) } }, ...tieBreak];
    case "score":
      return [{ score: nullsLast(order) }, ...tieBreak];
    case "progress":
      return [{ progress: order }, ...tieBreak];
    case "started":
      return [{ startedAt: nullsLast(order) }, ...tieBreak];
    case "finished":
      return [{ finishedAt: nullsLast(order) }, ...tieBreak];
    case "year":
      return [{ media: { seasonYear: nullsLast(order) } }, ...tieBreak];
    case "length":
      /*
        Épisodes pour un anime, chapitres pour un manga. Quand le type est posé, une seule colonne
        a du sens. Sans type, Prisma ne sait pas trier sur « l'une ou l'autre » : les animes
        passent d'abord, classés par épisodes, puis les mangas par chapitres — chacun a l'autre
        colonne vide, que `nulls: "last"` renvoie derrière.
      */
      if (filters.type === "ANIME")
        return [{ media: { episodes: nullsLast(order) } }, ...tieBreak];
      if (filters.type === "MANGA")
        return [{ media: { chapters: nullsLast(order) } }, ...tieBreak];
      return [
        { media: { episodes: nullsLast(order) } },
        { media: { chapters: nullsLast(order) } },
        ...tieBreak,
      ];
    default:
      // L'index `[userId, updatedAt]` existe pour celui-ci : c'est la question que la bibliothèque
      // pose d'abord — « où j'en étais déjà ? ».
      return [{ updatedAt: order }, { id: "asc" as const }];
  }
}
