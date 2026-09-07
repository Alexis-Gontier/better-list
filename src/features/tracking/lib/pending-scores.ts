/**
 * Les notes posées à l'écran dont l'écriture n'est pas revenue.
 *
 * La tier list déplace ses cartes **avant** la réponse du serveur, sans quoi chaque dépôt ferait
 * revenir la jaquette à sa place le temps d'un aller-retour. Mais le serveur reste la vérité, et
 * chaque écriture y déclenche un `revalidatePath` qui renvoie des lignes fraîches. Sans cette
 * table, ces lignes-là **défont le dépôt suivant** : celui-ci n'y est pas encore, donc sa carte
 * remonte à son ancien cran avant de se recorriger. Sur un écran fait pour enchaîner les dépôts,
 * ça se voit.
 *
 * Le module est pur, donc testable : dans ce dépôt, Vitest tourne en environnement `node` et ne
 * voit aucun composant React (`vitest.config.mts`). C'est le même parti que `score-tiers.ts`.
 *
 * **La `Map` est mutée sur place**, parce qu'elle vivra dans une `useRef` : la remplacer à chaque
 * écriture n'apporterait qu'un piège de fermeture, et elle ne déclenche aucun rendu.
 */

/** Une œuvre en cours d'écriture. */
type PendingScore = {
  /** La note qu'on vient de poser à l'écran. */
  score: number | null;
  /** La dernière note **confirmée** par le serveur, à remettre si l'écriture échoue. */
  previous: number | null;
  /** Combien d'écritures de cette œuvre n'ont pas encore répondu. */
  inFlight: number;
};

export type PendingScores = Map<number, PendingScore>;

/**
 * Une note vient d'être posée à l'écran.
 *
 * `currentScore` n'est retenu qu'à la **première** écriture : les suivantes partent d'un état que
 * le serveur n'a jamais confirmé, et y revenir en cas d'échec afficherait une note qui n'a existé
 * que dans le navigateur.
 */
export function queueScore(
  pending: PendingScores,
  mediaId: number,
  score: number | null,
  currentScore: number | null,
): void {
  const previous = pending.get(mediaId);

  pending.set(mediaId, {
    score,
    previous: previous ? previous.previous : currentScore,
    inFlight: (previous?.inFlight ?? 0) + 1,
  });
}

/**
 * Une écriture est revenue, quelle qu'en soit l'issue.
 *
 * On ne cesse de suivre l'œuvre qu'à la dernière : tant qu'une écriture reste en vol, sa note
 * locale doit continuer de recouvrir ce que renvoie le serveur.
 */
export function settleScore(pending: PendingScores, mediaId: number): void {
  const entry = pending.get(mediaId);
  if (!entry) return;

  if (entry.inFlight <= 1) {
    pending.delete(mediaId);
    return;
  }

  pending.set(mediaId, { ...entry, inFlight: entry.inFlight - 1 });
}

/**
 * Une écriture a échoué : quelle note remettre ?
 *
 * `null` veut dire « rien en vol pour cette œuvre », ce qui n'est pas la même chose que
 * `{ previous: null }`, « elle n'était pas notée ». Les confondre effacerait une note posée depuis
 * un autre onglet. L'échec périme **toutes** les écritures en vol de l'œuvre, d'où l'oubli d'un
 * coup : elles partaient d'un état qui n'a jamais existé côté serveur.
 */
export function failScore(
  pending: PendingScores,
  mediaId: number,
): { previous: number | null } | null {
  const entry = pending.get(mediaId);
  if (!entry) return null;

  pending.delete(mediaId);
  return { previous: entry.previous };
}

/** Recouvre des lignes venues du serveur par les notes en vol. */
export function applyPendingScores<
  T extends { mediaId: number; score: number | null },
>(rows: T[], pending: PendingScores): T[] {
  if (pending.size === 0) return rows;

  return rows.map((row) => {
    const entry = pending.get(row.mediaId);
    return entry ? { ...row, score: entry.score } : row;
  });
}
