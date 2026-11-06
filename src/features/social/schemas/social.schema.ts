import * as z from "zod";

/**
 * La liste visée par un like ou une copie. Un `cuid` venu du client : on n'en valide que la forme,
 * comme `lists.schema.ts` ; c'est le `where` de l'action qui en vérifie la visibilité.
 */
export const listTargetSchema = z.object({
  listId: z.string().min(1).max(64),
});

/** Une ligne de l'onglet « Activité » de la cloche (maquette E). */
export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(["LIST_LIKED", "LIST_FORKED", "SIGNUP_PENDING"]),
  actorName: z.string(),
  actorImage: z.string().nullable(),
  listId: z.string().nullable(),
  listTitle: z.string().nullable(),
  /** Le fournisseur d'une demande d'inscription (« discord »), lu à l'affichage. */
  provider: z.string().nullable(),
  /** En secondes Unix, comme les épisodes de l'onglet voisin. */
  createdAt: z.number().int(),
  read: z.boolean(),
});
export type ActivityItem = z.infer<typeof activityItemSchema>;

export const activitySchema = z.object({
  unread: z.number().int().nonnegative(),
  items: z.array(activityItemSchema),
});
export type Activity = z.infer<typeof activitySchema>;
