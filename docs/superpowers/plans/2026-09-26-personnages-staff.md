# Pages Personnage et Staff — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter `/character/[id]` et `/staff/[id]`, alimentées par AniList, et relier les cartes
Personnages / Équipe de la fiche d'une œuvre à ces pages.

**Architecture:** Nouvelle feature `src/features/people/` (schémas Zod, documents GraphQL, deux
lectures `"use cache"`, fonctions pures testées, composants serveur + une feuille client pour les
spoilers). Deux routes sous `src/app/(app)/`, calquées sur `/media/[id]/page.tsx` (Suspense,
`tryAniList`, `ReportAniListStatus`). Une requête AniList par affichage.

**Tech Stack:** Next 16 (App Router, `"use cache"`, `PageProps`), React 19, Zod 4, nuqs 2
(`nuqs/server`), Vitest, Tailwind 4, shadcn.

**Spec:** [docs/superpowers/specs/2026-09-26-personnages-staff-design.md](../specs/2026-09-26-personnages-staff-design.md)

## Global Constraints

- Lire CLAUDE.md. Rappels : aucun chemin en dur (tout passe par `src/config/routes.ts`) ; pas de
  `process.env` ; appels HTTP uniquement via `anilistQuery` ; `"use client"` sur la feuille
  seulement ; `import "server-only"` en tête de tout fichier de `features/*/server/` qui lit.
- Fichiers en `kebab-case`, alias unique `@/*`, pas de barrel `index.ts`.
- Une panne AniList se rattrape **hors** du `"use cache"` (`tryAniList`) ; le 404 se rattrape
  **dedans** (`isAniListError(error) && error.isNotFound`).
- Aucun texte AniList n'est injecté en HTML brut : on rend des éléments React.
- Un tableau AniList se valide en `.nullish().transform((v) => v ?? [])`, jamais `.default([])`
  seul (un `null` le fait échouer).
- Taille de page : `CATALOGUE_PAGE_SIZE` (21) de `@/config/catalogue`.
- Commentaires en français, qui disent le **pourquoi**, densité du code voisin.
- Commandes : `node_modules/.bin/vitest run <fichier>`, `node_modules/.bin/tsc --noEmit` (après
  `node_modules/.bin/next typegen` si `PageProps` est introuvable), `node_modules/.bin/biome check <chemins>`.
- Messages de commit : `feat(personnes): …`, en français, terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Expressions régulières : utiliser `texte.match(regex)` (le hook de sécurité du poste bloque
  l'écriture de la méthode d'exécution des regex, qu'il confond avec celle de `child_process`).

---

### Task 1: Schémas Zod de `people`

**Files:**
- Create: `src/features/people/schemas/people.schema.ts`
- Test: `src/features/people/schemas/people.schema.test.ts`

**Interfaces:**
- Consumes: `fuzzyDateSchema`, `mediaCompactSchema` de `@/features/media/schemas/media.schema`.
- Produces: `characterDataSchema`, `staffDataSchema`, types `Character`, `Staff`,
  `CharacterMediaEdge`, `VoiceRoleEdge`, `StaffRoleEdge`, `PeopleMedia`, `PeopleConnection<E>`.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";

import {
  characterDataSchema,
  staffDataSchema,
} from "@/features/people/schemas/people.schema";

const media = {
  id: 21,
  type: "ANIME",
  format: "TV",
  status: "RELEASING",
  averageScore: 88,
  isAdult: false,
  title: { romaji: "ONE PIECE", english: null, native: null, userPreferred: "ONE PIECE" },
  coverImage: { extraLarge: null, large: "x", medium: null, color: null },
  episodes: null,
  chapters: null,
  season: null,
  seasonYear: null,
  genres: [],
  countryOfOrigin: "JP",
  description: null,
  startDate: { year: null },
};

describe("characterDataSchema", () => {
  it("accepte la forme relevée sur Luffy, âge en chaîne et année de naissance nulle", () => {
    const { Character } = characterDataSchema.parse({
      Character: {
        id: 40,
        name: { full: "Luffy Monkey", native: "ルフィ", alternative: ["Straw Hat"], alternativeSpoiler: null },
        image: { large: "x" },
        description: null,
        gender: "Male",
        age: "17-",
        bloodType: "F",
        favourites: 36031,
        dateOfBirth: { year: null, month: 5, day: 5 },
        media: {
          pageInfo: { total: 500, hasNextPage: true },
          edges: [{ characterRole: "MAIN", voiceActors: null, node: media }],
        },
      },
    });

    expect(Character?.age).toBe("17-");
    expect(Character?.name.alternativeSpoiler).toEqual([]);
    expect(Character?.media?.edges[0]?.voiceActors).toEqual([]);
  });
});

describe("staffDataSchema", () => {
  it("accepte un décès entièrement nul et des listes vides à null", () => {
    const { Staff } = staffDataSchema.parse({
      Staff: {
        id: 95021,
        name: { full: "Kazuhiko Inoue", native: null, alternative: null },
        image: null,
        description: null,
        gender: "Male",
        age: 72,
        bloodType: "O",
        favourites: 850,
        primaryOccupations: null,
        yearsActive: [1973],
        homeTown: null,
        dateOfBirth: { year: 1954, month: 3, day: 26 },
        dateOfDeath: { year: null, month: null, day: null },
        voiceRoles: {
          pageInfo: { total: 500, hasNextPage: true },
          edges: [{ characterRole: "MAIN", characters: null, node: media }],
        },
        animeRoles: { pageInfo: { total: 0, hasNextPage: false }, edges: null },
        mangaRoles: null,
      },
    });

    expect(Staff?.primaryOccupations).toEqual([]);
    expect(Staff?.voiceRoles?.edges[0]?.characters).toEqual([]);
    expect(Staff?.animeRoles?.edges).toEqual([]);
    expect(Staff?.mangaRoles).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `node_modules/.bin/vitest run src/features/people/schemas/people.schema.test.ts`
Expected: FAIL — module `people.schema` introuvable.

- [ ] **Step 3: Écrire le schéma**

```ts
import * as z from "zod";

import {
  fuzzyDateSchema,
  mediaCompactSchema,
} from "@/features/media/schemas/media.schema";

/**
 * Formes AniList d'un personnage et d'un membre du staff (docs/superpowers/specs/
 * 2026-09-26-personnages-staff-design.md).
 *
 * **Un tableau AniList peut arriver à `null`**, pas seulement absent : c'est ce qui a fait tomber
 * la fiche d'une œuvre sans audience le 26 septembre 2026 (docs/JOURNAL.md). `.default([])` ne
 * couvre que l'absence, d'où ce `transform` qui garde un tableau pour les lecteurs.
 */
function listOf<T extends z.ZodType>(item: T) {
  return z
    .array(item)
    .nullish()
    .transform((list) => list ?? []);
}

const personImageSchema = z.object({ large: z.string().nullable() }).nullable();

const personNameSchema = z.object({
  full: z.string().nullable(),
  native: z.string().nullable(),
  alternative: listOf(z.string().nullable()),
});

/**
 * La page d'une liste chez AniList. `total` plafonne à 500 sur ces listes (relevé le 26 septembre
 * 2026) : seul `hasNextPage` dit la vérité sur la suite, et `total` ne sert qu'à savoir si la liste
 * est vide — sous le plafond, zéro est exact.
 */
const pageInfoSchema = z.object({
  total: z.number().int().nullable(),
  hasNextPage: z.boolean().nullable(),
});

/**
 * L'œuvre d'une grille de personne : la carte du catalogue, plus l'année de début qui sert à
 * grouper les rôles d'un staff.
 */
export const peopleMediaSchema = mediaCompactSchema.extend({
  startDate: z.object({ year: z.number().int().nullable() }).nullable(),
});
export type PeopleMedia = z.infer<typeof peopleMediaSchema>;

const personRefSchema = z.object({
  id: z.number().int(),
  name: z.object({ full: z.string().nullable() }),
  image: personImageSchema,
});

function connectionOf<T extends z.ZodType>(edge: T) {
  return z.object({ pageInfo: pageInfoSchema, edges: listOf(edge) }).nullable();
}

export type PeopleConnection<E> = {
  pageInfo: z.infer<typeof pageInfoSchema>;
  edges: E[];
} | null;

export const characterMediaEdgeSchema = z.object({
  characterRole: z.string().nullable(),
  voiceActors: listOf(personRefSchema),
  node: peopleMediaSchema,
});
export type CharacterMediaEdge = z.infer<typeof characterMediaEdgeSchema>;

export const characterSchema = z.object({
  id: z.number().int(),
  name: personNameSchema.extend({
    alternativeSpoiler: listOf(z.string().nullable()),
  }),
  image: personImageSchema,
  description: z.string().nullable(),
  gender: z.string().nullable(),
  /** Texte libre chez AniList (« 17- », « 20s »), pas un nombre. */
  age: z.string().nullable(),
  bloodType: z.string().nullable(),
  favourites: z.number().int().nullable(),
  dateOfBirth: fuzzyDateSchema.nullable(),
  media: connectionOf(characterMediaEdgeSchema),
});
export type Character = z.infer<typeof characterSchema>;

export const characterDataSchema = z.object({
  Character: characterSchema.nullable(),
});

export const voiceRoleEdgeSchema = z.object({
  characterRole: z.string().nullable(),
  /** Les personnages que **cette personne** double dans l'œuvre — plusieurs parfois. */
  characters: listOf(personRefSchema.nullable()),
  node: peopleMediaSchema,
});
export type VoiceRoleEdge = z.infer<typeof voiceRoleEdgeSchema>;

export const staffRoleEdgeSchema = z.object({
  staffRole: z.string().nullable(),
  node: peopleMediaSchema,
});
export type StaffRoleEdge = z.infer<typeof staffRoleEdgeSchema>;

export const staffSchema = z.object({
  id: z.number().int(),
  name: personNameSchema,
  image: personImageSchema,
  description: z.string().nullable(),
  gender: z.string().nullable(),
  /** Un nombre ici, à l'inverse du personnage. */
  age: z.number().int().nullable(),
  bloodType: z.string().nullable(),
  favourites: z.number().int().nullable(),
  primaryOccupations: listOf(z.string().nullable()),
  yearsActive: listOf(z.number().int().nullable()),
  homeTown: z.string().nullable(),
  dateOfBirth: fuzzyDateSchema.nullable(),
  /** Un objet aux trois champs nuls pour une personne vivante, pas `null`. */
  dateOfDeath: fuzzyDateSchema.nullable(),
  voiceRoles: connectionOf(voiceRoleEdgeSchema),
  animeRoles: connectionOf(staffRoleEdgeSchema),
  mangaRoles: connectionOf(staffRoleEdgeSchema),
});
export type Staff = z.infer<typeof staffSchema>;

export const staffDataSchema = z.object({ Staff: staffSchema.nullable() });
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `node_modules/.bin/vitest run src/features/people/schemas/people.schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/people/schemas
git commit -m "feat(personnes): schémas AniList d'un personnage et d'un staff"
```

---

### Task 2: Routes et parseur de biographie

**Files:**
- Modify: `src/config/routes.ts` (ajout de `character` et `staff`)
- Create: `src/features/people/lib/people-bio.ts`
- Test: `src/features/people/lib/people-bio.test.ts`

**Interfaces:**
- Consumes: `routes.media`.
- Produces: `routes.character(id: number)`, `routes.staff(id: number)` ; `type BioSegment`,
  `type BioParagraph = BioSegment[]`, `parseBio(text: string | null): BioParagraph[]`,
  `resolveBioHref(raw: string): { href: string; external: boolean } | null`.

- [ ] **Step 1: Ajouter les routes** dans `src/config/routes.ts`, juste après `media` :

```ts
  /**
   * Un personnage, et les œuvres où il apparaît. Un seul segment, l'id AniList — comme `media`.
   */
  character: (id: number) => `/character/${id}` as const,

  /** Un membre du staff : doublage, réalisation, écriture. Même contrat que `character`. */
  staff: (id: number) => `/staff/${id}` as const,
```

- [ ] **Step 2: Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";

import { parseBio, resolveBioHref } from "@/features/people/lib/people-bio";

describe("resolveBioHref", () => {
  it("réécrit les liens AniList vers nos routes", () => {
    expect(resolveBioHref("https://anilist.co/character/17/Shanks")).toEqual({ href: "/character/17", external: false });
    expect(resolveBioHref("https://anilist.co/staff/95021")).toEqual({ href: "/staff/95021", external: false });
    expect(resolveBioHref("https://anilist.co/anime/21/ONE-PIECE/")).toEqual({ href: "/media/21", external: false });
    expect(resolveBioHref("/manga/30013")).toEqual({ href: "/media/30013", external: false });
  });

  it("garde les autres liens http(s) en externe et refuse le reste", () => {
    expect(resolveBioHref("https://twitter.com/x")).toEqual({ href: "https://twitter.com/x", external: true });
    expect(resolveBioHref("javascript:alert(1)")).toBeNull();
    expect(resolveBioHref("pas une url")).toBeNull();
  });
});

describe("parseBio", () => {
  it("rend un texte nu en un paragraphe", () => {
    expect(parseBio("Bonjour.")).toEqual([[{ kind: "text", text: "Bonjour." }]]);
  });

  it("rend null et le vide en aucun paragraphe", () => {
    expect(parseBio(null)).toEqual([]);
    expect(parseBio("  \n\n ")).toEqual([]);
  });

  it("sépare les paragraphes sur une ligne vide et garde les retours simples", () => {
    expect(parseBio("a\nb\n\nc")).toEqual([
      [{ kind: "text", text: "a" }, { kind: "break" }, { kind: "text", text: "b" }],
      [{ kind: "text", text: "c" }],
    ]);
  });

  it("lit le gras en __ comme en **", () => {
    expect(parseBio("__Height:__ 172 cm **x**")).toEqual([
      [
        { kind: "strong", children: [{ kind: "text", text: "Height:" }] },
        { kind: "text", text: " 172 cm " },
        { kind: "strong", children: [{ kind: "text", text: "x" }] },
      ],
    ]);
  });

  it("réécrit un lien AniList et laisse le texte d'un lien refusé", () => {
    expect(parseBio("[Shanks](https://anilist.co/character/17) et [x](javascript:y)")).toEqual([
      [
        { kind: "link", href: "/character/17", external: false, children: [{ kind: "text", text: "Shanks" }] },
        { kind: "text", text: " et " },
        { kind: "text", text: "x" },
      ],
    ]);
  });

  it("masque un spoiler qui contient du gras et traverse une ligne", () => {
    expect(parseBio("~!__A:__ b\nc!~ fin")).toEqual([
      [
        {
          kind: "spoiler",
          children: [
            { kind: "strong", children: [{ kind: "text", text: "A:" }] },
            { kind: "text", text: " b" },
            { kind: "break" },
            { kind: "text", text: "c" },
          ],
        },
        { kind: "text", text: " fin" },
      ],
    ]);
  });

  it("garde un spoiler entier même s'il traverse une ligne vide", () => {
    const [paragraph, ...rest] = parseBio("~!a\n\nb!~");
    expect(rest).toEqual([]);
    expect(paragraph?.[0]?.kind).toBe("spoiler");
  });

  it("nettoie les balises HTML qu'AniList laisse passer", () => {
    expect(parseBio("a<br>b &amp; <i>c</i>")).toEqual([
      [{ kind: "text", text: "a" }, { kind: "break" }, { kind: "text", text: "b & c" }],
    ]);
  });
});
```

- [ ] **Step 3: Lancer le test, vérifier qu'il échoue**

Run: `node_modules/.bin/vitest run src/features/people/lib/people-bio.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire le parseur**

```ts
import { routes } from "@/config/routes";

/**
 * La biographie d'un personnage ou d'un staff, du markdown AniList vers des segments.
 *
 * C'est de la saisie de contributeurs : gras (`__x__`, `**x**`), liens (`[texte](url)`), spoilers
 * (`~!x!~`, y compris sur plusieurs lignes et contenant du gras), et des restes de HTML. On la
 * découpe en segments que l'écran rend en éléments React — **jamais** en HTML brut, même règle que
 * le synopsis (`media-synopsis.tsx`). Tout ce qui n'est pas reconnu reste du texte.
 */
export type BioSegment =
  | { kind: "text"; text: string }
  | { kind: "break" }
  | { kind: "strong"; children: BioSegment[] }
  | { kind: "spoiler"; children: BioSegment[] }
  | { kind: "link"; href: string; external: boolean; children: BioSegment[] };

export type BioParagraph = BioSegment[];

const ANILIST_LINK =
  /^(?:https?:\/\/(?:www\.)?anilist\.co)?\/(anime|manga|character|staff)\/(\d+)/i;

/**
 * Où mène un lien de biographie. Un lien AniList devient une route à nous — une page de personnage
 * qui renverrait sur anilist.co ferait sortir de l'app à chaque nom cité. Les autres liens restent
 * externes, **à condition d'être en http(s)** : `javascript:` et consorts sont refusés, et le
 * lien retombe sur son texte.
 */
export function resolveBioHref(
  raw: string,
): { href: string; external: boolean } | null {
  const match = raw.match(ANILIST_LINK);
  if (match) {
    const id = Number(match[2]);
    const kind = match[1]?.toLowerCase();
    const href =
      kind === "character"
        ? routes.character(id)
        : kind === "staff"
          ? routes.staff(id)
          : routes.media(id);
    return { href, external: false };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { href: url.toString(), external: true };
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

function normalize(text: string): string {
  return (
    text
      .replace(/\r\n?/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&(?:amp|quot|#0?39|lt|gt|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
      // `~~~texte~~~` centre un bloc sur AniList ; ici il n'aurait aucun sens, on garde le texte.
      .replace(/~~~/g, "")
  );
}

type Frame = {
  kind: "root" | "strong" | "spoiler";
  marker: string;
  children: BioSegment[];
};

const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/;

function parseInline(source: string): BioSegment[] {
  const root: Frame = { kind: "root", marker: "", children: [] };
  const stack: Frame[] = [root];
  let buffer = "";

  const top = () => stack[stack.length - 1] as Frame;
  const flush = () => {
    if (buffer) top().children.push({ kind: "text", text: buffer });
    buffer = "";
  };
  // Referme les cadres jusqu'à celui demandé inclus : un gras resté ouvert dans un spoiler se
  // referme avec lui, plutôt que d'avaler la suite de la biographie.
  const closeUntil = (kind: Frame["kind"]) => {
    while (stack.length > 1) {
      const frame = stack.pop() as Frame;
      top().children.push({
        kind: frame.kind as "strong" | "spoiler",
        children: frame.children,
      });
      if (frame.kind === kind) return;
    }
  };

  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);

    if (rest.startsWith("~!")) {
      flush();
      stack.push({ kind: "spoiler", marker: "~!", children: [] });
      index += 2;
      continue;
    }
    if (rest.startsWith("!~") && stack.some((frame) => frame.kind === "spoiler")) {
      flush();
      closeUntil("spoiler");
      index += 2;
      continue;
    }

    const marker = rest.startsWith("__") ? "__" : rest.startsWith("**") ? "**" : null;
    if (marker) {
      flush();
      const current = top();
      if (current.kind === "strong" && current.marker === marker) closeUntil("strong");
      else stack.push({ kind: "strong", marker, children: [] });
      index += 2;
      continue;
    }

    const link = rest.match(LINK);
    if (link) {
      flush();
      const children = parseInline(link[1] ?? "");
      const target = resolveBioHref(link[2] ?? "");
      if (target) top().children.push({ kind: "link", ...target, children });
      else top().children.push(...children);
      index += link[0].length;
      continue;
    }

    if (rest[0] === "\n") {
      flush();
      top().children.push({ kind: "break" });
      index += 1;
      continue;
    }

    buffer += rest[0];
    index += 1;
  }

  flush();
  // Un marqueur jamais refermé : on garde ce qu'il enveloppe, sans le perdre ni le montrer brut.
  while (stack.length > 1) closeUntil(top().kind);
  return root.children;
}

function isBlank(segment: BioSegment): boolean {
  return (
    segment.kind === "break" ||
    (segment.kind === "text" && segment.text.trim() === "")
  );
}

function trimParagraph(paragraph: BioParagraph): BioParagraph {
  let start = 0;
  let end = paragraph.length;
  while (start < end && isBlank(paragraph[start] as BioSegment)) start += 1;
  while (end > start && isBlank(paragraph[end - 1] as BioSegment)) end -= 1;
  return paragraph.slice(start, end);
}

/**
 * Découpe **après** l'analyse, et seulement au premier niveau : un spoiler qui traverse une ligne
 * vide reste un seul spoiler, au lieu d'être coupé en deux moitiés dont la seconde s'afficherait.
 */
function splitParagraphs(segments: BioSegment[]): BioParagraph[] {
  const paragraphs: BioParagraph[] = [[]];
  let breaks = 0;

  for (const segment of segments) {
    if (segment.kind === "break") {
      breaks += 1;
      continue;
    }
    const current = paragraphs[paragraphs.length - 1] as BioParagraph;
    if (breaks >= 2 && current.length > 0) {
      paragraphs.push([segment]);
    } else {
      if (breaks === 1 && current.length > 0) current.push({ kind: "break" });
      current.push(segment);
    }
    breaks = 0;
  }

  return paragraphs
    .map(trimParagraph)
    .filter((paragraph) => paragraph.length > 0);
}

export function parseBio(text: string | null): BioParagraph[] {
  if (!text) return [];
  return splitParagraphs(parseInline(normalize(text)));
}
```

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `node_modules/.bin/vitest run src/features/people/lib/people-bio.test.ts`
Expected: PASS (10 tests). Si un test d'égalité échoue sur la frontière d'un segment texte,
corriger le parseur, pas le test.

- [ ] **Step 6: Commit**

```bash
git add src/config/routes.ts src/features/people/lib/people-bio.ts src/features/people/lib/people-bio.test.ts
git commit -m "feat(personnes): la biographie AniList, lue en segments et liens réécrits"
```

---

### Task 3: Libellés des faits, groupement par année, contrat d'URL

**Files:**
- Create: `src/features/people/lib/people-format.ts`
- Create: `src/features/people/lib/people-params.ts`
- Test: `src/features/people/lib/people-format.test.ts`
- Test: `src/features/people/lib/people-params.test.ts`

**Interfaces:**
- Consumes: types `PeopleMedia`, `VoiceRoleEdge`, `StaffRoleEdge` (Task 1).
- Produces:
  - `formatFuzzyDate(date: { year: number | null; month: number | null; day: number | null } | null): string | null`
  - `formatAge(age: string | number | null): string | null`
  - `formatYearsActive(years: (number | null)[]): string | null`
  - `formatGender(gender: string | null): string | null`
  - `formatOccupations(list: (string | null)[]): string | null`
  - `groupByYear<T>(items: T[], yearOf: (item: T) => number | null): YearGroup<T>[]` où `YearGroup<T> = { year: number | null; items: T[] }`
  - `mergeStaffRoles(edges: StaffRoleEdge[]): { media: PeopleMedia; roles: string[] }[]`
  - `mergeVoiceRoles(edges: VoiceRoleEdge[]): { media: PeopleMedia; characters: VoicedCharacter[] }[]` où `VoicedCharacter = NonNullable<VoiceRoleEdge["characters"][number]>`
  - `STAFF_TABS`, `type StaffTab`, `STAFF_TAB_LABELS`, `loadPeopleParams`, `serializePeopleParams`, `toPage(page: number): number`

- [ ] **Step 1: Écrire les tests qui échouent**

`people-format.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import {
  formatAge,
  formatFuzzyDate,
  formatGender,
  formatOccupations,
  formatYearsActive,
  groupByYear,
  mergeStaffRoles,
  mergeVoiceRoles,
} from "@/features/people/lib/people-format";
import type { PeopleMedia } from "@/features/people/schemas/people.schema";

const media = (id: number) => ({ id }) as PeopleMedia;

describe("formatFuzzyDate", () => {
  it("écrit jour, mois et année quand ils sont connus", () => {
    expect(formatFuzzyDate({ year: 1954, month: 3, day: 26 })).toBe("26 mars 1954");
    expect(formatFuzzyDate({ year: null, month: 5, day: 1 })).toBe("1er mai");
    expect(formatFuzzyDate({ year: 2001, month: null, day: null })).toBe("2001");
  });

  it("rend null quand rien n'est connu", () => {
    expect(formatFuzzyDate({ year: null, month: null, day: null })).toBeNull();
    expect(formatFuzzyDate(null)).toBeNull();
  });
});

describe("formatAge", () => {
  it("lit l'âge d'un staff et celui, textuel, d'un personnage", () => {
    expect(formatAge(72)).toBe("72 ans");
    expect(formatAge("17")).toBe("17 ans");
    expect(formatAge("17-")).toBe("17 ans au début");
    expect(formatAge("20s")).toBe("20s");
    expect(formatAge(null)).toBeNull();
  });
});

describe("formatYearsActive", () => {
  it("écrit une ou deux bornes", () => {
    expect(formatYearsActive([1973])).toBe("depuis 1973");
    expect(formatYearsActive([1973, 2010])).toBe("1973 – 2010");
    expect(formatYearsActive([])).toBeNull();
    expect(formatYearsActive([null])).toBeNull();
  });
});

describe("formatGender / formatOccupations", () => {
  it("traduit les valeurs courantes et laisse passer le reste", () => {
    expect(formatGender("Male")).toBe("Homme");
    expect(formatGender("Female")).toBe("Femme");
    expect(formatGender("Agender")).toBe("Agender");
    expect(formatOccupations(["Voice Actor", "Singer", "Producer", null])).toBe("Doublage, Chant, Producer");
    expect(formatOccupations([])).toBeNull();
  });
});

describe("groupByYear", () => {
  it("groupe en gardant l'ordre de première apparition", () => {
    const groups = groupByYear([{ y: null }, { y: 2026 }, { y: 2025 }, { y: 2026 }], (item) => item.y);
    expect(groups.map((group) => [group.year, group.items.length])).toEqual([
      [null, 1],
      [2026, 2],
      [2025, 1],
    ]);
  });
});

describe("mergeStaffRoles", () => {
  it("réunit les rôles d'une même œuvre sur une carte", () => {
    const merged = mergeStaffRoles([
      { staffRole: "Director", node: media(1) },
      { staffRole: "Storyboard (eps 1-3)", node: media(2) },
      { staffRole: "Script", node: media(1) },
      { staffRole: null, node: media(3) },
    ]);
    expect(merged.map((row) => [row.media.id, row.roles])).toEqual([
      [1, ["Director", "Script"]],
      [2, ["Storyboard (eps 1-3)"]],
      [3, []],
    ]);
  });
});

describe("mergeVoiceRoles", () => {
  it("réunit les personnages d'une même œuvre et écarte les nuls", () => {
    const luffy = { id: 40, name: { full: "Luffy" }, image: null };
    const ace = { id: 2072, name: { full: "Ace" }, image: null };
    const merged = mergeVoiceRoles([
      { characterRole: "MAIN", characters: [luffy, null], node: media(1) },
      { characterRole: "SUPPORTING", characters: [ace, luffy], node: media(1) },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.characters.map((character) => character.id)).toEqual([40, 2072]);
  });
});
```

`people-params.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import {
  loadPeopleParams,
  serializePeopleParams,
  toPage,
} from "@/features/people/lib/people-params";

describe("loadPeopleParams", () => {
  it("retombe sur les défauts quand l'URL est fausse", () => {
    expect(loadPeopleParams(new URLSearchParams("page=abc&onglet=tout"))).toEqual({ page: 1, onglet: null });
  });

  it("lit une page et un onglet valides", () => {
    expect(loadPeopleParams(new URLSearchParams("page=3&onglet=anime"))).toEqual({ page: 3, onglet: "anime" });
  });
});

describe("toPage", () => {
  it("borne la page à 1 au minimum", () => {
    expect(toPage(-2)).toBe(1);
    expect(toPage(0)).toBe(1);
    expect(toPage(4)).toBe(4);
  });
});

describe("serializePeopleParams", () => {
  it("efface la page par défaut de l'adresse", () => {
    expect(serializePeopleParams("/staff/1", { page: 1, onglet: "doublage" })).toBe("/staff/1?onglet=doublage");
    expect(serializePeopleParams("/character/40", { page: 2 })).toBe("/character/40?page=2");
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `node_modules/.bin/vitest run src/features/people/lib`
Expected: FAIL — modules `people-format` et `people-params` introuvables (les tests de
`people-bio` passent toujours).

- [ ] **Step 3: Écrire `people-format.ts`**

```ts
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
  const parts = [day, month ?? null, date.year ? String(date.year) : null].filter(
    (part): part is string => part !== null,
  );
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
      if (character && !row.characters.some((known) => known.id === character.id)) {
        row.characters.push(character);
      }
    }
    rows.set(edge.node.id, row);
  }
  return [...rows.values()];
}
```

- [ ] **Step 4: Écrire `people-params.ts`**

```ts
import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server";

/**
 * Le contrat d'URL des pages Personnage et Staff.
 *
 * Les onglets du staff sont **dans l'adresse**, comme ceux de la fiche (`media-tab-params.ts`) :
 * c'est le serveur qui décide quelle liste demander à AniList, et un lien peut pointer
 * directement les rôles d'équipe de quelqu'un. Valeurs en français sans accent, pour les URL.
 *
 * `onglet` n'a **pas** de défaut : sans lui, la page prend le premier onglet non vide, ce que le
 * parseur ne peut pas savoir.
 */
export const STAFF_TABS = ["doublage", "anime", "manga"] as const;
export type StaffTab = (typeof STAFF_TABS)[number];

export const STAFF_TAB_LABELS: Record<StaffTab, string> = {
  doublage: "Doublage",
  anime: "Anime",
  manga: "Manga",
};

const peopleParsers = {
  page: parseAsInteger.withDefault(1),
  onglet: parseAsStringLiteral(STAFF_TABS),
};

export const loadPeopleParams = createLoader(peopleParsers);
export const serializePeopleParams = createSerializer(peopleParsers);

/** `parseAsInteger` ne borne rien : `?page=-2` traverserait le parseur. */
export function toPage(page: number): number {
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `node_modules/.bin/vitest run src/features/people/lib`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/people/lib
git commit -m "feat(personnes): faits, groupement par année et contrat d'URL"
```

---

### Task 4: Lectures AniList (`server/`)

**Files:**
- Modify: `src/features/media/server/media.documents.ts:71` — `const MEDIA_COMPACT_FIELDS` → `export const MEDIA_COMPACT_FIELDS`
- Create: `src/features/people/server/people.documents.ts`
- Create: `src/features/people/server/people.queries.ts`

**Interfaces:**
- Consumes: `characterDataSchema`, `staffDataSchema` et types (Task 1) ; `STAFF_TABS`, `StaffTab`
  (Task 3) ; `anilistQuery`, `isAniListError` de `@/lib/http/anilist` ; `CATALOGUE_PAGE_SIZE`.
- Produces:
  - `getCharacter(id: number, page: number, opts: { includeAdult: boolean }): Promise<CharacterView | null>`
    avec `CharacterView = { character: Character; appearances: CharacterMediaEdge[]; page: number; hasNextPage: boolean }`
  - `getStaff(id: number, requested: StaffTab | null, page: number, opts: { includeAdult: boolean }): Promise<StaffView | null>`
    avec `StaffView = { staff: Staff; tabs: StaffTab[]; active: StaffTab | null; page: number; hasNextPage: boolean; voiceRoles: VoiceRoleEdge[]; staffRoles: StaffRoleEdge[] }`
  - Les deux **jettent** sur une panne (à rattraper par `tryAniList` dans la page) et rendent `null` sur un 404.

- [ ] **Step 1: Exporter le fragment** — dans `media.documents.ts`, remplacer
`const MEDIA_COMPACT_FIELDS = /* GraphQL */ \`` par `export const MEDIA_COMPACT_FIELDS = /* GraphQL */ \``,
et ajouter en fin de son commentaire : « Exporté le 26 septembre 2026 pour les grilles des pages
Personnage et Staff (`features/people/`), qui montrent la même carte. »

- [ ] **Step 2: Écrire `people.documents.ts`**

```ts
import "server-only";

import { MEDIA_COMPACT_FIELDS } from "@/features/media/server/media.documents";

/**
 * Documents GraphQL des pages Personnage et Staff. Calqués sur `schemas/people.schema.ts`, qui
 * reste la source de vérité des formes : un champ ajouté ici sans l'être au schéma disparaît au
 * parsing.
 *
 * Les œuvres des grilles sont la **carte du catalogue** (`MediaCompactFields`), plus l'année de
 * début qui groupe les rôles d'un staff.
 */

export const CHARACTER_QUERY = /* GraphQL */ `
  query Character($id: Int, $page: Int, $perPage: Int) {
    Character(id: $id) {
      id
      name {
        full
        native
        alternative
        alternativeSpoiler
      }
      image {
        large
      }
      description(asHtml: false)
      gender
      age
      bloodType
      favourites
      dateOfBirth {
        year
        month
        day
      }
      media(sort: [POPULARITY_DESC], page: $page, perPage: $perPage) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          characterRole
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
            id
            name {
              full
            }
            image {
              large
            }
          }
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
    }
  }
  ${MEDIA_COMPACT_FIELDS}
`;

/**
 * Le staff et **ses trois listes dans la même requête**, par alias. Seule la liste de l'onglet
 * actif est demandée en entier ; les deux autres le sont en `perPage: 1`, pour savoir si elles
 * sont vides — c'est ce qui décide des onglets affichés sans dépenser un crédit de plus.
 */
export const STAFF_QUERY = /* GraphQL */ `
  query Staff(
    $id: Int
    $voicePage: Int
    $voicePerPage: Int
    $animePage: Int
    $animePerPage: Int
    $mangaPage: Int
    $mangaPerPage: Int
  ) {
    Staff(id: $id) {
      id
      name {
        full
        native
        alternative
      }
      image {
        large
      }
      description(asHtml: false)
      gender
      age
      bloodType
      favourites
      primaryOccupations
      yearsActive
      homeTown
      dateOfBirth {
        year
        month
        day
      }
      dateOfDeath {
        year
        month
        day
      }
      voiceRoles: characterMedia(
        sort: [START_DATE_DESC]
        page: $voicePage
        perPage: $voicePerPage
      ) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          characterRole
          characters {
            id
            name {
              full
            }
            image {
              large
            }
          }
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
      animeRoles: staffMedia(
        type: ANIME
        sort: [START_DATE_DESC]
        page: $animePage
        perPage: $animePerPage
      ) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          staffRole
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
      mangaRoles: staffMedia(
        type: MANGA
        sort: [START_DATE_DESC]
        page: $mangaPage
        perPage: $mangaPerPage
      ) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          staffRole
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
    }
  }
  ${MEDIA_COMPACT_FIELDS}
`;
```

- [ ] **Step 3: Écrire `people.queries.ts`**

```ts
import "server-only";

import { cacheLife } from "next/cache";

import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import { STAFF_TABS, type StaffTab } from "@/features/people/lib/people-params";
import {
  type Character,
  type CharacterMediaEdge,
  characterDataSchema,
  type PeopleConnection,
  type Staff,
  type StaffRoleEdge,
  staffDataSchema,
  type VoiceRoleEdge,
} from "@/features/people/schemas/people.schema";
import {
  CHARACTER_QUERY,
  STAFF_QUERY,
} from "@/features/people/server/people.documents";
import { anilistQuery, isAniListError } from "@/lib/http/anilist";

/**
 * Lectures AniList des pages Personnage et Staff.
 *
 * Même structure que `getMediaById` (`features/media/server/media.queries.ts`) : la lecture brute
 * est en `"use cache"` pour la journée — une biographie bouge à la marge —, le 404 y est rattrapé
 * parce qu'une absence d'id est définitive, et la panne **traverse** pour que la page la rattrape
 * par `tryAniList`, hors du cache. Le filtre 18+ s'applique ici, hors du cache aussi, sur des
 * données déjà en mémoire : une seule entrée par clé sert les quatre comptes.
 *
 * **Une requête AniList par affichage.** La clé est (id, page) pour un personnage, (id, onglet,
 * page) pour un staff.
 */

async function fetchCharacter(
  id: number,
  page: number,
): Promise<Character | null> {
  "use cache";
  cacheLife("days");

  try {
    const { Character } = await anilistQuery({
      query: CHARACTER_QUERY,
      variables: { id, page, perPage: CATALOGUE_PAGE_SIZE },
      schema: characterDataSchema,
    });
    return Character;
  } catch (error) {
    if (isAniListError(error) && error.isNotFound) return null;
    throw error;
  }
}

export type CharacterView = {
  character: Character;
  appearances: CharacterMediaEdge[];
  page: number;
  hasNextPage: boolean;
};

export async function getCharacter(
  id: number,
  page: number,
  { includeAdult }: { includeAdult: boolean },
): Promise<CharacterView | null> {
  const character = await fetchCharacter(id, page);
  if (!character) return null;

  return {
    character,
    appearances: (character.media?.edges ?? []).filter(
      (edge) => includeAdult || !edge.node.isAdult,
    ),
    page,
    hasNextPage: character.media?.pageInfo.hasNextPage ?? false,
  };
}

/**
 * `tab === null` : on ne sait pas encore quel onglet sera ouvert — ça dépend de ce qui est vide.
 * On demande alors la première page **des trois** listes en entier : une requête plus lourde, mais
 * une seule, et l'onglet par défaut est servi sans deuxième appel.
 */
async function fetchStaff(
  id: number,
  tab: StaffTab | null,
  page: number,
): Promise<Staff | null> {
  "use cache";
  cacheLife("days");

  const size = (candidate: StaffTab) =>
    tab === null || tab === candidate ? CATALOGUE_PAGE_SIZE : 1;
  const pageOf = (candidate: StaffTab) => (tab === candidate ? page : 1);

  try {
    const { Staff } = await anilistQuery({
      query: STAFF_QUERY,
      variables: {
        id,
        voicePage: pageOf("doublage"),
        voicePerPage: size("doublage"),
        animePage: pageOf("anime"),
        animePerPage: size("anime"),
        mangaPage: pageOf("manga"),
        mangaPerPage: size("manga"),
      },
      schema: staffDataSchema,
    });
    return Staff;
  } catch (error) {
    if (isAniListError(error) && error.isNotFound) return null;
    throw error;
  }
}

function connectionFor(
  staff: Staff,
  tab: StaffTab,
): PeopleConnection<VoiceRoleEdge | StaffRoleEdge> {
  if (tab === "doublage") return staff.voiceRoles;
  if (tab === "anime") return staff.animeRoles;
  return staff.mangaRoles;
}

/** Sous le plafond de 500, `total: 0` est exact ; faute de total, on regarde la page reçue. */
function isEmpty(connection: PeopleConnection<unknown>): boolean {
  if (!connection) return true;
  if (connection.pageInfo.total !== null) return connection.pageInfo.total === 0;
  return connection.edges.length === 0;
}

export type StaffView = {
  staff: Staff;
  tabs: StaffTab[];
  active: StaffTab | null;
  page: number;
  hasNextPage: boolean;
  voiceRoles: VoiceRoleEdge[];
  staffRoles: StaffRoleEdge[];
};

export async function getStaff(
  id: number,
  requested: StaffTab | null,
  page: number,
  { includeAdult }: { includeAdult: boolean },
): Promise<StaffView | null> {
  const first = await fetchStaff(id, requested, requested ? page : 1);
  if (!first) return null;

  const tabs = STAFF_TABS.filter((tab) => !isEmpty(connectionFor(first, tab)));
  const active =
    requested && tabs.includes(requested) ? requested : (tabs[0] ?? null);

  /*
    L'onglet demandé est vide sur cette personne (un lien recopié d'un autre staff) : on retombe sur
    le premier non vide, **sans corriger l'URL**, comme la fiche d'une œuvre. Sa liste n'a été
    demandée qu'en `perPage: 1` — il faut donc la seconde lecture, rare et cachée elle aussi.
  */
  const staff =
    requested && active !== requested
      ? ((await fetchStaff(id, null, 1)) ?? first)
      : first;

  const current = active === requested ? page : 1;
  const connection = active ? connectionFor(staff, active) : null;
  const visible = <E extends { node: { isAdult: boolean } }>(edges: E[]) =>
    edges.filter((edge) => includeAdult || !edge.node.isAdult);

  return {
    staff,
    tabs,
    active,
    page: current,
    hasNextPage: connection?.pageInfo.hasNextPage ?? false,
    voiceRoles:
      active === "doublage" ? visible(staff.voiceRoles?.edges ?? []) : [],
    staffRoles:
      active === "anime"
        ? visible(staff.animeRoles?.edges ?? [])
        : active === "manga"
          ? visible(staff.mangaRoles?.edges ?? [])
          : [],
  };
}
```

- [ ] **Step 4: Vérifier contre la vraie API** — un script jetable dans le scratchpad (hors dépôt),
qui recopie `people.documents.ts` sans sa ligne `import "server-only"` et avec une copie locale du
fragment `MediaCompactFields`, puis envoie `CHARACTER_QUERY` (id 40, page 1, perPage 21) et
`STAFF_QUERY` (id 95021, toutes les tailles à 21) à `https://graphql.anilist.co` en POST avec les
en-têtes `Content-Type: application/json`, `Accept: application/json`,
`Referer: https://anilist.co/`, et valide chaque réponse avec `characterDataSchema.safeParse` /
`staffDataSchema.safeParse` (import par URL `file:///C:/Users/alexi/Desktop/dev/better-list/src/features/people/schemas/people.schema.ts`,
lancé avec `node_modules/.bin/tsx <script>.mts`).
Expected: HTTP 200, pas de `errors`, les deux `safeParse` en `success: true`. Refaire avec un
auteur de manga (Eiichiro Oda, staff 96881) et un id inexistant (999999999) : ce dernier doit
rendre un statut 404.

- [ ] **Step 5: Typecheck et lint**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/biome check src/features/people src/features/media/server/media.documents.ts`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/features/media/server/media.documents.ts src/features/people/server
git commit -m "feat(personnes): lectures AniList d'un personnage et d'un staff"
```

---

### Task 5: Composants — en-tête, faits, biographie, grille d'œuvres

**Files:**
- Modify: `src/features/media/components/media-card.tsx` — prop `footer`
- Create: `src/features/people/components/bio-spoiler.tsx` (seule feuille `"use client"`)
- Create: `src/features/people/components/person-bio.tsx`
- Create: `src/features/people/components/person-facts.tsx`
- Create: `src/features/people/components/person-header.tsx`
- Create: `src/features/people/components/people-media-grid.tsx`
- Create: `src/features/people/components/person-page-skeleton.tsx`

**Interfaces:**
- Consumes: `parseBio`, `BioSegment` (Task 2) ; `PeopleMedia` (Task 1) ; `MediaCard`, `CatalogueGrid`,
  `CatalogueGridSkeleton`, `WIDEST_COLUMN_COUNT`, `CataloguePaginationSkeleton`, `EntryQuickActions`,
  `EntryQuickEdit`, `EntryStatusDot`, `getLibraryEntriesFor`, `mediaTitle`, `TitleLanguage`, `Skeleton`.
- Produces:
  - `MediaCard` accepte `footer?: React.ReactNode`
  - `<BioSpoiler>{children}</BioSpoiler>`
  - `<PersonBio text={string | null} />`
  - `<PersonFacts facts={{ label: string; value: string | null }[]} />`
  - `<PersonHeader image name native alternatives spoilerAlternatives? favourites>{children}</PersonHeader>`
  - `<PeopleMediaGrid items={{ media: PeopleMedia; footer: React.ReactNode }[]} titleLanguage priority? />` (async)
  - `<PersonPageSkeleton />`

- [ ] **Step 1: `MediaCard.footer`** — dans `MediaCardProps`, après `details` :

```ts
  /**
   * Un contenu **sous la carte, hors du lien** — ajouté le 26 septembre 2026 pour les pages
   * Personnage et Staff, qui y posent le doubleur ou le personnage, eux-mêmes cliquables.
   *
   * Hors du `<Link>` pour la même raison qu'`action` : une ancre dans une ancre est du HTML
   * invalide. Même règle que `details` : un appelant le passe à toutes les cartes de sa grille.
   */
  footer?: React.ReactNode;
```

Ajouter `footer` à la déstructuration de `MediaCard`, et le rendre juste après `</MediaHoverCard>`,
avant le bloc `{action ? (…) : null}` :

```tsx
      {footer ? (
        <div className="flex min-w-0 flex-col gap-0.5">{footer}</div>
      ) : null}
```

- [ ] **Step 2: `bio-spoiler.tsx`**

```tsx
"use client";

import { useState } from "react";

/**
 * Un passage marqué spoiler : masqué, révélé au clic.
 *
 * La seule feuille cliente des pages Personnage et Staff. Le contenu est rendu par le serveur et
 * arrive en `children` : révéler ne demande aucune lecture, seulement de montrer ce qui est déjà là.
 */
export function BioSpoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);

  if (shown) return <span>{children}</span>;

  return (
    <button
      className="rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground text-xs hover:text-foreground"
      onClick={() => setShown(true)}
      type="button"
    >
      Spoiler — afficher
    </button>
  );
}
```

- [ ] **Step 3: `person-bio.tsx`**

```tsx
import Link from "next/link";

import { BioSpoiler } from "@/features/people/components/bio-spoiler";
import { type BioSegment, parseBio } from "@/features/people/lib/people-bio";

/** Deux paragraphes : de quoi reconnaître la personne sans pousser la grille hors de l'écran. */
const VISIBLE_PARAGRAPHS = 2;

/**
 * La biographie d'une personne, lue par `parseBio` et rendue en éléments — jamais en HTML brut.
 *
 * **Repliée après deux paragraphes**, dans un `<details>` natif : pas de JavaScript pour un geste
 * que le navigateur sait faire, et le texte replié reste trouvable par la recherche de la page.
 * Une biographie absente ne rend rien.
 */
export function PersonBio({ text }: { text: string | null }) {
  const paragraphs = parseBio(text);
  if (paragraphs.length === 0) return null;

  const visible = paragraphs.slice(0, VISIBLE_PARAGRAPHS);
  const folded = paragraphs.slice(VISIBLE_PARAGRAPHS);

  return (
    <section className="flex flex-col gap-3 text-muted-foreground text-sm/6">
      {visible.map((paragraph, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: texte figé, jamais réordonné
        <p key={index}>{renderSegments(paragraph)}</p>
      ))}
      {folded.length > 0 ? (
        <details className="group flex flex-col gap-3">
          <summary className="cursor-pointer text-foreground text-sm group-open:hidden">
            Lire la suite
          </summary>
          <div className="flex flex-col gap-3">
            {folded.map((paragraph, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: texte figé, jamais réordonné
              <p key={index}>{renderSegments(paragraph)}</p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function renderSegments(segments: BioSegment[]): React.ReactNode[] {
  return segments.map((segment, index) => {
    // L'index suffit ici : les segments viennent d'un texte figé et ne se réordonnent jamais.
    const key = index;
    switch (segment.kind) {
      case "text":
        return <span key={key}>{segment.text}</span>;
      case "break":
        return <br key={key} />;
      case "strong":
        return (
          <strong className="font-medium text-foreground" key={key}>
            {renderSegments(segment.children)}
          </strong>
        );
      case "spoiler":
        return (
          <BioSpoiler key={key}>{renderSegments(segment.children)}</BioSpoiler>
        );
      case "link":
        return segment.external ? (
          <a
            className="text-foreground underline underline-offset-2"
            href={segment.href}
            key={key}
            rel="noreferrer"
            target="_blank"
          >
            {renderSegments(segment.children)}
          </a>
        ) : (
          <Link
            className="text-foreground underline underline-offset-2"
            href={segment.href}
            key={key}
            prefetch={false}
          >
            {renderSegments(segment.children)}
          </Link>
        );
    }
  });
}
```

- [ ] **Step 4: `person-facts.tsx`**

```tsx
/**
 * Les faits d'une personne : anniversaire, âge, genre… Une ligne sans valeur **disparaît** au lieu
 * d'afficher un tiret — même règle que la ligne de faits de la fiche d'une œuvre.
 */
export function PersonFacts({
  facts,
}: {
  facts: { label: string; value: string | null }[];
}) {
  const known = facts.filter(
    (fact): fact is { label: string; value: string } => fact.value !== null,
  );
  if (known.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {known.map((fact) => (
        <div className="contents" key={fact.label}>
          <dt className="font-medium text-[0.6875rem] text-muted-foreground uppercase leading-5 tracking-[0.12em]">
            {fact.label}
          </dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 5: `person-header.tsx`**

```tsx
import { Heart } from "lucide-react";
import Image from "next/image";

import { BioSpoiler } from "@/features/people/components/bio-spoiler";

type PersonHeaderProps = {
  image: string | null;
  name: string | null;
  native: string | null;
  alternatives: (string | null)[];
  /** Les surnoms qui trahissent l'intrigue (« Joy Boy ») : masqués comme un spoiler de biographie. */
  spoilerAlternatives?: (string | null)[];
  favourites: number | null;
  /** Les faits et la biographie, rendus à droite du portrait sous le nom. */
  children?: React.ReactNode;
};

/**
 * L'en-tête d'une page Personnage ou Staff : portrait, nom, autres noms, favoris, puis ce que la
 * page y glisse. Deux appelants dès sa création, donc dans `features/people/components/`.
 */
export function PersonHeader({
  image,
  name,
  native,
  alternatives,
  spoilerAlternatives = [],
  favourites,
  children,
}: PersonHeaderProps) {
  const others = [native, ...alternatives].filter((value): value is string =>
    Boolean(value),
  );
  const hidden = spoilerAlternatives.filter((value): value is string =>
    Boolean(value),
  );

  return (
    <header className="flex flex-col gap-6 sm:flex-row">
      <div className="relative aspect-2/3 w-40 shrink-0 overflow-hidden rounded-md bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] sm:w-48">
        {image ? (
          <Image
            alt=""
            className="object-cover"
            fill
            priority
            sizes="192px"
            src={image}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-semibold text-2xl">{name ?? "Sans nom"}</h1>
            {others.length > 0 || hidden.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                {others.join(", ")}
                {hidden.length > 0 ? (
                  <>
                    {others.length > 0 ? ", " : null}
                    <BioSpoiler>{hidden.join(", ")}</BioSpoiler>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          {favourites ? (
            <p className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-sm tabular-nums">
              <Heart aria-hidden className="size-4" />
              {new Intl.NumberFormat("fr-FR").format(favourites)}
              <span className="sr-only">favoris sur AniList</span>
            </p>
          ) : null}
        </div>

        {children}
      </div>
    </header>
  );
}
```

- [ ] **Step 6: `people-media-grid.tsx`**

```tsx
import {
  CatalogueGrid,
  WIDEST_COLUMN_COUNT,
} from "@/components/shared/catalogue-grid";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { PeopleMedia } from "@/features/people/schemas/people.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { EntryQuickActions } from "@/features/tracking/components/entry-quick-actions";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";

/**
 * La grille d'œuvres d'une personne : la carte du catalogue, **avec la pastille de suivi et le
 * « +1 »** comme sur `/search` — une œuvre a la même apparence et le même geste partout. Sous
 * chaque carte, ce que la page y pose (le doubleur, le personnage, le rôle).
 *
 * Les entrées de suivi sont lues ici, en une requête pour la grille, sur l'index
 * `[userId, mediaId]` — rien ne pèse sur le quota AniList.
 *
 * `banner={null}` : la bannière n'est pas dans `MediaCompactFields`, et la fenêtre d'édition sait
 * s'en passer.
 */
export async function PeopleMediaGrid({
  items,
  titleLanguage,
  priority = false,
}: {
  items: { media: PeopleMedia; footer: React.ReactNode }[];
  titleLanguage: TitleLanguage;
  /** Vrai pour la première grille de la page seulement : c'est elle qui porte le LCP. */
  priority?: boolean;
}) {
  const entries = await getLibraryEntriesFor(
    items.map((item) => item.media.id),
  );

  return (
    <CatalogueGrid>
      {items.map(({ media, footer }, index) => {
        const entry = entries.get(media.id) ?? null;
        const unit = media.type === "ANIME" ? "episode" : "chapitre";
        const total = media.type === "ANIME" ? media.episodes : media.chapters;

        return (
          <MediaCard
            action={
              <EntryQuickActions
                mediaId={media.id}
                progress={entry?.progress ?? 0}
                total={total}
                tracked={entry !== null}
                unit={unit}
              >
                <EntryQuickEdit
                  banner={null}
                  compact
                  entry={entry}
                  mediaId={media.id}
                  title={mediaTitle(media.title, titleLanguage)}
                  total={total}
                  unit={unit}
                />
              </EntryQuickActions>
            }
            footer={footer}
            key={media.id}
            marker={
              entry ? <EntryStatusDot status={entry.status} /> : undefined
            }
            media={media}
            priority={priority && index < WIDEST_COLUMN_COUNT}
            titleLanguage={titleLanguage}
          />
        );
      })}
    </CatalogueGrid>
  );
}
```

- [ ] **Step 7: `person-page-skeleton.tsx`** (deux appelants : les deux pages)

```tsx
import { CatalogueGridSkeleton } from "@/components/shared/catalogue-grid";
import { CataloguePaginationSkeleton } from "@/components/shared/catalogue-pagination";
import { Skeleton } from "@/components/ui/skeleton";

/** Le repli des pages Personnage et Staff : en-tête, grille, pagination, aux mêmes proportions. */
export function PersonPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="aspect-2/3 w-40 rounded-md sm:w-48" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <CatalogueGridSkeleton />
      <CataloguePaginationSkeleton />
    </div>
  );
}
```

- [ ] **Step 8: Typecheck et lint**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/biome check src/features/people src/features/media/components/media-card.tsx`
Expected: aucune erreur. Si les props de `EntryQuickActions` / `EntryQuickEdit` ont évolué, se
caler sur leur usage dans `src/app/(app)/search/page.tsx`.

- [ ] **Step 9: Commit**

```bash
git add src/features/people/components src/features/media/components/media-card.tsx
git commit -m "feat(personnes): en-tête, faits, biographie et grille d'œuvres"
```

---

### Task 6: Page `/character/[id]`

**Files:**
- Create: `src/app/(app)/character/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCharacter` (Task 4) ; `loadPeopleParams`, `serializePeopleParams`, `toPage`,
  `formatFuzzyDate`, `formatAge`, `formatGender` (Task 3) ; `PersonHeader`, `PersonFacts`,
  `PersonBio`, `PeopleMediaGrid`, `PersonPageSkeleton` (Task 5) ; `formatCharacterRole` ;
  `tryAniList` ; `ReportAniListStatus` ; `CataloguePagination` ; `Empty*`.

- [ ] **Step 1: Écrire la page**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
import { CataloguePagination } from "@/components/shared/catalogue-pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { routes } from "@/config/routes";
import { formatCharacterRole } from "@/features/media/lib/media-format";
import { PeopleMediaGrid } from "@/features/people/components/people-media-grid";
import { PersonBio } from "@/features/people/components/person-bio";
import { PersonFacts } from "@/features/people/components/person-facts";
import { PersonHeader } from "@/features/people/components/person-header";
import { PersonPageSkeleton } from "@/features/people/components/person-page-skeleton";
import {
  formatAge,
  formatFuzzyDate,
  formatGender,
} from "@/features/people/lib/people-format";
import {
  loadPeopleParams,
  serializePeopleParams,
  toPage,
} from "@/features/people/lib/people-params";
import { getCharacter } from "@/features/people/server/people.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { tryAniList } from "@/lib/http/anilist";

/** Même garde que la fiche : l'id vient de l'URL, on le valide avant d'appeler AniList. */
const idSchema = z.coerce.number().int().positive();

function parseId(raw: string): number | null {
  const result = idSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/character/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  if (id === null) return {};
  const page = toPage(loadPeopleParams(await searchParams).page);
  const { includeAdult } = await getPreferences();
  // Même lecture que le contenu, donc même entrée de cache : aucune requête de plus. Et elle ne
  // doit jamais jeter — une panne rend des métadonnées vides, pas une page d'erreur.
  const view = await tryAniList(() => getCharacter(id, page, { includeAdult }));
  const name = view?.character.name.full;
  return name ? { title: name } : {};
}

/**
 * Un personnage : qui il est, et où il apparaît.
 *
 * Même squelette que la fiche d'une œuvre : la page n'attend rien, le contenu est suspendu. Une
 * requête AniList par affichage, cachée un jour par (id, page).
 */
export default function CharacterPage({
  params,
  searchParams,
}: PageProps<"/character/[id]">) {
  return (
    <Suspense fallback={<PersonPageSkeleton />}>
      <CharacterContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CharacterContent({
  params,
  searchParams,
}: {
  params: PageProps<"/character/[id]">["params"];
  searchParams: PageProps<"/character/[id]">["searchParams"];
}) {
  const id = parseId((await params).id);
  if (id === null) notFound();

  const page = toPage(loadPeopleParams(await searchParams).page);
  const { includeAdult, titleLanguage } = await getPreferences();

  /*
    Le `null` de `tryAniList` veut dire « AniList ne répond pas » ; celui de `getCharacter`,
    « ce personnage n'existe pas ». L'emballage garde les deux distincts, comme sur la fiche.
  */
  const result = await tryAniList(async () => ({
    view: await getCharacter(id, page, { includeAdult }),
  }));

  if (!result) {
    // Aucun repli : rien de ce qui fait cette page n'est stocké en base (PRODUCT.md §4.1).
    return (
      <>
        <ReportAniListStatus down />
        <p className="text-muted-foreground text-sm">
          Ce personnage n'a pas pu être chargé. AniList ne répond pas pour le
          moment.
        </p>
      </>
    );
  }

  const { view } = result;
  if (!view) notFound();

  const { character, appearances, hasNextPage } = view;

  return (
    <article className="flex flex-col gap-6">
      <ReportAniListStatus down={false} />

      <PersonHeader
        alternatives={character.name.alternative}
        favourites={character.favourites}
        image={character.image?.large ?? null}
        name={character.name.full}
        native={character.name.native}
        spoilerAlternatives={character.name.alternativeSpoiler}
      >
        <PersonFacts
          facts={[
            {
              label: "Anniversaire",
              value: formatFuzzyDate(character.dateOfBirth),
            },
            { label: "Âge", value: formatAge(character.age) },
            { label: "Genre", value: formatGender(character.gender) },
            { label: "Groupe sanguin", value: character.bloodType },
          ]}
        />
        <PersonBio text={character.description} />
      </PersonHeader>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Apparitions</h2>

        {appearances.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Rien à montrer sur cette page</EmptyTitle>
              <EmptyDescription>
                Aucune œuvre à afficher ici — elles sont peut-être masquées par
                votre réglage de contenu adulte.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PeopleMediaGrid
            items={appearances.map((edge) => {
              const [voice] = edge.voiceActors;
              const role = formatCharacterRole(edge.characterRole);
              return {
                media: edge.node,
                footer: (
                  <>
                    <p className="truncate text-muted-foreground text-xs">
                      {role ?? "\u00a0"}
                    </p>
                    {voice?.name.full ? (
                      <Link
                        className="truncate text-muted-foreground text-xs hover:text-foreground"
                        href={routes.staff(voice.id)}
                        prefetch={false}
                      >
                        {voice.name.full}
                      </Link>
                    ) : (
                      <p className="text-xs">{"\u00a0"}</p>
                    )}
                  </>
                ),
              };
            })}
            priority
            titleLanguage={titleLanguage}
          />
        )}

        <CataloguePagination
          hrefFor={(target) =>
            serializePeopleParams(routes.character(id), { page: target })
          }
          page={page}
          pageCount={hasNextPage ? page + 1 : page}
        />
      </section>
    </article>
  );
}
```

Les deux lignes du pied sont **toujours** rendues (espace insécable quand la valeur manque) : une
grille dont certaines cartes ont une ligne de moins perd son alignement horizontal (même règle que
`MediaCard.details`).

- [ ] **Step 2: Générer les types de route et vérifier**

Run: `node_modules/.bin/next typegen && node_modules/.bin/tsc --noEmit && node_modules/.bin/biome check "src/app/(app)/character"`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/character"
git commit -m "feat(personnes): la page d'un personnage et ses apparitions"
```

---

### Task 7: Page `/staff/[id]`

**Files:**
- Create: `src/app/(app)/staff/[id]/page.tsx`

`media/[id]/_components/media-tabs.tsx` n'est **pas** réutilisé : il est typé sur `MediaTab` et vit
dans le `_components/` de sa route. La barre du staff est écrite dans la page, même matière.

**Interfaces:**
- Consumes: `getStaff`, `StaffView` (Task 4) ; `STAFF_TAB_LABELS`, `StaffTab`, `loadPeopleParams`,
  `serializePeopleParams`, `toPage`, `groupByYear`, `mergeStaffRoles`, `mergeVoiceRoles`,
  `formatFuzzyDate`, `formatAge`, `formatGender`, `formatOccupations`, `formatYearsActive` (Task 3) ;
  `formatStaffRole` ; composants (Task 5) ; `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`.

- [ ] **Step 1: Écrire la page**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
import { CataloguePagination } from "@/components/shared/catalogue-pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/config/routes";
import { formatStaffRole } from "@/features/media/lib/media-format";
import { PeopleMediaGrid } from "@/features/people/components/people-media-grid";
import { PersonBio } from "@/features/people/components/person-bio";
import { PersonFacts } from "@/features/people/components/person-facts";
import { PersonHeader } from "@/features/people/components/person-header";
import { PersonPageSkeleton } from "@/features/people/components/person-page-skeleton";
import {
  formatAge,
  formatFuzzyDate,
  formatGender,
  formatOccupations,
  formatYearsActive,
  groupByYear,
  mergeStaffRoles,
  mergeVoiceRoles,
} from "@/features/people/lib/people-format";
import {
  loadPeopleParams,
  STAFF_TAB_LABELS,
  type StaffTab,
  serializePeopleParams,
  toPage,
} from "@/features/people/lib/people-params";
import {
  getStaff,
  type StaffView,
} from "@/features/people/server/people.queries";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { tryAniList } from "@/lib/http/anilist";

const idSchema = z.coerce.number().int().positive();

function parseId(raw: string): number | null {
  const result = idSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/staff/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  if (id === null) return {};
  const { page, onglet } = loadPeopleParams(await searchParams);
  const { includeAdult } = await getPreferences();
  const view = await tryAniList(() =>
    getStaff(id, onglet, toPage(page), { includeAdult }),
  );
  const name = view?.staff.name.full;
  return name ? { title: name } : {};
}

/**
 * Un membre du staff : qui il est, ce qu'il a doublé, ce qu'il a fait.
 *
 * Les trois listes sont des **onglets en lien** (`?onglet=`), comme ceux de la fiche d'une œuvre :
 * le serveur ne demande en entier que la liste ouverte, et un onglet vide n'est pas proposé.
 */
export default function StaffPage({
  params,
  searchParams,
}: PageProps<"/staff/[id]">) {
  return (
    <Suspense fallback={<PersonPageSkeleton />}>
      <StaffContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffContent({
  params,
  searchParams,
}: {
  params: PageProps<"/staff/[id]">["params"];
  searchParams: PageProps<"/staff/[id]">["searchParams"];
}) {
  const id = parseId((await params).id);
  if (id === null) notFound();

  const { page, onglet } = loadPeopleParams(await searchParams);
  const { includeAdult, titleLanguage } = await getPreferences();

  const result = await tryAniList(async () => ({
    view: await getStaff(id, onglet, toPage(page), { includeAdult }),
  }));

  if (!result) {
    return (
      <>
        <ReportAniListStatus down />
        <p className="text-muted-foreground text-sm">
          Cette personne n'a pas pu être chargée. AniList ne répond pas pour le
          moment.
        </p>
      </>
    );
  }

  const { view } = result;
  if (!view) notFound();

  const { staff, active } = view;
  const died = formatFuzzyDate(staff.dateOfDeath);

  return (
    <article className="flex flex-col gap-6">
      <ReportAniListStatus down={false} />

      <PersonHeader
        alternatives={staff.name.alternative}
        favourites={staff.favourites}
        image={staff.image?.large ?? null}
        name={staff.name.full}
        native={staff.name.native}
      >
        <PersonFacts
          facts={[
            { label: "Naissance", value: formatFuzzyDate(staff.dateOfBirth) },
            { label: "Décès", value: died },
            // AniList calcule l'âge à aujourd'hui : à côté d'un décès, ce serait faux.
            { label: "Âge", value: died ? null : formatAge(staff.age) },
            { label: "Genre", value: formatGender(staff.gender) },
            { label: "Activité", value: formatYearsActive(staff.yearsActive) },
            { label: "Ville natale", value: staff.homeTown },
            {
              label: "Métiers",
              value: formatOccupations(staff.primaryOccupations),
            },
          ]}
        />
        <PersonBio text={staff.description} />
      </PersonHeader>

      {active ? (
        <>
          <Separator />
          <StaffTabs active={active} id={id} tabs={view.tabs}>
            <StaffRoles titleLanguage={titleLanguage} view={view} />
            <CataloguePagination
              hrefFor={(target) =>
                serializePeopleParams(routes.staff(id), {
                  onglet: active,
                  page: target,
                })
              }
              page={view.page}
              pageCount={view.hasNextPage ? view.page + 1 : view.page}
            />
          </StaffTabs>
        </>
      ) : null}
    </article>
  );
}

/**
 * La barre d'onglets du staff. Même matière et même principe que celle de la fiche
 * (`media/[id]/_components/media-tabs.tsx`) : des liens, un seul panneau rendu, et donc une seule
 * liste demandée à AniList.
 */
function StaffTabs({
  id,
  tabs,
  active,
  children,
}: {
  id: number;
  tabs: StaffTab[];
  active: StaffTab;
  children: React.ReactNode;
}) {
  return (
    <Tabs className="gap-6" value={active}>
      <div className="-mx-4 scrollbar-none overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <TabsList
          className="w-full justify-start rounded-none border-border/60 border-b"
          variant="line"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              asChild
              className="flex-none px-3"
              key={tab}
              value={tab}
            >
              <Link
                href={serializePeopleParams(routes.staff(id), { onglet: tab })}
                scroll={false}
              >
                {STAFF_TAB_LABELS[tab]}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent className="flex flex-col gap-8" value={active}>
        {children}
      </TabsContent>
    </Tabs>
  );
}

/**
 * Les rôles de l'onglet ouvert, **groupés par année** comme sur AniList. Le groupement se fait dans
 * la page : une année peut donc être coupée entre deux pages, c'est le prix d'une pagination par
 * liens (spec).
 */
function StaffRoles({
  view,
  titleLanguage,
}: {
  view: StaffView;
  titleLanguage: TitleLanguage;
}) {
  const rows =
    view.active === "doublage"
      ? mergeVoiceRoles(view.voiceRoles).map((row) => ({
          media: row.media,
          footer: (
            <p className="truncate text-muted-foreground text-xs">
              {row.characters.length > 0
                ? row.characters.map((character, index) => (
                    <span key={character.id}>
                      {index > 0 ? ", " : null}
                      <Link
                        className="hover:text-foreground"
                        href={routes.character(character.id)}
                        prefetch={false}
                      >
                        {character.name.full ?? "Sans nom"}
                      </Link>
                    </span>
                  ))
                : "\u00a0"}
            </p>
          ),
        }))
      : mergeStaffRoles(view.staffRoles).map((row) => {
          const roles = row.roles
            .map((role) => formatStaffRole(role))
            .filter((role): role is string => Boolean(role))
            .join(", ");
          return {
            media: row.media,
            footer: (
              <p
                className="truncate text-muted-foreground text-xs"
                title={roles || undefined}
              >
                {roles || "\u00a0"}
              </p>
            ),
          };
        });

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Rien à montrer sur cette page</EmptyTitle>
          <EmptyDescription>
            Aucune œuvre à afficher ici — elles sont peut-être masquées par
            votre réglage de contenu adulte.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const groups = groupByYear(rows, (row) => row.media.startDate?.year ?? null);

  return (
    <>
      {groups.map((group, index) => (
        <section className="flex flex-col gap-4" key={group.year ?? "a-venir"}>
          <h2 className="font-semibold text-lg">{group.year ?? "À venir"}</h2>
          <PeopleMediaGrid
            items={group.items}
            priority={index === 0}
            titleLanguage={titleLanguage}
          />
        </section>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Générer les types et vérifier**

Run: `node_modules/.bin/next typegen && node_modules/.bin/tsc --noEmit && node_modules/.bin/biome check "src/app/(app)/staff"`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/staff"
git commit -m "feat(personnes): la page d'un staff, rôles par onglet et par année"
```

---

### Task 8: Liens depuis la fiche d'une œuvre

**Files:**
- Modify: `src/app/(app)/media/[id]/_components/media-characters.tsx`
- Modify: `src/app/(app)/media/[id]/_components/media-staff.tsx`

**Interfaces:**
- Consumes: `routes.character`, `routes.staff` (Task 2). Les données portent déjà les ids
  (`edge.node.id`, `voice.id`).

- [ ] **Step 1: Personnages** — dans `CharacterCard`, remplacer la `div` de la moitié gauche
(`<div className="flex min-w-0 flex-1 items-stretch gap-3">` qui contient le portrait du
personnage) par un `Link`, contenu inchangé :

```tsx
        <Link
          className="flex min-w-0 flex-1 items-stretch gap-3 transition-colors hover:bg-muted/40"
          href={routes.character(edge.node.id)}
          prefetch={false}
        >
          {/* contenu inchangé : PersonPortrait + colonne nom / rôle */}
        </Link>
```

et la `div` de la moitié droite (rendue quand `voice` existe) par :

```tsx
          <Link
            className="flex min-w-0 flex-1 items-stretch gap-3 transition-colors hover:bg-muted/40"
            href={routes.staff(voice.id)}
            prefetch={false}
          >
            {/* contenu inchangé : colonne nom / langue + PersonPortrait */}
          </Link>
```

Ajouter `import Link from "next/link";` et `import { routes } from "@/config/routes";`. Dans le
commentaire de `MediaCharacters`, remplacer la phrase « Aucun lien non plus — un personnage n'a pas
de page dans ce projet, et n'en aura pas ; une vignette qui ne mène nulle part vaut mieux qu'un lien
mort. » par : « Chaque moitié est un lien depuis le 26 septembre 2026 : le personnage mène à sa
page, le doubleur à la sienne. `prefetch={false}` pour ne pas dépenser de quota AniList sur une
grille qu'on fait défiler. »

- [ ] **Step 2: Équipe** — dans `StaffCard`, remplacer la `div` intérieure
(`<div className="flex h-20 items-stretch gap-3 overflow-hidden rounded-lg …">`) par un `Link`
portant les mêmes classes plus `transition-colors hover:bg-muted/40`, avec
`href={routes.staff(edge.node.id)}` et `prefetch={false}`. Mêmes imports.

- [ ] **Step 3: Vérifier**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/biome check "src/app/(app)/media/[id]/_components"`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/media/[id]/_components/media-characters.tsx" "src/app/(app)/media/[id]/_components/media-staff.tsx"
git commit -m "feat(fiche): les personnages, doubleurs et membres d'équipe mènent à leur page"
```

---

### Task 9: Docs, contrôle complet, vérification à l'écran

**Files:**
- Modify: `docs/STATE.md` — la carte (deux lignes : `/character/[id]` et `/staff/[id]`, « livré
  (26 septembre) »), le tableau « Ce qui reste dans `features/` » (ligne **`people`**), la date du
  relevé en tête.
- Modify: `docs/PRODUCT.md` §5 — les deux routes dans l'architecture des routes.
- Modify: `docs/fiche-media.md` — sur les lignes `characters` / `staff`, noter que les cartes mènent
  désormais aux pages.
- Modify: `docs/JOURNAL.md` — compléter l'entrée du 26 septembre : le plafond à 500 des listes,
  l'âge en texte, le décès aux trois champs nuls, le choix « trois listes pleines quand l'onglet
  est inconnu ».

- [ ] **Step 1: Mettre à jour les quatre documents** (texte court, style des lignes voisines).

- [ ] **Step 2: Contrôle complet**

Run: `node_modules/.bin/biome check . && node_modules/.bin/next typegen && node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run && node_modules/.bin/knip`
Expected: tout vert. Si knip signale un export mort (un schéma d'arête, un type), le dés-exporter
plutôt que de le geler.

- [ ] **Step 3: Vérifier à l'écran** — `pnpm dev`, session connectée, en 1440 et en 390 :
  - `/character/40` : en-tête, faits (« 5 mai », « 17 ans au début »), biographie avec spoilers
    masqués et liens internes, grille avec rôle et doubleur cliquable, page 2.
  - `/staff/95021` : onglets Doublage / Anime, groupes par année (« À venir » en tête), personnage
    cliquable, `?onglet=manga` retombe sur Doublage sans erreur.
  - `/staff/96881` (Eiichiro Oda) : onglets Manga / Anime.
  - `/character/999999999` → 404.
  - `/media/21?onglet=personnages` et `?onglet=equipe` : les cartes mènent aux pages.
  Relever toute anomalie et la corriger avant de conclure.

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs: pages Personnage et Staff livrées"
```
