/**
 * Découpe un titre en morceaux, **en marquant ceux qui reprennent le terme cherché**.
 *
 * La comparaison ignore la casse : « frieren » doit marquer « Frieren ». Toutes les occurrences
 * sont marquées, pas seulement la première — « One Piece » cherché dans « ONE PIECE: One Piece
 * Film » se lit aux deux endroits.
 *
 * **Elle n'ignore pas les accents**, et c'est un choix de simplicité : normaliser en NFD change la
 * longueur de la chaîne, donc les positions à reporter sur le titre affiché. Un titre du catalogue
 * est presque toujours en romaji ou en anglais, où la question ne se pose pas.
 *
 * Un titre qu'AniList a trouvé par un **titre alternatif** ne contient pas le terme : il revient
 * entier, sans marque, et c'est juste — il n'y a rien de commun à montrer.
 */
export function highlightMatch(
  text: string,
  query: string,
): Array<{ text: string; match: boolean }> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];

  const haystack = text.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), match: false });
    }
    parts.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false });
  }

  return parts;
}
