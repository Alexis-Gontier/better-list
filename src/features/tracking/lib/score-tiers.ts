import {
  formatStars,
  SCORE_STAR_STEP,
  SCORE_STARS,
  scoreToStars,
  starsToScore,
} from "@/features/tracking/lib/entry-format";

/**
 * Le plateau de la tier list — **les paliers sont les crans de la note, pas des lettres**.
 *
 * C'est ce qui distingue cet écran de la `ListView TIERS` de docs/PRODUCT.md §4.4, qui posera des
 * paliers libres sur une liste : ici, déposer une œuvre sur une ligne **écrit sa note**. Il n'y a
 * donc rien à stocker de plus qu'`Entry.score`, et aucun palier à nommer — un « S » au-dessus de
 * « A » ne dirait pas quelle note enregistrer.
 *
 * Tout ce fichier est pur : c'est ce qui rend l'écran testable sans base ni navigateur, comme
 * `entry-transition.ts` pour le suivi.
 */

export type ScoreTier = {
  /**
   * Identifiant de la zone de dépôt. Une chaîne et non la note : dnd-kit compare ses identifiants
   * par égalité stricte, et `0` — une note valide — y serait confondu avec l'absence de zone.
   */
  id: string;
  /** Étoiles affichées. `null` dans la réserve : elle n'est pas un jugement. */
  stars: number | null;
  /** La note écrite quand on dépose ici. `null` efface la note. */
  score: number | null;
  label: string;
  /**
   * La couleur de la bande, en dur. `null` pour la réserve, qui reprend le gris du thème.
   *
   * Une valeur littérale et non un jeton de thème : ce dégradé **ne s'inverse pas** entre clair et
   * sombre — le rouge du haut et le violet du bas disent le rang, et un palier qui changerait de
   * teinte selon le thème ne dirait plus rien. Le texte posé dessus est donc noir dans les deux cas.
   */
  color: string | null;
};

/** Combien de crans de 5 à 0 par demies : onze, bornes comprises. */
const TIER_COUNT = SCORE_STARS / SCORE_STAR_STEP + 1;

/**
 * Le dégradé des bandes, du meilleur cran au pire — **celui de TierMaker**, à la demande d'Alexis
 * (7 septembre 2026).
 *
 * Ce sont les onze teintes que l'outil emploie quand une tier list dépasse ses cinq paliers
 * habituels : rouge, orange, jaune, vert, cyan, bleu, violet. Elles sont assez pâles pour porter du
 * texte noir, et leur ordre est ce qui rend un plateau lisible d'un coup d'œil — on ne lit pas les
 * chiffres, on voit où est la masse.
 *
 * Autant de couleurs que de crans, et le compilateur ne le vérifie pas : `SCORE_TIERS` s'arrêterait
 * silencieusement à une bande sans couleur si l'échelle changeait. C'est ce que garde le test.
 */
const TIER_COLORS = [
  "#ff7f7f",
  "#ffbf7f",
  "#ffdf7f",
  "#ffff7f",
  "#bfff7f",
  "#7fff7f",
  "#7fffbf",
  "#7fffff",
  "#7fbfff",
  "#7f7fff",
  "#bf7fff",
] as const;

/**
 * Les crans notés, du meilleur au pire.
 *
 * **Zéro en fait partie**, et ce n'est pas une coquetterie : `entryScoreSchema` distingue « pas
 * encore noté » (`null`) de « noté zéro », qui est un jugement (docs/PRODUCT.md §4.2). Sans cette
 * ligne, une note de zéro déjà posée n'aurait aucune case où être déposée — ni relue.
 */
export const SCORE_TIERS: ScoreTier[] = Array.from(
  { length: TIER_COUNT },
  (_, index) => {
    const stars = SCORE_STARS - index * SCORE_STAR_STEP;
    const score = starsToScore(stars);

    return {
      id: `tier-${score}`,
      stars,
      score,
      label: formatStars(stars),
      color: TIER_COLORS[index] ?? null,
    };
  },
);

/**
 * La réserve, en bas du plateau.
 *
 * Elle sert dans les deux sens : on y pioche une œuvre pour lui donner sa première note, et on y
 * ramène une note qu'on regrette — auquel cas `score: null` l'efface plutôt que de la mettre à
 * zéro. C'est la seule façon de défaire une notation depuis cet écran.
 */
export const UNRATED_TIER: ScoreTier = {
  id: "unrated",
  stars: null,
  score: null,
  label: "Non notées",
  /* Pas de couleur : la réserve n'est pas un rang, et lui en donner une la ferait lire comme un
     douzième palier — le pire de tous, puisqu'elle est en bas. */
  color: null,
};

/** Les lignes du plateau, dans l'ordre où elles s'affichent. */
export const TIER_BOARD: ScoreTier[] = [...SCORE_TIERS, UNRATED_TIER];

/**
 * Où se range une note.
 *
 * L'arrondi est celui de l'affichage (`scoreToStars`) et pas un calcul parallèle : une note de 87
 * s'affiche « 4,5/5 » partout ailleurs dans le produit, elle doit donc se trouver sur la ligne 4,5.
 * Deux arrondis différents pour la même note, c'est une œuvre qu'on cherche une ligne trop bas.
 */
export function tierIdForScore(score: number | null): string {
  if (score === null) return UNRATED_TIER.id;

  return `tier-${starsToScore(scoreToStars(score))}`;
}

/** Ce qu'une ligne du plateau doit savoir de ses œuvres pour les ranger. */
type TierSortable = { score: number | null; title: string };

export type TierGroup<T> = { tier: ScoreTier; items: T[] };

/**
 * Le comparateur français : « Éclair » se range entre « Chat » et « Zèbre », pas après.
 */
const TITLE_COLLATOR = new Intl.Collator("fr", { sensitivity: "base" });

/**
 * Répartit les œuvres sur le plateau — **toutes les lignes, vides comprises**.
 *
 * Une ligne vide reste affichée : c'est le vide qui montre qu'un cran n'est pas utilisé, et un
 * plateau dont les lignes apparaissent et disparaissent au fil des dépôts est un plateau dont les
 * cibles bougent sous le doigt.
 *
 * **Aucun rang n'est stocké à l'intérieur d'un cran**, et c'est une décision : ce serait une colonne
 * et une migration pour un ordre que la note ne porte pas. On trie donc par note exacte
 * décroissante — ce qui range d'elles-mêmes les notes importées d'AniList à l'intérieur de leur
 * palier — puis par titre, qui garantit un ordre total. Sans ce second critère, deux rendus
 * successifs pourraient ne pas donner le même plateau.
 */
export function groupIntoTiers<T extends TierSortable>(
  items: T[],
): TierGroup<T>[] {
  const byTier = new Map<string, T[]>(TIER_BOARD.map((tier) => [tier.id, []]));

  for (const item of items) {
    byTier.get(tierIdForScore(item.score))?.push(item);
  }

  return TIER_BOARD.map((tier) => ({
    tier,
    items: (byTier.get(tier.id) ?? []).sort(
      (left, right) =>
        (right.score ?? 0) - (left.score ?? 0) ||
        TITLE_COLLATOR.compare(left.title, right.title),
    ),
  }));
}
