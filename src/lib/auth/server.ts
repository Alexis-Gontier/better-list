import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, lastLoginMethod } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

import { env } from "@/config/env";
import { site } from "@/config/site";
import { ADMIN_ROLE } from "@/lib/auth/roles";
import { MAX_USERNAME_LENGTH, normalizeUsername } from "@/lib/auth/username";
import { prisma } from "@/lib/db/prisma";

/**
 * Configuration Better Auth.
 *
 * **OAuth seulement, trois fournisseurs** (GitHub, Discord, Google ; D56). Ni mot de
 * passe ni e-mail : pas de vérification, de reset, ni de surface brute-force.
 *
 * **L'inscription est ouverte, l'accès ne l'est pas.** On ne peut pas inviter quelqu'un à l'avance
 * en OAuth : son identité n'existe qu'au moment où il se connecte. Le contrôle se fait donc après
 * la création du compte — tout utilisateur naît `PENDING` et n'entre qu'une fois approuvé (§7.1).
 */

/**
 * Dérive un `username` libre à partir du nom proposé par le fournisseur.
 *
 * Les logins GitHub sont uniques, donc la collision suppose qu'un compte ait changé de login et
 * qu'un autre l'ait repris. C'est rare — mais sans ce garde-fou, ce cas rare devient une erreur
 * 500 à l'inscription, au pire moment possible.
 */
async function resolveUsername(candidate: string) {
  const base = normalizeUsername(candidate);

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

/**
 * Les droits du plugin `admin`, **sans l'usurpation**. Elle permettrait de se connecter en tant
 * qu'un autre membre, donc de lire son compte : entre amis, rien ne la justifie (D57).
 */
const accessControl = createAccessControl(defaultStatements);
const roles = {
  [ADMIN_ROLE]: accessControl.newRole({
    user: ["list", "get", "set-role", "ban", "delete"],
    session: ["list", "revoke", "delete"],
  }),
  user: accessControl.newRole({ user: [], session: [] }),
};

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
    // Facultatifs (D62) : sans identifiants, le fournisseur n'est pas déclaré du tout.
    ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
      ? {
          discord: {
            clientId: env.DISCORD_CLIENT_ID,
            clientSecret: env.DISCORD_CLIENT_SECRET,
            /** `username` est le nom Discord moderne, sans le `#1234` d'autrefois. */
            mapProfileToUser: (profile: { username: string }) => ({
              username: profile.username,
            }),
          },
        }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            /** Google n'a pas de pseudo : la partie locale de l'adresse en tient lieu. */
            mapProfileToUser: (profile: { email: string }) => ({
              username: profile.email.split("@")[0],
            }),
          },
        }
      : {}),
  },

  /**
   * **Un compte par personne**, quel que soit le fournisseur : quelqu'un qui revient par Google après
   * être entré par GitHub, avec la même adresse vérifiée, retrouve son compte au lieu d'en créer un
   * second qui repasserait par la liste d'attente. Seuls ces trois fournisseurs vérifient l'adresse.
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "discord", "google"],
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
    /**
     * Supprimer son compte, depuis `/settings`. Le schéma fait le reste en cascade. Le dernier
     * administrateur ne peut pas partir : personne ne pourrait plus approuver les demandes.
     */
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const self = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (self?.role !== ADMIN_ROLE) return;

        const admins = await prisma.user.count({ where: { role: ADMIN_ROLE } });
        if (admins <= 1) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Vous êtes le dernier administrateur : nommez-en un autre avant de partir.",
          });
        }
      },
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

        /**
         * Chaque administrateur apprend la demande dans sa cloche (lot 3, §4). Le fournisseur se lit
         * à l'affichage : à ce stade, le compte `Account` n'est pas encore écrit.
         */
        after: async (user) => {
          const admins = await prisma.user.findMany({
            where: { role: ADMIN_ROLE },
            select: { id: true },
          });
          await prisma.notification.createMany({
            data: admins.map(({ id }) => ({
              type: "SIGNUP_PENDING" as const,
              actorId: user.id,
              recipientId: id,
            })),
          });
        },
      },

      update: {
        /**
         * Contrepartie du `input: true` sur `username` : ce champ, `status`, le rôle et le
         * bannissement sont retirés de toute mise à jour passant par `update-user` (rôle et
         * bannissement ne bougent que par le plugin `admin`).
         *
         * Sans ce filtre, l'endpoint `update-user` permettrait à n'importe qui de se renommer —
         * donc de changer l'URL de son profil, voire de heurter la contrainte d'unicité. Le
         * statut, lui, ne se change que hors application (Prisma Studio), et c'est voulu.
         */
        before: async (user) => {
          const {
            username: _username,
            status: _status,
            role: _role,
            banned: _banned,
            banReason: _banReason,
            banExpires: _banExpires,
            ...allowed
          } = user;

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
  plugins: [
    admin({
      ac: accessControl,
      roles,
      adminRoles: [ADMIN_ROLE],
      defaultRole: "user",
      bannedUserMessage: "Votre compte a été suspendu.",
    }),
    /**
     * Retient le dernier fournisseur dans un cookie (`better-auth.last_used_login_method`), lu par
     * `/login` pour la pastille « Dernière ». Rien en base : c'est une aide, pas une donnée.
     */
    lastLoginMethod({ storeInDatabase: false }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
