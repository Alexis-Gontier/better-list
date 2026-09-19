import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
} from "nuqs/server";

/**
 * Paramètre d'URL de l'étagère — **source unique, client et serveur**.
 *
 * Même principe que `/library` et `/search` : les parseurs de `nuqs/server` sont isomorphes, la
 * rangée de filtres écrit l'adresse et la page la relit. Un décodage maison divergerait au premier
 * changement.
 *
 * Il n'y a **qu'un** paramètre, et c'est délibéré. La question de l'écran est « il me manque
 * lesquels ? » (docs/PRODUCT.md §8 item 8) : « incomplètes » est la réponse à cette question, pas
 * une facette parmi d'autres. Un tri, un type, une recherche viendront s'il manquent — pas
 * d'avance.
 *
 * Il vit dans `features/collection/lib/` et non dans le `_lib/` de la route, pour la même raison
 * que `library-params.ts` vit dans `features/tracking/lib/` : **la lecture le consomme aussi.**
 * `getShelf` prend un `CollectionState`, et un contrat d'URL dont le serveur dépend ne peut pas
 * rester privé à une route — ce serait `features/` qui importerait `app/`, à contresens
 * d'ARCHITECTURE.md.
 */

/**
 * Les trois états d'une série vis-à-vis de son édition, dans l'ordre où on les parcourt.
 *
 * « Toutes » d'abord parce que c'est l'étagère ; « Incomplètes » juste après parce que c'est la
 * raison d'être de l'écran.
 */
export const COLLECTION_STATE_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "incomplete", label: "Incomplètes" },
  { value: "complete", label: "Complètes" },
] as const;

export type CollectionState =
  (typeof COLLECTION_STATE_OPTIONS)[number]["value"];

const STATE_VALUES = COLLECTION_STATE_OPTIONS.map((option) => option.value);

export const collectionFilterParsers = {
  /**
   * `all` par défaut, donc **omis de l'adresse** : `/collection` tout court est l'étagère entière.
   *
   * Les valeurs sont closes par `parseAsStringLiteral` — un état inventé dans l'URL retombe sur
   * « toutes » plutôt que de vider l'écran sans rien dire.
   */
  state: parseAsStringLiteral(STATE_VALUES).withDefault("all"),
};

/** Lecture du filtre depuis les `searchParams` d'une page. */
export const loadCollectionFilters = createLoader(collectionFilterParsers);

/**
 * Construction d'une URL d'étagère. Bâtir l'adresse avec les parseurs qui la reliront garantit
 * l'aller-retour et omet la valeur par défaut.
 */
export const serializeCollectionFilters = createSerializer(
  collectionFilterParsers,
);

/** Ce que `loadCollectionFilters` renvoie — le filtre décodé d'une URL. */
export type CollectionFilterValues = Awaited<
  ReturnType<typeof loadCollectionFilters>
>;
