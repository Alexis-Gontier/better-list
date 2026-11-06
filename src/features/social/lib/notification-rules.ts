/*
  Pas de `server-only` : le menu de la cloche, côté client, compose ses lignes avec
  `notificationLabel`.
*/

type NotificationType = "LIST_LIKED" | "LIST_FORKED" | "SIGNUP_PENDING";

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  discord: "Discord",
  google: "Google",
};

/** On ne s'annonce pas à soi-même son propre geste. */
export function shouldNotify({
  actorId,
  recipientId,
}: {
  actorId: string;
  recipientId: string;
}): boolean {
  return actorId !== recipientId;
}

/** Les deux morceaux d'une ligne de la cloche : la phrase, puis son objet en gras (maquette E). */
export function notificationLabel(notification: {
  type: NotificationType;
  actorName: string;
  listTitle: string | null;
  provider: string | null;
}): { lead: string; subject: string } {
  const { type, actorName, listTitle, provider } = notification;

  if (type === "SIGNUP_PENDING") {
    const via = provider ? ` (${PROVIDER_LABELS[provider] ?? provider})` : "";
    return { lead: "Nouvelle demande :", subject: `${actorName}${via}` };
  }

  const verb = type === "LIST_LIKED" ? "a aimé" : "a copié";
  return { lead: `${actorName} ${verb}`, subject: listTitle ?? "" };
}
