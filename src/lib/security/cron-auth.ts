import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/config/env";

/**
 * La garde des routes `api/cron/*` : l'en-tête `Authorization: Bearer $CRON_SECRET`.
 *
 * Vercel l'envoie sur les crons de `vercel.json`, le workflow GitHub des notifications Discord
 * l'envoie à la main. **C'est la seule garde de ces routes** : le `matcher` de `src/proxy.ts` exclut
 * `api/` en entier, et elles ne vivent pas sous le layout `(app)`.
 *
 * Parti de `api/cron/refresh-media/route.ts`, promu ici le 26 septembre 2026 quand
 * `api/cron/discord` en a eu besoin — deux gardes recopiées finiraient par ne plus comparer pareil.
 *
 * **Comparaison à temps constant.** Un `===` sur une chaîne s'arrête au premier caractère différent,
 * ce qui rend le temps de réponse dépendant du préfixe fourni et permet, en principe, de deviner le
 * secret octet par octet. La comparaison de longueur en amont n'affaiblit rien : `timingSafeEqual`
 * exige deux tampons de même taille, et la longueur de l'en-tête n'est pas le secret.
 */
export function isAuthorizedCron(header: string | null): boolean {
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (!header || header.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
