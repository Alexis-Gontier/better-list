# Refonte, lot 3 : listes sociales et notifications — plan d'implémentation

> **Pour l'agent qui exécute :** skill requise, `superpowers:executing-plans` (exécution en ligne :
> budget limité, pas de sous-agents). Les étapes se cochent (`- [ ]`).

**But :** liker et copier la liste d'un autre membre, une page Communauté, « Dans les listes » sur
la fiche, et des notifications sociales (likes, copies, demandes d'inscription) dans la cloche.

**Architecture :** deux tables (`ListLike`, `Notification`) et un enum. Les règles pures (ce qu'une
copie recopie, quand une notification s'écrit) vivent dans `features/lists/lib/` et
`features/social/lib/`, testées sans base. Les écritures sont des Server Actions minces
(`authActionClient`) qui écrivent le geste **et** sa notification dans une transaction. Toute lecture
de liste d'autrui passe par `visibleListsWhere` (D64).

**Pile :** Next 16.3 (App Router, `cacheComponents`), Prisma 7, next-safe-action v8, Zod 4, shadcn,
sonner, Vitest, Playwright.

**Spec :** `docs/superpowers/specs/2026-11-01-refonte-sociale-design.md`, §3 et §4.
**Maquettes validées :** `docs/design/refonte.fig`, page « Refonte — Lot 3 · Listes sociales »
(cadres A à G, 1440 et 390).

## Contraintes globales

- Tout en français : interface, commentaires, commits (`type(portée): sujet`).
- Aucune URL en dur : `routes.ts`. Jamais `process.env`. Jamais `fetch` nu (`upfetch` + `schema`).
- `*.queries.ts` commence par `import "server-only";`, `*.actions.ts` par `"use server"`.
- Server Actions : `.metadata({ actionName }).inputSchema(schema).action(...)`.
- **Une erreur métier ne passe pas par `throw`** : `handleServerError` masque le message en
  production. L'action **renvoie** `{ status: "unavailable" }` et le client affiche
  « Cette liste n'est plus disponible ».
- Toute lecture d'une liste d'autrui : `visibleListsWhere(viewerId)`.
- Pas de compteur dénormalisé : `_count`.
- Règle de promotion : un composant démarre dans le `_components/` de sa route.
- Pas de `loading.tsx` : chaque zone qui attend a son `<Suspense>` et un squelette fidèle.
- Commentaires : le pourquoi, une à trois lignes.
- Fin de tâche : `pnpm typecheck && pnpm test && pnpm lint && pnpm knip` vert.
- Après un changement de Server Actions : redémarrer `pnpm dev`.

## Choix pris en écrivant le plan (à reporter dans `decisions.md`, D65)

1. **Copier ne redirige pas** : la maquette B, validée, montre un toast « Copiée dans vos listes,
   en privé » avec « Ouvrir ». La spec disait aussi « on est redirigé » ; le toast l'emporte, on
   reste sur la liste qu'on lisait.
2. **Le genre s'écrit en toutes lettres** sur la carte Communauté (« Classement »), validé avec
   la maquette A.
3. **`SIGNUP_PENDING` nomme le fournisseur à la lecture** (le compte `Account` de l'acteur),
   parce que le hook `user.create.after` ne le connaît pas.
4. **La carte reste un lien entier** ; le bouton ♥ se pose par-dessus (`relative z-10`) et le lien
   s'étire en `after:absolute after:inset-0`. Un `<button>` dans un `<a>` est du HTML invalide.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `prisma/schema.prisma` + migration `social` | `ListLike`, `Notification`, `NotificationType` |
| `src/features/lists/lib/list-fork.ts` (+ test) | ce qu'une copie recopie |
| `src/features/social/lib/notification-rules.ts` (+ test) | doublons, retrait, libellés |
| `src/features/social/schemas/social.schema.ts` | entrées des actions, réponse de la cloche |
| `src/features/social/server/social.actions.ts` | `toggleListLike`, `forkList`, `markNotificationsRead` |
| `src/features/social/server/notifications.queries.ts` (+ test) | l'onglet « Activité » |
| `src/features/lists/server/lists.queries.ts` | `getList` enrichie, `getCommunityLists`, `getListsWithMedia` |
| `src/lib/auth/server.ts` | hook `user.create.after` : `SIGNUP_PENDING` |
| `src/features/admin/server/admin.actions.ts` | marquer lues les demandes tranchées |
| `src/app/api/notifications/route.ts` | renvoie épisodes **et** activité |
| `src/features/tracking/components/notifications-menu.tsx` | deux onglets, pastille cumulée |
| `src/app/(app)/lists/_components/lists-tabs.tsx` | « Mes listes » / « Communauté » |
| `src/app/(app)/lists/community/page.tsx` + `_components/` | la page Communauté |
| `src/features/social/components/like-button.tsx` (deux appelants : liste et carte) ; `src/app/(app)/lists/[id]/_components/fork-button.tsx` | les gestes |
| `src/app/(app)/media/[id]/_components/media-in-lists.tsx` | « Dans les listes » + « Tout voir » |
| `src/config/routes.ts` | `routes.lists.community` |
| `e2e/social.spec.ts` | liker, copier, Communauté |

---

### Tâche 1 : le schéma

**Fichiers :** modifier `prisma/schema.prisma` ; créer la migration.

**Produit :** `prisma.listLike`, `prisma.notification`, enum `NotificationType`
(`LIST_LIKED`, `LIST_FORKED`, `SIGNUP_PENDING`).

- [ ] **Étape 1 : ajouter au schéma**

```prisma
enum NotificationType {
  LIST_LIKED
  LIST_FORKED
  SIGNUP_PENDING
}

/// Un « j'aime » sur la liste d'un autre membre (spec §3). Pas de compteur dénormalisé : à dix
/// comptes, `_count` suffit.
model ListLike {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  listId String
  list   List   @relation(fields: [listId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, listId])
  @@index([listId])
  @@map("list_likes")
}

/// Les seules notifications **stockées** : le retard d'épisodes reste calculé (précise D31).
model Notification {
  id          String           @id @default(cuid())
  recipientId String
  recipient   User             @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  actorId     String
  actor       User             @relation("NotificationActor", fields: [actorId], references: [id], onDelete: Cascade)
  type        NotificationType
  listId      String?
  list        List?            @relation(fields: [listId], references: [id], onDelete: Cascade)
  createdAt   DateTime         @default(now())
  readAt      DateTime?

  @@index([recipientId, readAt, createdAt])
  @@map("notifications")
}
```

Ajouter les relations inverses : dans `User`, `listLikes ListLike[]`,
`notificationsReceived Notification[] @relation("NotificationRecipient")`,
`notificationsSent Notification[] @relation("NotificationActor")` ; dans `List`,
`likes ListLike[]` et `notifications Notification[]`.

- [ ] **Étape 2 : migrer**

Run: `pnpm db:migrate --name social`
Expected: migration `…_social` créée et appliquée, client régénéré.

- [ ] **Étape 3 : vérifier**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Étape 4 : commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(social): likes et notifications en base"
```

---

### Tâche 2 : ce qu'une copie recopie

**Fichiers :** créer `src/features/lists/lib/list-fork.ts` et `list-fork.test.ts`.

**Produit :**
`forkData(source: ForkSource, ownerId: string): { list: ForkListData; items: ForkItemData[] }`

- [ ] **Étape 1 : le test**

```ts
import { describe, expect, it } from "vitest";

import { forkData } from "@/features/lists/lib/list-fork";

const source = {
  id: "orig",
  title: "Best of isekai",
  description: "Les incontournables",
  kind: "RANKING" as const,
  cutoff: 10,
  items: [
    { mediaId: 1, rank: "a0", note: "à revoir", readyNotifiedAt: new Date() },
    { mediaId: 2, rank: "a1", note: null, readyNotifiedAt: null },
  ],
};

describe("forkData", () => {
  it("recopie titre, description, genre, coupe et rangs, en privé", () => {
    const { list, items } = forkData(source, "moi");
    expect(list).toEqual({
      ownerId: "moi",
      title: "Best of isekai",
      description: "Les incontournables",
      kind: "RANKING",
      cutoff: 10,
      visibility: "PRIVATE",
      forkedFromId: "orig",
    });
    expect(items).toEqual([
      { mediaId: 1, rank: "a0" },
      { mediaId: 2, rank: "a1" },
    ]);
  });

  it("ne recopie ni les notes ni l'horodatage d'annonce", () => {
    const { items } = forkData(source, "moi");
    for (const item of items) {
      expect(item).not.toHaveProperty("note");
      expect(item).not.toHaveProperty("readyNotifiedAt");
    }
  });
});
```

- [ ] **Étape 2 : le voir échouer**

Run: `pnpm test src/features/lists/lib/list-fork.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Étape 3 : l'implémentation**

```ts
import "server-only";

import type { ListKind } from "@/features/lists/schemas/lists.schema";

export type ForkSource = {
  id: string;
  title: string;
  description: string | null;
  kind: ListKind;
  cutoff: number | null;
  items: { mediaId: number; rank: string }[];
};

/**
 * La copie d'une liste (spec §3) : le contenu et son ordre, **pas** ce qui appartient à l'original :
 * jeton de partage, likes, notes, annonces Discord. Elle naît privée : copier n'est pas publier.
 */
export function forkData(source: ForkSource, ownerId: string) {
  return {
    list: {
      ownerId,
      title: source.title,
      description: source.description,
      kind: source.kind,
      cutoff: source.cutoff,
      visibility: "PRIVATE" as const,
      forkedFromId: source.id,
    },
    items: source.items.map(({ mediaId, rank }) => ({ mediaId, rank })),
  };
}
```

`readyNotifiedAt` est recalculé à l'écriture (tâche 4), comme à l'ajout : une œuvre déjà prête
n'est pas une nouvelle (D50).

- [ ] **Étape 4 : le voir passer**

Run: `pnpm test src/features/lists/lib/list-fork.test.ts`
Expected: PASS.

- [ ] **Étape 5 : commit**

```bash
git add src/features/lists/lib/list-fork.ts src/features/lists/lib/list-fork.test.ts
git commit -m "feat(lists): ce qu'une copie de liste recopie"
```

---

### Tâche 3 : les règles des notifications

**Fichiers :** créer `src/features/social/lib/notification-rules.ts` et `notification-rules.test.ts`.

**Produit :**
- `shouldNotify({ actorId, recipientId }): boolean` (jamais à soi-même) ;
- `notificationLabel(n: { type; actorName; listTitle; provider }): { lead: string; subject: string }`.

- [ ] **Étape 1 : le test**

```ts
import { describe, expect, it } from "vitest";

import {
  notificationLabel,
  shouldNotify,
} from "@/features/social/lib/notification-rules";

describe("shouldNotify", () => {
  it("ne notifie jamais son propre geste", () => {
    expect(shouldNotify({ actorId: "a", recipientId: "a" })).toBe(false);
    expect(shouldNotify({ actorId: "a", recipientId: "b" })).toBe(true);
  });
});

describe("notificationLabel", () => {
  it("dit qui a aimé quoi", () => {
    expect(
      notificationLabel({ type: "LIST_LIKED", actorName: "Sora", listTitle: "Top 10", provider: null }),
    ).toEqual({ lead: "Sora a aimé", subject: "Top 10" });
  });

  it("dit qui a copié quoi", () => {
    expect(
      notificationLabel({ type: "LIST_FORKED", actorName: "Léo", listTitle: "Top 10", provider: null }),
    ).toEqual({ lead: "Léo a copié", subject: "Top 10" });
  });

  it("nomme le fournisseur d'une demande", () => {
    expect(
      notificationLabel({ type: "SIGNUP_PENDING", actorName: "Kenji", listTitle: null, provider: "discord" }),
    ).toEqual({ lead: "Nouvelle demande :", subject: "Kenji (Discord)" });
  });
});
```

- [ ] **Étape 2 : le voir échouer**

Run: `pnpm test src/features/social/lib/notification-rules.test.ts`
Expected: FAIL.

- [ ] **Étape 3 : l'implémentation**

```ts
const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  discord: "Discord",
  google: "Google",
};

type NotificationType = "LIST_LIKED" | "LIST_FORKED" | "SIGNUP_PENDING";

/** On ne s'annonce pas à soi-même son propre geste. */
export function shouldNotify({ actorId, recipientId }: { actorId: string; recipientId: string }) {
  return actorId !== recipientId;
}

/** Les deux morceaux d'une ligne de la cloche : la phrase, puis son objet en gras (maquette E). */
export function notificationLabel(n: {
  type: NotificationType;
  actorName: string;
  listTitle: string | null;
  provider: string | null;
}): { lead: string; subject: string } {
  if (n.type === "SIGNUP_PENDING") {
    const via = n.provider ? ` (${PROVIDER_LABELS[n.provider] ?? n.provider})` : "";
    return { lead: "Nouvelle demande :", subject: `${n.actorName}${via}` };
  }
  const verb = n.type === "LIST_LIKED" ? "a aimé" : "a copié";
  return { lead: `${n.actorName} ${verb}`, subject: n.listTitle ?? "" };
}
```

Pas de `server-only` : le menu client importe `notificationLabel`.

- [ ] **Étape 4 : le voir passer**

Run: `pnpm test src/features/social/lib/notification-rules.test.ts`
Expected: PASS.

- [ ] **Étape 5 : commit**

```bash
git add src/features/social/lib
git commit -m "feat(social): règles et libellés des notifications"
```

---

### Tâche 4 : liker, copier, marquer lu

**Fichiers :** créer `src/features/social/schemas/social.schema.ts`,
`src/features/social/server/social.actions.ts`, `social.actions.test.ts`.

**Consomme :** `forkData` (T2), `shouldNotify` (T3), `visibleListsWhere`.
**Produit :**
- `toggleListLike({ listId })` → `{ status: "ok"; liked: boolean } | { status: "unavailable" }`
- `forkList({ listId })` → `{ status: "ok"; id: string } | { status: "unavailable" }`
- `markNotificationsRead()` → `void`

- [ ] **Étape 1 : les schémas**

```ts
import * as z from "zod";

export const listTargetSchema = z.object({ listId: z.cuid() });
```

(Vérifier dans `lists.schema.ts` comment l'identifiant est validé, `z.cuid()` ou autre, et faire pareil.)

- [ ] **Étape 2 : les tests (Prisma doublé, comme `lists.queries.test.ts`)**

Cas à couvrir, chacun en `it` :
1. liker la liste d'un autre crée le like **et** une `LIST_LIKED` ;
2. liker sa propre liste renvoie `unavailable` et n'écrit rien ;
3. une liste invisible (privée d'un autre) renvoie `unavailable` ;
4. retirer un like supprime la `LIST_LIKED` **non lue** de cet acteur sur cette liste, pas la lue ;
5. remettre un like quand une `LIST_LIKED` non lue existe déjà n'en écrit pas une seconde ;
6. copier crée la liste privée, ses items (`createMany`) et une `LIST_FORKED` ;
7. copier sa propre liste renvoie `unavailable`.

Le double de `prisma.$transaction` appelle la fonction reçue avec le même objet doublé
(`$transaction: vi.fn((fn) => fn(prismaDouble))`). Le double de `getSession` rend
`{ user: { id: "moi", status: "APPROVED" } }` ; `next/cache` est doublé (`revalidatePath: vi.fn()`).

- [ ] **Étape 3 : les voir échouer**

Run: `pnpm test src/features/social/server/social.actions.test.ts`
Expected: FAIL.

- [ ] **Étape 4 : l'implémentation**

```ts
"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import { forkData } from "@/features/lists/lib/list-fork";
import { READY_MEDIA_STATUSES } from "@/features/lists/lib/list-sections";
import { visibleListsWhere } from "@/features/lists/server/list-visibility";
import { shouldNotify } from "@/features/social/lib/notification-rules";
import { listTargetSchema } from "@/features/social/schemas/social.schema";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/** La liste d'un autre que je peux voir, ou `null` : ni la mienne, ni une invisible. */
async function othersVisibleList(listId: string, viewerId: string) {
  return prisma.list.findFirst({
    where: { id: listId, ownerId: { not: viewerId }, ...visibleListsWhere(viewerId) },
    select: { id: true, ownerId: true },
  });
}

/*
  Une erreur métier se **renvoie** : un `throw` serait réécrit en « Une erreur est survenue » par
  `handleServerError` en production.
*/
const UNAVAILABLE = { status: "unavailable" } as const;

export const toggleListLike = authActionClient
  .metadata({ actionName: "toggleListLike" })
  .inputSchema(listTargetSchema)
  .action(async ({ parsedInput: { listId }, ctx }) => {
    const list = await othersVisibleList(listId, ctx.user.id);
    if (!list) return UNAVAILABLE;

    const liked = await prisma.$transaction(async (tx) => {
      const key = { userId_listId: { userId: ctx.user.id, listId } };
      const unread = { type: "LIST_LIKED" as const, actorId: ctx.user.id, listId, readAt: null };

      if (await tx.listLike.findUnique({ where: key })) {
        await tx.listLike.delete({ where: key });
        // Retirer son like efface l'annonce que le propriétaire n'a pas encore lue, pas l'historique.
        await tx.notification.deleteMany({ where: unread });
        return false;
      }

      await tx.listLike.create({ data: { userId: ctx.user.id, listId } });
      const pending = await tx.notification.findFirst({ where: unread, select: { id: true } });
      if (!pending && shouldNotify({ actorId: ctx.user.id, recipientId: list.ownerId })) {
        await tx.notification.create({
          data: { type: "LIST_LIKED", actorId: ctx.user.id, recipientId: list.ownerId, listId },
        });
      }
      return true;
    });

    revalidatePath(routes.lists.detail(listId));
    revalidatePath(routes.lists.community);
    return { status: "ok" as const, liked };
  });

export const forkList = authActionClient
  .metadata({ actionName: "forkList" })
  .inputSchema(listTargetSchema)
  .action(async ({ parsedInput: { listId }, ctx }) => {
    const source = await prisma.list.findFirst({
      where: { id: listId, ownerId: { not: ctx.user.id }, ...visibleListsWhere(ctx.user.id) },
      select: {
        id: true, ownerId: true, title: true, description: true, kind: true, cutoff: true,
        items: { orderBy: { rank: "asc" }, select: { mediaId: true, rank: true, media: { select: { status: true } } } },
      },
    });
    if (!source) return UNAVAILABLE;

    const { list, items } = forkData(source, ctx.user.id);
    const now = new Date();
    const ready = new Set(
      source.items
        .filter(({ media }) => (READY_MEDIA_STATUSES as readonly string[]).includes(media.status ?? ""))
        .map(({ mediaId }) => mediaId),
    );

    const id = await prisma.$transaction(async (tx) => {
      const copy = await tx.list.create({ data: list, select: { id: true } });
      // Une liste de plusieurs centaines d'œuvres : un seul `createMany` (spec, cas limites).
      await tx.listItem.createMany({
        data: items.map((item) => ({
          ...item,
          listId: copy.id,
          readyNotifiedAt: ready.has(item.mediaId) ? now : null,
        })),
      });
      await tx.notification.create({
        data: { type: "LIST_FORKED", actorId: ctx.user.id, recipientId: source.ownerId, listId },
      });
      return copy.id;
    });

    revalidatePath(routes.lists.root);
    revalidatePath(routes.lists.detail(listId));
    return { status: "ok" as const, id };
  });

/** Ouvrir l'onglet « Activité » lit tout ce qu'il montre (spec §4). */
export const markNotificationsRead = authActionClient
  .metadata({ actionName: "markNotificationsRead" })
  .action(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { recipientId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    });
  });
```

Si le corps de `forkList` dépasse ~20 lignes après formatage, descendre le calcul de `ready` dans
`list-fork.ts` (`readyAtFor(items, now)`), avec son test.

- [ ] **Étape 5 : `routes.lists.community`**

Dans `src/config/routes.ts`, sous `lists` :

```ts
    /** Les listes « Membres » des autres comptes (spec §3). Segment statique, prioritaire sur `[id]`. */
    community: "/lists/community",
    /** La Communauté triée et paginée par l'URL. */
    communityPage: (tri: "aimees" | "recentes", page = 1) =>
      `/lists/community?tri=${tri}${page > 1 ? `&page=${page}` : ""}` as const,
```

- [ ] **Étape 6 : les voir passer**

Run: `pnpm test src/features/social && pnpm typecheck`
Expected: PASS.

- [ ] **Étape 7 : commit**

```bash
git add src/features/social src/config/routes.ts
git commit -m "feat(social): liker, copier une liste et marquer lu"
```

---

### Tâche 5 : les lectures des listes

**Fichiers :** modifier `src/features/lists/server/lists.queries.ts` et son test.

**Produit :**
- `ListDetail` gagne `likeCount: number`, `likedByMe: boolean`, `forkCount: number` (copies
  **visibles du lecteur**), `forkedFrom: { id; title; ownerName } | null` (seulement si l'original
  m'est visible).
- `ListSummary` gagne `likeCount`, `likedByMe`, `owner: { name; username; image }`.
- `getCommunityLists({ includeAdult, sort, page }): Promise<{ lists: ListSummary[]; hasMore: boolean; total: number }>`
- `getListsWithMedia(mediaId): Promise<MediaListRef[]>`, avec
  `MediaListRef = { id; title; owner: { name; username }; isMine: boolean; rank: number | null; covers: ListCover[] }`.

- [ ] **Étape 1 : les tests**

Avec Prisma doublé, vérifier **le `where`** :
1. `getCommunityLists` demande `{ ownerId: { not: viewerId }, visibility: "MEMBERS", owner: { status: "APPROVED", banned: false }, items: { some: {} } }` ;
2. `sort: "aimees"` ordonne par `[{ likes: { _count: "desc" } }, { updatedAt: "desc" }]`, `"recentes"` par `{ createdAt: "desc" }` ;
3. `page: 2` prend `take: 2 * PAGE_SIZE + 1` (on recharge le cumul : « Voir plus » est un lien) et `hasMore` vient de la ligne de trop ;
4. `getList` : `forkCount` compte `forks` filtrés par `visibleListsWhere(viewerId)` ; `forkedFrom` vaut `null` quand l'original n'est pas visible ;
5. `getListsWithMedia` : `where` = `{ items: { some: { mediaId } }, ...visibleListsWhere(viewerId) }`, et `rank` vaut la position (1-based) seulement pour un `RANKING`.

- [ ] **Étape 2 : les voir échouer**

Run: `pnpm test src/features/lists/server/lists.queries.test.ts`
Expected: FAIL.

- [ ] **Étape 3 : l'implémentation**

Dans `getList`, ajouter au `select` :

```ts
      _count: { select: { items: true, likes: true, forks: { where: visibleListsWhere(viewerId) } } },
      likes: { where: { userId: viewerId }, select: { userId: true } },
      forkedFrom: {
        // L'original ne se nomme que s'il m'est visible ; supprimé, `SetNull` l'a déjà effacé.
        select: { id: true, title: true, owner: { select: { name: true } }, ownerId: true, visibility: true },
      },
```

et calculer `forkedFrom` avec la règle de `visibleListsWhere` appliquée en mémoire **ou**, plus sûr,
par une seconde lecture `prisma.list.findFirst({ where: { id: list.forkedFromId, ...visibleListsWhere(viewerId) } })`.
Choisir la seconde lecture : la règle de visibilité ne doit exister qu'à un endroit (D64).

`getCommunityLists` réutilise la fabrication des cartes de `getLists` : extraire de `getLists` une
fonction locale `summarize(rows, where, viewerId, includeAdult, isOwn)` qui fait les requêtes 2 et 3
et le `map`, puis l'appeler des deux côtés. `PAGE_SIZE = 24`.

`getListsWithMedia` : une requête sur les listes visibles qui contiennent l'œuvre, avec
`items: { orderBy: { rank: "asc" }, select: { mediaId: true, media: { select: { coverImage: true, isAdult: true, titleRomaji: true, titleEnglish: true } } } }` ;
le rang est `index + 1` de l'œuvre dans `items` si `kind === "RANKING"`, sinon `null` ; deux
jaquettes (les deux premières, 18+ filtré selon `includeAdult`) ; tri : les miennes d'abord, puis
`updatedAt` décroissant.

- [ ] **Étape 4 : les voir passer**

Run: `pnpm test src/features/lists && pnpm typecheck`
Expected: PASS.

- [ ] **Étape 5 : commit**

```bash
git add src/features/lists/server
git commit -m "feat(lists): likes, copies et Communauté dans les lectures"
```

---

### Tâche 6 : ♥ et « Copier » sur la liste d'un autre (maquettes B et C)

**Fichiers :** créer `src/features/social/components/like-button.tsx` (deux appelants dans ce lot : la liste et la carte Communauté),
`src/app/(app)/lists/[id]/_components/
fork-button.tsx` ; modifier `src/app/(app)/lists/[id]/page.tsx`.

**Consomme :** `toggleListLike`, `forkList` (T4), `ListDetail` enrichie (T5).

- [ ] **Étape 1 : `LikeButton`**

```tsx
"use client";

import { HeartIcon } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleListLike } from "@/features/social/server/social.actions";
import { cn } from "@/lib/utils";

/** Le ♥ et son compteur, optimiste (spec §3) : le serveur confirme, il ne fait pas attendre. */
export function LikeButton({ listId, liked, count }: { listId: string; liked: boolean; count: number }) {
  const [state, setState] = useOptimistic({ liked, count });
  const [, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      setState({ liked: !state.liked, count: state.count + (state.liked ? -1 : 1) });
      const result = await toggleListLike({ listId });
      if (result?.data?.status !== "ok") {
        toast.error("Cette liste n'est plus disponible.");
      }
    });
  }

  return (
    <Button aria-pressed={state.liked} onClick={toggle} size="sm" variant="outline"
      aria-label={state.liked ? "Ne plus aimer cette liste" : "Aimer cette liste"}>
      <HeartIcon className={cn(state.liked && "fill-primary text-primary")} data-icon="inline-start" />
      {state.count}
    </Button>
  );
}
```

Le ♥ plein en `primary` est l'emploi « état actif » de l'accent (D33 à D36) : le vérifier dans
`decisions.md` avant de livrer.

- [ ] **Étape 2 : `ForkButton`**

```tsx
"use client";

import { CopyIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { forkList } from "@/features/social/server/social.actions";
import { useRouter } from "next/navigation";

/** « Copier dans mes listes » : la copie naît privée, le toast le dit (maquette B). */
export function ForkButton({ listId }: { listId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function fork() {
    startTransition(async () => {
      const result = await forkList({ listId });
      const data = result?.data;
      if (data?.status !== "ok") {
        toast.error("Cette liste n'est plus disponible.");
        return;
      }
      toast.success("Copiée dans vos listes, en privé.", {
        action: { label: "Ouvrir", onClick: () => router.push(routes.lists.detail(data.id)) },
      });
    });
  }

  return (
    <Button disabled={pending} onClick={fork} size="sm" variant="outline">
      <CopyIcon data-icon="inline-start" />
      Copier dans mes listes
    </Button>
  );
}
```

- [ ] **Étape 3 : la page**

Dans `ListDetail` de `page.tsx` :
- en tête, quand `!list.isOwner`, la barre d'actions rend
  `<LikeButton count={list.likeCount} liked={list.likedByMe} listId={list.id} />` puis
  `<ForkButton listId={list.id} />` (même `div` que les actions du propriétaire) ;
- la ligne `text-xs` remplace « · Une liste de @pseudo » par le libellé de la maquette B :
  `{owner.name} · {listHeadline…}` suivi de `· copiée N fois` si `forkCount > 0`
  (`copiée 1 fois`, `copiée 2 fois`) ;
- pour le propriétaire d'une copie (`list.forkedFrom`), ajouter après « Privée » :
  `· Copiée de <Link href={routes.lists.detail(forkedFrom.id)}>{forkedFrom.title}</Link> · {forkedFrom.ownerName}` (maquette C) ;
- le propriétaire voit aussi « copiée N fois » et le nombre de ♥ en texte (il ne se like pas).

- [ ] **Étape 4 : vérifier**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. Puis redémarrer `pnpm dev`, ouvrir la liste d'un autre compte (seed) en 1440 et en
390, liker, retirer, copier : comparer aux cadres B et C.

- [ ] **Étape 5 : commit**

```bash
git add "src/app/(app)/lists/[id]" src/features/social/components
git commit -m "feat(lists): aimer et copier la liste d'un autre membre"
```

---

### Tâche 7 : la page Communauté (maquettes A et G)

**Fichiers :** créer `src/app/(app)/lists/_components/lists-tabs.tsx`,
`src/app/(app)/lists/community/page.tsx`,
`src/app/(app)/lists/community/_components/community-list-card.tsx`,
`community-empty.tsx`, `community-sort.tsx` ; modifier `src/app/(app)/lists/page.tsx`.

**Consomme :** `getCommunityLists` (T5), `LikeButton` (T6).

- [ ] **Étape 1 : `ListsTabs`** (Server Component, deux liens stylés comme `Tabs` ligne de la
  maquette A, avec le badge du nombre) : `{ active: "mine" | "community"; mineCount; communityCount }`.
  Liens `routes.lists.root` et `routes.lists.community`. L'actif porte `aria-current="page"`.

- [ ] **Étape 2 : `/lists`** : le titre devient « Listes », la description
  « Les vôtres, et celles des autres membres. » (maquette A) ; `ListsTabs` sous l'en-tête, dans
  sa propre `<Suspense>` (les compteurs lisent la base) avec un squelette `h-9 w-64`.

- [ ] **Étape 3 : `CommunityListCard`** : la charpente de `ListCard` (mosaïque, titre), puis la
  ligne « avatar · Pseudo · Genre · N » et, à droite, `LikeButton` en variante compacte
  (`variant="ghost" size="xs"`, prop `compact`). Le lien de la carte s'étire
  (`after:absolute after:inset-0`), le bouton est `relative z-10` (choix 4).

- [ ] **Étape 4 : `community/page.tsx`**

```tsx
export const metadata: Metadata = { title: "Communauté", description: "Les listes des autres membres." };

export default function CommunityPage({ searchParams }: PageProps<"/lists/community">) {
  return (
    <div className="flex flex-col gap-6">
      {/* même en-tête que /lists, onglet Communauté actif */}
      <Suspense fallback={<CommunityGridSkeleton />}>
        <CommunityGrid searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

`CommunityGrid` lit `tri` (`aimees` par défaut, validé par un `z.enum` local) et `page`
(`z.coerce.number().int().min(1).catch(1)`), appelle `getCommunityLists`, rend
`CommunitySort` (deux liens segmentés « Les plus aimées » / « Récentes »), la grille
(`GRID_COLUMNS` de `/lists`), et « Voir plus » (`<Link href={routes.lists.communityPage(tri, page + 1)} scroll={false}>`)
si `hasMore`. Vide : `CommunityEmpty` (maquette G : « Aucune liste partagée », « Quand un autre
membre ouvrira une liste aux membres, elle apparaîtra ici. », bouton « Voir mes listes »).

- [ ] **Étape 5 : vérifier**

Run: `pnpm typecheck && pnpm lint && pnpm knip`
Expected: PASS. Au navigateur, 1440 et 390 : `/lists`, `/lists/community`, tri, « Voir plus »,
état vide (base sans liste d'autrui), comparés aux cadres A et G.

- [ ] **Étape 6 : commit**

```bash
git add "src/app/(app)/lists"
git commit -m "feat(lists): la page Communauté et ses onglets"
```

---

### Tâche 8 : « Dans les listes » sur la fiche (maquettes D et F)

**Fichiers :** créer `src/app/(app)/media/[id]/_components/media-in-lists.tsx` (serveur) et
`media-in-lists-dialog.tsx` (client) ; modifier `src/app/(app)/media/[id]/page.tsx`.

**Consomme :** `getListsWithMedia` (T5).

- [ ] **Étape 1 :** `MediaInLists({ mediaId })` : `await getListsWithMedia(mediaId)` ; `null` si
  vide ; sinon titre « Dans les listes » + compteur, quatre mini-cartes (deux jaquettes 18 × 27,
  titre, avatar, « Pseudo · #rang » ou « Vous · #rang » pour les miennes) en grille
  `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, et « Tout voir » si plus de quatre.
- [ ] **Étape 2 :** `MediaInListsDialog` : `Dialog` shadcn, titre « Dans les listes » + N, la même
  mini-carte en pile, `max-h-[70vh] overflow-y-auto` (maquette F). Les données arrivent en props :
  aucune lecture client.
- [ ] **Étape 3 :** dans l'onglet « Aperçu » de `MediaTabPanel`, sous `MediaOverview` :
  `<Suspense fallback={<MediaInListsSkeleton />}><MediaInLists mediaId={media.id} /></Suspense>`
  (D29). Squelette : titre `h-7 w-40` + quatre cartes `h-[58px]`.
- [ ] **Étape 4 :** `revalidatePath(routes.media(mediaId))` n'est pas nécessaire au like ; il l'est
  déjà à l'ajout (`revalidateLists`).
- [ ] **Étape 5 : vérifier** — `pnpm typecheck && pnpm lint`, puis au navigateur une œuvre rangée
  dans plusieurs listes, en 1440 et 390, « Tout voir » ouvert ; une œuvre dans aucune liste : pas de bloc.
- [ ] **Étape 6 : commit**

```bash
git add "src/app/(app)/media/[id]"
git commit -m "feat(media): les listes qui contiennent l'œuvre"
```

---

### Tâche 9 : les notifications d'inscription

**Fichiers :** modifier `src/lib/auth/server.ts`, `src/features/admin/server/admin.actions.ts`.

- [ ] **Étape 1 :** dans `databaseHooks.user.create`, ajouter :

```ts
        /** Chaque administrateur apprend la demande dans sa cloche (spec §4). */
        after: async (user) => {
          const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
          if (admins.length === 0) return;
          await prisma.notification.createMany({
            data: admins.map(({ id }) => ({ type: "SIGNUP_PENDING" as const, actorId: user.id, recipientId: id })),
          });
        },
```

Vérifier la valeur exacte du rôle admin dans `src/lib/auth/roles.ts` (`isAdmin`) et l'utiliser.

- [ ] **Étape 2 :** dans `setUsersStatus`, quand `status !== "PENDING"`, après l'`updateMany` :

```ts
    // Une demande tranchée n'attend plus personne : lue chez tous les administrateurs (spec §4).
    if (status !== "PENDING") {
      await prisma.notification.updateMany({
        where: { type: "SIGNUP_PENDING", actorId: { in: userIds }, readAt: null },
        data: { readAt: new Date() },
      });
    }
```

- [ ] **Étape 3 :** `pnpm typecheck && pnpm test` → PASS.
- [ ] **Étape 4 : commit**

```bash
git add src/lib/auth/server.ts src/features/admin/server/admin.actions.ts
git commit -m "feat(admin): les demandes d'inscription dans la cloche"
```

---

### Tâche 10 : la cloche à deux onglets (maquette E)

**Fichiers :** créer `src/features/social/server/notifications.queries.ts` (+ test) ; modifier
`src/features/social/schemas/social.schema.ts`, `src/app/api/notifications/route.ts`,
`src/features/tracking/components/notifications-menu.tsx`.

**Produit :** `getActivity(): Promise<Activity>` ;
`activitySchema = z.object({ unread: z.number().int(), items: z.array(activityItemSchema) })` avec
`activityItemSchema = z.object({ id, type: z.enum([...]), actorName, actorInitials, listId: z.string().nullable(), listTitle: z.string().nullable(), provider: z.string().nullable(), createdAt: z.number().int(), read: z.boolean() })` ;
`bellSchema = z.object({ episodes: episodeNotificationsSchema, activity: activitySchema })`.

- [ ] **Étape 1 : test de `getActivity`** — Prisma doublé : `where: { recipientId: viewerId }`,
  `orderBy: { createdAt: "desc" }`, `take: 30` ; `provider` vient du premier `Account` de l'acteur
  pour `SIGNUP_PENDING` seulement ; `unread` = `count({ where: { recipientId, readAt: null } })`.
- [ ] **Étape 2 :** l'implémenter (`import "server-only"`), le voir passer.
- [ ] **Étape 3 : la route** renvoie
  `{ episodes: await getEpisodeNotifications(), activity: await getActivity() }` en
  `Promise.all`. Garde inchangée.
- [ ] **Étape 4 : le menu**
  - le schéma lu devient `bellSchema` ;
  - pastille : `episodes.items.length + activity.unread` ; affichée en nombre (maquette E) ;
  - `DropdownMenuLabel` remplacé par deux onglets (`Tabs` shadcn, `variant` par défaut) :
    « Épisodes » (le corps actuel, inchangé) et « Activité » ;
  - ouvrir « Activité » appelle `markNotificationsRead()` une fois si `activity.unread > 0`, et
    remet `unread` à 0 localement ; la pastille bleue d'une ligne non lue reste jusqu'à la fermeture ;
  - une ligne : avatar initiales, `notificationLabel(...)` (lead normal, subject en `font-medium`),
    `formatSince` ; lien vers `routes.lists.detail(listId)` ou `routes.admin.users` ;
  - vide : « Rien de neuf » / « Personne n'a encore aimé ni copié vos listes. » ;
  - largeur `w-90 max-w-[calc(100vw-2rem)]` (maquette E en 390).
  - Le commentaire d'en-tête du fichier (« Il n'y a rien à marquer comme lu ») doit être réécrit :
    il reste vrai pour les épisodes, plus pour l'activité.
- [ ] **Étape 5 : vérifier** — `pnpm typecheck && pnpm test && pnpm lint && pnpm knip`, puis au
  navigateur : un compte like la liste d'un autre, l'autre voit la pastille, ouvre « Activité »,
  la pastille baisse ; 1440 et 390.
- [ ] **Étape 6 : commit**

```bash
git add src/features/social src/app/api/notifications src/features/tracking/components/notifications-menu.tsx
git commit -m "feat(social): la cloche annonce likes, copies et demandes"
```

---

### Tâche 11 : E2E

**Fichiers :** créer `e2e/social.spec.ts`.

Desktop seul (comptes partagés), deux contextes comme `confidentialite.spec.ts` :
1. **liker** : l'admin crée une liste « Membres » avec une œuvre (ou la seed en a une), le membre
   l'ouvre, clique « Aimer cette liste », le compteur passe à 1 ; l'admin voit la pastille, ouvre
   « Activité » et lit « … a aimé » ; nettoyage : retirer le like, supprimer la liste ;
2. **copier** : le membre clique « Copier dans mes listes », le toast « Copiée dans vos listes, en
   privé » paraît, « Ouvrir » mène à une liste qui affiche « Privée » et « Copiée de » ; nettoyage :
   supprimer la copie ;
3. **Communauté** : une liste privée de l'admin n'apparaît pas dans `/lists/community` vue par le
   membre.

Run: `pnpm test:e2e e2e/social.spec.ts --project=desktop`
Expected: PASS. Commit : `test(e2e): liker, copier et la Communauté`.

---

### Tâche 12 : documentation et PR

- [ ] `docs/decisions.md` : **D65**, les quatre choix de ce plan.
- [ ] `docs/conception.md` : §4.4 (likes, copies), §5 (`/lists/community`), §6 (cloche à deux
  sources), le modèle de données ; précise D6 et D31 comme le dit la spec.
- [ ] `docs/design/refonte.fig` : réaligner la page du lot 3 sur ce qui a été livré si le code a dévié.
- [ ] `pnpm typecheck && pnpm test && pnpm lint && pnpm knip && pnpm build`, E2E sans `@anilist`.
- [ ] Agent `convention-reviewer` sur le diff (CLAUDE.md), corriger.
- [ ] Pousser `feat/refonte-lot3-social`, ouvrir la PR « Refonte, lot 3 : listes sociales et
  notifications ». **Ne pas fusionner** sans l'accord explicite d'Alexis.
