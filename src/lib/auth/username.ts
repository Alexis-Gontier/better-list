/** Longueur maximale d'un `login` GitHub, donc du `username` qu'on en dérive. */
export const MAX_USERNAME_LENGTH = 39;

/**
 * Ramène un nom proposé par un fournisseur à ce qu'une URL `/u/[username]` peut porter.
 *
 * Les trois fournisseurs n'ont pas le même alphabet : GitHub est déjà propre, Discord accepte `.`
 * et `_`, Google ne donne qu'une adresse. On garde `[a-z0-9-]` pour tous.
 */
export function normalizeUsername(candidate: string) {
  return (
    candidate
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_USERNAME_LENGTH) || "membre"
  );
}
