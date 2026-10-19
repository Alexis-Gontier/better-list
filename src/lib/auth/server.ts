import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/config/env";
import { site } from "@/config/site";
import { prisma } from "@/lib/db/prisma";

/**
 * Configuration Better Auth.
 *
 * **GitHub OAuth uniquement, pas de mot de passe** (docs/conception.md §7). Ce choix supprime d'un
 * coup la vérification d'email, le reset, l'envoi de mails et toute la surface brute-force —
 * pour un cercle privé de quatre comptes, c'est du périmètre en moins sans perte.
 *
 * **L'inscription est ouverte, l'accès ne l'est pas.** On ne peut pas inviter quelqu'un à l'avance
 * en OAuth : son identité n'existe qu'au moment où il se connecte. Le contrôle se fait donc après
 * la création du compte — tout utilisateur naît `PENDING` et n'entre qu'une fois approuvé (§7.1).
 */

/** Longueur maximale d'un `login` GitHub, donc du `username` qu'on en dérive. */
const MAX_USERNAME_LENGTH = 39;

/**
 * Dérive un `username` libre à partir du login GitHub.
 *
 * Les logins GitHub sont uniques, donc la collision suppose qu'un compte ait changé de login et
 * qu'un autre l'ait repris. C'est rare — mais sans ce garde-fou, ce cas rare devient une erreur
 * 500 à l'inscription, au pire moment possible.
 */
async function resolveUsername(candidate: string) {
  const base =
    candidate
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_USERNAME_LENGTH) || "membre";

  for (let suffix = 0; suffix < 20; suffix++) {
    const username = suffix === 0 ? base : `${base}-${suffix}`;
    const taken = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!taken) return username;
  }

  // Filet de sécurité : on préfère un identifiant laid à un échec d'inscription.
  return `${base}-${Date.now().toString(36)}`.slice(0, MAX_USERNAME_LENGTH);
}

export const auth = betterAuth({
  appName: site.name,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  /** Explicite plutôt qu'omis : personne ne doit rajouter un mot de passe par inadvertance. */
  emailAndPassword: { enabled: false },

  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      /**
       * Les scopes `read:user` et `user:email` sont déjà les défauts du provider, et celui-ci
       * interroge `api.github.com/user/emails` quand le profil public n'expose pas d'adresse.
       * Un compte sans email public peut donc s'inscrire — rien à ajouter ici.
       */
      mapProfileToUser: (profile) => ({ username: profile.login }),
    },
  },

  user: {
    additionalFields: {
      /**
       * Identifiant public, porte l'URL `/u/[username]`.
       *
       * `input: true` est **nécessaire**, pas un relâchement : Better Auth filtre le retour de
       * `mapProfileToUser` avec la même règle que les entrées client
       * (`parseAdditionalUserInputFromProviderProfile`), donc un champ en `input: false` n'est
       * jamais alimenté par le profil OAuth. Le verrou est ailleurs — voir le hook
       * `user.update.before` plus bas, qui interdit de modifier ce champ après coup.
       */
      username: { type: "string", required: false, input: true },
      /** Liste d'attente. `input: false` : personne ne s'auto-approuve via l'API. */
      status: { type: "string", required: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24,
    /**
     * Le cache cookie évite un aller-retour base à chaque lecture de session. C'est aussi ce qui
     * rend la vérification optimiste de `src/proxy.ts` fiable et gratuite.
     */
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  databaseHooks: {
    user: {
      create: {
        /**
         * Dernier rempart avant l'insertion. `mapProfileToUser` a proposé un `username` ; on le
         * normalise et on le rend unique ici, et surtout on **force** `PENDING` — le statut ne
         * doit dépendre d'aucune donnée venue de GitHub.
         */
        before: async (user) => {
          const proposed =
            typeof user.username === "string" && user.username
              ? user.username
              : user.name;

          return {
            data: {
              ...user,
              username: await resolveUsername(proposed ?? ""),
              status: "PENDING",
            },
          };
        },
      },

      update: {
        /**
         * Contrepartie du `input: true` sur `username` : ce champ et `status` sont retirés de
         * toute mise à jour passant par Better Auth.
         *
         * Sans ce filtre, l'endpoint `update-user` permettrait à n'importe qui de se renommer —
         * donc de changer l'URL de son profil, voire de heurter la contrainte d'unicité. Le
         * statut, lui, ne se change que hors application (Prisma Studio), et c'est voulu.
         */
        before: async (user) => {
          const { username: _username, status: _status, ...allowed } = user;

          return { data: allowed };
        },
      },
    },
  },

  /**
   * `storage: "database"` n'est pas un réglage de confort — sans lui, le défaut résolu est
   * `"memory"` (aucun `secondaryStorage` n'est configuré). Sur Vercel, cela veut dire un compteur
   * par instance de fonction, perdu à chaque démarrage à froid : la limite est annoncée mais ne
   * tient pas. Les lignes vont dans la table `RateLimit`, que Better Auth purge lui-même.
   *
   * La fenêtre est comptée **par IP**. Dix requêtes par minute est large pour un usage normal —
   * une connexion GitHub en coûte deux ou trois — mais reste serré si plusieurs membres du cercle
   * sortent par la même adresse. C'est le seul endroit à desserrer si un 429 apparaît en usage
   * légitime.
   */
  rateLimit: { enabled: true, storage: "database", window: 60, max: 10 },

  /** `nextCookies` doit rester le dernier plugin du tableau. */
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
