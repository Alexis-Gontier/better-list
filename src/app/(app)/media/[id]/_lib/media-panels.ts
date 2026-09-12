import type {
  MediaCompact,
  MediaDetail,
  MediaTag,
} from "@/features/media/schemas/media.schema";

/**
 * Ce que chaque onglet de la fiche a réellement à montrer.
 *
 * **Ces fonctions existent parce qu'une même question se pose deux fois** : le composant demande
 * *quoi afficher*, la page demande *y a-t-il quelque chose à afficher* — elle n'ouvre pas d'onglet
 * pour un panneau vide. Sans elles, la page aurait recopié le filtrage 18+ et le tri des
 * composants, et les deux copies auraient divergé au premier changement de règle.
 *
 * La tentation était de laisser la page regarder l'élément rendu (`const x = <Panel />` puis
 * `x ? …`). **Ça ne marche pas** : un élément React est un objet de description, toujours vrai, que
 * le composant soit destiné à renvoyer `null` ou non. Le rendu n'a pas encore eu lieu au moment où
 * la page décide.
 *
 * **Elles ne travaillent que sur la requête de fiche**, jamais sur les lectures par onglet : c'est
 * ce qui permet à la page de décider quels onglets ouvrir sans dépenser un crédit de quota pour le
 * savoir. Un échantillon vide vaut preuve que l'ensemble l'est aussi.
 *
 * Fonctions pures, dans le `_lib/` de la route : un seul écran les consomme
 * (docs/ARCHITECTURE.md).
 */

type RelationEdge = MediaDetail["relations"]["edges"][number];

/**
 * L'ordre d'importance des liens, du plus structurant au plus anecdotique.
 *
 * **C'est le seul jugement de valeur de ce fichier, et il est assumé.** AniList rend les relations
 * dans un ordre qui n'est ni chronologique ni hiérarchique ; sur One Piece, la suite de la série se
 * retrouvait entre deux courts-métrages promotionnels. Ce classement remet en tête ce qui répond à
 * la question qu'on se pose vraiment — *qu'est-ce que je regarde avant, qu'est-ce que je regarde
 * après* —, et repousse les liens qui n'engagent à rien : un personnage commun, une collaboration
 * publicitaire.
 *
 * Un type inconnu tombe en fin de liste sans disparaître. AniList étend cette énumération, et une
 * relation mal classée vaut mieux qu'une relation perdue.
 */
const RELATION_ORDER = [
  "SOURCE",
  "PREQUEL",
  "SEQUEL",
  "PARENT",
  "ADAPTATION",
  "SIDE_STORY",
  "SPIN_OFF",
  "ALTERNATIVE",
  "COMPILATION",
  "CONTAINS",
  "SUMMARY",
  "CHARACTER",
  "OTHER",
];

function relationRank(type: string | null): number {
  const index = type ? RELATION_ORDER.indexOf(type) : -1;
  return index === -1 ? RELATION_ORDER.length : index;
}

/**
 * Les œuvres liées, filtrées et classées.
 *
 * **Le filtre 18+ est appliqué ici, et il ne peut pas l'être ailleurs.** `getMediaById` filtre
 * l'œuvre demandée, mais son `isAdult` ne vaut que pour elle : une suite classée adulte arrive dans
 * les relations d'une fiche qui ne l'est pas. Et le document GraphQL ne sait pas filtrer une
 * sélection imbriquée. Le tri se fait donc en mémoire, **hors du `"use cache"`** — comme le planning
 * le fait déjà (`calendar/page.tsx`), et pour la même raison : mettre la préférence dans la clé de
 * cache doublerait les requêtes AniList pour un document identique.
 *
 * `toSorted` et non `sort` : `media` vient d'une lecture cachée, donc l'objet peut être partagé
 * entre deux rendus, et trier en place réordonnerait la valeur cachée elle-même. Le tri de
 * JavaScript est stable, donc à priorité égale l'ordre d'AniList est conservé — il suit la
 * chronologie à l'intérieur d'une même catégorie.
 *
 * Pas de lecture dédiée pour cet onglet : `relations` n'accepte aucune pagination chez AniList,
 * donc la requête de fiche les a **toutes**. Il n'y a rien de plus à aller chercher.
 */
export function visibleRelations(
  media: MediaDetail,
  includeAdult: boolean,
): RelationEdge[] {
  return media.relations.edges
    .filter((edge) => includeAdult || !edge.node.isAdult)
    .toSorted(
      (a, b) => relationRank(a.relationType) - relationRank(b.relationType),
    );
}

/**
 * Les tags, filtrés et triés par pertinence décroissante.
 *
 * Les tags portent leur **propre** `isAdult`, indépendant de celui de l'œuvre : une série tout
 * public peut être marquée d'un tag explicite par la communauté. Le filtre s'applique donc ici,
 * comme pour les relations.
 *
 * Le tri par `rank` n'est pas cosmétique : AniList les rend dans un ordre quelconque, et c'est le
 * rang qui distingue « Pirates » à 95 % d'un tag posé par trois votants.
 */
export function visibleTags(
  media: MediaDetail,
  includeAdult: boolean,
): MediaTag[] {
  return media.tags
    .filter((tag) => includeAdult || !tag.isAdult)
    .toSorted((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
}

/**
 * L'échantillon de recommandations de la requête de fiche.
 *
 * `mediaRecommendation` est nul quand l'œuvre recommandée a été supprimée d'AniList depuis le vote
 * — une carte sans jaquette ni titre n'apprendrait rien. S'y ajoute la préférence de contenu, qui
 * vaut pour chaque œuvre recommandée et pas seulement pour celle qu'on regarde.
 *
 * L'onglet complet ne passe **pas** par ici : `getMediaRecommendations` applique les mêmes deux
 * tamis sur sa propre lecture, au plus près de la donnée qu'elle vient de recevoir.
 */
export function sampleRecommendations(
  media: MediaDetail,
  includeAdult: boolean,
): MediaCompact[] {
  return media.recommendations.nodes.flatMap((node) => {
    const recommended = node.mediaRecommendation;
    if (!recommended) return [];
    if (recommended.isAdult && !includeAdult) return [];
    return [recommended];
  });
}
