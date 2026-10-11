/**
 * Les deux seuls comptes que la suite E2E touche. Ids et emails sont namespacés pour qu'aucune
 * requête de nettoyage ne puisse atteindre un vrai membre : `.invalid` est réservé (RFC 2606).
 */
export const accounts = {
  member: {
    id: "e2e-member",
    username: "e2e-member",
    email: "e2e-member@example.invalid",
    status: "APPROVED",
    storageState: "e2e/.auth/member.json",
  },
  pending: {
    id: "e2e-pending",
    username: "e2e-pending",
    email: "e2e-pending@example.invalid",
    status: "PENDING",
    storageState: "e2e/.auth/pending.json",
  },
} as const;

export type TestAccount = (typeof accounts)[keyof typeof accounts];
