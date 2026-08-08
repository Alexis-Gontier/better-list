/**
 * Le `slug` d'une liste — ce qui porte son URL.
 *
 * Fonction pure et testée (`list-slug.test.ts`), parce que c'est le genre de code qu'on croit
 * évident et qui produit `/lists/---` au premier titre exotique.
 *
 * Deux contraintes viennent du produit : les titres sont saisis en français, donc accentués, et
 * rien n'empêche d'appeler une liste « 葬送のフリーレン » ou « ⭐ ». Un slug doit rester lisible dans
 * une barre d'adresse **et** ne jamais être vide.
 */

/** Au-delà, l'URL devient illisible sans rien apporter. Le titre complet reste en base. */
const MAX_LENGTH = 60;

/** Repli quand il ne reste rien d'utilisable — un titre entièrement en japonais, par exemple. */
const FALLBACK = "liste";

export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    // Retire les diacritiques une fois les caractères décomposés : « Été » devient « ete ».
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Tout ce qui n'est ni lettre latine ni chiffre devient un séparateur, y compris les emojis.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    // Le `slice` peut laisser un tiret en fin de chaîne s'il tombe au milieu d'un séparateur.
    .replace(/-+$/g, "");

  return slug || FALLBACK;
}

/**
 * Rend un slug unique parmi ceux déjà pris.
 *
 * Un suffixe numérique, et non un identifiant aléatoire : deux listes appelées « Top 2026 » donnent
 * `top-2026` et `top-2026-2`, ce qui reste lisible et devinable. L'unicité réelle est garantie en
 * base par `@@unique([ownerId, slug])` — cette fonction évite l'aller-retour dans le cas courant,
 * elle ne remplace pas la contrainte.
 */
export function uniqueSlug(title: string, taken: string[]): string {
  const base = slugify(title);
  const used = new Set(taken);

  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix++;

  return `${base}-${suffix}`;
}
