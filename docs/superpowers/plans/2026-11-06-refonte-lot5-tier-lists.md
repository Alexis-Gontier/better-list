# Lot 5 — Tier lists : plan d'implémentation

> **Pour l'agent :** exécuter tâche par tâche (superpowers:executing-plans), cases `- [ ]` à cocher.
> Document de chantier : supprimé une fois la PR fusionnée (CLAUDE.md, « Specs et plans »).

**But :** un cinquième genre de liste, la tier list — paliers colorés, réserve « Pas encore
classées », éditeur glisser-déposer et clavier, « Faire ma version ».

**Architecture :** une tier list est une `List` de genre `TIER`. Les paliers vivent en JSON sur la
liste (`List.tiers`), le placement sur l'item (`ListItem.tierIndex`, `null` = réserve), et `rank`
ordonne dans le palier. Toute la logique de paliers est pure dans `features/lists/lib/tier-list.ts`
(testée) ; les actions restent minces et transactionnelles.

**Pile :** Prisma 7, Zod 4, next-safe-action v8, dnd-kit (core 6, sortable 10), shadcn.

**Spec :** `docs/superpowers/specs/2026-11-01-refonte-sociale-design.md` §6 ; maquette : page
« Refonte — Lot 5 · Tier lists » de `docs/design/refonte.fig`.

## Contraintes globales

- Défaut S, A, B, C, D : `#FF7F7F`, `#FFBF7F`, `#FFDF7F`, `#FFFF7F`, `#BFFF7F`. **Huit paliers au plus.**
- Nuancier du menu : 11 pastels et 4 gris de TierMaker.
- Étiquette : le nom en noir sur le pastel. **Exception à D33** : seule couleur hors jaquettes.
- `ListView` et `ListViewItem` supprimées (vides) : **révise D17**.
- Chaque geste part aussitôt (D37), avec mise à jour optimiste et retour arrière sur échec.
- Clavier comme le réordonnancement actuel : Espace saisit, flèches déplacent, Espace repose.
- La copie d'une tier list **ne recopie pas** `shareToken`, likes, `note`, `readyNotifiedAt` (§3).
- **Écart assumé à la spec** : la carte d'une tier list montre un aperçu en paliers (trois rangées,
  maquette D « carte · tier list »), pas la mosaïque. La maquette, plus récente, l'emporte.
- Fin de tâche : `pnpm typecheck && pnpm test && pnpm lint && pnpm knip` vert.

---

### Tâche 1 : schéma, migration, genre `TIER`

**Fichiers :** `prisma/schema.prisma`, nouvelle migration, `src/features/lists/schemas/lists.schema.ts`,
`src/features/lists/lib/list-labels.ts` (+ test), `src/features/lists/components/list-kind-glyph.tsx`,
`src/features/lists/lib/list-sections.ts` (+ test), `src/features/lists/components/list-form-dialog.tsx`.

**Produit :** `ListKind` inclut `"TIER"` partout ; colonnes `List.tiers Json?`, `List.versionOfId`,
`ListItem.tierIndex Int?` ; `NotificationType.LIST_VERSIONED`.

- [ ] Schéma Prisma :
  ```prisma
  enum ListKind { SELECTION RANKING WATCHLIST WAIT_FOR_END TIER }
  // model List
  /// Les paliers d'une tier list (`tier-list.ts`). Lus seulement pour `TIER`, conservés hors du genre.
  tiers       Json?
  versionOfId String?
  versionOf   List?   @relation("ListVersion", fields: [versionOfId], references: [id], onDelete: SetNull)
  versions    List[]  @relation("ListVersion")
  // model ListItem
  /// Index dans `List.tiers` ; `null` = la réserve « Pas encore classées ».
  tierIndex Int?
  @@index([listId, tierIndex, rank])
  enum NotificationType { LIST_LIKED LIST_FORKED SIGNUP_PENDING LIST_VERSIONED }
  ```
  Retirer `views ListView[]`, `viewItems ListViewItem[]`, les modèles `ListView`, `ListViewItem` et
  l'enum `ListViewType`.
- [ ] `pnpm db:migrate --name tier_lists`, puis `pnpm prisma generate` (Prisma 7 ne régénère plus).
  Relire le SQL : `DROP TABLE list_view_items`, `list_views`, ajouts nullables seulement.
- [ ] `listKindSchema` : ajouter `"TIER"` ; libellé « Tier list », indice « Des paliers S, A, B… à
  remplir en glissant les jaquettes. » ; glyphe (trois barres empilées) ; option du formulaire.
- [ ] `listSections("TIER", …)` : une seule section sans libellé, dans l'ordre des rangs (la page
  ne l'utilise pas pour dessiner, seulement pour les décomptes). Test.
- [ ] `listCountsLine("TIER")` : « 19 œuvres · 10 classées » — ajouter `placed` aux comptes passés
  par l'appelant. Test.
- [ ] Vérifs, commit `feat(lists): genre tier list au schéma`.

### Tâche 2 : la logique des paliers, pure et testée

**Fichiers :** créer `src/features/lists/lib/tier-list.ts` et `tier-list.test.ts`.

**Produit :**
```ts
export const TIER_PALETTE: readonly string[]; // 11 pastels puis 4 gris, ordre du nuancier
export const DEFAULT_TIERS: Tier[];           // S A B C D aux cinq premiers pastels
export const MAX_TIERS = 8;
export const tierSchema = z.object({ label: z.string().trim().min(1).max(12), color: z.enum(TIER_PALETTE) });
export const tiersSchema = z.array(tierSchema).min(1).max(MAX_TIERS);
export type Tier = z.infer<typeof tierSchema>;
export function parseTiers(json: unknown): Tier[];          // repli sur DEFAULT_TIERS si invalide
export const tierOpSchema: z.ZodDiscriminatedUnion<…>;       // voir ci-dessous
export type TierOp = z.infer<typeof tierOpSchema>;
/** Les nouveaux paliers, et comment chaque ancien `tierIndex` se renumérote (`null` = réserve). */
export function applyTierOp(tiers: Tier[], op: TierOp): { tiers: Tier[]; remap: (i: number) => number | null } | null;
export function groupByTier<T extends { tierIndex: number | null }>(tiers: Tier[], items: T[]): { rows: { tier: Tier; items: T[] }[]; reserve: T[] };
```
`TierOp` : `rename {index,label}`, `recolor {index,color}`, `insert {index, where:"above"|"below"}`
(libellé suivant libre de la suite S A B C D E F G H, couleur suivante du nuancier), `move
{index, direction:"up"|"down"}`, `clear {index}`, `delete {index}`. `applyTierOp` rend `null` pour un
geste impossible (insérer au-delà de 8, supprimer le dernier palier, monter le premier).

- [ ] Tests d'abord, un par opération, dont les cas de la spec :
  ```ts
  it("supprimer A renvoie ses œuvres dans la réserve et décale celles du dessous", () => {
    const r = applyTierOp(DEFAULT_TIERS, { type: "delete", index: 1 });
    expect(r?.tiers.map((t) => t.label)).toEqual(["S", "B", "C", "D"]);
    expect([0, 1, 2, 4].map((i) => r?.remap(i))).toEqual([0, null, 1, 3]);
  });
  ```
  `move` échange deux indices dans `remap` ;
  `clear` : `remap(i)=null` pour `i===index`, identité ailleurs ; `insert above 0` : tout décale de 1 ;
  9ᵉ palier refusé ; `groupByTier` range un `tierIndex` hors bornes dans la réserve ;
  `parseTiers("nimporte")` rend `DEFAULT_TIERS`.
- [ ] Implémenter, tests verts, commit `feat(lists): logique des paliers`.

### Tâche 3 : les écritures

**Fichiers :** `src/features/lists/schemas/lists.schema.ts`, `src/features/lists/server/lists.actions.ts`,
`src/features/lists/lib/list-reorder.ts` (+ test).

**Consomme :** `applyTierOp`, `tiersSchema`, `DEFAULT_TIERS`, `rankAfterMove`.
**Produit :** actions `moveTierItem({ listId, mediaId, tierIndex: number|null, toIndex })` et
`updateTiers({ listId, op: TierOp })`.

- [ ] `rankInGroup(items, movedId, toIndex)` dans `list-reorder.ts` : comme `rankAfterMove`, mais
  `items` est le palier **cible** sans l'élément déplacé (il vient peut-être d'ailleurs). Tests :
  insérer en tête, en queue, au milieu, dans un palier vide.
- [ ] `moveTierItem` : propriété vérifiée d'abord (comme `reorderListItem`), relire les items du
  palier cible triés par rang, `tierIndex` borné à `tiers.length - 1` sinon refus, une seule
  `update` de la ligne (`tierIndex`, `rank`). Revalide la liste et `/lists`.
- [ ] `updateTiers` : lire `tiers` et les items, `applyTierOp`, puis **une transaction** : écrire
  `tiers`, et pour chaque `tierIndex` qui change, un `updateMany` par ancien indice (au plus 8).
  Ordre des `updateMany` : passer d'abord par des valeurs négatives temporaires pour qu'un échange
  (`move`) ne mélange pas deux paliers. `null` (geste impossible) → `{ updated: false }`.
- [ ] `createList` et `updateList` : passer en `TIER` sans paliers pose `DEFAULT_TIERS` ; les
  `tierIndex` ne sont jamais effacés en quittant le genre (comme `cutoff`, D47).
- [ ] `addToList` : rien à changer (`tierIndex` vaut `null` par défaut : la réserve).
- [ ] Vérifs, commit `feat(lists): déplacer une œuvre de palier, éditer les paliers`.

### Tâche 4 : les lectures

**Fichiers :** `src/features/lists/server/lists.queries.ts` (+ test), `community.queries.ts` (+ test).

**Produit :** `ListDetail` gagne `tiers: Tier[] | null`, `items[i].tierIndex`, `versionOf: { id,
title, ownerName } | null`, `versions: { count: number; owners: { name, image }[] }` (visibles du
lecteur, trois avatars au plus) ; `ListSummary` gagne `tierPreview: { tier: Tier; covers:
ListCover[] }[] | null` (trois premiers paliers, quatre jaquettes chacun, 18+ filtrées) ;
`MediaListRef` gagne `tier: Tier | null`.

- [ ] Tests : `summarizeLists` d'une `TIER` produit `tierPreview` et des `covers` en ordre de palier
  (S d'abord, la réserve en dernier) ; `getListsWithMedia` donne `tier` au lieu de `rank` ; la
  version d'une liste privée d'un autre n'est pas comptée.
- [ ] Implémenter (`parseTiers` sur la colonne JSON, `groupByTier`), commit
  `feat(lists): lire paliers, versions et aperçu`.

### Tâche 5 : les rangées, en lecture et en édition

**Fichiers :** créer `src/features/lists/components/tier-rows.tsx` (serveur, lecture : liste d'un
autre et `/l/[token]`), `src/app/(app)/lists/[id]/_components/tier-board.tsx` (client, éditeur),
`tier-menu.tsx`, `tier-cover-menu.tsx` ; modifier `src/app/(app)/lists/[id]/page.tsx`.

Maquette A et B. Une rangée : étiquette `w-20` (390 : `w-14`) au fond pastel, texte noir centré
`font-semibold text-xl` ; jaquettes `w-14` (390 : `w-12`) en `flex-wrap gap-1` ; menu « ⋯ »
(`Button variant="ghost" size="icon"`) à droite. Réserve en bas sur `bg-card`, titre « Pas encore
classées · N », aide « Glissez une jaquette sur un palier, ou cliquez-la ».

- [ ] `TierRows` (serveur) : `groupByTier`, sans poignée ni réserve ; une rangée vide garde sa
  hauteur.
- [ ] `TierBoard` (client) : un `DndContext` (sensors **identiques** à `ListReorderGrid` : souris
  8 px, appui 200 ms tolérance 8, clavier) et un `SortableContext` par palier + la réserve
  (`id` = `tier-<i>` / `reserve`) ; `onDragOver` déplace entre conteneurs dans l'état local,
  `onDragEnd` appelle `moveTierItem` avec le conteneur et l'indice final ; retour à l'état serveur
  sur `onError`. Annonces lecteur d'écran : « Déplacée en A, position 2 ».
- [ ] `TierCoverMenu` : un clic (sans glisser) ouvre un `Popover` « Ranger dans… » : une pastille
  par palier, puis « Retirer du classement » (vers la réserve, pas hors de la liste).
- [ ] `TierMenu` : `DropdownMenu` avec champ Nom (validé au blur/Entrée), nuancier (`TIER_PALETTE`,
  `radiogroup`), Monter, Descendre, Ajouter un palier au-dessus / en dessous, Vider le palier,
  Supprimer le palier (destructif, sans confirmation : les œuvres vont dans la réserve). Chaque
  entrée appelle `updateTiers` ; entrées impossibles désactivées.
- [ ] `page.tsx` : si `list.kind === "TIER"`, le propriétaire voit `TierBoard` (pas de mode
  « Réorganiser »), les autres `TierRows`. En-tête : « Tier list · 19 œuvres · 10 classées · ♥ 4 ·
  3 versions » ; pour une version, « Ma version de *Titre* · Pseudo » (maquette D).
- [ ] Vérifier en 1440 et 390 au navigateur (glisser souris, clavier, clic → menu), commit
  `feat(lists): l'éditeur de tier list`.

### Tâche 6 : copier une tier list, « Faire ma version »

**Fichiers :** `src/features/lists/lib/list-fork.ts` (+ test), `src/features/social/server/social.actions.ts`
(+ test), `src/features/social/schemas/social.schema.ts`, `src/app/(app)/lists/[id]/_components/fork-button.tsx`,
le rendu des notifications (`notification-rules.ts` et le menu de la cloche).

- [ ] `forkData(source, ownerId, { mode: "copy" | "version" })` : `copy` recopie `tiers` et les
  `tierIndex` ; `version` recopie `tiers`, met tous les `tierIndex` à `null`, pose `versionOfId` et
  pas `forkedFromId`. Tests (dont : `shareToken`, likes, notes jamais recopiés).
- [ ] `forkList` prend `mode` (défaut `copy`) ; en `version`, notification `LIST_VERSIONED`
  (« Léo a fait sa version de *…* »). Refusé sur une liste non `TIER`.
- [ ] `ForkButton` : sur une `TIER`, ouvre un `Dialog` à deux choix (`RadioGroup`, maquette C) :
  « Faire ma version » (défaut) et « Copier avec son classement » ; bouton principal au libellé du
  choix. Même toast « Copiée dans vos listes, en privé » + « Ouvrir ».
- [ ] Commit `feat(social): faire sa version d'une tier list`.

### Tâche 7 : la carte, la fiche, le lien de partage

**Fichiers :** `src/features/lists/components/list-card.tsx`, `community-list-card.tsx`, créer
`tier-preview.tsx` ; le bloc « Dans les listes » de `/media/[id]` ; `src/app/(share)/l/[token]/page.tsx`
et `getSharedList`.

- [ ] `TierPreview` : trois rangées (étiquette 24 px, jaquettes 24×36), à la place de la mosaïque
  quand `tierPreview` n'est pas `null`.
- [ ] Fiche : « Sora · S » (pastille au pastel) au lieu du rang.
- [ ] `/l/[token]` : `TierRows`, 18+ retirées, « + N réservées aux membres » (D64).
- [ ] Commit `feat(lists): les tier lists sur les cartes, la fiche et le partage`.

### Tâche 8 : E2E, docs, maquette

- [ ] `e2e/lists.spec.ts` : créer une tier list, ranger une œuvre en A **au clavier** (Tab jusqu'à
  la jaquette, Espace, flèche haut, Espace), recharger, l'œuvre est en A (base seule, pas
  `@anilist` : ajouter l'œuvre par le miroir comme les tests existants).
- [ ] `docs/decisions.md` : D67 (tier list = genre, révise D17 ; exception à D33 ; carte en
  paliers ; « Faire ma version ») ; `conception.md` §4.4 (colonnes), §5 (`/lists/[id]`), §6 ;
  supprimer la spec (dernier lot) et ce plan ; réaligner la maquette si le code a dévié.
- [ ] `convention-reviewer` sur le diff, puis PR.
