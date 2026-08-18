import { isResponseError } from "up-fetch";
import * as z from "zod";

import { upfetch } from "@/lib/http/fetch";

/**
 * Client GraphQL AniList.
 *
 * AniList expose un endpoint GraphQL unique, en POST, sans authentification pour les données
 * publiques. Deux contraintes mesurées sur l'API dictent tout ce fichier :
 *
 * 1. **POST** — le Data Cache de `fetch` ne mémorise que les GET. Une option
 *    `next: { revalidate }` posée ici n'aurait aucun effet : la mise en cache se fait un cran
 *    plus haut, dans les fonctions `"use cache"` de `features/<domaine>/server/`.
 * 2. **30 requêtes/minute par IP** (en-tête `X-RateLimit-Limit`, quota nominal de 90 en
 *    fonctionnement normal). Côté serveur ce budget est partagé par tous les visiteurs :
 *    chaque lecture non mise en cache est prélevée sur le même compteur.
 *
 * Le fichier est volontairement isomorphe (pas de `server-only`) : il ne porte aucun secret, et
 * AniList renvoie `Access-Control-Allow-Origin: *`. Un appel depuis le navigateur reste donc
 * possible le jour où un écran a besoin d'un fetch client.
 */

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

/** Une entrée du tableau `errors` d'une réponse GraphQL AniList. */
const anilistErrorSchema = z.object({
  message: z.string(),
  status: z.number().optional(),
});

const anilistErrorBodySchema = z.object({
  errors: z.array(anilistErrorSchema).min(1),
});

/**
 * Enveloppe volontairement lâche : `data` reste `unknown` pour qu'on puisse traiter les erreurs
 * GraphQL — AniList en renvoie parfois avec un HTTP 200 — avant de valider la charge utile.
 */
const anilistEnvelopeSchema = z.object({
  data: z.unknown().nullish(),
  errors: z.array(anilistErrorSchema).optional(),
});

/**
 * Le `name` que porte une erreur de **panne** — API coupée, en erreur, ou quota épuisé.
 *
 * Ce n'est pas une coquetterie de nommage, c'est le seul canal disponible. Une erreur levée
 * dans une fonction `"use cache"` est **resérialisée** en franchissant la frontière : côté
 * appelant, ce n'est plus une `AniListError` mais un `Error` nu, dont il ne reste que `name`,
 * `message` et un `digest` (mesuré le 15 août 2026 avec Next 16.3). `instanceof` répond `false`
 * et `status` vaut `undefined`. Le tri doit donc être fait **avant** la frontière, à la
 * construction, et déposé dans le seul champ qui la traverse.
 */
const ANILIST_OUTAGE_ERROR = "AniListOutageError";

/**
 * La panne, par statut.
 *
 * Le 403 n'est pas ici par excès de prudence : AniList coupe son endpoint en le renvoyant, avec
 * pour message « The AniList API has been temporarily disabled due to severe stability issues. »
 * (constaté le 15 août 2026). Aucune requête ne passe alors, quelle qu'elle soit — c'est une panne
 * générale, à traiter comme un 5xx et non comme un refus d'accès à une ressource.
 *
 * Le 429 rejoint le lot côté affichage — un catalogue absent est un catalogue absent — tout en
 * gardant son propre prédicat pour qui doit distinguer les deux.
 */
function isOutageStatus(status: number) {
  return status === 403 || status === 429 || status >= 500;
}

/**
 * Erreur AniList normalisée : porte le statut renvoyé par l'API et son message métier plutôt
 * que le message générique de la couche transport.
 */
export class AniListError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    // Le nom encode la catégorie parce que lui seul survit à `"use cache"` — voir
    // `ANILIST_OUTAGE_ERROR`.
    this.name = isOutageStatus(status) ? ANILIST_OUTAGE_ERROR : "AniListError";
    this.status = status;
  }

  /** L'entité demandée n'existe pas — à traduire en `notFound()` dans la page. */
  get isNotFound() {
    return this.status === 404;
  }

  /** Quota dépassé : rien ne reviendra avant la fenêtre de la minute suivante. */
  get isRateLimited() {
    return this.status === 429;
  }
}

export function isAniListError(error: unknown): error is AniListError {
  return error instanceof AniListError;
}

/**
 * AniList ne répond pas : coupure, erreur serveur ou quota épuisé.
 *
 * Se contente du `name`, sans `instanceof` : c'est ce qui la rend vraie **des deux côtés** d'un
 * `"use cache"`, là où un `instanceof` ne l'est qu'en amont.
 */
export function isAniListOutage(error: unknown): boolean {
  return error instanceof Error && error.name === ANILIST_OUTAGE_ERROR;
}

/**
 * Exécute une lecture AniList et renvoie `null` si l'API est hors service ou saturée.
 *
 * **À appeler hors d'un `"use cache"`, jamais dedans.** Rattraper la panne à l'intérieur de la
 * fonction cachée mémoriserait le `null` pour toute la durée du `cacheLife` — l'accueil resterait
 * vide une heure après le retour d'AniList. Laissée remontée jusqu'ici, l'erreur empêche l'entrée
 * d'être écrite, et la requête suivante retente.
 *
 * Le filet est **étroit à dessein** : seules la panne (403, 5xx) et le quota (429) donnent `null`.
 * Un 404 reste un 404, et une charge utile qui ne valide pas reste une erreur de code — ni l'un ni
 * l'autre ne doit se déguiser en « catalogue indisponible ».
 */
export async function tryAniList<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (isAniListOutage(error)) return null;
    throw error;
  }
}

type AniListQueryOptions<TSchema extends z.ZodType> = {
  /** Le document GraphQL. */
  query: string;
  /** Les variables du document — on n'interpole jamais de valeur dans la query. */
  variables?: Record<string, unknown>;
  /** Schéma du champ `data` de la réponse. */
  schema: TSchema;
};

/**
 * Exécute un document GraphQL et renvoie son `data`, validé.
 *
 * À ne pas appeler depuis un composant : passer par une query de
 * `features/<domaine>/server/*.queries.ts`, qui porte le `"use cache"` et le `cacheLife`.
 */
export async function anilistQuery<TSchema extends z.ZodType>({
  query,
  variables,
  schema,
}: AniListQueryOptions<TSchema>): Promise<z.infer<TSchema>> {
  // Validation en deux temps, plutôt qu'un `z.object({ data: schema })` passé à upfetch :
  // imbriquer un schéma générique dans un `z.object` fait perdre son type de sortie à Zod.
  // Le transport valide donc l'enveloppe, et le schéma de l'appelant valide la charge utile.
  let envelope: z.infer<typeof anilistEnvelopeSchema>;

  try {
    envelope = await upfetch(ANILIST_ENDPOINT, {
      method: "POST",
      body: { query, variables },
      schema: anilistEnvelopeSchema,
      retry: {
        attempts: 2,
        delay: ({ attempt }) => attempt * 500,
        when: ({ response, error }) => {
          if (error instanceof Error && error.name === "TimeoutError")
            return true;
          // 429 est délibérément absent : la fenêtre de quota dure une minute. L'attendre
          // dépasserait le délai de remplissage d'un `"use cache"` (50 s) et bloquerait le
          // rendu. L'erreur remonte, et le cache est là précisément pour qu'on n'y arrive pas.
          return (response?.status ?? 0) >= 500;
        },
      },
    });
  } catch (error) {
    throw normalizeError(error);
  }

  // GraphQL peut signaler une erreur dans un corps par ailleurs valide, statut 200 inclus.
  const [firstError] = envelope.errors ?? [];
  if (firstError) {
    throw new AniListError(firstError.message, firstError.status ?? 500);
  }

  return schema.parse(envelope.data);
}

/** Remonte le message d'AniList quand la réponse en contient un, sinon l'erreur d'origine. */
function normalizeError(error: unknown): unknown {
  if (!isResponseError(error)) return error;

  const body = anilistErrorBodySchema.safeParse(error.data);
  const first = body.success ? body.data.errors[0] : undefined;

  return new AniListError(
    first?.message ?? error.message,
    first?.status ?? error.status,
  );
}
