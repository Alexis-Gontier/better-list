import { up } from "up-fetch";

/**
 * Client HTTP unique pour les appels sortants.
 *
 * `fetch` nu rend un `any` : le typage du retour est une promesse que rien ne vérifie. Passer
 * par ce client permet d'attacher un `schema` Zod par requête, et la réponse est validée avant
 * d'entrer dans le code.
 *
 *   const user = await upfetch("/users/1", { schema: userSchema });
 *
 * Les defaults sont une **fonction** — elle est réévaluée à chaque requête, pour qu'un token
 * ou une locale lus ici restent frais.
 */
export const upfetch = up(globalThis.fetch, () => ({
  timeout: 10_000,
}));
