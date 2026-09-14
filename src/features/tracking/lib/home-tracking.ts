import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

const ACTIVE_STATUSES: readonly EntryStatus[] = ["CURRENT", "REPEATING"];

/**
 * Sépare mon suivi en deux piles pour l'accueil — **par le statut, et par lui seul**.
 *
 * - **en cours** : ce que je regarde ou relis ;
 * - **à reprendre** : ce que j'ai mis en pause.
 *
 * Une première version faisait aussi passer dans « à reprendre » les séries en cours restées sans
 * geste depuis trente jours. Mesurée sur un vrai compte le 14 septembre 2026, elle laissait **une**
 * œuvre dans « en cours » et en rangeait cinquante-huit dans « à reprendre » : la règle vidait la
 * rangée qu'elle devait nourrir, et le lien de la rangée vers `/library?status=PAUSED` ne montrait
 * plus la même chose qu'elle. Décision d'Alexis : le statut, et l'ancienneté affichée sur la carte
 * plutôt qu'employée pour trier.
 *
 * Les autres statuts (prévu, terminé, abandonné) ne vont nulle part. L'ordre reçu est conservé dans
 * chaque pile : la lecture arrive triée par activité récente.
 */
export function partitionTracking<
  Row extends { entry: { status: EntryStatus } },
>(rows: Row[]): { active: Row[]; resumable: Row[] } {
  const active: Row[] = [];
  const resumable: Row[] = [];

  for (const row of rows) {
    const { status } = row.entry;

    if (ACTIVE_STATUSES.includes(status)) active.push(row);
    else if (status === "PAUSED") resumable.push(row);
  }

  return { active, resumable };
}
