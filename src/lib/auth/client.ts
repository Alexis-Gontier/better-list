"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Client Better Auth, pour les composants interactifs.
 *
 * Pas de `baseURL` : le client tape la même origine que la page, ce qui est toujours vrai ici et
 * évite d'embarquer une variable d'environnement de plus dans le bundle.
 *
 * Fichier séparé de `@/lib/auth/server` à dessein — la configuration serveur porte le secret et la
 * connexion base, et ne doit jamais partager un module avec du code client.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
