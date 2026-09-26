import * as z from "zod";

/**
 * L'adresse d'un webhook Discord, **et rien d'autre**.
 *
 * L'hôte est fermé, et ce n'est pas du zèle : le serveur appellera cette URL — à l'enregistrement
 * pour la vérifier, puis toutes les heures. Une URL libre ferait de lui un relais vers n'importe
 * quelle adresse, réseau interne compris. Les trois hôtes sont ceux que Discord distribue : le
 * domaine historique, et les canaux `ptb` / `canary` du client.
 *
 * L'id est numérique (un snowflake), le jeton est en base64url : le motif le dit, pour qu'une URL
 * tronquée au copier-coller échoue ici, et non à la première diffusion.
 */
const DISCORD_WEBHOOK_URL =
  /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+$/;

export const discordWebhookUrlSchema = z
  .string()
  .trim()
  .regex(DISCORD_WEBHOOK_URL, "Ce n'est pas une adresse de webhook Discord.");

export const saveDiscordWebhookSchema = z.object({
  url: discordWebhookUrlSchema,
});

/**
 * Ce que Discord rend sur `GET` d'un webhook — réduit à ce qu'on lit.
 *
 * `name` est nullable dans leur documentation (un webhook créé par une intégration peut ne pas en
 * avoir) ; on retombe alors sur un libellé générique plutôt que de refuser le branchement.
 */
export const discordWebhookInfoSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

/** Le message créé, rendu par `?wait=true`. Seul l'id est lu : il prouve que l'envoi a abouti. */
export const discordMessageSchema = z.object({
  id: z.string(),
});

/**
 * Un embed Discord, dans le sous-ensemble qu'on envoie.
 *
 * Décrit en Zod pour que le type vienne d'un seul endroit (`z.infer`), pas parce qu'on le valide :
 * c'est nous qui le fabriquons.
 */
export const discordEmbedSchema = z.object({
  title: z.string().max(256),
  url: z.url(),
  description: z.string().max(4096).optional(),
  timestamp: z.iso.datetime().optional(),
  image: z.object({ url: z.url() }).optional(),
});
export type DiscordEmbed = z.infer<typeof discordEmbedSchema>;

/** L'état du branchement tel que `/settings` l'affiche — **sans l'URL**, qui est le secret. */
export const discordWebhookStatusSchema = z
  .object({
    name: z.string(),
    /** Le seul fragment de l'URL qu'on laisse voir : de quoi reconnaître son webhook. */
    hint: z.string(),
  })
  .nullable();
export type DiscordWebhookStatus = z.infer<typeof discordWebhookStatusSchema>;
