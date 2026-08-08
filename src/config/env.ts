import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

/**
 * Point d'entrée unique et validé des variables d'environnement.
 *
 * On n'écrit jamais `process.env.X` ailleurs dans le code applicatif : passer par `env`
 * garantit que la variable existe, qu'elle a le bon format, et qu'une variable serveur ne
 * peut pas fuir dans un bundle client.
 *
 * Toute variable ajoutée ici doit l'être à deux endroits : dans `server`/`client`, et — pour
 * les variables client — dans `experimental__runtimeEnv`, parce que Next.js n'inline que les
 * accès littéraux à `process.env`.
 */
export const env = createEnv({
  server: {
    /** Chaîne de connexion PostgreSQL (Neon). Utiliser l'URL *poolée* en production. */
    DATABASE_URL: z.url(),

    /** Secret de signature des sessions Better Auth. 32 octets minimum. */
    BETTER_AUTH_SECRET: z.string().min(32),

    /** Application OAuth GitHub — seul fournisseur d'authentification (PRODUCT.md §7). */
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),

    /**
     * Jeton porteur du cron Vercel (PRODUCT.md §4.1).
     *
     * C'est la **seule** protection de `/api/cron/*` : ces routes ne portent pas de session, donc la
     * garde de `(app)/layout.tsx` ne les couvre pas. Longueur minimale imposée pour qu'un secret
     * bricolé à la main ne passe pas la validation du build.
     */
    CRON_SECRET: z.string().min(32),
  },

  client: {
    /** URL publique. `baseURL` de Better Auth et origine de confiance CSRF. */
    NEXT_PUBLIC_APP_URL: z.url(),
  },

  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]),
  },

  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /** Laisse passer une string vide comme "non défini" plutôt que de la valider. */
  emptyStringAsUndefined: true,

  /** Échappatoire pour les builds sans secrets (Docker, CI lint-only). */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
