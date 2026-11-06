import * as z from "zod";

/**
 * La liste visée par un like ou une copie. Un `cuid` venu du client : on n'en valide que la forme,
 * comme `lists.schema.ts` ; c'est le `where` de l'action qui en vérifie la visibilité.
 */
export const listTargetSchema = z.object({
  listId: z.string().min(1).max(64),
});
