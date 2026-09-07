import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { env } from "@/config/env";
import { refreshStaleMirror } from "@/features/media/server/media.mirror";

/**
 * Cron de rafraîchissement du miroir AniList (docs/PRODUCT.md §4.1).
 *
 * Sans lui, le miroir est une photographie : une série en cours de diffusion garde pour toujours le
 * nombre d'épisodes qu'elle avait le jour où quelqu'un l'a ajoutée, et le planning de V2 — qui
 * repose entièrement sur ces colonnes — n'a aucune donnée juste à afficher.
 *
 * Le handler ne contient **aucune logique** : la politique de péremption est dans
 * `features/media/lib/media-freshness.ts` (pure et testée), son application dans
 * `features/media/server/media.mirror.ts`. Ce fichier n'est qu'une porte — il authentifie, il
 * appelle, il rend compte. C'est la règle « `app/` ne fait que du routing » appliquée à un route
 * handler.
 *
 * **Cadence : `0 4 * * *`**, déclarée dans `vercel.json` — une passe par jour, à 4 h UTC (5 ou 6 h à
 * Paris selon la saison). Le fichier étant du JSON, il ne peut pas porter ce commentaire : la
 * cadence se lit donc ici.
 *
 * **Une fois par jour parce que le plan Vercel est Hobby**, qui ne permet pas mieux. Conséquence
 * assumée : les œuvres en cours de diffusion sont rafraîchies toutes les 24 h et non toutes les
 * 12 h comme le seuil de `media-freshness.ts` le voudrait (§4.1). L'écart se rattrape en changeant
 * cette seule ligne le jour où le plan change — aucun code n'en dépend.
 *
 * **Le seuil reste volontairement plus court que la cadence, et ce n'est pas une incohérence.** Un
 * seuil de 12 h garantit qu'une ligne volatile est *toujours* périmée quand la passe arrive, donc
 * qu'elle est reprise à chaque fois. Aligner le seuil sur 24 h ferait l'inverse : une ligne
 * rafraîchie à 4 h 02 ne serait pas encore périmée à 4 h 00 le lendemain, et attendrait 48 h.
 *
 * L'heure choisie est creuse à dessein : une passe consomme au plus `MIRROR_MAX_BATCHES_PER_RUN`
 * requêtes du quota AniList (30/minute, partagé avec les visiteurs), donc autant ne pas la faire
 * tomber sur un moment où quelqu'un navigue.
 */

/**
 * Une passe peut enchaîner plusieurs requêtes AniList et autant de transactions. Le défaut de
 * Vercel (10 s) la couperait au milieu ; comme chaque lot est committé séparément une coupure ne
 * corrompt rien, mais elle laisse du travail qu'il faudrait reprendre à la passe suivante pour
 * rien. Soixante secondes est le maximum du plan Hobby, comme la cadence quotidienne.
 */
export const maxDuration = 60;

/**
 * Comparaison à temps constant du jeton porteur.
 *
 * Un `===` sur une chaîne s'arrête au premier caractère différent, ce qui rend le temps de réponse
 * dépendant du préfixe fourni et permet, en principe, de deviner le secret octet par octet. Le coût
 * de faire les choses correctement étant de trois lignes, il n'y a pas d'arbitrage à faire.
 *
 * La comparaison de longueur en amont n'affaiblit rien : `timingSafeEqual` exige deux tampons de
 * même taille, et la longueur de l'en-tête n'est pas le secret.
 */
function isAuthorizedCron(header: string | null): boolean {
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (!header || header.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  /*
    Vercel envoie `Authorization: Bearer $CRON_SECRET` sur les crons déclarés dans `vercel.json`.
    **C'est la seule garde de cette route** : le `matcher` de `src/proxy.ts` exclut `api/` en entier,
    et elle ne vit pas sous le layout `(app)`, donc `requireApprovedUser()` ne la couvre pas non
    plus.

    La réponse d'un refus ne dit rien de plus que « non » : ni la raison — en-tête absent, mal formé
    ou faux —, ni l'existence de ce que la route rafraîchit. Un 401 nu est déjà tout ce qu'un
    appelant légitime a besoin de savoir, et tout ce qu'un autre doit apprendre.
  */
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await refreshStaleMirror();

  // Le compte rendu part dans les journaux Vercel, où il est la seule façon de voir que le cron
  // travaille : `stale: 0` sur plusieurs passes dit que le miroir est à jour, `stale` égal au
  // plafond (`MIRROR_BATCH_SIZE × MIRROR_MAX_BATCHES_PER_RUN`) dit qu'il faudrait passer plus
  // souvent.
  return Response.json(summary);
}
