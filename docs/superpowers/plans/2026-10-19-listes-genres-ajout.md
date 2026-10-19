# Listes : genre et ajout depuis la liste — plan d'implémentation

> **Pour les agents :** sous-skill requise — `superpowers:subagent-driven-development` (recommandé)
> ou `superpowers:executing-plans`, tâche par tâche. Les étapes se cochent (`- [ ]`).

**But :** remplir une liste depuis elle-même (PR 1), puis donner à chaque liste un genre qui décide
de son affichage (PR 2).

**Architecture :** PR 1 ajoute une fenêtre cliente sur `/lists/[id]` qui réutilise `/api/search`
et les actions `addToList` / `removeFromList`, plus une requête de suggestions lue par la page.
PR 2 ajoute `kind` et `cutoff` à `List`, une fonction pure `listSections` qui répartit les œuvres
selon le genre, et branche cette répartition sur `/lists/[id]`, `/lists`, la fiche et `/l/[token]`.

**Pile :** Next 16.3 (App Router, `cacheComponents`), React 19, Prisma 7 sur Neon, Zod 4,
next-safe-action, shadcn (`Command` = cmdk), Vitest, Playwright.

**Spec :** [docs/superpowers/specs/2026-10-19-listes-genres-ajout-design.md](../specs/2026-10-19-listes-genres-ajout-design.md)

## Contraintes globales

- Tout en français : interface, commentaires, commits (`type(portée): sujet`).
- Commentaires : le **pourquoi**, en une à trois lignes. Pas de récit de séance dans le code.
- Aucune URL en dur : `routes` de `@/config/routes`. Jamais `process.env.X`. Jamais `fetch` nu :
  `upfetch` avec un `schema`.
- `"use client"` sur la feuille interactive seulement, jamais sur une page.
- Règle de promotion : un composant d'un seul écran vit dans le `_components/` de sa route.
- D33 : l'accent n'a que quatre emplois ; le rang d'un classement est en blanc, pas en accent.
- `git add <fichier>` un par un, jamais `git add -A`.
- Une tâche n'est finie qu'avec `pnpm typecheck && pnpm test && pnpm lint && pnpm knip` vert. Une
  PR n'est prête qu'après l'écran vu au navigateur en 1440 et en 390 px.
- **Ne jamais fusionner** : s'arrêter à la PR ouverte et verte. Fusionner déploie la production.

## Fichiers

| Fichier | Rôle | PR |
| --- | --- | --- |
| `src/features/command/schemas/command-search.schema.ts` | exporte `CommandSearchItem` | 1 |
| `src/features/lists/server/lists.queries.ts` | `getListSuggestions` ; puis `kind`, `cutoff`, décomptes | 1, 2 |
| `src/features/lists/server/lists.queries.test.ts` | tests de `getListSuggestions` (Prisma doublé) | 1, 2 |
| `src/features/lists/server/lists.actions.ts` | revalide `/lists/[id]` ; puis `kind`, `cutoff` | 1, 2 |
| `src/app/(app)/lists/[id]/_components/add-media-dialog.tsx` | la fenêtre « Ajouter des œuvres » | 1 |
| `src/app/(app)/lists/[id]/page.tsx` | bouton d'ajout ; puis sections et rangs | 1, 2 |
| `e2e/lists.spec.ts` | parcours d'ajout ; puis genre | 1, 2 |
| `prisma/schema.prisma` + migration | `ListKind`, `kind`, `cutoff` | 2 |
| `src/features/lists/schemas/lists.schema.ts` (+ `.test.ts`) | `listKindSchema`, `cutoff` | 2 |
| `src/features/lists/lib/list-sections.ts` (+ `.test.ts`) | répartition pure par genre | 2 |
| `src/features/lists/lib/list-labels.ts` (+ `.test.ts`) | libellés de genre et de décompte | 2 |
| `src/components/shared/rank-numeral.tsx` | le grand chiffre de rang | 2 |
| `src/features/media/components/media-card.tsx` | prop `rank` | 2 |
| `src/features/lists/components/list-form-dialog.tsx` | champ Genre, champ « Top … » | 2 |
| `src/components/ui/radio-group.tsx` | ajouté par shadcn | 2 |
| `src/app/(app)/lists/_components/list-card.tsx` | ligne de décompte par genre | 2 |
| `src/app/(app)/lists/_components/create-list-dialog.tsx` | envoie `kind`, `cutoff` | 2 |
| `src/app/(app)/lists/[id]/_components/list-actions-menu.tsx` | « Modifier » | 2 |
| `src/app/(app)/media/[id]/_components/add-to-list-dialog.tsx` | genre et décompte par ligne | 2 |
| `src/app/(share)/l/[token]/page.tsx` | sections et rangs, sans « Déjà vues » | 2 |
| `docs/decisions.md`, `docs/conception.md` | D47 (PR 1), D46 (PR 2) | 1, 2 |

---

# PR 1 — Ajouter depuis la liste

Branche : `feat/lists-add-media` (existe déjà ; porte la spec et ce plan).

### Tâche 1 : la requête de suggestions

**Fichiers :**
- Modifier : `src/features/command/schemas/command-search.schema.ts` (après `commandSearchItemSchema`)
- Modifier : `src/features/lists/server/lists.queries.ts` (fin de fichier, et imports)
- Créer : `src/features/lists/server/lists.queries.test.ts`

**Interfaces :**
- Produit : `type CommandSearchItem = z.infer<typeof commandSearchItemSchema>`, et
  `getListSuggestions(listId: string, prefs: { includeAdult: boolean; titleLanguage: TitleLanguage }): Promise<CommandSearchItem[]>`.

- [ ] **Étape 1 : exporter le type d'une ligne de recherche**

Dans `command-search.schema.ts`, juste après la déclaration de `commandSearchItemSchema` :

```ts
export type CommandSearchItem = z.infer<typeof commandSearchItemSchema>;
```

- [ ] **Étape 2 : écrire le test qui échoue**

`src/features/lists/server/lists.queries.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La **question posée à la base** par les suggestions, et la forme de ce qui en revient.
 *
 * Prisma est doublé : ce qui peut se tromper ici, c'est le `where` — une œuvre déjà rangée qui
 * reviendrait en suggestion, ou une préférence 18+ ignorée —, pas PostgreSQL.
 */

const { entryFindMany } = vi.hoisted(() => ({ entryFindMany: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { entry: { findMany: entryFindMany } },
}));
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => ({ user: { id: "membre-1" } })),
}));

import { getListSuggestions } from "@/features/lists/server/lists.queries";

/** Une ligne du miroir, avec tout ce que `MIRRORED_MEDIA_SELECT` demande. */
function mirrorRow(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: "ANIME",
    format: "TV",
    status: "FINISHED",
    titleRomaji: `Romaji ${id}`,
    titleEnglish: `English ${id}`,
    titleNative: null,
    coverImage: `https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/${id}.jpg`,
    meanScore: null,
    isAdult: false,
    episodes: 12,
    chapters: null,
    bannerImage: null,
    season: "SPRING",
    seasonYear: 2020,
    genres: [],
    countryOfOrigin: "JP",
    coverColor: null,
    ...overrides,
  };
}

beforeEach(() => {
  entryFindMany.mockReset();
  entryFindMany.mockResolvedValue([]);
});

describe("getListSuggestions", () => {
  it("cherche mes œuvres prévues absentes de la liste, les plus récentes d'abord", async () => {
    await getListSuggestions("liste-1", {
      includeAdult: true,
      titleLanguage: "ROMAJI",
    });

    expect(entryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "membre-1",
          status: { in: ["PLANNING"] },
          media: { listItems: { none: { listId: "liste-1" } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    );
  });

  it("écarte les œuvres adultes quand la préférence les masque", async () => {
    await getListSuggestions("liste-1", {
      includeAdult: false,
      titleLanguage: "ROMAJI",
    });

    expect(entryFindMany.mock.calls[0]?.[0].where.media).toEqual({
      listItems: { none: { listId: "liste-1" } },
      isAdult: false,
    });
  });

  it("rend des lignes prêtes à afficher, dans la langue du compte", async () => {
    entryFindMany.mockResolvedValue([
      { status: "PLANNING", media: mirrorRow(7) },
    ]);

    const [item] = await getListSuggestions("liste-1", {
      includeAdult: true,
      titleLanguage: "ENGLISH",
    });

    expect(item).toMatchObject({
      id: 7,
      title: "English 7",
      format: "Série TV",
      year: 2020,
      status: "PLANNING",
    });
    expect(item?.cover).toEqual(expect.any(String));
  });
});
```

- [ ] **Étape 3 : vérifier qu'il échoue**

Lancer : `pnpm test src/features/lists/server/lists.queries.test.ts`
Attendu : ÉCHEC, `getListSuggestions` n'est pas exporté.

Si `"Série TV"` n'est pas le libellé de `formatMediaFormat("TV")`, lire
`src/features/media/lib/media-format.ts` et corriger **le test** avec le libellé réel.

- [ ] **Étape 4 : écrire la requête**

Dans `lists.queries.ts`, compléter les imports :

```ts
import type { CommandSearchItem } from "@/features/command/schemas/command-search.schema";
import {
  compactFromMirror,
  formatMediaFormat,
  MIRRORED_MEDIA_SELECT,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
```

Puis, en fin de fichier :

```ts
/** Huit : ce que la fenêtre d'ajout montre sans défiler, au-dessus du champ. */
const SUGGESTION_COUNT = 8;

/**
 * Ce que la fenêtre « Ajouter des œuvres » propose avant qu'on tape : mes œuvres prévues qui ne
 * sont pas encore dans cette liste, les dernières touchées d'abord.
 *
 * **Aucune lecture AniList** : tout vient du miroir et de mon suivi. La forme est celle d'une ligne
 * de la palette (`CommandSearchItem`), pour que la fenêtre dessine suggestions et résultats d'un
 * même composant.
 */
export async function getListSuggestions(
  listId: string,
  {
    includeAdult,
    titleLanguage,
  }: { includeAdult: boolean; titleLanguage: TitleLanguage },
): Promise<CommandSearchItem[]> {
  const userId = await currentUserId();

  const rows = await prisma.entry.findMany({
    where: {
      userId,
      status: { in: ["PLANNING"] },
      media: {
        listItems: { none: { listId } },
        ...(includeAdult ? {} : { isAdult: false }),
      },
    },
    orderBy: { updatedAt: "desc" },
    take: SUGGESTION_COUNT,
    select: { status: true, media: { select: MIRRORED_MEDIA_SELECT } },
  });

  return rows.map(({ status, media }) => {
    const compact = compactFromMirror(media);

    return {
      id: compact.id,
      title: mediaTitle(compact.title, titleLanguage),
      format: formatMediaFormat(compact.format),
      year: media.seasonYear,
      cover: compact.coverImage?.medium ?? compact.coverImage?.large ?? null,
      status,
    };
  });
}
```

Si `compact.coverImage` n'a pas de champ `medium`, garder `large` seul (voir le type
`MediaCompact`) ; `pnpm typecheck` le signalera.

- [ ] **Étape 5 : vérifier que les tests passent**

Lancer : `pnpm test src/features/lists/server/lists.queries.test.ts`
Attendu : 3 tests PASS.

- [ ] **Étape 6 : committer**

```bash
git add src/features/command/schemas/command-search.schema.ts src/features/lists/server/lists.queries.ts src/features/lists/server/lists.queries.test.ts
git commit -m "feat(lists): suggestions d'œuvres à ranger, tirées de ma bibliothèque"
```

### Tâche 2 : la fenêtre « Ajouter des œuvres »

**Fichiers :**
- Créer : `src/app/(app)/lists/[id]/_components/add-media-dialog.tsx`
- Modifier : `src/features/lists/server/lists.actions.ts` (`addToList`, `removeFromList`)

**Interfaces :**
- Consomme : `CommandSearchItem`, `commandSearchResultSchema`, `COMMAND_SEARCH_MIN_LENGTH`
  (`command-search.schema.ts`) ; `addToList`, `removeFromList` ; `useDebouncedValue`
  (`@/hooks/use-debounced-value`) ; `EntryStatusDot` (`status: EntryStatus`).
- Produit : `AddMediaDialog({ listId, memberIds, suggestions }: { listId: string; memberIds: number[]; suggestions: CommandSearchItem[] })`.

Pas de test unitaire : Vitest tourne sous `node`, sans DOM. Le composant est couvert par l'E2E de
la tâche 3 et par la vérification au navigateur.

- [ ] **Étape 1 : revalider la page de la liste après un ajout ou un retrait**

Dans `lists.actions.ts`, dans `addToList` **et** dans `removeFromList`, juste après
`revalidateLists(mediaId);` :

```ts
    // La grille de la liste est derrière la fenêtre d'ajout : elle doit suivre chaque geste.
    revalidatePath(routes.lists.detail(listId));
```

- [ ] **Étape 2 : écrire le composant**

`src/app/(app)/lists/[id]/_components/add-media-dialog.tsx` :

```tsx
"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import {
  COMMAND_SEARCH_MIN_LENGTH,
  type CommandSearchItem,
  type CommandSearchResult,
  commandSearchResultSchema,
} from "@/features/command/schemas/command-search.schema";
import {
  addToList,
  removeFromList,
} from "@/features/lists/server/lists.actions";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { upfetch } from "@/lib/http/fetch";

/** Le délai de la palette : sous 250 ms, chaque lettre partirait en requête sur le quota du cercle. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Remplir une liste **depuis elle-même** (D47) : chercher, ranger, recommencer, sans quitter
 * l'écran.
 *
 * La fenêtre reste ouverte et chaque ligne est une bascule, comme celle de la fiche. `Entrée` range
 * la ligne surlignée puis sélectionne le terme : la frappe suivante le remplace, donc on enchaîne
 * au clavier. Vider le champ démonterait la ligne pendant son écriture, et un échec ne pourrait
 * plus remettre la case en place.
 *
 * La recherche est celle de la palette (`/api/search`) : un GET annulé à chaque frappe, sous le
 * cache d'une heure de `searchMedia`.
 */
export function AddMediaDialog({
  listId,
  memberIds,
  suggestions,
}: {
  listId: string;
  /** Les œuvres déjà dans la liste : la page les connaît, la recherche n'a pas à les savoir. */
  memberIds: number[];
  suggestions: CommandSearchItem[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CommandSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const searchable = term.length >= COMMAND_SEARCH_MIN_LENGTH;
  const members = new Set(memberIds);

  /*
    Une requête par terme stabilisé, la précédente annulée. Le dernier résultat reste affiché
    pendant la suivante : une liste qui se vide à chaque lettre fait perdre sa place à l'œil.
  */
  useEffect(() => {
    if (!open || !searchable) {
      setResult(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    upfetch(routes.api.search, {
      params: { q: term },
      schema: commandSearchResultSchema,
      signal: controller.signal,
    })
      .then((next) => {
        setResult(next);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setLoading(false);
        toast.error("La recherche n'a pas abouti. Réessayez.");
      });

    return () => controller.abort();
  }, [open, searchable, term]);

  const items = searchable ? (result?.items ?? []) : suggestions;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon data-icon="inline-start" />
          {/* Sur téléphone, la barre d'actions n'a de place que pour l'icône. */}
          <span className="sr-only sm:not-sr-only">Ajouter des œuvres</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-3 p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Ajouter des œuvres</DialogTitle>
          <DialogDescription>
            Entrée range l'œuvre surlignée ; tapez la suivante aussitôt.
          </DialogDescription>
        </DialogHeader>

        {/* `shouldFilter={false}` : le tri est celui d'AniList, cmdk n'a rien à refiltrer. */}
        <Command className="rounded-none border-t" shouldFilter={false}>
          <div className="relative">
            <CommandInput
              onValueChange={setQuery}
              placeholder="Chercher une œuvre…"
              ref={inputRef}
              value={query}
            />
            {loading ? (
              <Spinner className="absolute top-1/2 right-3 -translate-y-1/2" />
            ) : null}
          </div>

          <CommandList className="max-h-96">
            <CommandEmpty>
              {searchable
                ? `Rien ne correspond à « ${term} ».`
                : "Tapez un titre pour chercher dans le catalogue."}
            </CommandEmpty>

            {result?.fromMirror && searchable ? (
              <p className="px-4 py-2 text-muted-foreground text-xs">
                AniList ne répond pas : résultats de la copie locale.
              </p>
            ) : null}

            {items.length > 0 ? (
              <CommandGroup
                heading={searchable ? undefined : "Dans ma bibliothèque"}
              >
                {items.map((item) => (
                  <ResultRow
                    inList={members.has(item.id)}
                    item={item}
                    key={item.id}
                    listId={listId}
                    onAdded={() => inputRef.current?.select()}
                  />
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Une œuvre, et la bascule qui la range ou la retire.
 *
 * Chaque ligne tient ses propres actions, comme `ListToggle` sur la fiche : deux ajouts coup sur
 * coup ne doivent pas partager un `isPending`.
 */
function ResultRow({
  item,
  listId,
  inList: inListFromServer,
  onAdded,
}: {
  item: CommandSearchItem;
  listId: string;
  inList: boolean;
  onAdded: () => void;
}) {
  const [inList, setInList] = useState(inListFromServer);

  // La revalidation de la page renvoie l'état réel ; c'est lui qui fait foi.
  useEffect(() => setInList(inListFromServer), [inListFromServer]);

  const onError = ({ error }: { error: { serverError?: string } }) => {
    toast.error(error.serverError ?? "Le rangement n'a pas abouti. Réessayez.");
    setInList(inListFromServer);
  };

  const add = useAction(addToList, { onError });
  const remove = useAction(removeFromList, { onError });
  const pending = add.isPending || remove.isPending;

  const toggle = () => {
    if (pending) return;
    const next = !inList;
    setInList(next);
    (next ? add.execute : remove.execute)({ listId, mediaId: item.id });
    if (next) onAdded();
  };

  const meta = [item.format, item.year].filter(Boolean).join(" · ");

  return (
    <CommandItem className="gap-3" onSelect={toggle} value={String(item.id)}>
      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
        {item.cover ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="32px"
            src={item.cover}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          {item.status ? <EntryStatusDot status={item.status} /> : null}
          <span className="truncate" title={item.title}>
            {item.title}
          </span>
        </span>
        {meta ? (
          <span className="text-muted-foreground text-xs">{meta}</span>
        ) : null}
      </div>

      {/* La place du témoin est fixe : le libellé ne doit pas sauter au clic. */}
      <span className="flex w-28 shrink-0 items-center justify-end gap-1.5 text-xs">
        {pending ? (
          <Spinner />
        ) : inList ? (
          <>
            <CheckIcon className="size-4" />
            Dans la liste
          </>
        ) : (
          <>
            <PlusIcon className="size-4" />
            Ajouter
          </>
        )}
      </span>
    </CommandItem>
  );
}
```

Points à vérifier en écrivant :
- `CommandInput` de `src/components/ui/command.tsx` transmet-il `ref` ? En React 19, `ref` est une
  prop : s'il l'étale sur `CommandPrimitive.Input`, c'est bon. Sinon, poser `ref` via un
  `data-slot` et `document.querySelector` serait fragile : **ajouter** plutôt la transmission dans
  le composant (D35 interdit de changer le style shadcn, pas de transmettre une prop).
- Si `CommandInput` porte déjà une icône de loupe dans un wrapper, garder le `Spinner` à droite
  comme écrit.

- [ ] **Étape 3 : typecheck et lint**

Lancer : `pnpm typecheck && pnpm lint`
Attendu : vert. Corriger les écarts de type signalés (prop `ref`, `coverImage.medium`).

- [ ] **Étape 4 : committer**

```bash
git add "src/app/(app)/lists/[id]/_components/add-media-dialog.tsx" src/features/lists/server/lists.actions.ts
git commit -m "feat(lists): fenêtre « Ajouter des œuvres » sur la page d'une liste"
```

### Tâche 3 : brancher la fenêtre sur la page, E2E, décision D47

**Fichiers :**
- Modifier : `src/app/(app)/lists/[id]/page.tsx`
- Créer : `e2e/lists.spec.ts`
- Modifier : `docs/decisions.md`, `docs/conception.md`

**Interfaces :**
- Consomme : `AddMediaDialog`, `getListSuggestions`.

- [ ] **Étape 1 : écrire l'E2E qui échoue**

`e2e/lists.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

import { routes } from "@/config/routes";

import { accounts } from "./support/accounts";

test.use({ storageState: accounts.member.storageState });

test("remplir une liste depuis elle-même, au clavier @anilist", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "écrit en base avec le seul compte membre : un viewport suffit",
  );

  const title = `E2E ajout ${Date.now()}`;

  await page.goto(routes.lists.root);
  await page.getByRole("button", { name: "Nouvelle liste" }).first().click();
  await page.getByLabel("Nom").fill(title);
  await page.getByRole("button", { name: "Créer" }).click();
  await page.getByRole("link", { name: new RegExp(title) }).click();

  await page.getByRole("button", { name: "Ajouter des œuvres" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Chercher une œuvre…").fill("frieren");
  await expect(dialog.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(dialog.getByText("Dans la liste").first()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText("1 œuvre")).toBeVisible();
});
```

Les listes du compte de test partent en cascade au teardown (`deleteAccounts`).

- [ ] **Étape 2 : vérifier qu'il échoue**

Lancer (avec `pnpm dev` ouvert) : `pnpm test:e2e e2e/lists.spec.ts`
Attendu : ÉCHEC, pas de bouton « Ajouter des œuvres ».

- [ ] **Étape 3 : brancher la page**

Dans `src/app/(app)/lists/[id]/page.tsx` :

1. Importer :

```ts
import { AddMediaDialog } from "@/app/(app)/lists/[id]/_components/add-media-dialog";
import {
  getList,
  getListSuggestions,
} from "@/features/lists/server/lists.queries";
```

2. Remplacer la lecture du suivi par une lecture en parallèle :

```ts
  /*
    Le suivi et les suggestions ne servent qu'en consultation, et ne dépendent pas l'un de l'autre :
    ils partent ensemble.
  */
  const [entries, suggestions] = reordering
    ? [new Map(), []]
    : await Promise.all([
        getLibraryEntriesFor(list.items.map((i) => i.media.id)),
        getListSuggestions(list.id, { includeAdult, titleLanguage }),
      ]);
```

3. Dans la barre d'actions (`<div className="flex shrink-0 items-center gap-2">`), avant le
   bouton « Réorganiser » :

```tsx
            {reordering ? null : (
              <AddMediaDialog
                listId={list.id}
                memberIds={list.items.map((item) => item.media.id)}
                suggestions={suggestions}
              />
            )}
```

4. Dans le docstring de `ListPage`, remplacer la puce « **Pas de bouton « ajouter une œuvre »
   ici.** … » par :

```
 * - **On remplit aussi la liste d'ici** (D47) : la fenêtre « Ajouter des œuvres » cherche et range
 *   sans passer par la fiche. Celle de la fiche reste, pour ranger une œuvre dans plusieurs listes.
```

5. Dans `ListContentEmpty`, remplacer la description du cas vide par :
   `"Ajoutez une première œuvre avec « Ajouter des œuvres », ou depuis la fiche d'une œuvre."`

6. Dans `ListDetailSkeleton`, la barre d'actions gagne un bouton : ajouter
   `<Skeleton className="h-8 w-40" />` avant `<Skeleton className="h-8 w-32" />`.

- [ ] **Étape 4 : vérifier que l'E2E passe**

Lancer : `pnpm test:e2e e2e/lists.spec.ts`
Attendu : PASS.

- [ ] **Étape 5 : écrire la décision**

Dans `docs/decisions.md`, après D45 :

```markdown
- **D47** — Une liste se remplit aussi depuis elle-même : la fenêtre « Ajouter des œuvres » de
  `/lists/[id]` cherche et range sans passer par la fiche. Révise la décision du 6 septembre 2026
  (« on remplit une liste depuis la fiche ») : dix-sept œuvres demandaient dix-sept allers-retours.
```

Dans `docs/conception.md` §5, la ligne `/lists` devient :

```markdown
| `/lists` · `/lists/[id]` | Mes listes, une liste réordonnable (glisser et clavier), remplie depuis elle-même (D47) | livré |
```

- [ ] **Étape 6 : committer**

```bash
git add "src/app/(app)/lists/[id]/page.tsx" e2e/lists.spec.ts docs/decisions.md docs/conception.md
git commit -m "feat(lists): remplir une liste depuis sa page (D47)"
```

### Tâche 4 : vérifier et ouvrir la PR 1

- [ ] **Étape 1 : la batterie complète**

Lancer : `pnpm typecheck && pnpm test && pnpm lint && pnpm knip`
Attendu : vert. `knip` signalera `CommandSearchItem` s'il n'est pas importé : il l'est par
`lists.queries.ts` et `add-media-dialog.tsx`.

- [ ] **Étape 2 : l'écran au navigateur**

Redémarrer `pnpm dev` (piège connu des Server Actions après un refactor). En 1440 puis en 390 px :
- ouvrir une liste, ouvrir « Ajouter des œuvres » : les suggestions s'affichent sans frappe ;
- taper un titre, Entrée, taper le suivant, Entrée : les deux sont « Dans la liste » ;
- fermer : la grille montre les deux œuvres ;
- en 390, le bouton ne montre que l'icône et la barre d'actions ne déborde pas.

- [ ] **Étape 3 : relecture des conventions**

Lancer l'agent `convention-reviewer` sur le diff ; corriger ce qu'il relève.

- [ ] **Étape 4 : pousser et ouvrir la PR**

```bash
git push -u origin feat/lists-add-media
gh pr create --base main --title "feat(lists): remplir une liste depuis elle-même" --body "…"
```

Corps : le pourquoi (17 allers-retours), ce qui change, D47, la vérification faite. **S'arrêter
là** : attendre l'accord explicite avant toute fusion.

---

# PR 2 — Les genres de liste

Branche : `feat/lists-genres`, créée depuis `main` une fois la PR 1 fusionnée, ou depuis
`feat/lists-add-media` si elle ne l'est pas encore (la PR 2 visera alors cette branche).

### Tâche 5 : le modèle, les schémas, les actions

**Fichiers :**
- Modifier : `prisma/schema.prisma` (`model List`, nouvel `enum ListKind`)
- Créer : `prisma/migrations/<horodatage>_list_kind/migration.sql` (généré)
- Modifier : `src/features/lists/schemas/lists.schema.ts`
- Créer : `src/features/lists/schemas/lists.schema.test.ts`
- Modifier : `src/features/lists/server/lists.actions.ts` (`createList`, `updateList`)

**Interfaces :**
- Produit : `listKindSchema`, `type ListKind = "SELECTION" | "RANKING" | "WATCHLIST" | "WAIT_FOR_END"`,
  `createListSchema` / `updateListSchema` avec `kind` et `cutoff: number | null`.

- [ ] **Étape 1 : le schéma Prisma**

Dans `prisma/schema.prisma`, avant `model List` :

```prisma
/// Ce qu'une liste est (D46). Il décide de son affichage, jamais de son ordre.
enum ListKind {
  SELECTION
  RANKING
  WATCHLIST
  WAIT_FOR_END
}
```

Dans `model List`, après `isTemplate` :

```prisma
  kind   ListKind @default(SELECTION)
  /// Ligne de coupe d'un classement (« Top 10 »). Lue seulement pour `RANKING`, mais conservée si
  /// la liste change de genre : y revenir retrouve son Top 10.
  cutoff Int?
```

- [ ] **Étape 2 : la migration**

Lancer : `pnpm db:migrate --name list_kind`
Attendu : une migration qui crée le type `ListKind` et ajoute deux colonnes, `kind` avec
`DEFAULT 'SELECTION'`. Relire le SQL : aucune autre table touchée.

- [ ] **Étape 3 : les tests de schéma qui échouent**

`src/features/lists/schemas/lists.schema.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import {
  createListSchema,
  updateListSchema,
} from "@/features/lists/schemas/lists.schema";

describe("createListSchema", () => {
  it("prend « Sélection » quand le genre n'est pas donné", () => {
    expect(createListSchema.parse({ title: "Pile" })).toMatchObject({
      kind: "SELECTION",
    });
  });

  it("refuse un genre inconnu", () => {
    expect(
      createListSchema.safeParse({ title: "Pile", kind: "TIER" }).success,
    ).toBe(false);
  });

  it("borne la ligne de coupe entre 1 et 100", () => {
    const base = { title: "Top", kind: "RANKING" };
    expect(createListSchema.safeParse({ ...base, cutoff: 0 }).success).toBe(false);
    expect(createListSchema.safeParse({ ...base, cutoff: 101 }).success).toBe(false);
    expect(createListSchema.safeParse({ ...base, cutoff: 10 }).success).toBe(true);
    expect(createListSchema.safeParse({ ...base, cutoff: null }).success).toBe(true);
  });
});

describe("updateListSchema", () => {
  it("exige le genre", () => {
    expect(
      updateListSchema.safeParse({ listId: "l1", title: "Top" }).success,
    ).toBe(false);
  });
});
```

Lancer : `pnpm test src/features/lists/schemas/lists.schema.test.ts`
Attendu : ÉCHEC (`kind` absent).

- [ ] **Étape 4 : les schémas**

Dans `lists.schema.ts`, après `listDescriptionSchema` :

```ts
/** Les quatre genres d'une liste (D46) — le miroir de l'énumération `ListKind` de Prisma. */
export const listKindSchema = z.enum([
  "SELECTION",
  "RANKING",
  "WATCHLIST",
  "WAIT_FOR_END",
]);
export type ListKind = z.infer<typeof listKindSchema>;

/** Un « Top 100 » est déjà une liste entière ; au-delà, une ligne de coupe ne coupe plus rien. */
const listCutoffSchema = z.number().int().min(1).max(100).nullable();
```

Puis :

```ts
export const createListSchema = z.object({
  title: listTitleSchema,
  description: listDescriptionSchema,
  kind: listKindSchema.default("SELECTION"),
  cutoff: listCutoffSchema.optional(),
});

export const updateListSchema = z.object({
  listId: listIdSchema,
  title: listTitleSchema,
  description: listDescriptionSchema,
  kind: listKindSchema,
  cutoff: listCutoffSchema,
});
```

Lancer : `pnpm test src/features/lists/schemas/lists.schema.test.ts` → PASS.

- [ ] **Étape 5 : les actions**

Dans `createList`, `data` devient :

```ts
      data: {
        ownerId: ctx.user.id,
        title: parsedInput.title,
        description: parsedInput.description ?? null,
        kind: parsedInput.kind,
        cutoff: parsedInput.cutoff ?? null,
      },
```

Dans `updateList` :

```ts
    const { listId, title, description, kind, cutoff } = parsedInput;

    await prisma.list.updateMany({
      where: { id: listId, ownerId: ctx.user.id },
      data: { title, description: description ?? null, kind, cutoff },
    });

    revalidateLists();
    revalidatePath(routes.lists.detail(listId));
```

`ListActionsMenu` appelle `updateList` sans `kind` : `pnpm typecheck` échouera jusqu'à la tâche 8.
Pour garder la tâche verte, y passer provisoirement `kind: list.kind, cutoff: list.cutoff` — ce qui
demande `kind` et `cutoff` sur `ListDetail` : ajouter dès maintenant, dans `getList`,
`kind: true, cutoff: true` au `select`, `kind: ListKind; cutoff: number | null` au type
`ListDetail`, et les deux champs au `return`.

- [ ] **Étape 6 : vérifier et committer**

Lancer : `pnpm typecheck && pnpm test`
Attendu : vert.

```bash
git add prisma/schema.prisma prisma/migrations src/features/lists/schemas/lists.schema.ts src/features/lists/schemas/lists.schema.test.ts src/features/lists/server/lists.actions.ts src/features/lists/server/lists.queries.ts "src/app/(app)/lists/[id]/_components/list-actions-menu.tsx"
git commit -m "feat(lists): une liste a un genre et une ligne de coupe (D46)"
```

### Tâche 6 : la répartition par genre et les libellés

**Fichiers :**
- Créer : `src/features/lists/lib/list-sections.ts`, `src/features/lists/lib/list-sections.test.ts`
- Créer : `src/features/lists/lib/list-labels.ts`, `src/features/lists/lib/list-labels.test.ts`

**Interfaces :**
- Produit :
  - `listSections<T>(kind: ListKind, cutoff: number | null, inputs: SectionInput<T>[]): ListSection<T>[]`
  - `type SectionInput<T> = { item: T; mediaStatus: MediaStatus | null; entryStatus: EntryStatus | null }`
  - `type ListSection<T> = { key: SectionKey; label: string | null; collapsed: boolean; items: { item: T; rank: number }[] }`
  - `sectionCounts(sections): { ready: number; seen: number }`
  - `LIST_KIND_LABELS: Record<ListKind, string>`, `itemCountLabel(count: number): string`,
    `listCountsLine(kind, cutoff, counts: { total: number; ready: number; seen: number }): string`

- [ ] **Étape 1 : les tests de `listSections` qui échouent**

`src/features/lists/lib/list-sections.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import {
  listSections,
  type SectionInput,
  sectionCounts,
} from "@/features/lists/lib/list-sections";

/** Une œuvre réduite à ce qui décide de sa section ; `item` est son nom, pour lire les assertions. */
function input(
  item: string,
  mediaStatus: SectionInput<string>["mediaStatus"] = "FINISHED",
  entryStatus: SectionInput<string>["entryStatus"] = null,
): SectionInput<string> {
  return { item, mediaStatus, entryStatus };
}

const names = (section: { items: { item: string }[] } | undefined) =>
  section?.items.map(({ item }) => item);

describe("listSections", () => {
  it("rend une liste vide sans aucune section", () => {
    expect(listSections("WAIT_FOR_END", null, [])).toEqual([]);
  });

  it("garde une sélection en un seul bloc sans intitulé", () => {
    const sections = listSections("SELECTION", null, [input("a"), input("b")]);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ key: "all", label: null });
  });

  it("numérote un classement dans l'ordre de la liste", () => {
    const [all] = listSections("RANKING", null, [input("a"), input("b")]);
    expect(all?.items.map(({ rank }) => rank)).toEqual([1, 2]);
  });

  it("coupe un classement en Top N et Prétendants, sans renuméroter", () => {
    const sections = listSections("RANKING", 2, [
      input("a"),
      input("b"),
      input("c"),
    ]);
    expect(sections.map(({ label }) => label)).toEqual(["Top 2", "Prétendants"]);
    expect(sections[1]?.items).toEqual([{ item: "c", rank: 3 }]);
  });

  it("ne coupe pas quand la ligne dépasse la liste", () => {
    const sections = listSections("RANKING", 10, [input("a"), input("b")]);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe("all");
  });

  it("ignore la ligne de coupe hors classement", () => {
    expect(listSections("SELECTION", 1, [input("a"), input("b")])).toHaveLength(1);
  });

  it("range à part, repliées, les œuvres vues d'une file", () => {
    const sections = listSections("WATCHLIST", null, [
      input("a", "FINISHED", "COMPLETED"),
      input("b", "FINISHED", "PLANNING"),
      input("c", "RELEASING", null),
    ]);
    expect(sections.map(({ key }) => key)).toEqual(["todo", "seen"]);
    expect(names(sections[0])).toEqual(["b", "c"]);
    expect(sections[1]).toMatchObject({ label: "Déjà vues", collapsed: true });
  });

  it("ne compte pas un abandon comme vu", () => {
    const sections = listSections("WATCHLIST", null, [
      input("a", "FINISHED", "DROPPED"),
    ]);
    expect(sections.map(({ key }) => key)).toEqual(["todo"]);
  });

  it("sépare prêtes et en parution dans une attente de fin", () => {
    const sections = listSections("WAIT_FOR_END", null, [
      input("finie", "FINISHED"),
      input("annulee", "CANCELLED"),
      input("en-cours", "RELEASING"),
      input("pause", "HIATUS"),
      input("a-venir", "NOT_YET_RELEASED"),
      input("inconnue", null),
      input("lue", "FINISHED", "COMPLETED"),
    ]);
    expect(sections.map(({ key }) => key)).toEqual(["ready", "releasing", "seen"]);
    expect(names(sections[0])).toEqual(["finie", "annulee"]);
    expect(names(sections[1])).toEqual(["en-cours", "pause", "a-venir", "inconnue"]);
    expect(names(sections[2])).toEqual(["lue"]);
  });

  it("garde le rang de la liste entière dans chaque section", () => {
    const [ready] = listSections("WAIT_FOR_END", null, [
      input("en-cours", "RELEASING"),
      input("finie", "FINISHED"),
    ]);
    expect(ready?.items).toEqual([{ item: "finie", rank: 2 }]);
  });
});

describe("sectionCounts", () => {
  it("compte les prêtes et les vues", () => {
    const sections = listSections("WAIT_FOR_END", null, [
      input("finie", "FINISHED"),
      input("en-cours", "RELEASING"),
      input("lue", "FINISHED", "COMPLETED"),
    ]);
    expect(sectionCounts(sections)).toEqual({ ready: 1, seen: 1 });
  });
});
```

Lancer : `pnpm test src/features/lists/lib/list-sections.test.ts`
Attendu : ÉCHEC, module introuvable.

- [ ] **Étape 2 : `listSections`**

`src/features/lists/lib/list-sections.ts` :

```ts
import type { ListKind } from "@/features/lists/schemas/lists.schema";
import type { MediaStatus } from "@/features/media/schemas/media.schema";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

/**
 * Répartir les œuvres d'une liste selon son genre (D46).
 *
 * **Un seul ordre** : les sections filtrent l'ordre de la liste sans le changer, et chaque œuvre
 * garde son rang dans la liste entière. Réorganiser garde donc son sens quel que soit le genre.
 *
 * Fonction pure : la page, la carte de `/lists` et la page partagée la partagent, et c'est ici que
 * vivent les cas qui se trompent en silence — une œuvre annulée, un abandon pris pour une lecture.
 */

export type SectionKey =
  | "all"
  | "top"
  | "contenders"
  | "todo"
  | "ready"
  | "releasing"
  | "seen";

export type SectionInput<T> = {
  item: T;
  mediaStatus: MediaStatus | null;
  /** Mon suivi. `null` hors bibliothèque, et partout sur la page partagée. */
  entryStatus: EntryStatus | null;
};

export type ListSection<T> = {
  key: SectionKey;
  label: string | null;
  collapsed: boolean;
  items: { item: T; rank: number }[];
};

/** Une œuvre annulée n'aura pas de suite : elle est aussi prête à lire qu'une œuvre terminée. */
const READY_STATUSES: ReadonlySet<MediaStatus> = new Set([
  "FINISHED",
  "CANCELLED",
]);

/** Seul « terminé » vaut vu : en pratique, un abandon veut souvent dire « en attendant la fin ». */
const isSeen = (status: EntryStatus | null) => status === "COMPLETED";
const isReady = (status: MediaStatus | null) =>
  status !== null && READY_STATUSES.has(status);

export function listSections<T>(
  kind: ListKind,
  cutoff: number | null,
  inputs: SectionInput<T>[],
): ListSection<T>[] {
  const ranked = inputs.map((input, index) => ({ ...input, rank: index + 1 }));

  const section = (
    key: SectionKey,
    label: string | null,
    keep: (entry: (typeof ranked)[number]) => boolean,
    collapsed = false,
  ): ListSection<T> => ({
    key,
    label,
    collapsed,
    items: ranked.filter(keep).map(({ item, rank }) => ({ item, rank })),
  });

  const sections: ListSection<T>[] = (() => {
    switch (kind) {
      case "RANKING":
        return cutoff !== null && ranked.length > cutoff
          ? [
              section("top", `Top ${cutoff}`, ({ rank }) => rank <= cutoff),
              section("contenders", "Prétendants", ({ rank }) => rank > cutoff),
            ]
          : [section("all", null, () => true)];
      case "WATCHLIST":
        return [
          section("todo", "À voir", ({ entryStatus }) => !isSeen(entryStatus)),
          section("seen", "Déjà vues", ({ entryStatus }) => isSeen(entryStatus), true),
        ];
      case "WAIT_FOR_END":
        return [
          section(
            "ready",
            "Prêtes",
            (e) => !isSeen(e.entryStatus) && isReady(e.mediaStatus),
          ),
          section(
            "releasing",
            "En parution",
            (e) => !isSeen(e.entryStatus) && !isReady(e.mediaStatus),
          ),
          section("seen", "Déjà vues", (e) => isSeen(e.entryStatus), true),
        ];
      default:
        return [section("all", null, () => true)];
    }
  })();

  // Une section vide n'a rien à annoncer.
  return sections.filter(({ items }) => items.length > 0);
}

export function sectionCounts(sections: ListSection<unknown>[]) {
  const count = (key: SectionKey) =>
    sections.find((s) => s.key === key)?.items.length ?? 0;
  return { ready: count("ready"), seen: count("seen") };
}
```

Lancer : `pnpm test src/features/lists/lib/list-sections.test.ts` → PASS.

- [ ] **Étape 3 : les tests des libellés qui échouent**

`src/features/lists/lib/list-labels.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import {
  itemCountLabel,
  listCountsLine,
} from "@/features/lists/lib/list-labels";

describe("itemCountLabel", () => {
  it("dit zéro, un et plusieurs", () => {
    expect(itemCountLabel(0)).toBe("Aucune œuvre");
    expect(itemCountLabel(1)).toBe("1 œuvre");
    expect(itemCountLabel(18)).toBe("18 œuvres");
  });
});

describe("listCountsLine", () => {
  const counts = { total: 17, ready: 8, seen: 0 };

  it("dit « Aucune œuvre » pour toute liste vide", () => {
    expect(listCountsLine("WAIT_FOR_END", null, { total: 0, ready: 0, seen: 0 })).toBe(
      "Aucune œuvre",
    );
  });

  it("annonce le Top d'un classement coupé", () => {
    expect(listCountsLine("RANKING", 10, { ...counts, total: 18 })).toBe(
      "Top 10 · 18 œuvres",
    );
    expect(listCountsLine("RANKING", null, { ...counts, total: 18 })).toBe("18 œuvres");
  });

  it("annonce la progression d'une file", () => {
    expect(listCountsLine("WATCHLIST", null, { total: 14, ready: 0, seen: 3 })).toBe(
      "3 vues sur 14",
    );
    expect(listCountsLine("WATCHLIST", null, { total: 14, ready: 0, seen: 0 })).toBe(
      "14 à voir",
    );
  });

  it("annonce les prêtes d'une attente de fin", () => {
    expect(listCountsLine("WAIT_FOR_END", null, counts)).toBe("8 prêtes sur 17");
    expect(listCountsLine("WAIT_FOR_END", null, { ...counts, ready: 1 })).toBe(
      "1 prête sur 17",
    );
    expect(listCountsLine("WAIT_FOR_END", null, { ...counts, ready: 0 })).toBe(
      "Aucune prête sur 17",
    );
  });
});
```

Lancer : `pnpm test src/features/lists/lib/list-labels.test.ts` → ÉCHEC.

- [ ] **Étape 4 : les libellés**

`src/features/lists/lib/list-labels.ts` :

```ts
import type { ListKind } from "@/features/lists/schemas/lists.schema";

/** Le nom d'un genre, tel que le formulaire et les en-têtes le disent. */
export const LIST_KIND_LABELS: Record<ListKind, string> = {
  SELECTION: "Sélection",
  RANKING: "Classement",
  WATCHLIST: "À voir",
  WAIT_FOR_END: "Quand c'est fini",
};

/** Ce que le formulaire dit de chaque genre, sous son nom. */
export const LIST_KIND_HINTS: Record<ListKind, string> = {
  SELECTION: "Des œuvres, sans ordre.",
  RANKING: "L'ordre compte.",
  WATCHLIST: "Une file à vider.",
  WAIT_FOR_END: "J'attends la fin de parution.",
};

/** « Aucune œuvre » plutôt que « 0 œuvre » : un zéro se lit comme une panne de chargement. */
export function itemCountLabel(count: number): string {
  if (count === 0) return "Aucune œuvre";
  return count === 1 ? "1 œuvre" : `${count} œuvres`;
}

/** La ligne de décompte d'une liste, propre à son genre : sa carte et son en-tête la partagent. */
export function listCountsLine(
  kind: ListKind,
  cutoff: number | null,
  { total, ready, seen }: { total: number; ready: number; seen: number },
): string {
  if (total === 0) return itemCountLabel(0);

  switch (kind) {
    case "RANKING":
      return cutoff !== null
        ? `Top ${cutoff} · ${itemCountLabel(total)}`
        : itemCountLabel(total);
    case "WATCHLIST":
      return seen === 0 ? `${total} à voir` : `${seen} vue${seen > 1 ? "s" : ""} sur ${total}`;
    case "WAIT_FOR_END":
      if (ready === 0) return `Aucune prête sur ${total}`;
      return `${ready} prête${ready > 1 ? "s" : ""} sur ${total}`;
    default:
      return itemCountLabel(total);
  }
}
```

Lancer : `pnpm test src/features/lists/lib/` → PASS.

- [ ] **Étape 5 : retirer les doublons d'`itemLabel`**

`itemLabel` est recopiée dans `src/app/(app)/lists/_components/list-card.tsx`,
`src/app/(app)/lists/[id]/page.tsx` et `src/app/(share)/l/[token]/page.tsx`. Remplacer chaque
appel par `itemCountLabel` importé de `@/features/lists/lib/list-labels`, et supprimer les trois
fonctions locales.

- [ ] **Étape 6 : vérifier et committer**

Lancer : `pnpm typecheck && pnpm test && pnpm knip`

```bash
git add src/features/lists/lib/list-sections.ts src/features/lists/lib/list-sections.test.ts src/features/lists/lib/list-labels.ts src/features/lists/lib/list-labels.test.ts "src/app/(app)/lists/_components/list-card.tsx" "src/app/(app)/lists/[id]/page.tsx" "src/app/(share)/l/[token]/page.tsx"
git commit -m "feat(lists): répartition des œuvres et libellés par genre"
```

`knip` peut signaler `LIST_KIND_HINTS`, `listSections` ou `listCountsLine` comme inutilisés tant
que les tâches 7 à 9 ne les branchent pas : c'est attendu, la batterie complète se juge à la
tâche 11.

### Tâche 7 : le formulaire de liste

**Fichiers :**
- Ajouter : `src/components/ui/radio-group.tsx` (shadcn)
- Modifier : `src/features/lists/components/list-form-dialog.tsx`
- Modifier : `src/app/(app)/lists/_components/create-list-dialog.tsx`
- Modifier : `src/app/(app)/lists/[id]/_components/list-actions-menu.tsx`

**Interfaces :**
- Produit : `ListFormValues = { title: string; description: string; kind: ListKind; cutoff: string }`
  (`cutoff` reste du texte dans le formulaire ; l'appelant le convertit).

- [ ] **Étape 1 : ajouter RadioGroup**

Lancer : `pnpm dlx shadcn@latest add radio-group`
Puis : `git diff package.json` — **retirer tout paquet `cn` ajouté** (piège connu).

- [ ] **Étape 2 : le formulaire**

Dans `list-form-dialog.tsx` :

```ts
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  LIST_KIND_HINTS,
  LIST_KIND_LABELS,
} from "@/features/lists/lib/list-labels";
import {
  type ListKind,
  listKindSchema,
} from "@/features/lists/schemas/lists.schema";

export type ListFormValues = {
  title: string;
  description: string;
  kind: ListKind;
  /** Du texte tant qu'on tape : l'appelant le convertit, vide devient `null`. */
  cutoff: string;
};

const EMPTY: ListFormValues = {
  title: "",
  description: "",
  kind: "SELECTION",
  cutoff: "",
};
```

Ajouter `cutoff?: string[]` et `kind?: string[]` au type `fieldErrors`. Après le bloc
« Description », avant `<DialogFooter>` :

```tsx
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium text-sm">Genre</legend>
            <RadioGroup
              className="grid gap-2 sm:grid-cols-2"
              onValueChange={(kind) =>
                setValues((current) => ({
                  ...current,
                  kind: listKindSchema.parse(kind),
                }))
              }
              value={values.kind}
            >
              {listKindSchema.options.map((kind) => (
                <Label
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-primary"
                  htmlFor={`list-kind-${kind}`}
                  key={kind}
                >
                  <RadioGroupItem id={`list-kind-${kind}`} value={kind} />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{LIST_KIND_LABELS[kind]}</span>
                    <span className="text-muted-foreground text-xs">
                      {LIST_KIND_HINTS[kind]}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          {/*
            La ligne de coupe ne se montre que pour un classement, mais sa valeur reste dans l'état :
            changer de genre puis revenir retrouve son Top 10.
          */}
          {values.kind === "RANKING" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="list-cutoff">Top</Label>
              <Input
                aria-describedby={cutoffError ? "list-cutoff-error" : undefined}
                aria-invalid={cutoffError ? true : undefined}
                className="w-24"
                id="list-cutoff"
                inputMode="numeric"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    cutoff: event.target.value,
                  }))
                }
                placeholder="10"
                value={values.cutoff}
              />
              <p className="text-muted-foreground text-xs">
                Facultatif. Les œuvres suivantes deviennent les prétendants.
              </p>
              {cutoffError ? (
                <p className="text-destructive text-sm" id="list-cutoff-error">
                  {cutoffError}
                </p>
              ) : null}
            </div>
          ) : null}
```

Avec, près des deux autres : `const cutoffError = fieldErrors?.cutoff?.[0];`.

Ajouter en tête du module la conversion partagée par les deux appelants :

```ts
/** Vide devient `null` ; le reste part tel quel, et c'est Zod qui refuse un nombre hors bornes. */
export function parseCutoff(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}
```

Le texte de `DialogDescription` devient : « Le nom est le seul champ nécessaire. Le genre décide de
l'affichage : rangs, progression, œuvres prêtes. »

- [ ] **Étape 3 : les appelants**

Dans `create-list-dialog.tsx`, `onSubmit` :

```tsx
        onSubmit={({ title, description, kind, cutoff }) =>
          execute({
            title,
            description: description.trim() || undefined,
            kind,
            cutoff: parseCutoff(cutoff),
          })
        }
```

Dans `list-actions-menu.tsx` :
- `PencilIcon` reste ; le libellé « Renommer » devient « Modifier », `heading` devient
  « Modifier la liste », l'état `renaming` devient `editing`, `rename` devient `edit`.
- `initialValues` :

```tsx
        initialValues={{
          title: list.title,
          description: list.description ?? "",
          kind: list.kind,
          cutoff: list.cutoff === null ? "" : String(list.cutoff),
        }}
```

- `onSubmit` :

```tsx
        onSubmit={({ title, description, kind, cutoff }) =>
          edit.execute({
            listId: list.id,
            title,
            description: description.trim() || null,
            kind,
            cutoff: parseCutoff(cutoff),
          })
        }
```

Retirer le passage provisoire de la tâche 5.

- [ ] **Étape 4 : vérifier et committer**

Lancer : `pnpm typecheck && pnpm lint`

```bash
git add src/components/ui/radio-group.tsx package.json pnpm-lock.yaml src/features/lists/components/list-form-dialog.tsx "src/app/(app)/lists/_components/create-list-dialog.tsx" "src/app/(app)/lists/[id]/_components/list-actions-menu.tsx"
git commit -m "feat(lists): choisir le genre et le Top d'une liste"
```

N'ajouter `package.json` et `pnpm-lock.yaml` que si shadcn a ajouté une dépendance réelle
(`@radix-ui/react-radio-group` ou équivalent).

### Tâche 8 : la page d'une liste par genre

**Fichiers :**
- Créer : `src/components/shared/rank-numeral.tsx`
- Modifier : `src/features/media/components/media-card.tsx`
- Modifier : `src/app/(app)/lists/[id]/page.tsx`

**Interfaces :**
- Consomme : `listSections`, `sectionCounts`, `listCountsLine`, `LIST_KIND_LABELS` ;
  `ListDetail.kind`, `ListDetail.cutoff` (tâche 5).
- Produit : `RankNumeral({ rank }: { rank: number })` ; `MediaCard` prop `rank?: number`.

- [ ] **Étape 1 : le chiffre de rang**

`src/components/shared/rank-numeral.tsx` :

```tsx
/**
 * Le rang d'une œuvre dans un classement, posé sur le coin bas-gauche de sa jaquette.
 *
 * En blanc, jamais en accent (D33) : il vit sur une illustration, d'où l'ombre qui le détache des
 * jaquettes claires. `aria-hidden` : l'appelant dit le rang en toutes lettres au lecteur d'écran.
 */
export function RankNumeral({ rank }: { rank: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-0.5 left-1.5 font-extrabold font-heading text-5xl text-white tabular-nums leading-none tracking-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.85)]"
    >
      {rank}
    </span>
  );
}
```

- [ ] **Étape 2 : la prop `rank` de `MediaCard`**

Dans `MediaCardProps`, après `marker` :

```ts
  /**
   * Le rang de l'œuvre dans un classement (D46), posé sur la jaquette. Un nombre et pas un nœud :
   * la carte décide où il va, l'appelant dit seulement lequel.
   */
  rank?: number;
```

Le déstructurer dans `MediaCard`. Dans la case de la jaquette
(`<div className="relative aspect-2/3 …">`), après l'`Image` :

```tsx
            {rank !== undefined ? <RankNumeral rank={rank} /> : null}
```

Et dans la ligne du titre, avant `{marker}` :

```tsx
              {rank !== undefined ? (
                <span className="sr-only">Numéro {rank}, </span>
              ) : null}
```

Importer `RankNumeral` de `@/components/shared/rank-numeral`.

- [ ] **Étape 3 : les sections sur la page**

Dans `src/app/(app)/lists/[id]/page.tsx`, en consultation :

```tsx
  const sections = listSections(
    list.kind,
    list.cutoff,
    list.items.map((item) => ({
      item,
      mediaStatus: item.media.status,
      entryStatus: entries.get(item.media.id)?.status ?? null,
    })),
  );
  const counts = {
    total: list.itemCount,
    ...sectionCounts(sections),
  };
```

La ligne de décompte de l'en-tête devient :

```tsx
            <p className="text-muted-foreground text-xs">
              {list.kind === "SELECTION"
                ? listCountsLine(list.kind, list.cutoff, counts)
                : `${LIST_KIND_LABELS[list.kind]} · ${listCountsLine(list.kind, list.cutoff, counts)}`}
            </p>
```

En mode réorganisation, `counts` se calcule sans suivi : y garder `itemCountLabel(list.itemCount)`.

Remplacer la `CatalogueGrid` de consultation par :

```tsx
        <div className="flex flex-col gap-8">
          {sections.map((section, sectionIndex) => {
            const grid = (
              <CatalogueGrid>
                {section.items.map(({ item, rank }, index) => (
                  <MediaCard
                    action={/* l'EntryQuickEdit actuel, inchangé */}
                    key={item.media.id}
                    marker={/* l'EntryStatusDot actuel, inchangé */}
                    media={item.media}
                    // La première rangée de la première section porte la mesure de LCP.
                    priority={sectionIndex === 0 && index < WIDEST_COLUMN_COUNT}
                    rank={list.kind === "RANKING" ? rank : undefined}
                    titleLanguage={titleLanguage}
                  />
                ))}
              </CatalogueGrid>
            );

            if (section.label === null) return <div key={section.key}>{grid}</div>;

            /*
              Une section repliée est un `<details>` natif : ouvrir « Déjà vues » ne coûte pas une
              ligne de JavaScript, et la page reste serveur.
            */
            return section.collapsed ? (
              <details className="group flex flex-col gap-4" key={section.key}>
                <summary className="cursor-pointer font-heading text-lg">
                  {section.label} ({section.items.length})
                </summary>
                <div className="pt-4">{grid}</div>
              </details>
            ) : (
              <section className="flex flex-col gap-4" key={section.key}>
                <h2 className="font-heading text-lg">
                  {section.label} ({section.items.length})
                </h2>
                {grid}
              </section>
            );
          })}
        </div>
```

Garder les props `action` et `marker` **exactement** comme dans le code actuel (`EntryQuickEdit`
et `EntryStatusDot`, en lisant `item` au lieu de la variable de boucle d'avant).

- [ ] **Étape 4 : vérifier et committer**

Lancer : `pnpm typecheck && pnpm test && pnpm lint`

```bash
git add src/components/shared/rank-numeral.tsx src/features/media/components/media-card.tsx "src/app/(app)/lists/[id]/page.tsx"
git commit -m "feat(lists): rangs, Top N et sections sur la page d'une liste"
```

### Tâche 9 : la carte de `/lists`, les suggestions et la fiche

**Fichiers :**
- Modifier : `src/features/lists/server/lists.queries.ts` (`getLists`, `getListSuggestions`,
  `getListMembership`) et `lists.queries.test.ts`
- Modifier : `src/app/(app)/lists/_components/list-card.tsx`
- Modifier : `src/app/(app)/lists/[id]/page.tsx` (appel de `getListSuggestions`)
- Modifier : `src/app/(app)/media/[id]/_components/add-to-list-dialog.tsx`

**Interfaces :**
- Produit : `ListSummary.countsLine: string` ;
  `getListSuggestions(listId, kind: ListKind, prefs)` ;
  `ListMembership` gagne `kind: ListKind; itemCount: number`.

- [ ] **Étape 1 : les tests de suggestions par genre, qui échouent**

Dans `lists.queries.test.ts`, mettre à jour les appels existants en
`getListSuggestions("liste-1", "SELECTION", { … })`, remplacer l'attente du premier test par
`where: { userId: "membre-1", media: { listItems: { none: { listId: "liste-1" } } } }`
(une sélection suggère tous statuts), et ajouter :

```ts
  it("suggère mes œuvres prévues pour une file", async () => {
    await getListSuggestions("liste-1", "WATCHLIST", {
      includeAdult: true,
      titleLanguage: "ROMAJI",
    });
    expect(entryFindMany.mock.calls[0]?.[0].where.status).toEqual({
      in: ["PLANNING"],
    });
  });

  it("suggère mes œuvres en parution mises de côté pour une attente de fin", async () => {
    await getListSuggestions("liste-1", "WAIT_FOR_END", {
      includeAdult: true,
      titleLanguage: "ROMAJI",
    });
    const { where } = entryFindMany.mock.calls[0]?.[0];
    expect(where.status).toEqual({ in: ["PAUSED", "DROPPED", "PLANNING"] });
    expect(where.media.status).toEqual({
      in: ["RELEASING", "HIATUS", "NOT_YET_RELEASED"],
    });
  });
```

Lancer : `pnpm test src/features/lists/server/lists.queries.test.ts` → ÉCHEC.

- [ ] **Étape 2 : les suggestions selon le genre**

Dans `lists.queries.ts` :

```ts
/**
 * Ce que chaque genre suggère avant qu'on tape. Une attente de fin propose ce que j'ai mis de côté
 * pendant sa parution — en production, c'est exactement le contenu de « A lire une fois fini ».
 */
const SUGGESTION_FILTERS: Record<
  ListKind,
  { entry?: EntryStatus[]; media?: MediaStatus[] }
> = {
  SELECTION: {},
  RANKING: {},
  WATCHLIST: { entry: ["PLANNING"] },
  WAIT_FOR_END: {
    entry: ["PAUSED", "DROPPED", "PLANNING"],
    media: ["RELEASING", "HIATUS", "NOT_YET_RELEASED"],
  },
};
```

La signature devient `getListSuggestions(listId: string, kind: ListKind, prefs)` et le `where` :

```ts
    where: {
      userId,
      ...(filter.entry ? { status: { in: filter.entry } } : {}),
      media: {
        listItems: { none: { listId } },
        ...(filter.media ? { status: { in: filter.media } } : {}),
        ...(includeAdult ? {} : { isAdult: false }),
      },
    },
```

avec `const filter = SUGGESTION_FILTERS[kind];`. Mettre à jour le docstring (« selon le genre »)
et l'appel de la page : `getListSuggestions(list.id, list.kind, { includeAdult, titleLanguage })`.

Lancer le test → PASS.

- [ ] **Étape 3 : la ligne de décompte des cartes**

Dans `getLists`, ajouter `kind: true, cutoff: true` au `select`, puis lire les statuts de **tous**
les items de mes listes (la requête 2 les rapatrie déjà ; on la remplace par une lecture dédiée
plus étroite) :

```ts
  /*
    Les décomptes « prêtes » et « vues » portent sur la liste entière, pas sur ses quatre jaquettes :
    une lecture de plus, étroite (trois colonnes), quel que soit le nombre de listes.
  */
  const statuses = await prisma.listItem.findMany({
    where: { list: { ownerId } },
    orderBy: { rank: "asc" },
    select: { listId: true, mediaId: true, media: { select: { status: true } } },
  });
  const entries = await prisma.entry.findMany({
    where: {
      userId: ownerId,
      mediaId: { in: [...new Set(statuses.map(({ mediaId }) => mediaId))] },
    },
    select: { mediaId: true, status: true },
  });
  const entryStatus = new Map(entries.map((e) => [e.mediaId, e.status]));
```

Et dans le `map` de retour :

```ts
    countsLine: listCountsLine(row.kind, row.cutoff, {
      total: row._count.items,
      ...sectionCounts(
        listSections(
          row.kind,
          row.cutoff,
          statuses
            .filter(({ listId }) => listId === row.id)
            .map(({ mediaId, media }) => ({
              item: mediaId,
              mediaStatus: media.status,
              entryStatus: entryStatus.get(mediaId) ?? null,
            })),
        ),
      ),
    }),
```

Ajouter `countsLine: string` au type `ListSummary` (avec un commentaire d'une ligne). Dans
`list-card.tsx`, la dernière ligne affiche `{list.countsLine}` ; retirer l'import d'`itemCountLabel`
s'il n'y sert plus. Mettre à jour le docstring de `getLists` : « trois requêtes » devient cinq, et
dire pourquoi.

- [ ] **Étape 4 : genre et décompte dans la fenêtre de la fiche**

Dans `getListMembership`, ajouter `kind: true, _count: { select: { items: true } }` au `select` ;
`ListMembership` gagne `kind: ListKind; itemCount: number`. Dans `add-to-list-dialog.tsx`,
`ListToggle` remplace le `<span>` du titre par :

```tsx
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate" title={list.title}>
            {list.title}
          </span>
          <span className="text-muted-foreground text-xs">
            {LIST_KIND_LABELS[list.kind]} · {itemCountLabel(list.itemCount)}
          </span>
        </span>
```

- [ ] **Étape 5 : vérifier et committer**

Lancer : `pnpm typecheck && pnpm test && pnpm lint`

```bash
git add src/features/lists/server/lists.queries.ts src/features/lists/server/lists.queries.test.ts "src/app/(app)/lists/_components/list-card.tsx" "src/app/(app)/lists/[id]/page.tsx" "src/app/(app)/media/[id]/_components/add-to-list-dialog.tsx"
git commit -m "feat(lists): décomptes par genre sur les cartes, suggestions selon le genre"
```

### Tâche 10 : la page partagée

**Fichiers :**
- Modifier : `src/features/lists/server/lists.queries.ts` (`getSharedList`, type `SharedList`)
- Modifier : `src/app/(share)/l/[token]/page.tsx`

- [ ] **Étape 1 : la lecture**

`getSharedList` ajoute `kind: true, cutoff: true` au `select` ; `SharedList` gagne
`kind: ListKind; cutoff: number | null`.

- [ ] **Étape 2 : la page**

Dans `src/app/(share)/l/[token]/page.tsx`, calculer :

```tsx
  /*
    Sans suivi : le visiteur n'a pas celui du propriétaire, et le montrer dévoilerait sa
    bibliothèque. `entryStatus: null` partout, donc « Déjà vues » ne paraît jamais ici.
  */
  const sections = listSections(
    list.kind,
    list.cutoff,
    list.items.map((item) => ({
      item,
      mediaStatus: item.media.status,
      entryStatus: null,
    })),
  );
```

Rendre chaque section comme sur `/lists/[id]` (intitulé `h2` quand `label` n'est pas `null`), avec
la grille `<ul>` existante par section, et dans la case de la jaquette :

```tsx
                  {list.kind === "RANKING" ? <RankNumeral rank={rank} /> : null}
```

et `<span className="sr-only">Numéro {rank}, </span>` avant le titre pour un classement. La ligne
« Une liste de … » devient « Une liste de {ownerName} · {LIST_KIND_LABELS[list.kind]} ·
{itemCountLabel(list.items.length)} » (sans le genre pour une sélection).

- [ ] **Étape 3 : vérifier et committer**

Lancer : `pnpm typecheck && pnpm lint`

```bash
git add src/features/lists/server/lists.queries.ts "src/app/(share)/l/[token]/page.tsx"
git commit -m "feat(lists): la page partagée suit le genre de la liste"
```

### Tâche 11 : E2E, décision D46, vérification, PR 2

**Fichiers :**
- Modifier : `e2e/lists.spec.ts`, `docs/decisions.md`, `docs/conception.md`

- [ ] **Étape 1 : l'E2E qui ne lit que la base**

Ajouter à `e2e/lists.spec.ts` :

```ts
test("créer une liste « Quand c'est fini », puis en faire un Top 3", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "écrit en base avec le seul compte membre : un viewport suffit",
  );

  const title = `E2E genre ${Date.now()}`;

  await page.goto(routes.lists.root);
  await page.getByRole("button", { name: "Nouvelle liste" }).first().click();
  await page.getByLabel("Nom").fill(title);
  await page.getByLabel(/Quand c'est fini/).check();
  await page.getByRole("button", { name: "Créer" }).click();

  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card.getByText("Aucune œuvre")).toBeVisible();
  await card.click();
  await expect(page.getByText("Quand c'est fini · Aucune œuvre")).toBeVisible();

  await page.getByRole("button", { name: new RegExp(`Actions sur la liste ${title}`) }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await page.getByLabel(/Classement/).check();
  await page.getByLabel("Top").fill("3");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Classement · Aucune œuvre")).toBeVisible();
});
```

Lancer : `pnpm test:e2e e2e/lists.spec.ts` → PASS (les deux tests, le premier si AniList répond).

- [ ] **Étape 2 : la décision et la conception**

`docs/decisions.md`, après D47 :

```markdown
- **D46** — Une liste a un genre : Sélection, Classement, À voir, Quand c'est fini. Il décide de
  son affichage (rangs et ligne de coupe, progression, sections « Prêtes » et « Déjà vues ») ;
  l'ordre reste unique. Précise D17 : le genre n'est pas une vue, et les vues restent reportées.
```

`docs/conception.md` §4.4 : ajouter une phrase sur `kind` et `cutoff`, et que « prête » et
« vue » se calculent (statut de parution du miroir, suivi `COMPLETED`). §5 : la ligne `/lists`
mentionne les genres (D46). §6 : ajouter « Annoncer sur Discord qu'une œuvre d'une liste « Quand
c'est fini » a terminé sa parution ».

- [ ] **Étape 3 : la batterie complète**

Lancer : `pnpm typecheck && pnpm test && pnpm lint && pnpm knip`
Attendu : vert, `knip` compris.

- [ ] **Étape 4 : l'écran au navigateur**

Redémarrer `pnpm dev`. En 1440 et en 390 px, avec une liste de chaque genre :
- Classement avec `cutoff` : chiffres lisibles sur jaquettes claires et sombres, trait « Top N »,
  « Prétendants » numérotés à la suite ;
- À voir : « Déjà vues » repliée, s'ouvre ;
- Quand c'est fini : « Prêtes » en tête, décompte juste sur la carte de `/lists` ;
- formulaire : quatre genres lisibles en 390 (une colonne), champ « Top » n'apparaît que pour un
  classement ;
- fenêtre de la fiche : genre et décompte sous chaque nom ;
- page partagée d'un classement et d'une attente de fin.

- [ ] **Étape 5 : relecture, PR**

Lancer l'agent `convention-reviewer` ; corriger. Puis :

```bash
git add e2e/lists.spec.ts docs/decisions.md docs/conception.md
git commit -m "docs(lists): D46, le genre d'une liste"
git push -u origin feat/lists-genres
gh pr create --base main --title "feat(lists): le genre d'une liste" --body "…"
```

**S'arrêter à la PR ouverte et verte.** Après fusion (accord explicite seulement) : supprimer la
spec et ce plan, et rappeler qu'il faut reclasser les sept listes de production à la main.
