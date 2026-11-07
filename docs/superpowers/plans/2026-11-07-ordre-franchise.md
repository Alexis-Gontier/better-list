# Ordre de visionnage d'une franchise — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** un onglet « Ordre » sur la fiche, qui montre la franchise (préquelles, suites et histoires
parallèles) dans l'ordre où la regarder, avec le statut du membre sur chaque œuvre.

**Architecture :** deux fonctions pures dans `features/media/lib/` : le parcours par niveaux, avec
un lecteur de niveau injecté, et l'ordonnancement par tri topologique. Une query cachée par niveau
dans `features/media/server/franchise.queries.ts`. Un panneau serveur dans le `_components/` de la
fiche.

**Tech Stack :** Next 16 (`"use cache"`, `cacheLife`), Zod 4, upfetch via `anilistQuery`, Vitest.

**Spec :** `docs/superpowers/specs/2026-11-07-ordre-franchise-design.md`

## Contraintes globales

- Tout en français : interface, commentaires (le **pourquoi**, une à trois lignes), commits
  `type(portée): sujet`.
- Plafonds du parcours : **6 requêtes**, **80 œuvres**, lots de **50** ids.
- Relations suivies : `PREQUEL` et `SEQUEL` (explorées) ; `SIDE_STORY` (collectées, jamais
  explorées). Rien d'autre.
- Filtre 18+ appliqué **hors** du cache, sans couper la chaîne.
- Aucune URL en dur (`routes`), pas de `process.env`, pas de `fetch` nu.
- Fini quand `pnpm typecheck && pnpm test && pnpm lint && pnpm knip` est vert et l'écran vu en
  1440 et 390 px.

---

### Task 1 : l'ordonnancement (`orderFranchise`)

**Files :**
- Create : `src/features/media/lib/franchise-order.ts`
- Test : `src/features/media/lib/franchise-order.test.ts`

**Interfaces :**
- Produces :
  - `type FranchiseGraph = { currentId: number; media: Map<number, MediaCompact>; sequels: Array<[number, number]>; sides: Array<[number, number]> }` : `sequels` vaut `[avant, après]`, `sides` vaut `[maillon, parallèle]`.
  - `type FranchiseItem = { media: MediaCompact; role: "main" | "side"; position: number | null; current: boolean }`
  - `orderFranchise(graph: FranchiseGraph): FranchiseItem[]`

- [ ] **Step 1 : écrire les tests**

```ts
import { describe, expect, it } from "vitest";
import {
  type FranchiseGraph,
  orderFranchise,
} from "@/features/media/lib/franchise-order";
import type { MediaCompact } from "@/features/media/schemas/media.schema";

function media(id: number, seasonYear: number | null = null): MediaCompact {
  return {
    id,
    type: "ANIME",
    format: "TV",
    status: "FINISHED",
    averageScore: null,
    isAdult: false,
    title: { romaji: `M${id}`, english: null, native: null, userPreferred: null },
    coverImage: null,
    episodes: null,
    chapters: null,
    season: null,
    seasonYear,
    genres: [],
    countryOfOrigin: null,
    description: null,
  };
}

function graph(
  currentId: number,
  all: MediaCompact[],
  sequels: Array<[number, number]>,
  sides: Array<[number, number]> = [],
): FranchiseGraph {
  return {
    currentId,
    media: new Map(all.map((m) => [m.id, m])),
    sequels,
    sides,
  };
}

const ids = (g: FranchiseGraph) => orderFranchise(g).map((item) => item.media.id);

describe("orderFranchise", () => {
  it("ordonne une chaîne linéaire, vue depuis le milieu", () => {
    const g = graph(2, [media(3), media(1), media(2)], [[2, 3], [1, 2]]);
    expect(ids(g)).toEqual([1, 2, 3]);
    expect(orderFranchise(g).map((i) => i.position)).toEqual([1, 2, 3]);
    expect(orderFranchise(g).find((i) => i.current)?.media.id).toBe(2);
  });

  it("départage une bifurcation par année, puis par id, l'année nulle en dernier", () => {
    const g = graph(
      1,
      [media(1, 2010), media(4, null), media(3, 2015), media(2, 2012)],
      [[1, 4], [1, 3], [1, 2]],
    );
    expect(ids(g)).toEqual([1, 2, 3, 4]);
  });

  it("ignore les arêtes en double et coupe un cycle sans boucler", () => {
    const g = graph(
      1,
      [media(1, 2010), media(2, 2011), media(3, 2012)],
      [[1, 2], [1, 2], [2, 3], [3, 1]],
    );
    expect(ids(g)).toEqual([1, 2, 3]);
  });

  it("place les parallèles après leur maillon, sans numéro", () => {
    const g = graph(
      1,
      [media(1, 2010), media(2, 2012), media(10, 2013), media(11, 2011)],
      [[1, 2]],
      [[1, 10], [1, 11], [2, 10]],
    );
    const items = orderFranchise(g);
    expect(items.map((i) => i.media.id)).toEqual([1, 11, 10, 2]);
    expect(items.map((i) => i.role)).toEqual(["main", "side", "side", "main"]);
    expect(items.map((i) => i.position)).toEqual([1, null, null, 2]);
  });

  it("garde comme maillon une parallèle qui est aussi dans la chaîne", () => {
    const g = graph(1, [media(1), media(2)], [[1, 2]], [[1, 2]]);
    expect(orderFranchise(g).map((i) => i.role)).toEqual(["main", "main"]);
  });

  it("rend l'œuvre seule quand elle n'a aucun lien", () => {
    expect(ids(graph(7, [media(7)], []))).toEqual([7]);
  });
});
```

- [ ] **Step 2 : lancer les tests et les voir échouer**

Run : `pnpm test src/features/media/lib/franchise-order.test.ts`
Attendu : FAIL, module introuvable.

- [ ] **Step 3 : implémenter**

```ts
import type { MediaCompact } from "@/features/media/schemas/media.schema";

/** La franchise telle que le parcours l'a vue, avant tout ordre. */
export type FranchiseGraph = {
  currentId: number;
  media: Map<number, MediaCompact>;
  /** `[avant, après]` : une arête `SEQUEL` a→b, ou `PREQUEL` lue à l'envers. */
  sequels: Array<[number, number]>;
  /** `[maillon, parallèle]`. */
  sides: Array<[number, number]>;
};

export type FranchiseItem = {
  media: MediaCompact;
  role: "main" | "side";
  /** Le rang dans la chaîne ; `null` pour une parallèle, qui ne compte pas comme une étape. */
  position: number | null;
  current: boolean;
};

// L'id AniList croît avec la date d'ajout : il départage deux œuvres de la même année.
function compareMedia(a: MediaCompact, b: MediaCompact): number {
  const ya = a.seasonYear ?? Number.POSITIVE_INFINITY;
  const yb = b.seasonYear ?? Number.POSITIVE_INFINITY;
  if (ya !== yb) return ya < yb ? -1 : 1;
  return a.id - b.id;
}

/**
 * Tri topologique des suites (Kahn). Parmi les maillons prêts, le mieux classé passe d'abord :
 * c'est ce qui ordonne une bifurcation. Quand rien n'est prêt alors qu'il reste des maillons,
 * c'est un cycle d'AniList : on le coupe en plaçant le mieux classé des restants.
 */
export function orderFranchise(graph: FranchiseGraph): FranchiseItem[] {
  const main = new Set<number>([graph.currentId]);
  for (const [before, after] of graph.sequels) {
    main.add(before);
    main.add(after);
  }

  const next = new Map<number, Set<number>>();
  const indegree = new Map<number, number>();
  for (const id of main) {
    next.set(id, new Set());
    indegree.set(id, 0);
  }
  for (const [before, after] of graph.sequels) {
    const out = next.get(before);
    if (before === after || !out || out.has(after)) continue;
    out.add(after);
    indegree.set(after, (indegree.get(after) ?? 0) + 1);
  }

  const known = [...main].flatMap((id) => {
    const found = graph.media.get(id);
    return found ? [found] : [];
  });
  const placed = new Set<number>();
  const chain: MediaCompact[] = [];

  while (chain.length < known.length) {
    const remaining = known.filter((m) => !placed.has(m.id)).sort(compareMedia);
    const pick =
      remaining.find((m) => (indegree.get(m.id) ?? 0) <= 0) ?? remaining[0];
    if (!pick) break;
    placed.add(pick.id);
    chain.push(pick);
    for (const after of next.get(pick.id) ?? []) {
      indegree.set(after, (indegree.get(after) ?? 0) - 1);
    }
  }

  const attached = new Set<number>();
  const items: FranchiseItem[] = [];
  chain.forEach((link, index) => {
    items.push({
      media: link,
      role: "main",
      position: index + 1,
      current: link.id === graph.currentId,
    });
    const sides = graph.sides
      .filter(([parent, side]) => parent === link.id && !main.has(side) && !attached.has(side))
      .flatMap(([, side]) => {
        const found = graph.media.get(side);
        return found ? [found] : [];
      })
      .filter((side, i, all) => all.findIndex((s) => s.id === side.id) === i)
      .sort(compareMedia);
    for (const side of sides) {
      attached.add(side.id);
      items.push({ media: side, role: "side", position: null, current: false });
    }
  });

  return items;
}
```

- [ ] **Step 4 : lancer les tests et les voir passer**

Run : `pnpm test src/features/media/lib/franchise-order.test.ts`
Attendu : 6 PASS.

- [ ] **Step 5 : commit**

```bash
git add src/features/media/lib/franchise-order.ts src/features/media/lib/franchise-order.test.ts
git commit -m "feat(media): ordonnancement d'une franchise"
```

---

### Task 2 : le parcours (`walkFranchise`)

**Files :**
- Create : `src/features/media/lib/franchise-walk.ts`
- Test : `src/features/media/lib/franchise-walk.test.ts`

**Interfaces :**
- Consumes : `FranchiseGraph` (Task 1).
- Produces :
  - `type FranchiseEdge = { relationType: string | null; node: MediaCompact }`
  - `type FetchLevel = (ids: number[]) => Promise<Map<number, FranchiseEdge[]> | null>` : `null` quand AniList n'a pas répondu.
  - `const FRANCHISE_LIMITS = { requests: 6, media: 80, batch: 50 }`
  - `walkFranchise(start: MediaCompact, startEdges: FranchiseEdge[], fetchLevel: FetchLevel, limits?: typeof FRANCHISE_LIMITS): Promise<{ graph: FranchiseGraph; requests: number; truncated: boolean; incomplete: boolean }>`

- [ ] **Step 1 : écrire les tests**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  type FetchLevel,
  type FranchiseEdge,
  walkFranchise,
} from "@/features/media/lib/franchise-walk";
import type { MediaCompact } from "@/features/media/schemas/media.schema";

function media(id: number): MediaCompact {
  return {
    id,
    type: "ANIME",
    format: "TV",
    status: "FINISHED",
    averageScore: null,
    isAdult: false,
    title: { romaji: `M${id}`, english: null, native: null, userPreferred: null },
    coverImage: null,
    episodes: null,
    chapters: null,
    season: null,
    seasonYear: null,
    genres: [],
    countryOfOrigin: null,
    description: null,
  };
}

const edge = (relationType: string, id: number): FranchiseEdge => ({
  relationType,
  node: media(id),
});

/** Un AniList simulé : les relations de chaque œuvre, et le relevé des lots demandés. */
function fakeAniList(relations: Record<number, FranchiseEdge[]>) {
  const fetchLevel = vi.fn<FetchLevel>(async (ids) =>
    new Map(ids.map((id) => [id, relations[id] ?? []])),
  );
  return fetchLevel;
}

describe("walkFranchise", () => {
  it("suit préquelles et suites dans les deux sens, un lot par niveau", async () => {
    const fetchLevel = fakeAniList({
      1: [edge("SEQUEL", 2)],
      3: [edge("PREQUEL", 2), edge("SEQUEL", 4)],
      4: [edge("PREQUEL", 3)],
    });
    const walk = await walkFranchise(
      media(2),
      [edge("PREQUEL", 1), edge("SEQUEL", 3)],
      fetchLevel,
    );
    expect([...walk.graph.media.keys()].sort()).toEqual([1, 2, 3, 4]);
    expect(fetchLevel.mock.calls.map(([ids]) => ids)).toEqual([[1, 3], [4]]);
    expect(walk).toMatchObject({ requests: 2, truncated: false, incomplete: false });
  });

  it("collecte les parallèles sans les explorer, et ignore les autres liens", async () => {
    const fetchLevel = fakeAniList({});
    const walk = await walkFranchise(
      media(1),
      [edge("SIDE_STORY", 9), edge("SPIN_OFF", 8), edge("ADAPTATION", 7)],
      fetchLevel,
    );
    expect(walk.graph.sides).toEqual([[1, 9]]);
    expect([...walk.graph.media.keys()].sort()).toEqual([1, 9]);
    expect(fetchLevel).not.toHaveBeenCalled();
  });

  it("ne revisite pas une œuvre déjà vue", async () => {
    const fetchLevel = fakeAniList({ 2: [edge("PREQUEL", 1), edge("SEQUEL", 1)] });
    await walkFranchise(media(1), [edge("SEQUEL", 2)], fetchLevel);
    expect(fetchLevel).toHaveBeenCalledTimes(1);
  });

  it("découpe un niveau en lots", async () => {
    const fetchLevel = fakeAniList({});
    const walk = await walkFranchise(
      media(0),
      [1, 2, 3, 4, 5].map((id) => edge("SEQUEL", id)),
      fetchLevel,
      { requests: 6, media: 80, batch: 2 },
    );
    expect(fetchLevel.mock.calls.map(([ids]) => ids)).toEqual([[1, 2], [3, 4], [5]]);
    expect(walk.requests).toBe(3);
  });

  it("s'arrête au plafond de requêtes et le dit", async () => {
    const chain: Record<number, FranchiseEdge[]> = {};
    for (let id = 1; id < 20; id++) chain[id] = [edge("SEQUEL", id + 1)];
    const walk = await walkFranchise(media(0), [edge("SEQUEL", 1)], fakeAniList(chain), {
      requests: 3,
      media: 80,
      batch: 50,
    });
    expect(walk).toMatchObject({ requests: 3, truncated: true, incomplete: false });
  });

  it("rend ce qu'il a quand AniList ne répond plus", async () => {
    const fetchLevel = vi.fn<FetchLevel>(async () => null);
    const walk = await walkFranchise(media(1), [edge("SEQUEL", 2)], fetchLevel);
    expect([...walk.graph.media.keys()].sort()).toEqual([1, 2]);
    expect(walk).toMatchObject({ incomplete: true, truncated: false });
  });
});
```

- [ ] **Step 2 : lancer les tests et les voir échouer**

Run : `pnpm test src/features/media/lib/franchise-walk.test.ts`
Attendu : FAIL, module introuvable.

- [ ] **Step 3 : implémenter**

```ts
import type { FranchiseGraph } from "@/features/media/lib/franchise-order";
import type { MediaCompact } from "@/features/media/schemas/media.schema";

export type FranchiseEdge = { relationType: string | null; node: MediaCompact };

/** Les relations d'un lot d'œuvres ; `null` quand AniList n'a pas répondu. */
export type FetchLevel = (
  ids: number[],
) => Promise<Map<number, FranchiseEdge[]> | null>;

/**
 * 50 est le `perPage` maximal d'AniList. 6 requêtes sur les 30 par minute partagées par toute la
 * production : une chaîne de douze saisons, parcourue dans les deux sens à la fois, y tient.
 */
export const FRANCHISE_LIMITS = { requests: 6, media: 80, batch: 50 };

/**
 * Le parcours par niveaux : chaque lot de maillons nouveaux part en **une** requête, donc le coût
 * suit la longueur de la chaîne, pas sa largeur. Les parallèles sont collectées et jamais
 * explorées : c'est ce qui empêche Gundam de devenir tout AniList.
 */
export async function walkFranchise(
  start: MediaCompact,
  startEdges: FranchiseEdge[],
  fetchLevel: FetchLevel,
  limits = FRANCHISE_LIMITS,
) {
  const media = new Map<number, MediaCompact>([[start.id, start]]);
  const sequels: Array<[number, number]> = [];
  const sides: Array<[number, number]> = [];
  const seen = new Set<number>([start.id]);
  let requests = 0;
  let incomplete = false;

  function absorb(from: number, edges: FranchiseEdge[]): number[] {
    const discovered: number[] = [];
    for (const { relationType, node } of edges) {
      if (relationType === "SIDE_STORY") {
        sides.push([from, node.id]);
        if (!media.has(node.id)) media.set(node.id, node);
        continue;
      }
      if (relationType === "SEQUEL") sequels.push([from, node.id]);
      else if (relationType === "PREQUEL") sequels.push([node.id, from]);
      else continue;
      media.set(node.id, node);
      if (!seen.has(node.id)) {
        seen.add(node.id);
        discovered.push(node.id);
      }
    }
    return discovered;
  }

  let queue = absorb(start.id, startEdges);

  while (
    queue.length > 0 &&
    requests < limits.requests &&
    media.size < limits.media
  ) {
    const batch = queue.slice(0, limits.batch);
    queue = queue.slice(limits.batch);
    requests++;

    const level = await fetchLevel(batch);
    if (!level) {
      incomplete = true;
      break;
    }
    for (const id of batch) queue.push(...absorb(id, level.get(id) ?? []));
  }

  const graph: FranchiseGraph = { currentId: start.id, media, sequels, sides };
  return {
    graph,
    requests,
    truncated: !incomplete && queue.length > 0,
    incomplete,
  };
}
```

- [ ] **Step 4 : lancer les tests et les voir passer**

Run : `pnpm test src/features/media/lib/franchise-walk.test.ts`
Attendu : 6 PASS.

- [ ] **Step 5 : commit**

```bash
git add src/features/media/lib/franchise-walk.ts src/features/media/lib/franchise-walk.test.ts
git commit -m "feat(media): parcours d'une franchise par niveaux"
```

---

### Task 3 : la lecture AniList (`getFranchise`)

**Files :**
- Modify : `src/features/media/server/media.documents.ts` (ajouter `FRANCHISE_LEVEL_QUERY` en fin de fichier)
- Modify : `src/features/media/schemas/media.schema.ts` (ajouter `franchiseLevelDataSchema` après `mediaRecommendationsDataSchema`)
- Create : `src/features/media/server/franchise.queries.ts`

**Interfaces :**
- Consumes : `walkFranchise`, `FranchiseEdge` (Task 2) ; `orderFranchise`, `FranchiseItem` (Task 1) ; `tryAniList`, `anilistQuery` (`@/lib/http/anilist`).
- Produces : `type Franchise = { items: FranchiseItem[]; truncated: boolean; incomplete: boolean }` et `getFranchise(media: MediaDetail, { includeAdult }: { includeAdult: boolean }): Promise<Franchise>`.

- [ ] **Step 1 : le document GraphQL**, en fin de `media.documents.ts`

```ts
/**
 * Un niveau du parcours de franchise : les relations d'un lot d'œuvres, en **une** requête.
 * Rien d'autre que les relations : les œuvres elles-mêmes sont déjà connues par l'arête qui y mène.
 */
export const FRANCHISE_LEVEL_QUERY = /* GraphQL */ `
  query FranchiseLevel($ids: [Int], $perPage: Int) {
    Page(perPage: $perPage) {
      media(id_in: $ids) {
        id
        relations {
          edges {
            relationType
            node {
              ...MediaCompactFields
            }
          }
        }
      }
    }
  }
  ${MEDIA_COMPACT_FIELDS}
`;
```

- [ ] **Step 2 : le schéma**, après `mediaRecommendationsDataSchema`

```ts
export const franchiseLevelDataSchema = z.object({
  Page: z.object({
    media: z.array(
      z.object({
        id: z.number().int(),
        relations: z
          .object({ edges: z.array(relationEdgeSchema).default([]) })
          .default({ edges: [] }),
      }),
    ),
  }),
});
```

- [ ] **Step 3 : la query**, `src/features/media/server/franchise.queries.ts`

```ts
import "server-only";

import { cacheLife } from "next/cache";
import {
  type FranchiseItem,
  orderFranchise,
} from "@/features/media/lib/franchise-order";
import {
  type FranchiseEdge,
  walkFranchise,
} from "@/features/media/lib/franchise-walk";
import {
  franchiseLevelDataSchema,
  type MediaDetail,
} from "@/features/media/schemas/media.schema";
import { FRANCHISE_LEVEL_QUERY } from "@/features/media/server/media.documents";
import { anilistQuery, tryAniList } from "@/lib/http/anilist";

export type Franchise = {
  items: FranchiseItem[];
  truncated: boolean;
  incomplete: boolean;
};

/**
 * Un niveau, caché **seul** : un parcours interrompu ne met en cache que les niveaux réussis, donc
 * une panne ne survit pas à elle-même. Des semaines, parce qu'une suite s'annonce rarement. Un
 * tableau plutôt qu'une `Map`, pour rester trivialement sérialisable par le cache.
 */
async function fetchFranchiseLevel(
  ids: number[],
): Promise<Array<[number, FranchiseEdge[]]>> {
  "use cache";
  cacheLife("weeks");

  const { Page } = await anilistQuery({
    query: FRANCHISE_LEVEL_QUERY,
    variables: { ids, perPage: ids.length },
    schema: franchiseLevelDataSchema,
  });

  return Page.media.map((entry) => [entry.id, entry.relations.edges]);
}

/**
 * La franchise de l'œuvre, dans l'ordre. Le niveau 0 vient de la fiche, déjà lue : l'onglet a
 * toujours au moins les voisins directs, même un jour de panne. Le filtre 18+ passe après le
 * cache et après l'ordre, pour qu'une suite adulte masquée ne coupe pas la chaîne.
 */
export async function getFranchise(
  media: MediaDetail,
  { includeAdult }: { includeAdult: boolean },
): Promise<Franchise> {
  const walk = await walkFranchise(media, media.relations.edges, async (ids) => {
    // Ids triés : deux parcours qui demandent le même lot partagent la même entrée de cache.
    const level = await tryAniList(() =>
      fetchFranchiseLevel(ids.toSorted((a, b) => a - b)),
    );
    return level ? new Map(level) : null;
  });

  return {
    items: orderFranchise(walk.graph).filter(
      (item) => includeAdult || !item.media.isAdult,
    ),
    truncated: walk.truncated,
    incomplete: walk.incomplete,
  };
}
```

- [ ] **Step 4 : vérifier**

Run : `pnpm typecheck && pnpm lint`
Attendu : vert. Si `tryAniList` ne rend pas `null` sur une limite de débit, relire
`src/lib/http/anilist.ts:121-160` et ajuster le commentaire, pas le comportement.

- [ ] **Step 5 : commit**

```bash
git add src/features/media/server/media.documents.ts src/features/media/schemas/media.schema.ts src/features/media/server/franchise.queries.ts
git commit -m "feat(media): lecture de la franchise, un niveau caché par requête"
```

---

### Task 4 : l'onglet « Ordre »

**Files :**
- Modify : `src/app/(app)/media/[id]/_lib/media-tab-params.ts` (`MEDIA_TABS`, `MEDIA_TAB_LABELS`)
- Modify : `src/app/(app)/media/[id]/_lib/media-panels.ts` (`hasFranchise`)
- Create : `src/app/(app)/media/[id]/_components/media-franchise.tsx`
- Modify : `src/app/(app)/media/[id]/page.tsx` (liste `tabs` et `MediaTabPanel`)

**Interfaces :**
- Consumes : `getFranchise`, `Franchise` (Task 3).
- Produces : `hasFranchise(media: MediaDetail, includeAdult: boolean): boolean`, `MediaFranchise`.

- [ ] **Step 1 : l'onglet.** Dans `media-tab-params.ts`, insérer `"ordre"` juste après `"apercu"`
  dans `MEDIA_TABS`, et `ordre: "Ordre",` dans `MEDIA_TAB_LABELS`.

- [ ] **Step 2 : `hasFranchise`**, en fin de `media-panels.ts`

```ts
/**
 * Y a-t-il une chaîne à ordonner ? Lu sur la requête de fiche, **sans requête de plus** : sans
 * préquelle ni suite visible, l'onglet ne montrerait que l'œuvre elle-même.
 */
export function hasFranchise(media: MediaDetail, includeAdult: boolean): boolean {
  return visibleRelations(media, includeAdult).some(
    (edge) => edge.relationType === "PREQUEL" || edge.relationType === "SEQUEL",
  );
}
```

- [ ] **Step 3 : le panneau**, `_components/media-franchise.tsx`

```tsx
import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import type { FranchiseItem } from "@/features/media/lib/franchise-order";
import type { MediaType } from "@/features/media/schemas/media.schema";
import type { Franchise } from "@/features/media/server/franchise.queries";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { CatalogueMediaCard } from "@/features/tracking/components/catalogue-media-card";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";
import { cn } from "@/lib/utils";

/**
 * L'ordre de la franchise, **dans la grille d'« Œuvres liées »** : la fiche garde une seule forme de
 * carte pour ses deux onglets d'œuvres, et la grille se lit dans l'ordre de lecture. L'étiquette
 * sous la carte dit l'étape à la place du type de lien.
 */
export async function MediaFranchise({
  franchise,
  type,
  titleLanguage,
}: {
  franchise: Franchise;
  type: MediaType;
  titleLanguage: TitleLanguage;
}) {
  const entries = await getLibraryEntriesFor(
    franchise.items.map((item) => item.media.id),
  );

  return (
    <MediaSection
      title={type === "ANIME" ? "Ordre de visionnage" : "Ordre de lecture"}
    >
      <ol className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-7">
        {franchise.items.map((item) => (
          <li className="flex min-w-0 flex-col gap-1" key={item.media.id}>
            <CatalogueMediaCard
              entry={entries.get(item.media.id) ?? null}
              media={item.media}
              titleLanguage={titleLanguage}
            />
            <p
              className={cn(
                "truncate text-[0.6875rem] font-medium tracking-[0.12em] uppercase",
                item.current ? "text-primary" : "text-muted-foreground",
              )}
              title={stepLabel(item)}
            >
              {stepLabel(item)}
            </p>
          </li>
        ))}
      </ol>
      {franchise.incomplete ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Liste incomplète : AniList n'a pas tout rendu. Réessayez dans une minute.
        </p>
      ) : franchise.truncated ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Franchise tronquée : seules les premières œuvres ont été parcourues.
        </p>
      ) : null}
    </MediaSection>
  );
}

function stepLabel(item: FranchiseItem): string {
  if (item.position === null) return "Facultatif";
  return item.current ? `N° ${item.position} · Vous êtes ici` : `N° ${item.position}`;
}
```

Vérifier que `MediaType` est bien exporté par `media.schema.ts` (`grep -n "export type MediaType"`),
sinon utiliser `MediaCompact["type"]`.

- [ ] **Step 4 : brancher la page.** Dans `page.tsx` :
  - importer `hasFranchise` depuis `_lib/media-panels`, `MediaFranchise` depuis
    `_components/media-franchise` et `getFranchise` depuis `@/features/media/server/franchise.queries` ;
  - dans `tabs`, juste après `"apercu" as const,`, ajouter
    `hasFranchise(media, includeAdult) ? ("ordre" as const) : null,` ;
  - dans `MediaTabPanel`, juste après le bloc `if (active === "apercu") { … }`, ajouter :

```tsx
  if (active === "ordre") {
    const franchise = await getFranchise(media, { includeAdult });
    return (
      <MediaFranchise
        franchise={franchise}
        titleLanguage={titleLanguage}
        type={media.type}
      />
    );
  }
```

- [ ] **Step 5 : vérifier**

Run : `pnpm typecheck && pnpm test && pnpm lint && pnpm knip`
Attendu : vert. Si un test ou un E2E énumère les onglets de la fiche
(`grep -rn "Œuvres liées\|MEDIA_TABS" src e2e`), l'ajuster.

- [ ] **Step 6 : à l'écran**, `pnpm dev` (le redémarrer s'il tourne depuis longtemps), en 1440 puis
  390 px :
  - *L'Attaque des Titans* saison 2 (`/media/20958`) : la chaîne dans l'ordre, les OAV marqués
    « Facultatif », « Vous êtes ici » sur la saison 2 ;
  - une œuvre sans suite : pas d'onglet « Ordre » ;
  - un manga avec suite : titre « Ordre de lecture ».

- [ ] **Step 7 : commit**

```bash
git add "src/app/(app)/media/[id]/_lib/media-tab-params.ts" "src/app/(app)/media/[id]/_lib/media-panels.ts" "src/app/(app)/media/[id]/_components/media-franchise.tsx" "src/app/(app)/media/[id]/page.tsx"
git commit -m "feat(media): onglet Ordre de la fiche"
```

---

### Task 5 : docs, maquette, PR

**Files :**
- Modify : `docs/decisions.md` (D68, après D67)
- Modify : `docs/conception.md` (§5 ligne `/media/[id]`, §6 point 5, §8 « En attente »)
- Modify : `docs/design/refonte.fig` (D54 : la maquette suit le code)

- [ ] **Step 1 : D68**, au format des décisions voisines :

```markdown
- **D68** — L'ordre de visionnage d'une franchise est un onglet « Ordre » de la fiche, ouvert
  seulement s'il y a une préquelle ou une suite visible. Il suit `PREQUEL`/`SEQUEL` de proche en
  proche, place les `SIDE_STORY` en « Facultatif » sans les explorer, et laisse les spin-offs et
  adaptations à « Œuvres liées ». Parcours par niveaux, un niveau caché par requête (des
  semaines), plafonné à 6 requêtes et 80 œuvres.
```

- [ ] **Step 2 : conception.md.** §5 : « six onglets (Aperçu, Ordre, Personnages, Équipe, Œuvres
  liées, Tags) » ; §6 : retirer le point 5 et renuméroter (le code ne cite pas les numéros de §6 :
  vérifier avec `grep -rn "§6\." src`) ; §8 : déplacer « l'ordre de visionnage d'une franchise »
  dans « Livré ».

- [ ] **Step 3 : maquette.** Enregistrer d'abord le document ouvert dans OpenPencil (`save_file`).
  Ajouter l'onglet « Ordre » à la fiche dans `docs/design/refonte.fig`, à partir de l'écran réel, en
  1440 et 390. Enregistrer.

- [ ] **Step 4 : relecture et PR.** Lancer l'agent `convention-reviewer` sur le diff, corriger,
  puis supprimer la spec et le plan (le chantier se fusionne avec ses décisions reportées) :

```bash
git rm docs/superpowers/specs/2026-11-07-ordre-franchise-design.md docs/superpowers/plans/2026-11-07-ordre-franchise.md
git add docs/decisions.md docs/conception.md docs/design/refonte.fig
git commit -m "docs: ordre de visionnage livré (D68)"
git push -u origin feat/ordre-franchise
gh pr create --title "feat(media): ordre de visionnage d'une franchise" --body "…"
```

S'arrêter à la PR ouverte : la fusion attend l'accord d'Alexis.
