import { formatRelationType } from "@/features/media/lib/media-format";
import type {
  MediaCompact,
  MediaDetail,
} from "@/features/media/schemas/media.schema";

/**
 * Ce que la fiche cite : les œuvres liées, groupées, et les rapprochements de la communauté.
 *
 * **Le calcul est ici et pas dans les composants**, pour une raison de mise en page : l'onglet
 * « Œuvres liées » ne doit exister que s'il a quelque chose à montrer, et on ne peut pas le savoir
 * en laissant chaque composant décider dans son coin — un rendu ne se sonde pas. La page appelle
 * donc une fois, décide de l'onglet, et passe le résultat aux deux composants, qui n'ont plus qu'à
 * l'afficher.
 *
 * Fonction pure et testée (`media-related.test.ts`), dans le `_lib/` de la route : un seul
 * appelant, donc pas de promotion (docs/ARCHITECTURE.md).
 */

/**
 * L'ordre des groupes, et il n'est pas alphabétique.
 *
 * Il suit la question qu'on se pose en arrivant ici : *par quoi je commence, et qu'est-ce qui vient
 * après ?* D'où l'œuvre d'origine puis l'adaptation en tête, la chronologie ensuite, et les
 * satellites — spin-offs, résumés, compilations — à la fin. Un tri par nom mettrait « Autre » en
 * deuxième position.
 *
 * C'est la première pierre de l'ordre de visionnage d'une franchise (docs/PRODUCT.md §8) : la
 * matière est ici, il ne lui manque qu'un calcul.
 */
const RELATION_ORDER = [
  "SOURCE",
  "ADAPTATION",
  "PREQUEL",
  "SEQUEL",
  "PARENT",
  "SIDE_STORY",
  "SPIN_OFF",
  "ALTERNATIVE",
  "CHARACTER",
  "SUMMARY",
  "COMPILATION",
  "CONTAINS",
  "OTHER",
];

export type RelationGroup = {
  label: string;
  items: MediaCompact[];
};

export type RelatedMedia = {
  groups: RelationGroup[];
  recommendations: MediaCompact[];
};

/** Ce que la fonction lit de la fiche, et rien de plus — pour que le test tienne en dix lignes. */
export type RelatedSource = Pick<MediaDetail, "relations" | "recommendations">;

/**
 * **Le filtre adulte se réapplique ici**, et c'est le point important de ce module.
 *
 * L'œuvre demandée est passée par `isAdult` côté requête, mais ses relations et ses
 * recommandations, non : un anime tout public peut pointer vers une adaptation classée adulte, et
 * AniList la renvoie sans se demander qui regarde. Le réglage du compte (docs/PRODUCT.md §4.6)
 * serait sans effet précisément là où il compte.
 */
export function relatedMedia(
  media: RelatedSource,
  includeAdult: boolean,
): RelatedMedia {
  const allowed = (item: MediaCompact) => includeAdult || !item.isAdult;

  const byRelation = new Map<string, MediaCompact[]>();

  for (const edge of media.relations.edges) {
    // Un lien sans nature n'a pas de groupe où aller, et « Autre » serait une invention.
    if (!edge.relationType || !allowed(edge.node)) continue;

    const existing = byRelation.get(edge.relationType);
    if (existing) existing.push(edge.node);
    else byRelation.set(edge.relationType, [edge.node]);
  }

  const groups = [...byRelation.entries()]
    .sort(([a], [b]) => relationRank(a) - relationRank(b))
    .map(([relation, items]) => ({
      // `formatRelationType` ne rend `null` que sur une entrée nulle, déjà écartée plus haut.
      label: formatRelationType(relation) ?? relation,
      items,
    }));

  const recommendations = media.recommendations.nodes
    .map((node) => node.mediaRecommendation)
    // AniList renvoie des recommandations dont l'œuvre a été supprimée depuis : le nœud existe, la
    // cible est nulle. Le prédicat est explicite, sinon `item` resterait nullable pour le rendu.
    .filter((item): item is MediaCompact => item !== null && allowed(item));

  return { groups, recommendations };
}

/** Un lien qu'AniList vient d'inventer passe en dernier plutôt que de casser l'ordre. */
function relationRank(relation: string): number {
  const index = RELATION_ORDER.indexOf(relation);
  return index === -1 ? RELATION_ORDER.length : index;
}
