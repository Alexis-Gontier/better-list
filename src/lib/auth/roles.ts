/**
 * Le rôle qui ouvre `/admin/users`. Une seule valeur : à dix comptes, il n'y a pas de modérateur
 * entre le membre et l'administrateur.
 */
export const ADMIN_ROLE = "admin";

export function isAdmin(user: { role?: string | null }) {
  return user.role === ADMIN_ROLE;
}
