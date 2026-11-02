/**
 * Les seuls comptes que la suite E2E touche. Ids et emails sont namespacés pour qu'aucune requête
 * de nettoyage ne puisse atteindre un vrai membre : `.invalid` est réservé (RFC 2606).
 */
export const accounts = {
  member: {
    id: "e2e-member",
    username: "e2e-member",
    email: "e2e-member@example.invalid",
    status: "APPROVED",
    role: null,
    storageState: "e2e/.auth/member.json",
  },
  pending: {
    id: "e2e-pending",
    username: "e2e-pending",
    email: "e2e-pending@example.invalid",
    status: "PENDING",
    role: null,
    storageState: "e2e/.auth/pending.json",
  },
  admin: {
    id: "e2e-admin",
    username: "e2e-admin",
    email: "e2e-admin@example.invalid",
    status: "APPROVED",
    role: "admin",
    storageState: "e2e/.auth/admin.json",
  },
  /**
   * La demande que l'administrateur approuve puis annule. **Distincte de `pending`** : les specs
   * tournent en parallèle, et basculer `pending` ferait vaciller `access.spec.ts`.
   */
  request: {
    id: "e2e-request",
    username: "e2e-request",
    email: "e2e-request@example.invalid",
    status: "PENDING",
    role: null,
    storageState: "e2e/.auth/request.json",
  },
} as const;

export type TestAccount = (typeof accounts)[keyof typeof accounts];
