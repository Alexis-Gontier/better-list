import type { NextRequest } from "next/server";

import { commandSearchQuerySchema } from "@/features/command/schemas/command-search.schema";
import { searchForCommand } from "@/features/command/server/command-search.queries";
import { getSession } from "@/lib/auth/session";

/**
 * La recherche de la palette, à la frappe.
 *
 * **Un route handler et pas une Server Action**, et c'est une règle du dépôt (CLAUDE.md) : une
 * action est un POST que Next met en file, donc la réponse à « fri » peut arriver après celle à
 * « frieren » et l'écraser. Un `GET` s'annule côté client — `AbortController` à chaque frappe — et
 * la réponse d'une requête abandonnée n'est jamais lue.
 *
 * Le handler ne contient **aucune logique** : il garde, il valide, il appelle
 * `features/command/server/`. C'est la règle « `app/` ne fait que du routing ».
 */
export async function GET(request: NextRequest) {
  /*
    **Sa garde est la seule qu'il ait.** `src/proxy.ts` exclut `api/` en entier et ce fichier ne vit
    pas sous le layout `(app)` : `requireApprovedUser()` ne le couvre pas. Et elle ne redirige pas —
    un appel `fetch` qui suivrait une redirection vers `/login` recevrait une page HTML là où il
    attend du JSON.

    Le compte doit être **approuvé**, pas seulement connecté : un compte en liste d'attente n'a pas
    accès au catalogue, et le quota AniList qu'il dépenserait est celui du cercle.
  */
  const session = await getSession();

  if (session?.user.status !== "APPROVED") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = commandSearchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  return Response.json(await searchForCommand(parsed.data.q));
}
