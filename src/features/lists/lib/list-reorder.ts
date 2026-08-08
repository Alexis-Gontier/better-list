import { generateKeyBetween } from "fractional-indexing";

/**
 * Le calcul d'un déplacement dans une liste (docs/PRODUCT.md §4.4).
 *
 * **C'est ici que le glisser-déposer se trompe, pas dans le glisser.** La partie visuelle est prise en
 * charge par dnd-kit ; ce qui reste à écrire est le voisinage — entre quelles deux clés insérer —, et
 * c'est un raisonnement d'index qui a exactement deux façons de se tromper d'une case. D'où une
 * fonction pure, isolée et testée, que l'action se contente d'appeler.
 *
 * **Un déplacement ne touche qu'une ligne.** C'est toute la raison d'être de l'index fractionnaire :
 * `rank` est une chaîne, pas un entier, donc on n'a jamais à renuméroter ce qui suit. Déplacer la
 * quarantième œuvre d'une liste coûte un `UPDATE`, pas quarante.
 */

export type RankedItem = {
  id: string;
  rank: string;
};

/**
 * Le rang que doit prendre `movedId` pour se retrouver à la position `toIndex`.
 *
 * `items` est la liste **dans son ordre actuel**, du premier au dernier. `toIndex` est la position
 * visée dans la liste telle qu'elle sera *après* le déplacement — c'est la convention de dnd-kit, et
 * la seule qui se raisonne sans se tordre l'esprit.
 *
 * Le point à ne pas rater : **on retire l'élément déplacé avant de chercher ses voisins**. Sans ça,
 * déplacer un élément vers la droite le compte encore à son ancienne place, et il atterrit une case
 * trop tôt. C'est le décalage classique de ce calcul, et c'est ce que testent les cas « vers l'avant ».
 *
 * Renvoie `null` quand il n'y a rien à faire — élément inconnu, ou déjà à sa place. L'action s'en sert
 * pour ne pas écrire : réordonner sans rien déplacer ne doit pas toucher la base ni faire remonter la
 * liste en tête de l'index.
 */
export function rankAfterMove(
  items: RankedItem[],
  movedId: string,
  toIndex: number,
): string | null {
  const fromIndex = items.findIndex((item) => item.id === movedId);
  if (fromIndex === -1) return null;

  // Une position venue du navigateur est ramenée dans les bornes plutôt que refusée : dnd-kit ne
  // produit rien d'aberrant, mais l'action est un endpoint que rien n'oblige à passer par lui.
  const target = Math.min(Math.max(toIndex, 0), items.length - 1);
  if (target === fromIndex) return null;

  const rest = items.filter((item) => item.id !== movedId);

  // `rest[target - 1]` et `rest[target]` encadrent la place visée. Aux extrémités, l'un des deux est
  // absent : `generateKeyBetween` accepte `null` des deux côtés, ce qui couvre « tout en haut » et
  // « tout en bas » sans cas particulier.
  const before = rest[target - 1]?.rank ?? null;
  const after = rest[target]?.rank ?? null;

  return generateKeyBetween(before, after);
}
