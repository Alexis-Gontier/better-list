import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

/**
 * Toutes les routes Better Auth : `/api/auth/*` — démarrage OAuth, callback GitHub, session,
 * déconnexion. Ce segment est exclu du matcher de `src/proxy.ts` : le protéger interdirait de se
 * connecter.
 */
export const { GET, POST } = toNextJsHandler(auth);
