import type { NextRequest } from "next/server";

import { commandQuerySchema } from "@/features/command/schemas/command.schema";
import { getCommandResults } from "@/features/command/server/command.queries";
import { getSession } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/security/rate-limit";

/**
 * Les résultats de la palette de commandes.
 *
 * **Pourquoi un route handler et non une Server Action.** La palette cherche à la frappe, or une
 * Server Action est un POST que Next **sérialise** : deux frappes rapprochées font la queue, et la
 * réponse à « fri » arrive après celle à « frieren ». Un `GET` se laisse au contraire annuler par
 * l'`AbortController` du navigateur dès que la frappe suivante arrive — c'est le bon outil pour une
 * recherche continue, et les actions restent ce qu'elles doivent être : des mutations.
 *
 * **La garde est ici, parce qu'elle ne peut pas être ailleurs.** Un route handler ne vit pas sous le
 * layout `(app)`, donc `requireApprovedUser()` ne le couvre pas — même raison que le cron. Et le
 * `matcher` du proxy exclut `api/` en entier (voir `src/proxy.ts`), ce qui est correct mais retire
 * aussi le dernier filet.
 *
 * Pas de `redirect()` malgré la ressemblance avec la garde du layout : renvoyer une page de connexion
 * à un `fetch()` est une réponse absurde. Un 401 est ce que le client sait interpréter.
 */

/**
 * Vingt recherches par minute et par compte.
 *
 * **Ce plafond ne prouve rien sur le quota AniList, et ne cherche pas à le faire.** Quatre comptes à
 * vingt requêtes valent quatre-vingts appels possibles pour trente autorisés par minute : ce qui
 * protège réellement le quota, c'est le `"use cache"` de `searchMedia` et le fait qu'une saisie vide
 * ne parte jamais chez AniList. Ce qu'on arrête ici, c'est le cas où un client s'emballe — effet
 * React qui reboucle, `AbortController` qui ne coupe plus, onglet laissé ouvert sur une palette qui
 * rejoue sa requête — et brûle le quota de tout le monde sans que personne ne tape au clavier.
 *
 * Vingt est très au-dessus d'un usage humain : avec les 220 ms d'anti-rebond de la palette, une
 * recherche complète en coûte quatre ou cinq.
 */
const SEARCH_RATE_LIMIT = { max: 20, windowSeconds: 60 };

export async function GET(request: NextRequest) {
  const session = await getSession();

  // Statut revérifié, et pas seulement la présence de session : un compte peut être remis en attente
  // entre sa connexion et sa frappe. Même règle que `authActionClient`.
  //
  // Attention à ce que cette ligne promet : avec `session.cookieCache` activé, la lecture vient du
  // cookie et non de la base. Une remise en attente met donc jusqu'à cinq minutes à fermer la porte.
  if (!session || session.user.status !== "APPROVED") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Le plafond est posé après l'authentification, pas avant : compter les requêtes des anonymes
  // ferait grossir la table sans borne (voir `ApiRateLimit` dans le schéma), et le 401 ci-dessus
  // coûte déjà moins qu'une recherche.
  const budget = await consumeRateLimit({
    key: `command:${session.user.id}`,
    ...SEARCH_RATE_LIMIT,
  });

  if (!budget.allowed) {
    return Response.json(
      { error: "Trop de recherches" },
      { status: 429, headers: { "Retry-After": String(budget.retryAfter) } },
    );
  }

  // Le schéma borne la saisie et applique son défaut. Sans lui, un `?q=` de dix mille caractères
  // partirait tel quel dans un `contains` SQL et dans une requête AniList.
  const parsed = commandQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  return Response.json(await getCommandResults(parsed.data.q));
}
