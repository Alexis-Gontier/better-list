import * as z from "zod";

/**
 * Formes de la collection physique (docs/PRODUCT.md §4.5).
 *
 * **Ce que ces schémas ne couvrent pas est une décision, pas un oubli.** `OwnedVolume` porte aussi
 * `price`, `acquiredAt`, `condition` et `notes` ; aucun écran ne les remplit — retirés le
 * 19 septembre 2026 avec la fenêtre de saisie qui seule les portait. Les colonnes restent au
 * schéma Prisma (les retirer coûterait une migration pour rien), mais rien ici ne les valide,
 * parce que rien ne les écrit. Le jour où un écran en veut, il apportera son champ.
 *
 * `lentTo` est dans le même cas, et pour une raison plus nette : le prêt entre membres est
 * **abandonné** (décision d'Alexis, 19 septembre 2026), pas reporté.
 */

/**
 * Le plus haut numéro de tome qu'on accepte.
 *
 * Mille, ce qui est large : la plus longue série publiée tient très en dessous. La borne n'est pas
 * là pour juger d'un catalogue mais pour qu'une plage forgée — « du tome 1 au tome 900 000 » —
 * ne demande pas à la base d'écrire un million de lignes avant d'échouer.
 */
export const MAX_VOLUME_NUMBER = 1000;

const volumeNumberSchema = z.number().int().min(1).max(MAX_VOLUME_NUMBER);

/**
 * Poser ou retirer une plage de tomes — **le seul geste d'écriture de l'étagère.**
 *
 * Un clic sur une case envoie `from === to` : la plage n'est pas un mode à part, c'est le geste
 * normal, et un tome isolé en est le cas d'une seule borne (décision du 19 septembre 2026).
 *
 * `from <= to` est vérifié ici plutôt que côté serveur : c'est une propriété de l'entrée, pas une
 * règle métier, et une plage à l'envers est une erreur de câblage du client — pas une saisie à
 * rattraper en silence.
 */
export const setOwnedRangeSchema = z
  .object({
    mediaId: z.number().int().positive(),
    from: volumeNumberSchema,
    to: volumeNumberSchema,
    /** `true` pose les tomes sur l'étagère, `false` les en retire. */
    owned: z.boolean(),
  })
  .refine((input) => input.from <= input.to, {
    message: "La borne de départ doit précéder la borne d'arrivée.",
    path: ["to"],
  });

/**
 * Corriger le nombre de tomes d'une édition.
 *
 * **C'est la seule donnée du modèle qu'aucune source ne peut fournir.** AniList ne donne un
 * `volumes` que pour les séries terminées, et il ignore la notion d'édition (§9) : 72 en édition
 * simple, 27 en Hokage édition, et lui n'en connaît qu'un. Sans cet écran, une série en cours de
 * parution n'aurait jamais de total, donc jamais de manquants — c'est-à-dire pas d'étagère.
 *
 * `null` est accepté et veut dire « je ne sais pas encore » : `volumeGaps` sait ne signaler que
 * les creux internes dans ce cas, plutôt que d'inventer une fin de série.
 */
export const setEditionVolumesTotalSchema = z.object({
  mediaId: z.number().int().positive(),
  volumesTotal: z.number().int().min(1).max(MAX_VOLUME_NUMBER).nullable(),
});

/**
 * Poser le tome suivant — « il vient de paraître, et je l'ai ».
 *
 * **Le numéro n'est pas dans l'entrée, et c'est le point.** Il se déduit en base, du plus grand
 * entre le total de l'édition et le dernier tome possédé : le client ne peut donc pas demander le
 * tome 400 d'une série qui en compte douze, et deux onglets qui cliquent en même temps tombent
 * sur le même numéro plutôt que sur deux.
 *
 * Ce geste existe parce qu'une série **en cours** n'a pas de fin connue : AniList ne donne un
 * nombre de volumes que pour les séries terminées (docs/PRODUCT.md §9), donc la grille s'arrête
 * au dernier tome possédé et il faut bien un moyen d'aller plus loin. Sans lui, poser le tome
 * suivant demandait d'ouvrir le menu et de saisir un total à la main.
 */
export const addNextVolumeSchema = z.object({
  mediaId: z.number().int().positive(),
});
