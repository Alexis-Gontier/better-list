import type {
  PeopleMedia,
  StaffRoleEdge,
  VoiceRoleEdge,
} from "@/features/people/schemas/people.schema";

/** Les faits d'une personne, du vocabulaire AniList vers le français. */

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

type FuzzyDate = {
  year: number | null;
  month: number | null;
  day: number | null;
};

/**
 * Une date floue : AniList connaît souvent le jour et le mois d'un anniversaire sans l'année — un
 * personnage n'a pas d'année de naissance. On écrit ce qu'on sait, rien de plus.
 */
export function formatFuzzyDate(date: FuzzyDate | null): string | null {
  if (!date) return null;
  const month = date.month ? MONTHS[date.month - 1] : undefined;
  const day =
    date.day && month ? (date.day === 1 ? "1er" : String(date.day)) : null;
  const parts = [
    day,
    month ?? null,
    date.year ? String(date.year) : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * L'âge. Un nombre chez un staff, **du texte libre** chez un personnage : « 17- » veut dire
 * « 17 ans au début de l'histoire » (AniList l'affiche « Initial Age »). Le reste passe tel quel.
 */
export function formatAge(age: string | number | null): string | null {
  if (age === null || age === "") return null;
  if (typeof age === "number") return `${age} ans`;
  if (/^\d+$/.test(age)) return `${age} ans`;
  const initial = age.match(/^(\d+)-$/);
  if (initial) return `${initial[1]} ans au début`;
  return age;
}

/** Les années d'activité : une borne veut dire « toujours actif », deux une carrière close. */
export function formatYearsActive(years: (number | null)[]): string | null {
  const [start, end] = years.filter((year): year is number => year !== null);
  if (start === undefined) return null;
  return end === undefined ? `depuis ${start}` : `${start} – ${end}`;
}

const GENDER_LABELS: Record<string, string> = {
  Male: "Homme",
  Female: "Femme",
  "Non-binary": "Non binaire",
};

export function formatGender(gender: string | null): string | null {
  if (!gender) return null;
  return GENDER_LABELS[gender] ?? gender;
}

/**
 * Les métiers, en noms d'activité plutôt qu'en noms de personne : « Doublage » et non
 * « Doubleur », ce qui évite d'accorder au genre de quelqu'un qu'AniList ne renseigne pas toujours.
 */
const OCCUPATION_LABELS: Record<string, string> = {
  "Voice Actor": "Doublage",
  Singer: "Chant",
  Mangaka: "Manga",
  Animator: "Animation",
  Director: "Réalisation",
  Illustrator: "Illustration",
  Writer: "Écriture",
  Composer: "Composition",
  Actor: "Comédie",
};

export function formatOccupations(list: (string | null)[]): string | null {
  const labels = list
    .filter((item): item is string => Boolean(item))
    .map((item) => OCCUPATION_LABELS[item] ?? item);
  return labels.length > 0 ? labels.join(", ") : null;
}

export type YearGroup<T> = { year: number | null; items: T[] };

/**
 * Groupe par année **dans l'ordre d'AniList**, qui trie déjà `START_DATE_DESC` et met les œuvres
 * sans date (« À venir ») en tête. Une `Map` plutôt qu'un groupement consécutif : une année qui
 * reviendrait plus loin rejoint son groupe au lieu d'en ouvrir un second.
 */
export function groupByYear<T>(
  items: T[],
  yearOf: (item: T) => number | null,
): YearGroup<T>[] {
  const groups = new Map<number | null, T[]>();
  for (const item of items) {
    const year = yearOf(item);
    const group = groups.get(year);
    if (group) group.push(item);
    else groups.set(year, [item]);
  }
  return [...groups].map(([year, grouped]) => ({ year, items: grouped }));
}

/** Une œuvre peut revenir avec plusieurs postes : une carte, tous ses rôles. */
export function mergeStaffRoles(
  edges: StaffRoleEdge[],
): { media: PeopleMedia; roles: string[] }[] {
  const rows = new Map<number, { media: PeopleMedia; roles: string[] }>();
  for (const edge of edges) {
    const row = rows.get(edge.node.id) ?? { media: edge.node, roles: [] };
    if (edge.staffRole) row.roles.push(edge.staffRole);
    rows.set(edge.node.id, row);
  }
  return [...rows.values()];
}

export type VoicedCharacter = NonNullable<VoiceRoleEdge["characters"][number]>;

/** Même règle pour le doublage : une œuvre, tous les personnages que la personne y double. */
export function mergeVoiceRoles(
  edges: VoiceRoleEdge[],
): { media: PeopleMedia; characters: VoicedCharacter[] }[] {
  const rows = new Map<
    number,
    { media: PeopleMedia; characters: VoicedCharacter[] }
  >();
  for (const edge of edges) {
    const row = rows.get(edge.node.id) ?? { media: edge.node, characters: [] };
    for (const character of edge.characters) {
      if (
        character &&
        !row.characters.some((known) => known.id === character.id)
      ) {
        row.characters.push(character);
      }
    }
    rows.set(edge.node.id, row);
  }
  return [...rows.values()];
}
