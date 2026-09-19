/**
 * Les trous d'une série, et la façon de les écrire.
 *
 * C'est le calcul qui justifie le modèle par tome (docs/PRODUCT.md §4.5) : une ligne
 * `OwnedVolume` par tome possédé permet de représenter « j'ai le 1 et le 3, pas le 2 », ce
 * qu'un compteur ne saurait pas faire. Ces deux fonctions sont l'autre bout de cette
 * décision — elles rendent la question « il me manque lesquels ? » lisible en une phrase.
 *
 * Module **pur**, sans accès base ni React : c'est ce qui permet de le tester seul, et de
 * l'appeler aussi bien depuis l'écran racine que depuis la fiche d'une série.
 */

/**
 * Les numéros manquants, en ordre croissant.
 *
 * `total` est le `volumesTotal` de l'édition, saisi à la main : AniList ne fournit aucune donnée
 * au niveau du tome (§9). Quand il est inconnu, il n'y a pas de trou calculable **au-delà** du
 * dernier tome possédé — on ne peut que signaler les creux internes, et c'est ce que fait un
 * `total` pris au maximum des numéros possédés.
 */
export function missingVolumes(
  owned: readonly number[],
  total: number,
): number[] {
  const present = new Set(owned);
  const missing: number[] = [];

  for (let number = 1; number <= total; number++) {
    if (!present.has(number)) missing.push(number);
  }

  return missing;
}

/**
 * Le seuil à partir duquel une suite se replie en intervalle.
 *
 * Trois, et pas deux : « 11, 12 » se lit plus vite que « 11 → 12 », qui coûte deux caractères
 * de plus pour dire la même chose. À partir de trois, l'intervalle gagne à chaque terme.
 */
const RANGE_THRESHOLD = 3;

/**
 * Les numéros mis en phrase : `11, 12, 29, 63 → 110`.
 *
 * Les suites consécutives se replient, les isolés restent écrits. Sans ce repli, une série dont
 * il manque quarante tomes rendrait une ligne de quarante nombres — illisible précisément sur
 * l'écran où elle compte, c'est-à-dire un téléphone tenu devant un rayon.
 */
export function formatVolumeRanges(numbers: readonly number[]): string {
  const sorted = [...numbers].sort((a, b) => a - b);
  const parts: string[] = [];

  /*
    Deux bornes plutôt qu'un indice qui saute : `noUncheckedIndexedAccess` fait de chaque
    `sorted[i]` un `number | undefined`, et la version à indices passait son temps à s'en
    défendre. Ici on ne lit jamais que l'élément courant de la boucle.
  */
  let start: number | null = null;
  let end: number | null = null;

  function flush() {
    if (start === null || end === null) return;

    if (end - start + 1 >= RANGE_THRESHOLD) {
      parts.push(`${start} → ${end}`);
      return;
    }

    for (let number = start; number <= end; number++) {
      parts.push(String(number));
    }
  }

  for (const number of sorted) {
    if (start === null || end === null) {
      start = number;
      end = number;
      continue;
    }

    // Un doublon ne rouvre pas d'intervalle : il ne dit rien de plus que le tome déjà en cours.
    if (number === end) continue;

    if (number === end + 1) {
      end = number;
      continue;
    }

    flush();
    start = number;
    end = number;
  }
  flush();

  return parts.join(", ");
}

/**
 * Les trous d'une série, **`volumesTotal` inconnu compris**.
 *
 * Le nombre de tomes d'une édition est saisi à la main — AniList n'en fournit aucun au niveau du
 * tome (docs/PRODUCT.md §9) —, donc il peut manquer. Quand il manque, on ne sait rien de ce qui
 * vient après le dernier tome possédé : une série peut être en cours de parution. On ne signale
 * alors que les creux **internes**, et la série n'est jamais dite complète — « complète » est une
 * affirmation, et on ne l'affirme pas sans le total.
 */
export function volumeGaps(
  owned: readonly number[],
  volumesTotal: number | null,
): { missing: number[]; isComplete: boolean } {
  if (volumesTotal === null) {
    if (owned.length === 0) return { missing: [], isComplete: false };

    return {
      missing: missingVolumes(owned, Math.max(...owned)),
      isComplete: false,
    };
  }

  const missing = missingVolumes(owned, volumesTotal);

  /*
    Une étagère vide sur une édition de zéro tome n'est pas « complète » : `volumesTotal` à 0 est
    une saisie qui n'a pas encore eu lieu, pas une collection achevée.
  */
  return { missing, isComplete: volumesTotal > 0 && missing.length === 0 };
}

/**
 * Une plage appliquée à un ensemble de numéros — **la même règle côté client et côté serveur.**
 *
 * L'îlot de saisie s'en sert pour son état optimiste, et elle est testée ici plutôt que déduite
 * deux fois : un écart entre ce que l'écran montre pendant l'aller-retour et ce que la base écrit
 * ferait clignoter la grille au retour de l'action.
 */
export function applyVolumeRange(
  numbers: readonly number[],
  range: { from: number; to: number; owned: boolean },
): number[] {
  const next = new Set(numbers);

  for (let number = range.from; number <= range.to; number++) {
    if (range.owned) next.add(number);
    else next.delete(number);
  }

  return [...next].sort((a, b) => a - b);
}
