// `server-only` bien que le fichier soit pur : seul `server/media.mirror.ts` l'appelle, et le
// marqueur transforme une fuite dans un bundle client en erreur de build plutôt qu'en poids mort.
import "server-only";

import type { MediaStatus } from "@/features/media/schemas/media.schema";

/**
 * Politique de péremption du miroir local (docs/conception.md §4.1).
 *
 * Le miroir existe parce qu'AniList plafonne à 30 requêtes/minute par IP, partagée par tous les
 * visiteurs : une bibliothèque de 600 titres ne peut pas être servie par l'API. La contrepartie est
 * qu'une copie se périme, et **une copie qu'on ne rafraîchit jamais est un bug qui grossit** — une
 * série en cours de diffusion garde pour toujours le nombre d'épisodes qu'elle avait le jour où
 * quelqu'un l'a ajoutée.
 *
 * Ce fichier est pur et sans accès réseau : c'est la logique qui se trompe, donc c'est elle qu'on
 * isole et qu'on teste. `media.mirror.ts` l'applique, le cron l'appelle.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Deux classes de volatilité, deux durées de vie.
 *
 * Une œuvre terminée ne bouge plus qu'à la marge (une note communautaire qui glisse, un genre
 * corrigé) : trente jours suffisent. Une œuvre en cours de diffusion gagne un épisode par semaine et
 * change de statut à la fin de la saison — douze heures est la granularité qui permet au planning de
 * V2 de dire quelque chose de vrai.
 *
 * **Ce sont des seuils de péremption, pas une cadence.** Le cron passe une fois par jour (plan Vercel
 * Hobby, voir le handler) : douze heures signifie donc « toujours périmée quand la passe arrive, donc
 * toujours reprise ». Garder le seuil **plus court** que la cadence est délibéré — l'aligner sur 24 h
 * ferait qu'une ligne rafraîchie à 4 h 02 attendrait le surlendemain.
 */
export const MIRROR_TTL_MS = {
  volatile: 12 * HOUR_MS,
  settled: 30 * DAY_MS,
} as const;

/**
 * Classement de **chaque** statut AniList, et pas seulement de ceux qui nous intéressent.
 *
 * `Record<MediaStatus, …>` est exhaustif par construction : le jour où AniList ajoute une valeur à
 * son énumération, le build casse ici plutôt que de ranger silencieusement le nouveau statut dans la
 * classe la plus lente. Même raisonnement que les tables de libellés de `media-format.ts`.
 */
const STATUS_CLASS: Record<MediaStatus, keyof typeof MIRROR_TTL_MS> = {
  FINISHED: "settled",
  CANCELLED: "settled",
  RELEASING: "volatile",
  NOT_YET_RELEASED: "volatile",
  HIATUS: "volatile",
};

const ALL_STATUSES = Object.keys(STATUS_CLASS) as MediaStatus[];

/** Statuts figés — rafraîchis tous les trente jours. */
export const SETTLED_STATUSES: MediaStatus[] = ALL_STATUSES.filter(
  (status) => STATUS_CLASS[status] === "settled",
);

/** Statuts mouvants — rafraîchis toutes les douze heures. */
export const VOLATILE_STATUSES: MediaStatus[] = ALL_STATUSES.filter(
  (status) => STATUS_CLASS[status] === "volatile",
);

/**
 * Durée de vie d'une ligne du miroir.
 *
 * Un `status` nul est traité comme **volatile**, et c'est le choix prudent : la colonne est
 * `nullable` parce qu'AniList laisse le champ vide sur quelques fiches, or on ne sait alors pas de
 * quoi il s'agit. Le ranger dans la classe lente reviendrait à ne jamais découvrir son vrai statut.
 */
export function mirrorTtlMs(status: MediaStatus | null): number {
  if (!status) return MIRROR_TTL_MS.volatile;
  return MIRROR_TTL_MS[STATUS_CLASS[status]];
}

/**
 * La ligne a-t-elle dépassé sa durée de vie ?
 *
 * `now` est un paramètre et non un `new Date()` enfoui : c'est ce qui rend la fonction testable, et
 * ce qui permet au cron de raisonner sur un seul instant pour toute une passe.
 */
export function isMirrorStale(
  media: { status: MediaStatus | null; syncedAt: Date },
  now: Date = new Date(),
): boolean {
  return now.getTime() - media.syncedAt.getTime() >= mirrorTtlMs(media.status);
}

/**
 * Les deux bornes de `syncedAt` en dessous desquelles une ligne est périmée, une par classe.
 *
 * Renvoyer des bornes plutôt qu'un prédicat n'est pas un détail : c'est ce qui permet au cron de
 * poser la question à PostgreSQL (`syncedAt < …`, servi par l'index `[status, syncedAt]`) au lieu de
 * charger la table pour la filtrer en mémoire.
 */
export function mirrorStaleCutoffs(now: Date = new Date()) {
  return {
    volatileBefore: new Date(now.getTime() - MIRROR_TTL_MS.volatile),
    settledBefore: new Date(now.getTime() - MIRROR_TTL_MS.settled),
  };
}

/**
 * Nombre d'œuvres rafraîchies par requête AniList.
 *
 * C'est **toute l'économie du cron** : `media(id_in: [...])` ramène cinquante fiches pour une seule
 * requête, donc un miroir de mille titres se remet à jour en vingt requêtes — sous le quota d'une
 * minute. Cinquante est le `perPage` maximum accepté par AniList ; au-delà, l'API borne elle-même.
 */
export const MIRROR_BATCH_SIZE = 50;

/**
 * Plafond de requêtes par passe de cron, pour que le quota reste hors d'atteinte quelle que soit la
 * taille de la table.
 *
 * Les lignes sont reprises **de la plus ancienne à la plus récente** : ce qui dépasse le plafond
 * n'est pas perdu, il est simplement traité à la passe suivante, et l'ordre garantit qu'aucune ligne
 * ne peut être indéfiniment sautée.
 */
export const MIRROR_MAX_BATCHES_PER_RUN = 20;
