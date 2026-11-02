# Refonte, lot 2 — Confidentialité : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque membre règle ce que les autres voient de son profil, chaque liste devient
« Membres » ou « Privée », et une liste d'un autre membre s'ouvre en lecture.

**Architecture:** six booléens dans `UserPreferences` et un enum `List.visibility`. Toute lecture
concernée passe par deux helpers testés : `canViewProfileSection` / `profileAdultFilter`
(`features/profile/lib/profile-privacy.ts`) et `visibleListsWhere` (`features/lists/server/`).
Aucun écran ne filtre lui-même. Les actions d'écriture restent gardées par `ownerId`.

**Tech Stack:** Next 16.3 (`cacheComponents`), Prisma 7, Zod 4, next-safe-action v8, shadcn,
Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-01-refonte-sociale-design.md` §2. Maquette validée :
`docs/design/refonte.fig`, page « Refonte — Lot 2 · Confidentialité » (A paramètres, B profil
caché, C visibilité d'une liste, D liste partagée sans compte).

## Global Constraints

- Tout en français ; commits `type(portée): sujet` ; branche `feat/refonte-lot2-confidentialite`,
  PR vers `main`, **jamais de fusion sans l'accord d'Alexis**.
- Réglages enregistrés un par un, sans bouton (D44). Défauts : tout `true` sauf `showAdult` `false`.
- Le propriétaire voit toujours tout son profil. `Entry.private` reste (cacher une seule œuvre).
- `/l/[token]` marche quelle que soit la visibilité (D16).
- Une `<Suspense>` par zone avec squelette fidèle ; `"use client"` sur la feuille seulement ;
  chemins par `routes` ; commentaires = le pourquoi, citant `Dxx` (pas la spec).
- Fin de tâche : `pnpm typecheck && pnpm test && pnpm lint && pnpm knip` vert ; écran vu en 1440 et
  390 px. Après un changement de Server Actions : redémarrer `pnpm dev`.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `prisma/schema.prisma` + migration `privacy` | six booléens, `ListVisibility`, `List.visibility` |
| `src/features/preferences/schemas/preferences.schema.ts` | champs de confidentialité |
| `src/features/preferences/server/preferences.queries.ts` | `getPreferences`, `getPrivacyOf(userId)` |
| `src/features/profile/lib/profile-privacy.ts` (+ test) | `canViewProfileSection`, `profileAdultFilter` |
| `src/features/lists/server/list-visibility.ts` (+ test) | `visibleListsWhere` |
| `src/features/lists/server/lists.queries.ts` | `getList` ouverte aux listes visibles, `getProfileLists` |
| `src/features/lists/schemas/lists.schema.ts`, `lists.actions.ts`, `components/list-form-dialog.tsx` | visibilité choisie |
| `src/app/(app)/lists/**` | lecture d'une liste d'autrui, mention « Privée » |
| `src/app/(app)/u/[username]/**` | sections gardées, bandeau du profil caché, section « Listes » |
| `src/app/(app)/settings/_components/privacy-settings.tsx`, `page.tsx` | rubrique « Confidentialité » |
| `src/app/(share)/l/[token]/**` | 18+ retirées pour un visiteur, « + N œuvres réservées aux membres » |
| `e2e/confidentialite.spec.ts` | parcours |

---

### Task 0: Branche

- [ ] `git switch feat/refonte-lot1-entree && git pull && git switch -c feat/refonte-lot2-confidentialite`
  (rebaser sur `main` une fois la PR 62 fusionnée).

### Task 1: Schéma

**Files:** `prisma/schema.prisma`, migration générée.

- [ ] **Step 1:** dans `UserPreferences`, sous `includeAdult` :

```prisma
  /// Confidentialité du profil (D64). Le propriétaire voit toujours tout ; ces réglages ne
  /// concernent que les autres membres.
  profileVisible       Boolean @default(true)
  showJournal          Boolean @default(true)
  showStats            Boolean @default(true)
  showActivityCalendar Boolean @default(true)
  showFavorites        Boolean @default(true)
  /// Faux par défaut : mes œuvres 18+ sont traitées comme privées pour les autres.
  showAdult            Boolean @default(false)
```

- [ ] **Step 2:** l'enum et la colonne :

```prisma
enum ListVisibility {
  PRIVATE
  MEMBERS
}
```

  et dans `List`, sous `cutoff` : `visibility ListVisibility @default(MEMBERS)` avec
  `@@index([visibility])`.

- [ ] **Step 3:** `pnpm db:migrate --name privacy`, puis `pnpm prisma generate`. Attendu : six
  `ADD COLUMN` sur `user_preferences`, un `CREATE TYPE` et un `ADD COLUMN` sur `list`.
- [ ] **Step 4:** commit `feat(privacy): réglages de confidentialité et visibilité des listes en base`.

### Task 2: Préférences de confidentialité

**Files:** `preferences.schema.ts`, `preferences.queries.ts`, `preferences.actions.ts` (rien à
changer si le schéma partiel suffit), leurs tests s'ils existent.

**Interfaces — Produces:** `Preferences` porte les six booléens ; `DEFAULT_PREFERENCES` aussi ;
`type ProfilePrivacy = Pick<Preferences, "profileVisible" | "showJournal" | "showStats" | "showActivityCalendar" | "showFavorites" | "showAdult">` ;
`getPrivacyOf(userId: string): Promise<ProfilePrivacy>` (les réglages **du propriétaire** d'un
profil, défauts si pas de ligne).

- [ ] **Step 1:** ajouter à `preferencesSchema` :

```ts
  profileVisible: z.boolean(),
  showJournal: z.boolean(),
  showStats: z.boolean(),
  showActivityCalendar: z.boolean(),
  showFavorites: z.boolean(),
  showAdult: z.boolean(),
```

  et les mêmes clés à `DEFAULT_PREFERENCES` (`true` ×5, `showAdult: false`). Exporter
  `ProfilePrivacy` (le `Pick` ci-dessus) et `PRIVACY_KEYS` (le tableau des six clés, `as const`).
- [ ] **Step 2:** `getPreferences` sélectionne les six colonnes. Ajouter `getPrivacyOf` :

```ts
/**
 * Les réglages de confidentialité **du propriétaire** d'un profil, pas du visiteur. Sans ligne, ce
 * sont les défauts : un compte qui n'a jamais ouvert ses réglages a un profil visible.
 */
export async function getPrivacyOf(userId: string): Promise<ProfilePrivacy> {
  const row = await prisma.userPreferences.findUnique({
    where: { userId },
    select: Object.fromEntries(PRIVACY_KEYS.map((key) => [key, true])) as Record<
      (typeof PRIVACY_KEYS)[number],
      true
    >,
  });
  return row ?? pick(DEFAULT_PREFERENCES, PRIVACY_KEYS);
}
```

  (`pick` local de trois lignes si le projet n'en a pas : `Object.fromEntries(keys.map((k) => [k, obj[k]]))`.)
- [ ] **Step 3:** vérifier que `updatePreferences` accepte les nouvelles clés (`updatePreferencesSchema = preferencesSchema.partial()`) et que son `upsert` les écrit ; `pnpm typecheck && pnpm test`.
- [ ] **Step 4:** commit `feat(privacy): préférences de confidentialité`.

### Task 3: Les helpers du profil

**Files:** Create `src/features/profile/lib/profile-privacy.ts`, `profile-privacy.test.ts`.

**Interfaces — Produces:**
`type ProfileSection = "journal" | "stats" | "activity" | "favorites"` ;
`canViewProfileSection(viewer: { isOwner: boolean }, privacy: ProfilePrivacy, section: ProfileSection): boolean` ;
`profileAdultFilter({ isOwner, viewerIncludeAdult, privacy }): boolean` — l'`includeAdult` à
passer aux lectures du profil.

- [ ] **Step 1: tests**

```ts
import { describe, expect, it } from "vitest";

import {
  canViewProfileSection,
  profileAdultFilter,
} from "@/features/profile/lib/profile-privacy";
import { DEFAULT_PREFERENCES } from "@/features/preferences/schemas/preferences.schema";

const open = { ...DEFAULT_PREFERENCES };
const hidden = { ...DEFAULT_PREFERENCES, profileVisible: false };

describe("canViewProfileSection", () => {
  it("montre tout au propriétaire, même un profil caché", () => {
    expect(canViewProfileSection({ isOwner: true }, hidden, "journal")).toBe(true);
  });
  it("cache tout aux autres quand le profil est caché", () => {
    for (const section of ["journal", "stats", "activity", "favorites"] as const) {
      expect(canViewProfileSection({ isOwner: false }, hidden, section)).toBe(false);
    }
  });
  it("suit le réglage de chaque section", () => {
    const noJournal = { ...open, showJournal: false };
    expect(canViewProfileSection({ isOwner: false }, noJournal, "journal")).toBe(false);
    expect(canViewProfileSection({ isOwner: false }, noJournal, "stats")).toBe(true);
  });
});

describe("profileAdultFilter", () => {
  it("garde la préférence du propriétaire pour lui-même", () => {
    expect(profileAdultFilter({ isOwner: true, viewerIncludeAdult: true, privacy: open })).toBe(true);
  });
  it("cache le 18+ d'un profil qui ne le montre pas, même au lecteur qui l'accepte", () => {
    expect(profileAdultFilter({ isOwner: false, viewerIncludeAdult: true, privacy: open })).toBe(false);
  });
  it("le montre seulement si les deux l'acceptent", () => {
    const adult = { ...open, showAdult: true };
    expect(profileAdultFilter({ isOwner: false, viewerIncludeAdult: true, privacy: adult })).toBe(true);
    expect(profileAdultFilter({ isOwner: false, viewerIncludeAdult: false, privacy: adult })).toBe(false);
  });
});
```

- [ ] **Step 2:** le module :

```ts
import type { ProfilePrivacy } from "@/features/preferences/schemas/preferences.schema";

export type ProfileSection = "journal" | "stats" | "activity" | "favorites";

const SECTION_SETTING = {
  journal: "showJournal",
  stats: "showStats",
  activity: "showActivityCalendar",
  favorites: "showFavorites",
} as const satisfies Record<ProfileSection, keyof ProfilePrivacy>;

/** La seule porte d'une section de profil (D64) : aucun écran ne lit ces réglages lui-même. */
export function canViewProfileSection(
  viewer: { isOwner: boolean },
  privacy: ProfilePrivacy,
  section: ProfileSection,
) {
  if (viewer.isOwner) return true;
  return privacy.profileVisible && privacy[SECTION_SETTING[section]];
}

/**
 * L'`includeAdult` des lectures d'un profil. Pour un autre, le 18+ n'apparaît que si le
 * propriétaire le montre **et** si le lecteur l'accepte (D7) : compteurs compris.
 */
export function profileAdultFilter({
  isOwner,
  viewerIncludeAdult,
  privacy,
}: {
  isOwner: boolean;
  viewerIncludeAdult: boolean;
  privacy: ProfilePrivacy;
}) {
  return viewerIncludeAdult && (isOwner || privacy.showAdult);
}
```

- [ ] **Step 3:** `pnpm test src/features/profile/lib/profile-privacy.test.ts` → PASS ; commit
  `feat(profile): les règles de confidentialité du profil`.

### Task 4: `visibleListsWhere`

**Files:** Create `src/features/lists/server/list-visibility.ts`, `list-visibility.test.ts`.

**Interfaces — Produces:** `visibleListsWhere(viewerId: string): Prisma.ListWhereInput`.

- [ ] **Step 1: test**

```ts
import { describe, expect, it } from "vitest";

import { visibleListsWhere } from "@/features/lists/server/list-visibility";

describe("visibleListsWhere", () => {
  it("ouvre mes listes, et celles des autres en « Membres » seulement", () => {
    expect(visibleListsWhere("moi")).toEqual({
      OR: [
        { ownerId: "moi" },
        { visibility: "MEMBERS", owner: { status: "APPROVED", banned: false } },
      ],
    });
  });
});
```

- [ ] **Step 2:**

```ts
import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/**
 * Les listes qu'un membre peut voir (D64) : les siennes, et celles des autres en « Membres »
 * tant que leur propriétaire est dans le cercle. **Toute** lecture de listes d'autrui passe ici.
 */
export function visibleListsWhere(viewerId: string): Prisma.ListWhereInput {
  return {
    OR: [
      { ownerId: viewerId },
      { visibility: "MEMBERS", owner: { status: "APPROVED", banned: false } },
    ],
  };
}
```

- [ ] **Step 3:** PASS ; commit `feat(lists): visibleListsWhere`.

### Task 5: Choisir la visibilité d'une liste

**Files:** `lists.schema.ts` (+ test), `lists.actions.ts`, `list-form-dialog.tsx`,
`src/app/(app)/lists/[id]/_components/list-actions-menu.tsx`, la page et les cartes de `/lists`.

- [ ] **Step 1:** `export const listVisibilitySchema = z.enum(["MEMBERS", "PRIVATE"]);` ; ajouter
  `visibility: listVisibilitySchema.default("MEMBERS")` à `createListSchema` et
  `visibility: listVisibilitySchema.optional()` à `updateListSchema`. Test : `createListSchema`
  sans visibilité donne `"MEMBERS"`.
- [ ] **Step 2:** `createList` et `updateList` écrivent `visibility` (même garde `ownerId`).
- [ ] **Step 3:** `ListFormDialog` : un champ « Visibilité », `ToggleGroup type="single" variant="outline"`
  « Membres » / « Privée », et sous lui, quand « Privée » : « Privée : vous seul la voyez. Le lien
  de partage, s'il existe, continue de marcher. » Description du dialogue d'édition : « Le titre,
  la description, le genre et qui la voit. »
- [ ] **Step 4:** `ListActionsMenu` : une entrée « Rendre privée » / « Montrer aux membres »
  (`LockIcon` / `UsersIcon`) qui appelle `updateList({ listId, visibility })`.
- [ ] **Step 5:** sur `/lists/[id]`, à côté du genre : « · Privée, visible de vous seul » quand
  `PRIVATE` ; sur les cartes de `/lists`, « · Privée » en fin de ligne de métadonnées. `getLists`
  et `getList` sélectionnent `visibility`.
- [ ] **Step 6:** vérifier au navigateur (créer privée, basculer), commit
  `feat(lists): une liste « Membres » ou « Privée »`.

### Task 6: Ouvrir la liste d'un autre membre, en lecture

**Files:** `lists.queries.ts`, `src/app/(app)/lists/[id]/page.tsx`.

**Interfaces — Produces:** `ListDetail` gagne `isOwner: boolean` et
`owner: { name: string; username: string }`.

- [ ] **Step 1:** dans `getList`, remplacer `where: { id: listId, ownerId }` par
  `where: { id: listId, ...visibleListsWhere(viewerId) }` et sélectionner
  `ownerId`, `owner: { select: { name: true, username: true } }`. Retourner
  `isOwner: list.ownerId === viewerId` et `owner`. **Ne pas renvoyer `shareToken` à un autre que le
  propriétaire** (`shareToken: isOwner ? list.shareToken : null`). Ajouter un cas au test de
  `lists.queries.test.ts` : la liste privée d'un autre rend `null`.
- [ ] **Step 2:** dans la page, quand `!list.isOwner` : pas d'`AddMediaDialog`, pas de bouton
  « Réorganiser », pas de `ListActionsMenu` ; sous le titre, « Une liste de
  [`@username`](routes.profile) ». Le retour « Mes listes » devient un lien vers le profil du
  propriétaire. `EntryQuickEdit` reste : c'est **mon** suivi de l'œuvre.
- [ ] **Step 3:** vérifier qu'aucune action ne touche une liste d'autrui (`lists.actions.ts` garde
  `ownerId` partout) ; commit `feat(lists): lire la liste d'un autre membre`.

### Task 7: Le profil sous confidentialité

**Files:** `src/app/(app)/u/[username]/page.tsx`, `_components/profile-hidden-notice.tsx`
(nouveau), `_components/profile-lists.tsx` (nouveau), `lists.queries.ts` (`getProfileLists`).

**Interfaces — Produces:** `getProfileLists({ ownerId, viewerId }): Promise<ProfileListCard[]>`
(`id`, `title`, `kind`, `itemCount`, `visibility`, quatre jaquettes), filtré par
`{ ownerId, ...visibleListsWhere(viewerId) }`, trié par `updatedAt` desc.

- [ ] **Step 1:** dans chaque bloc du profil, lire `privacy = await getPrivacyOf(profile.id)` (React
  `cache` sur `getPrivacyOf`) et :
  - remplacer l'`includeAdult` passé aux lectures par
    `profileAdultFilter({ isOwner: profile.isOwner, viewerIncludeAdult: includeAdult, privacy })` —
    favoris, couverture d'en-tête, statistiques, activité, journal ;
  - ne rendre le bloc que si `canViewProfileSection(profile, privacy, "<section>")` ; sinon `null`.
  - Les chiffres de l'en-tête suivent `"stats"`.
- [ ] **Step 2:** `ProfileHiddenNotice` : quand `!isOwner && !privacy.profileVisible`, un encart
  `bg-card rounded-lg` en tête : « {name} garde son profil pour lui » / « Son journal, ses
  statistiques et ses favoris ne sont pas partagés. Ses listes, si. »
- [ ] **Step 3:** `ProfileLists` : section « Ses listes » (« Mes listes » pour le propriétaire)
  avec le compte, une carte par liste (mosaïque `ListCoverMosaic`, titre, « {genre} · N œuvres »,
  « · Privée » pour le propriétaire), lien `routes.lists.detail(id)`. Toujours rendue, profil caché
  ou non ; `Empty` si aucune liste visible. Sa propre `<Suspense>` et son squelette.
- [ ] **Step 4:** vérifier au navigateur avec deux comptes (le sien et `@demo`), commit
  `feat(profile): sections gardées, profil caché et listes`.

### Task 8: La rubrique « Confidentialité » des paramètres

**Files:** Create `src/app/(app)/settings/_components/privacy-settings.tsx` ; Modify `settings/page.tsx`.

- [ ] **Step 1:** `PrivacySettings` (client, sur le modèle de `DisplaySettings` : `useAction(updatePreferences)`,
  optimiste, une ligne `SettingRow` par réglage, `Switch`). Textes de la maquette :
  - « Profil visible des membres » — « Les autres membres voient les sections cochées ci-dessous. »,
    ou quand coupé : « Les autres ne voient que votre avatar, votre pseudo et vos listes « Membres ». »
  - sous-titre « Ce que le profil montre » ; quatre lignes **désactivées quand le profil est caché** :
    Journal (« Chaque progression, note et changement de statut. »), Statistiques (« Les chiffres
    du haut, la répartition, les notes et les genres. »), Calendrier d'activité (« Une case par
    jour sur douze mois. »), Favoris (« Œuvres, personnages et membres du staff. »)
  - « Œuvres 18+ » — « Montrées seulement aux membres qui ont activé le contenu adulte. Désactivé,
    elles sont cachées partout sur votre profil, compteurs compris. »
  - note finale : « Pour cacher une seule œuvre, marquez-la « privée » dans sa fenêtre d'édition :
    elle disparaît partout, compteurs compris. »
- [ ] **Step 2:** la section `SettingsSection` « Confidentialité » (« Ce que les autres membres
  voient de vous. Vous, vous voyez toujours tout. Rien n'est jamais public. ») entre Affichage et
  Notifications, dans sa `<Suspense>` avec squelette. Description de la page : ajouter
  « confidentialité ».
- [ ] **Step 3:** navigateur 1440/390 ; commit `feat(settings): la rubrique Confidentialité`.

### Task 9: Liste partagée sans compte

**Files:** `src/app/(share)/l/[token]/page.tsx` ; Delete `_components/adult-item.tsx`.

- [ ] **Step 1:** pour un visiteur **sans session**, retirer les œuvres 18+ des rangées et compter
  ce qui est retiré ; pour un membre connecté, appliquer son `includeAdult`. Sous les rangées,
  quand `hidden > 0` : « + {hidden} œuvre(s) » / « réservée(s) aux membres » (maquette D). Les
  compteurs « N œuvres » de l'en-tête restent le total.
- [ ] **Step 2:** supprimer `AdultItem` et son usage ; mettre à jour le commentaire D49 → D64.
- [ ] **Step 3:** navigateur (déconnecté), commit `feat(share): 18+ réservées aux membres sur un lien partagé`.

### Task 10: E2E

**Files:** Create `e2e/confidentialite.spec.ts` (lire la skill `e2e-test`).

- [ ] **Step 1:** un test desktop seul (comptes uniques) : `e2e-member` coupe « Profil visible des
  membres » dans `/settings` ; dans un second contexte, `e2e-admin` ouvre `/u/e2e-member` et voit
  « garde son profil pour lui » et pas de section « Journal » ; `e2e-member` remet le réglage.
- [ ] **Step 2:** un test : `e2e-member` crée une liste « Privée », `e2e-admin` ne la trouve pas sur
  `/u/e2e-member` et `/lists/<id>` lui rend la page « introuvable ».
- [ ] **Step 3:** `pnpm test:e2e --grep-invert @anilist` vert ; commit `test(e2e): confidentialité`.

### Task 11: Documentation

- [ ] `docs/decisions.md` : **D64** — confidentialité du profil (six réglages, propriétaire voit
  tout, `canViewProfileSection` / `profileAdultFilter`), listes « Membres » / « Privée »
  (`visibleListsWhere`), liste d'autrui en lecture ; révise **D7** (profils visibles) et **D49**
  (18+ retirées sur `/l/[token]` pour un visiteur, « + N réservées aux membres »). Ajouter
  « *(Révisée par D64.)* » à D7 et D49.
- [ ] `docs/conception.md` : §4.4 (visibilité), §4.6 (préférences), §5 (`/u/[username]`,
  `/lists/[id]` d'autrui, `/settings`, `/l/[token]`).
- [ ] commit `docs: décisions et conception du lot 2`.

### Task 12: Revue et PR

- [ ] Tout vert (`typecheck`, `test`, `lint`, `knip`, `test:e2e`).
- [ ] Agent `convention-reviewer` sur le diff ; corriger.
- [ ] Captures README/landing à refaire si le profil change (D63, compte `@demo`).
- [ ] PR « Refonte, lot 2 : confidentialité » ; s'arrêter à la PR verte.
