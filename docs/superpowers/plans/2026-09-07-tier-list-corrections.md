# Tier list `/library/tiers` — plan de correction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** rendre le glisser-déposer de la tier list visible et fiable — la carte saisie doit se voir
pendant tout son trajet, et deux dépôts rapprochés ne doivent plus se défaire l'un l'autre.

**Architecture:** un `DragOverlay` sort la carte saisie du bloc qui la rogne ; un module pur
`pending-scores.ts` porte les écritures en vol, ce qui rend testable sans DOM la seule mécanique de
l'écran qui ait un état. Aucune migration, aucune nouvelle table, aucune lecture de plus.

**Tech Stack:** Next 16 (App Router, Server Components), React 19, `@dnd-kit/core` 6.3,
next-safe-action v8, Tailwind v4, Vitest 4 (environnement `node`).

**Spec:** ce plan tient lieu de spec — le constat est repris ci-dessous, mesuré au navigateur le
7 septembre 2026 sur la bibliothèque réelle (259 œuvres, dont 196 non notées).

---

## Le constat, en six points

Numérotés comme dans l'audit ; l'ordre des tâches les reprend.

| # | Ce qui cloche | Preuve |
| --- | --- | --- |
| **B1** | La carte glissée **disparaît** dès qu'elle sort de son `<ol>` : les deux blocs portent `overflow-clip` et il n'y a pas de `DragOverlay`. Piocher dans la réserve se fait à l'aveugle. | `elementFromPoint` au centre de la carte translatée ne la trouve pas ; glisser réel → trou gris à l'origine, rien nulle part ailleurs. |
| **B2** | Le message d'un cran vide est collé **à 1 px du haut** d'une ligne de 97 px : il se lit comme le pied de la ligne au-dessus. `m-auto` ne centre rien dans un `flex-wrap` en `content-start`. | Mesuré : `textTopOffset: 1`, `textBottomGap: 76`. |
| **A2** | Deux dépôts rapprochés : la revalidation du premier écrase l'optimiste du second, qui revient à son ancien cran puis se recorrige. | Lecture de `tier-board.tsx:143-146`. |
| **A3** | `onSettled` supprime `previousScores` par `mediaId` : le premier dépôt efface la mémoire du second, dont l'échec ne se rattrape alors plus. | Lecture de `tier-board.tsx:165-178`. |
| **A4** | Retirer une note ne laisse **aucune trace** au journal (`applyEntryChanges` n'émet `SCORED` que si la note n'est pas nulle). | `entry-transition.ts:215`, et le test qui le fige. |
| **A5** | Détails : union de types réécrite au lieu d'être dérivée ; flèches latérales non neutralisées pendant un glisser clavier ; la même phrase répétée sur six lignes vides. | Lecture. |

**Ce qui va bien et ne doit pas bouger** — vérifié, pas supposé : le clavier avance d'un cran par
flèche avec auto-scroll ; le focus revient sur la carte après annulation ; le filtre par type
recale bien le plateau (259 → 204 → 55) ; aucune erreur de console ni d'hydratation ;
`score-tiers.ts` est pur et couvert.

**Hors périmètre, décidé :** l'absence de menu au doigt (point 1 de l'audit) n'est pas traitée ici.
C'est une décision de produit — quel geste tactile ouvre le menu — pas une correction.

## Global Constraints

Extraites de `CLAUDE.md` et `docs/ARCHITECTURE.md`. Elles valent pour **chaque** tâche.

- `src/app/` ne contient que du routing ; le métier vit dans `src/features/<domaine>/`.
- Un composant démarre dans le `_components/` de sa route ; promotion au **deuxième** appelant réel.
- `"use client"` sur la feuille interactive, jamais sur la page parente.
- Fichiers et dossiers en `kebab-case`. Pas de barrel `index.ts` dans `features/`.
- Un seul alias d'import : `@/*` → `src/*`.
- Vitest tourne en environnement **`node`** et n'inclut que `src/**/*.test.ts` : **aucun composant
  React n'est testable**. Toute logique qu'on veut couvrir se sort donc dans un module pur de
  `features/<domaine>/lib/`. C'est déjà ce que fait `score-tiers.ts`.
- Un hook `PreToolUse` (`.claude/hooks/conventions-guard.mjs`) refuse les écritures qui violent
  celles de ces règles qu'une machine sait voir. **S'il bloque, c'est le code qu'il faut corriger.**
- Commits en français, `type(scope): sujet`, et le pied :
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

**Après chaque tâche, les quatre, toutes vertes :** `pnpm typecheck`, `pnpm lint`, `pnpm test`,
`pnpm knip`.

## Carte des fichiers

| Fichier | Responsabilité | Tâche |
| --- | --- | --- |
| `src/app/(app)/library/tiers/_components/tier-board.tsx` | **Modifier.** La face de carte devient un composant à part, partagé entre la jaquette déplaçable et l'aperçu de glisser ; le plateau gagne un `DragOverlay` et branche les écritures en vol. | 1, 2, 4, 6 |
| `src/features/tracking/lib/pending-scores.ts` | **Créer.** Module pur : les notes posées localement dont l'écriture n'est pas revenue. | 3 |
| `src/features/tracking/lib/pending-scores.test.ts` | **Créer.** Sa couverture. | 3 |
| `src/features/tracking/lib/entry-transition.ts` | **Modifier.** `SCORED` porte aussi l'effacement. | 5 |
| `src/features/tracking/lib/entry-transition.test.ts` | **Modifier.** Le test qui fige l'ancienne règle. | 5 |
| `src/features/tracking/lib/entry-format.ts` | **Modifier.** « Note retirée » au lieu de « Note modifiée ». | 5 |
| `src/features/tracking/lib/entry-format.test.ts` | **Modifier.** Le nouveau libellé. | 5 |
| `src/features/tracking/server/library.queries.ts` | **Modifier.** Le type des conditions d'œuvre se dérive au lieu d'être réécrit. | 6 |
| `docs/JOURNAL.md`, `docs/STATE.md` | **Modifier.** En fin de plan. | 7 |

## Points d'arrêt

**Les tâches 1, 2 et 6 changent ce qui se voit.** La méthode du projet impose une capture avant le
commit — 1512 et 390 — et l'accord d'Alexis. Un agent qui enchaînerait les six tâches sans montrer
la première aurait manqué le point.

Le serveur de dev tourne peut-être déjà sur le port 3000 (`Another next dev server is already
running` au lancement : c'est bon signe, s'y brancher). L'accès authentifié suit
`memory/playwright-auth-access.md` — le profil Playwright garde souvent la session d'une séance
précédente, donc essayer `/library/tiers` **avant** de rejouer le script de cookie.

---

### Task 1 : la carte saisie cesse d'être rognée (B1)

**Files:**
- Modify: `src/app/(app)/library/tiers/_components/tier-board.tsx`

**Interfaces:**
- Consumes: `TierEntry` (`@/features/tracking/server/library.queries`), déjà importé.
- Produces:
  - `const CARD_SHELL: string` — les classes de la coquille d'une jaquette, partagées.
  - `function TierCardFace({ entry, eager, alwaysShowTitle }: { entry: TierEntry; eager: boolean; alwaysShowTitle?: boolean }): ReactNode`
  - `TierBoard` rend un `<DragOverlay>` ; `TierCard` n'applique plus de `transform`.

- [ ] **Step 1 : sortir la coquille et la face de la carte**

Dans `tier-board.tsx`, au-dessus de `TierCard`, ajouter :

```tsx
/**
 * Les classes de la coquille d'une jaquette — **partagées entre la carte en place et l'aperçu qui
 * suit le curseur**. Deux listes de classes pour un même objet finiraient par diverger, et c'est
 * précisément l'objet dont l'aperçu doit être la copie exacte.
 */
const CARD_SHELL =
  "group relative aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted sm:w-20";

/**
 * Ce qu'on voit d'une jaquette : l'image, et le nom qui la tranche.
 *
 * Séparé de `TierCard` parce que l'aperçu de glisser doit montrer exactement la même chose sans
 * rien de ce qui rend la carte déplaçable — ni poignée, ni focus, ni menu.
 *
 * `alwaysShowTitle` sert à ce seul aperçu : le nom n'y apparaît pas au survol, puisqu'on ne survole
 * pas ce qu'on tient — et savoir ce qu'on transporte au-dessus de onze paliers est tout l'intérêt.
 */
function TierCardFace({
  entry,
  eager,
  alwaysShowTitle = false,
}: {
  entry: TierEntry;
  eager: boolean;
  alwaysShowTitle?: boolean;
}) {
  return (
    <>
      {entry.cover ? (
        <Image
          alt=""
          className="object-cover"
          fill
          priority={eager}
          sizes="(min-width: 640px) 80px, 56px"
          src={entry.cover}
        />
      ) : null}

      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 line-clamp-3 bg-background/85 px-1 py-0.5 text-[10px] leading-tight",
          entry.cover &&
            !alwaysShowTitle &&
            "opacity-0 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100",
        )}
      >
        {entry.title}
      </span>
    </>
  );
}
```

- [ ] **Step 2 : `TierCard` ne se déplace plus elle-même**

Remplacer le corps de `TierCard` jusqu'à `const card = (…)` par :

```tsx
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: entry.mediaId,
  });
```

(`transform` disparaît de la déstructuration : c'est l'aperçu qui bouge désormais, et une variable
inutilisée serait refusée par Biome.)

Puis remplacer le `card` par :

```tsx
  const card = (
    <div
      className={cn(
        // `touch-manipulation` et non `touch-none` : le navigateur garde le défilement, et c'est le
        // délai du `TouchSensor` qui distingue un balayage d'une saisie.
        CARD_SHELL,
        "cursor-grab touch-manipulation outline-none",
        // L'anneau suit le focus clavier : c'est ce qui rend le déplacement au clavier visible.
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        /*
          La carte reste **en place et pâlie** pendant qu'on la porte : c'est l'aperçu qui voyage.
          Le creux dit d'où elle vient, ce qui rend l'annulation lisible.
        */
        isDragging && "opacity-40",
      )}
      ref={setNodeRef}
      title={entry.title}
      {...attributes}
      {...listeners}
    >
      <TierCardFace entry={entry} eager={eager} />
    </div>
  );
```

L'attribut `style={{ transform: … }}` disparaît. L'import `CSS` de `@dnd-kit/utilities` devient
inutile : le retirer aussi, sinon `pnpm lint` le signale.

- [ ] **Step 3 : le plateau tient l'œuvre saisie et rend l'aperçu**

Ajouter `DragOverlay` et `DragStartEvent` à l'import de `@dnd-kit/core`, puis dans `TierBoard`,
juste après `const groups = useMemo(…)` :

```tsx
  /*
    **L'œuvre qu'on porte, pour l'aperçu et pour lui seul.** Le plateau n'en a pas besoin
    autrement : c'est `over` qui décide du dépôt, pas cet état.
  */
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeEntry =
    activeId === null
      ? null
      : (entries.find((entry) => entry.mediaId === activeId) ?? null);
```

Remplacer `handleDragEnd` par :

```tsx
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(Number(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    moveToTier(Number(active.id), over.id);
  };
```

Sur le `<DndContext>`, ajouter `onDragCancel={() => setActiveId(null)}` et
`onDragStart={handleDragStart}` (l'ordre des props est alphabétique, Biome le vérifie).

- [ ] **Step 4 : l'aperçu, hors des blocs qui rognent**

Toujours dans `TierBoard`, **après** la `<div className="flex flex-col gap-6">` fermante et avant
`</DndContext>` :

```tsx
      {/*
        **L'aperçu est ce qui répare le glisser** (7 septembre 2026). Les deux blocs du plateau
        portent `overflow-clip` pour que leurs coins arrondis coupent les jaquettes des première et
        dernière lignes — mais une carte simplement translatée est alors rognée dès qu'elle sort de
        son bloc, et piocher dans la réserve pour remonter au cran 5 se faisait à l'aveugle sur tout
        le trajet. `DragOverlay` rend la carte en `position: fixed`, dont le bloc conteneur est la
        fenêtre : aucun `overflow` d'ancêtre ne l'atteint.

        `dropAnimation={null}` : l'animation par défaut ramène l'aperçu vers la carte **d'origine**,
        alors que le dépôt vient justement de l'envoyer ailleurs. Elle montrerait donc le contraire
        de ce qui vient de se passer, et le rendu optimiste est déjà instantané.
      */}
      <DragOverlay dropAnimation={null}>
        {activeEntry ? (
          <div
            className={cn(CARD_SHELL, "cursor-grabbing shadow-lg ring-2 ring-ring")}
          >
            <TierCardFace alwaysShowTitle entry={activeEntry} eager={false} />
          </div>
        ) : null}
      </DragOverlay>
```

- [ ] **Step 5 : les quatre commandes**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip
```

Attendu : tout vert. `knip` doit rester muet — si `CSS` ou `transform` traîne encore, il ou Biome
le dira.

- [ ] **Step 6 : la preuve au navigateur**

Le glisser réel, **interrompu par Échap pour ne rien écrire en base** (extrait exécuté tel quel via
Playwright ; il part de la première carte de la réserve et remonte de 300 px) :

```js
async (page) => {
  await page.goto('http://localhost:3000/library/tiers');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const ols = [...document.querySelectorAll('ol')];
    const reserve = ols.find(o => o.querySelectorAll('li').length === 1);
    window.scrollTo(0, reserve.getBoundingClientRect().top + window.scrollY - 400);
  });
  await page.waitForTimeout(400);
  const start = await page.evaluate(() => {
    const ols = [...document.querySelectorAll('ol')];
    const reserve = ols.find(o => o.querySelectorAll('li').length === 1);
    const r = reserve.querySelector('li > div:nth-child(2) > div').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(start.x + i * 2, start.y - i * 25);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: '.playwright-mcp/tiers-drag-corrige.png' });
  await page.keyboard.press('Escape');
  await page.mouse.up();
}
```

Attendu : **la jaquette est visible**, au-dessus du plateau, à 300 px de son point de départ, son
titre affiché ; son emplacement d'origine est pâli et non vide. Avant correction, la même capture
ne montrait rien.

Refaire le même essai **au clavier** (Espace, six fois Flèche bas, Échap) : l'aperçu doit rester
visible en traversant la frontière entre le plateau et la réserve.

- [ ] **Step 7 : capture, accord, commit**

Captures en 1512 et 390 dans `.playwright-mcp/` (gitignoré), montrées à Alexis. Après accord :

```bash
git add "src/app/(app)/library/tiers/_components/tier-board.tsx"
git commit -m "$(cat <<'EOF'
fix(tiers): la carte glissée cesse d'être rognée par le plateau

Les deux blocs portent `overflow-clip` pour arrondir leurs coins, ce qui
effaçait toute carte simplement translatée hors de son bloc : piocher dans
la réserve se faisait à l'aveugle. Un `DragOverlay`, en `position: fixed`,
échappe à ce rognage.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : le message d'un cran vide se centre (B2)

**Files:**
- Modify: `src/app/(app)/library/tiers/_components/tier-board.tsx` (dans `TierRow`)

**Interfaces:**
- Consumes: rien de la tâche 1 ; les deux tâches ne se touchent pas.
- Produces: rien.

- [ ] **Step 1 : comprendre avant de changer**

`content-start` (`align-content: flex-start`) est posé pour que les jaquettes se tassent en haut
d'une ligne haute. Dans un conteneur `flex-wrap`, la **ligne** flex ne fait alors que la hauteur de
son contenu : les marges `auto` du paragraphe n'ont plus rien à répartir, et il se colle en haut.
Il ne faut donc pas retirer `content-start` — il faut ne pas l'appliquer quand la ligne est vide.

- [ ] **Step 2 : conditionner l'alignement**

Dans `TierRow`, remplacer le `cn(…)` de la `<div>` des jaquettes par :

```tsx
        className={cn(
          /*
            `gap-px` et non un vrai écart : les jaquettes se touchent, comme sur TierMaker, et c'est
            ce qui fait qu'un palier se lit comme un bloc dont on jauge la masse.
          */
          "flex min-h-24 flex-1 flex-wrap gap-px p-px transition-colors",
          /*
            **L'alignement dépend du contenu, et il le faut** (7 septembre 2026) : `content-start`
            tasse les jaquettes en haut d'une ligne haute, mais sur une ligne vide il écrase la
            ligne flex à la hauteur du texte, et `m-auto` n'a alors plus rien à centrer — le message
            se collait à 1 px du bord haut et se lisait comme le pied du palier au-dessus.
          */
          items.length === 0
            ? "items-center justify-center"
            : "content-start items-start",
          /* La ligne visée s'éclaire : sans retour, on dépose au jugé. */
          isOver && "bg-muted",
        )}
```

Le `<p>` perd son `m-auto`, désormais inutile :

```tsx
          <p className="px-3 text-muted-foreground text-sm">
```

- [ ] **Step 3 : les quatre commandes**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip
```

- [ ] **Step 4 : la mesure, la même qu'au constat**

```js
() => {
  const p = [...document.querySelectorAll('p')].find(n => n.textContent.startsWith('Rien à ce cran'));
  const row = p.closest('li');
  const pr = p.getBoundingClientRect(), rr = row.getBoundingClientRect();
  return {
    rowHeight: Math.round(rr.height),
    textTopOffset: Math.round(pr.top - rr.top),
    textBottomGap: Math.round(rr.bottom - pr.bottom),
  };
}
```

Attendu : `textTopOffset` et `textBottomGap` à peu près égaux (≈ 38 sur une ligne de 97), là où
c'était 1 et 76.

- [ ] **Step 5 : capture, accord, commit**

```bash
git add "src/app/(app)/library/tiers/_components/tier-board.tsx"
git commit -m "$(cat <<'EOF'
fix(tiers): le message d'un cran vide se centre dans sa ligne

`m-auto` ne centre rien dans un conteneur `flex-wrap` en `content-start` :
la ligne flex ne fait que la hauteur du texte. Le message se collait à 1 px
du haut et se lisait comme le pied du palier au-dessus.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : `pending-scores.ts`, les notes dont l'écriture n'est pas revenue (A2 + A3)

Les deux défauts sont **la même pièce manquante** : le plateau ne sait pas quelles notes il a posées
sans confirmation. Les traiter séparément demanderait deux fois la même table.

Le module est pur — donc testable, alors qu'un composant React ne l'est pas dans ce dépôt
(`vitest.config.mts`, environnement `node`). La `Map` est **mutée sur place** : elle vivra dans une
`useRef`, où une valeur remplacée à chaque écriture n'apporterait rien qu'un piège de fermeture.

**Files:**
- Create: `src/features/tracking/lib/pending-scores.ts`
- Test: `src/features/tracking/lib/pending-scores.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type PendingScores = Map<number, { score: number | null; previous: number | null; inFlight: number }>`
  - `function queueScore(pending: PendingScores, mediaId: number, score: number | null, currentScore: number | null): void`
  - `function settleScore(pending: PendingScores, mediaId: number): void`
  - `function failScore(pending: PendingScores, mediaId: number): { previous: number | null } | null`
  - `function applyPendingScores<T extends { mediaId: number; score: number | null }>(rows: T[], pending: PendingScores): T[]`

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/features/tracking/lib/pending-scores.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import {
  applyPendingScores,
  failScore,
  type PendingScores,
  queueScore,
  settleScore,
} from "@/features/tracking/lib/pending-scores";

const empty = (): PendingScores => new Map();

describe("applyPendingScores", () => {
  /**
   * Le cas qui a motivé le module : la revalidation du premier dépôt renvoie des lignes fraîches
   * où le second n'est pas encore écrit. Les reprendre telles quelles ferait revenir la carte à
   * son ancien cran, le temps d'un aller-retour.
   */
  it("recouvre les lignes serveur par les notes en vol", () => {
    const pending = empty();
    queueScore(pending, 1, 90, null);

    expect(
      applyPendingScores(
        [
          { mediaId: 1, score: null },
          { mediaId: 2, score: 50 },
        ],
        pending,
      ),
    ).toEqual([
      { mediaId: 1, score: 90 },
      { mediaId: 2, score: 50 },
    ]);
  });

  it("rend le tableau d'origine quand rien n'est en vol", () => {
    const rows = [{ mediaId: 1, score: 50 }];
    expect(applyPendingScores(rows, empty())).toBe(rows);
  });
});

describe("queueScore et settleScore", () => {
  /**
   * Deux déplacements de la **même** œuvre peuvent se chevaucher. La note d'avant retenue est celle
   * d'avant le premier : c'est le seul état que le serveur ait jamais confirmé.
   */
  it("garde la note d'avant la première écriture", () => {
    const pending = empty();
    queueScore(pending, 1, 90, 50);
    queueScore(pending, 1, 100, 90);

    expect(pending.get(1)).toEqual({
      score: 100,
      previous: 50,
      inFlight: 2,
    });
  });

  it("n'oublie l'œuvre qu'à la dernière écriture revenue", () => {
    const pending = empty();
    queueScore(pending, 1, 90, 50);
    queueScore(pending, 1, 100, 90);

    settleScore(pending, 1);
    expect(pending.get(1)?.inFlight).toBe(1);

    settleScore(pending, 1);
    expect(pending.has(1)).toBe(false);
  });

  it("ne bronche pas sur une écriture qu'on ne suit pas", () => {
    const pending = empty();
    expect(() => settleScore(pending, 404)).not.toThrow();
  });
});

describe("failScore", () => {
  /**
   * Un échec périme **toutes** les écritures en vol de cette œuvre : elles partaient d'un état qui
   * n'a jamais existé côté serveur. On revient donc à la dernière note confirmée, d'un coup.
   */
  it("rend la note d'avant et cesse de suivre l'œuvre", () => {
    const pending = empty();
    queueScore(pending, 1, 90, 50);
    queueScore(pending, 1, 100, 90);

    expect(failScore(pending, 1)).toEqual({ previous: 50 });
    expect(pending.has(1)).toBe(false);
  });

  /**
   * `null` et non `{ previous: null }` : « aucune écriture en cours » et « elle n'était pas notée »
   * sont deux choses différentes, et les confondre effacerait une note posée depuis un autre onglet.
   */
  it("distingue « rien en vol » de « pas de note »", () => {
    const pending = empty();
    expect(failScore(pending, 404)).toBeNull();

    queueScore(pending, 1, 90, null);
    expect(failScore(pending, 1)).toEqual({ previous: null });
  });
});
```

- [ ] **Step 2 : le lancer et vérifier qu'il échoue**

```bash
pnpm vitest run src/features/tracking/lib/pending-scores.test.ts
```

Attendu : ÉCHEC à l'import — `Failed to resolve import "@/features/tracking/lib/pending-scores"`.

- [ ] **Step 3 : écrire le module**

Créer `src/features/tracking/lib/pending-scores.ts` :

```ts
/**
 * Les notes posées à l'écran dont l'écriture n'est pas revenue.
 *
 * La tier list déplace ses cartes **avant** la réponse du serveur, sans quoi chaque dépôt ferait
 * revenir la jaquette à sa place le temps d'un aller-retour. Mais le serveur reste la vérité, et
 * chaque écriture y déclenche un `revalidatePath` qui renvoie des lignes fraîches. Sans cette
 * table, ces lignes-là **défont le dépôt suivant** : celui-ci n'y est pas encore, donc sa carte
 * remonte à son ancien cran avant de se recorriger. Sur un écran fait pour enchaîner les dépôts,
 * ça se voit.
 *
 * Le module est pur, donc testable : dans ce dépôt, Vitest tourne en environnement `node` et ne
 * voit aucun composant React (`vitest.config.mts`). C'est le même parti que `score-tiers.ts`.
 *
 * **La `Map` est mutée sur place**, parce qu'elle vivra dans une `useRef` : la remplacer à chaque
 * écriture n'apporterait qu'un piège de fermeture, et elle ne déclenche aucun rendu.
 */

/** Une œuvre en cours d'écriture. */
type PendingScore = {
  /** La note qu'on vient de poser à l'écran. */
  score: number | null;
  /** La dernière note **confirmée** par le serveur, à remettre si l'écriture échoue. */
  previous: number | null;
  /** Combien d'écritures de cette œuvre n'ont pas encore répondu. */
  inFlight: number;
};

export type PendingScores = Map<number, PendingScore>;

/**
 * Une note vient d'être posée à l'écran.
 *
 * `currentScore` n'est retenu qu'à la **première** écriture : les suivantes partent d'un état que
 * le serveur n'a jamais confirmé, et y revenir en cas d'échec afficherait une note qui n'a existé
 * que dans le navigateur.
 */
export function queueScore(
  pending: PendingScores,
  mediaId: number,
  score: number | null,
  currentScore: number | null,
): void {
  const previous = pending.get(mediaId);

  pending.set(mediaId, {
    score,
    previous: previous ? previous.previous : currentScore,
    inFlight: (previous?.inFlight ?? 0) + 1,
  });
}

/**
 * Une écriture est revenue, quelle qu'en soit l'issue.
 *
 * On ne cesse de suivre l'œuvre qu'à la dernière : tant qu'une écriture reste en vol, sa note
 * locale doit continuer de recouvrir ce que renvoie le serveur.
 */
export function settleScore(pending: PendingScores, mediaId: number): void {
  const entry = pending.get(mediaId);
  if (!entry) return;

  if (entry.inFlight <= 1) {
    pending.delete(mediaId);
    return;
  }

  pending.set(mediaId, { ...entry, inFlight: entry.inFlight - 1 });
}

/**
 * Une écriture a échoué : quelle note remettre ?
 *
 * `null` veut dire « rien en vol pour cette œuvre », ce qui n'est pas la même chose que
 * `{ previous: null }`, « elle n'était pas notée ». Les confondre effacerait une note posée depuis
 * un autre onglet. L'échec périme **toutes** les écritures en vol de l'œuvre, d'où l'oubli d'un
 * coup : elles partaient d'un état qui n'a jamais existé côté serveur.
 */
export function failScore(
  pending: PendingScores,
  mediaId: number,
): { previous: number | null } | null {
  const entry = pending.get(mediaId);
  if (!entry) return null;

  pending.delete(mediaId);
  return { previous: entry.previous };
}

/** Recouvre des lignes venues du serveur par les notes en vol. */
export function applyPendingScores<
  T extends { mediaId: number; score: number | null },
>(rows: T[], pending: PendingScores): T[] {
  if (pending.size === 0) return rows;

  return rows.map((row) => {
    const entry = pending.get(row.mediaId);
    return entry ? { ...row, score: entry.score } : row;
  });
}
```

- [ ] **Step 4 : relancer le test**

```bash
pnpm vitest run src/features/tracking/lib/pending-scores.test.ts
```

Attendu : 7 tests verts.

- [ ] **Step 5 : les quatre commandes**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip
```

`knip` signalera les exports non utilisés — c'est attendu à cette étape, la tâche 4 les branche.
**Si `knip` échoue, ne rien changer au module : enchaîner sur la tâche 4 et committer les deux
ensemble.** Un export « gelé » pour faire taire l'outil serait exactement ce que `knip` existe pour
attraper.

- [ ] **Step 6 : commit**

```bash
git add src/features/tracking/lib/pending-scores.ts src/features/tracking/lib/pending-scores.test.ts
git commit -m "$(cat <<'EOF'
feat(tiers): un module pur pour les notes dont l'écriture est en vol

Pur, donc couvert : Vitest tourne en environnement node dans ce dépôt et ne
voit aucun composant React. La tâche suivante le branche sur le plateau.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : le plateau cesse de défaire ses propres dépôts (A2 + A3)

**Files:**
- Modify: `src/app/(app)/library/tiers/_components/tier-board.tsx` (dans `TierBoard`)

**Interfaces:**
- Consumes: `queueScore`, `settleScore`, `failScore`, `applyPendingScores`, `PendingScores`
  (tâche 3), avec les signatures exactes qui y sont listées.
- Produces: rien.

- [ ] **Step 1 : remplacer `previousScores` par la table complète**

Importer le module :

```tsx
import {
  applyPendingScores,
  failScore,
  type PendingScores,
  queueScore,
  settleScore,
} from "@/features/tracking/lib/pending-scores";
```

Puis remplacer la `useRef` `previousScores` et son commentaire par :

```tsx
  /*
    Les notes posées à l'écran dont l'écriture n'est pas revenue (`pending-scores.ts`). Une table et
    non une seule variable : deux déplacements peuvent se chevaucher, et une variable unique ferait
    revenir la mauvaise carte.
  */
  const pending = useRef<PendingScores>(new Map());
```

- [ ] **Step 2 : le recalage serveur respecte ce qui est en vol**

Remplacer le bloc `if (lastServerEntries !== initialEntries) { … }` par :

```tsx
  const [lastServerEntries, setLastServerEntries] = useState(initialEntries);
  if (lastServerEntries !== initialEntries) {
    setLastServerEntries(initialEntries);
    /*
      **Mais pas par-dessus une note qu'on vient de poser.** Chaque écriture déclenche un
      `revalidatePath`, donc les lignes fraîches du premier dépôt arrivent alors que le second n'y
      est pas encore : les reprendre telles quelles renvoyait sa carte à son ancien cran, le temps
      d'un aller-retour (constaté le 7 septembre 2026 en enchaînant deux dépôts).
    */
    setEntries(applyPendingScores(initialEntries, pending.current));
  }
```

- [ ] **Step 3 : les trois rappels de l'action**

Remplacer le `useAction(saveEntry, { … })` par :

```tsx
  const { execute } = useAction(saveEntry, {
    onError: ({ error, input }) => {
      toast.error(
        error.serverError ?? "La note n'a pas été enregistrée. Réessayez.",
      );

      /*
        `failScore` rend `null` quand rien n'est en vol pour cette œuvre — ce qui n'est pas la même
        chose qu'une œuvre non notée, et les confondre effacerait une note posée depuis un autre
        onglet.
      */
      const failed = failScore(pending.current, input.mediaId);
      if (!failed) return;

      setEntries((current) =>
        current.map((entry) =>
          entry.mediaId === input.mediaId
            ? { ...entry, score: failed.previous }
            : entry,
        ),
      );
    },
    onSettled: ({ input }) => {
      settleScore(pending.current, input.mediaId);
    },
  });
```

(`onError` s'exécute avant `onSettled` ; `settleScore` sur une œuvre déjà oubliée ne fait rien,
c'est explicitement couvert par son test.)

- [ ] **Step 4 : le dépôt inscrit son écriture**

Dans `moveToTier`, remplacer `previousScores.current.set(mediaId, moved.score);` par :

```tsx
    queueScore(pending.current, mediaId, tier.score, moved.score);
```

- [ ] **Step 5 : les quatre commandes**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip
```

Attendu : tout vert, `knip` compris — les quatre exports de la tâche 3 sont désormais consommés.

- [ ] **Step 6 : la preuve au navigateur — et elle écrit en base**

C'est le seul essai du plan qui modifie des données. **Choisir une œuvre déjà notée, la déplacer
d'un cran, puis la remettre à son cran d'origine.** Une note remise à l'identique laisse deux
lignes `SCORED` au journal ; le dire à Alexis plutôt que de tenter de les effacer — le journal est
*append-only* et ne se corrige pas (`docs/PRODUCT.md` §4.3).

Le geste à reproduire : **deux dépôts en moins d'une seconde**, sur deux œuvres différentes.
Attendu : les deux cartes restent où on les a mises. Avant correction, la seconde revenait à son
ancien cran pendant environ un aller-retour serveur.

- [ ] **Step 7 : commit**

```bash
git add "src/app/(app)/library/tiers/_components/tier-board.tsx"
git commit -m "$(cat <<'EOF'
fix(tiers): deux dépôts rapprochés ne se défont plus l'un l'autre

Chaque écriture revalide, et les lignes fraîches du premier dépôt écrasaient
l'optimiste du second. Elles sont désormais recouvertes par les notes en vol,
qui portent aussi de quoi revenir en arrière œuvre par œuvre.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 : le journal retient qu'une note a été retirée (A4)

> **⚠️ Cette tâche renverse une décision existante, et un test la fige :** « journalise une note
> chiffrée, pas son effacement » (`entry-transition.test.ts:206`). **Demander l'accord d'Alexis
> avant de commencer.** L'argument en faveur du changement : la tier list fait de l'effacement un
> geste ordinaire — glisser une carte dans la réserve —, alors qu'il était jusqu'ici un cas de bord
> de la fiche ; un journal qui garde les notes posées mais pas les notes retirées ne permet plus de
> relire l'historique d'une note. L'argument contraire : `EntryEvent` est *append-only*, donc ce qui
> est écrit ici ne se reprend pas. Si Alexis dit non, sauter la tâche et le noter dans
> `docs/JOURNAL.md`.

**Files:**
- Modify: `src/features/tracking/lib/entry-transition.ts:51-58` (le type), `:215-217` (la règle)
- Modify: `src/features/tracking/lib/entry-transition.test.ts:205-217`
- Modify: `src/features/tracking/lib/entry-format.ts:384-390`
- Modify: `src/features/tracking/lib/entry-format.test.ts`

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: `EntryEventDraft.score?: number | null` (était `number`).

- [ ] **Step 1 : retourner le test de la transition**

Dans `entry-transition.test.ts`, remplacer le test `"journalise une note chiffrée, pas son
effacement"` par :

```ts
  /**
   * **L'effacement se journalise aussi** (7 septembre 2026). Il était muet tant que retirer une
   * note était un cas de bord de la fiche ; la tier list en fait un geste ordinaire — glisser une
   * carte dans la réserve —, et un journal qui garde les notes posées mais pas celles retirées ne
   * raconte plus l'histoire d'une note.
   */
  it("journalise une note comme son effacement", () => {
    const scored = apply(state({ status: "CURRENT", score: null }), {
      score: 85,
    });
    expect(scored.events).toEqual([{ type: "SCORED", score: 85 }]);

    const cleared = apply(state({ status: "CURRENT", score: 85 }), {
      score: null,
    });
    expect(cleared.events).toEqual([{ type: "SCORED", score: null }]);
    expect(cleared.next.score).toBeNull();
  });

  /** Une entrée qui naît sans note n'a rien effacé : pas d'événement pour un `null` qui ne bouge pas. */
  it("ne journalise pas une note absente qui le reste", () => {
    const { events } = apply(null, { status: "CURRENT" });

    expect(events.some((event) => event.type === "SCORED")).toBe(false);
  });
```

- [ ] **Step 2 : le lancer et vérifier qu'il échoue**

```bash
pnpm vitest run src/features/tracking/lib/entry-transition.test.ts
```

Attendu : ÉCHEC — `expected [] to deeply equal [ { type: 'SCORED', score: null } ]`.

- [ ] **Step 3 : ouvrir le type et la règle**

Dans `entry-transition.ts`, sur `EntryEventDraft` :

```ts
  /** `null` sur un `SCORED` : la note a été retirée, ce qui est un geste et non une absence. */
  score?: number | null;
```

Puis, plus bas :

```ts
  /*
    **L'effacement compte comme un événement.** `Entry.score` est écrasé, donc sans cette ligne
    retirer une note ne laisserait aucune trace nulle part — et la tier list en fait un geste
    ordinaire. `EntryEvent.score` est déjà nullable en base : rien à migrer.
  */
  if (next.score !== base.score) {
    events.push({ type: "SCORED", score: next.score });
  }
```

- [ ] **Step 4 : relancer**

```bash
pnpm vitest run src/features/tracking/lib/entry-transition.test.ts
```

Attendu : vert.

- [ ] **Step 5 : le libellé du journal**

`describeEntryEvent` traite déjà le cas nul, mais avec un libellé écrit pour une ligne abîmée à la
main. Dans `entry-format.ts` :

```ts
    case "SCORED": {
      /* Une note retirée, depuis la réserve de la tier list ou depuis la fiche. */
      if (event.score === null) return { label: "Note retirée", detail: null };
```

Et dans `entry-format.test.ts`, à la suite des cas `SCORED` existants :

```ts
  it("dit qu'une note a été retirée", () => {
    expect(
      describeEntryEvent(event({ type: "SCORED", score: null }), "episode"),
    ).toEqual({ label: "Note retirée", detail: null });
  });
```

- [ ] **Step 6 : les quatre commandes**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip
```

- [ ] **Step 7 : commit**

```bash
git add src/features/tracking/lib/entry-transition.ts src/features/tracking/lib/entry-transition.test.ts src/features/tracking/lib/entry-format.ts src/features/tracking/lib/entry-format.test.ts
git commit -m "$(cat <<'EOF'
feat(tracking): retirer une note laisse une trace au journal

L'effacement était muet tant qu'il était un cas de bord de la fiche. La tier
list en fait un geste ordinaire — glisser une carte dans la réserve —, et un
journal qui garde les notes posées mais pas celles retirées ne raconte plus
l'histoire d'une note. `EntryEvent.score` est déjà nullable : rien à migrer.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6 : les trois détails (A5)

**Files:**
- Modify: `src/features/tracking/server/library.queries.ts:96-106`
- Modify: `src/app/(app)/library/tiers/_components/tier-board.tsx` (`coordinateGetter`, `TierRow`)

**Interfaces:**
- Consumes: `LibraryFilterValues` (déjà importé dans `library.queries.ts`).
- Produces: rien.

- [ ] **Step 1 : le type se dérive au lieu d'être réécrit**

Dans `library.queries.ts`, remplacer la forme minimale de `mediaConditions` :

```ts
  /*
    La forme minimale plutôt que `LibraryFilterValues` : la tier list applique les mêmes conditions
    d'œuvre sans avoir ni page, ni tri, ni terme. Exiger les filtres complets l'obligerait à en
    inventer, et un filtre inventé finit par être lu.

    Les champs sont **dérivés** et non retapés : `TYPE_VALUES` vient de `LIBRARY_TYPE_OPTIONS`, et
    une union recopiée à la main cesse de suivre le jour où un troisième type apparaît.
  */
  filters: {
    q?: LibraryFilterValues["q"];
    type?: LibraryFilterValues["type"];
  };
```

- [ ] **Step 2 : les flèches latérales ne font plus glisser la page**

Dans `coordinateGetter`, remplacer les quatre premières lignes du corps par :

```tsx
  const step =
    event.code === "ArrowUp" ? -1 : event.code === "ArrowDown" ? 1 : 0;

  /*
    Gauche et droite sont **avalées sans rien faire** : l'ordre à l'intérieur d'un cran n'existe pas
    (`score-tiers.ts`), donc elles n'ont rien à déplacer — mais sans ce `preventDefault` elles font
    défiler la page de côté pendant qu'on tient une carte.
  */
  if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
    event.preventDefault();
    return;
  }

  if (step === 0 || !active || !collisionRect) return;

  event.preventDefault();
```

- [ ] **Step 3 : la phrase des crans vides**

Elle se répète sur six lignes d'affilée sur une bibliothèque réelle. **Choix par défaut : la
raccourcir**, l'invitation à déposer étant déjà portée par la description de la page et par les
instructions du lecteur d'écran. Si Alexis préfère la phrase entière, sauter cette étape.

Dans `TierRow` :

```tsx
            {tier.stars === null ? "Tout est noté." : "Rien à ce cran."}
```

- [ ] **Step 4 : les quatre commandes**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip
```

- [ ] **Step 5 : vérifier la flèche latérale au navigateur**

Saisir une carte au clavier (Espace), noter `window.scrollX`, presser Flèche droite trois fois,
relire `window.scrollX`. Attendu : inchangé.

- [ ] **Step 6 : capture, accord, commit**

```bash
git add src/features/tracking/server/library.queries.ts "src/app/(app)/library/tiers/_components/tier-board.tsx"
git commit -m "$(cat <<'EOF'
refactor(tiers): trois détails de l'audit du plateau

Le type des conditions d'œuvre se dérive de `LibraryFilterValues` au lieu de
retaper son union ; les flèches latérales cessent de faire défiler la page
pendant un glisser clavier ; la phrase d'un cran vide, répétée six fois sur
une bibliothèque réelle, se raccourcit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7 : la trace écrite

**Files:**
- Modify: `docs/JOURNAL.md`
- Modify: `docs/STATE.md`

- [ ] **Step 1 : `docs/JOURNAL.md`**

Ajouter une entrée datée du jour de l'exécution. Ce qui doit y figurer, parce que ce sont les
choses qu'on ne redécouvrirait pas :

- `overflow-clip` + carte translatée = carte invisible hors de son bloc ; `DragOverlay` est en
  `position: fixed`, donc hors d'atteinte de tout `overflow` d'ancêtre.
- `m-auto` ne centre rien dans un `flex-wrap` en `content-start` : la ligne flex se réduit à la
  hauteur du contenu.
- Le rendu optimiste et `revalidatePath` se disputent l'état dès qu'on enchaîne deux écritures ; la
  réponse est une table des écritures en vol, pas un verrou.
- Ce que le navigateur a trouvé et que les quatre commandes n'avaient pas vu — c'est l'argument
  qui justifie la passe visuelle.

- [ ] **Step 2 : `docs/STATE.md`**

Retirer de la liste des écarts connus ce que ce plan a corrigé. Si la tâche 5 a été refusée, y
inscrire la décision et sa raison, pour qu'elle ne soit pas reproposée.

- [ ] **Step 3 : commit**

```bash
git add docs/JOURNAL.md docs/STATE.md
git commit -m "$(cat <<'EOF'
docs: ce que l'audit de la tier list a appris

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Ce que ce plan ne fait pas

- **Le menu au doigt** (point 1 de l'audit) : au tactile, une jaquette ne réagit à rien, et « Ouvrir
  la fiche » est injoignable depuis le plateau. C'est un manque réel, mais le geste à choisir — tap,
  appui long qui se disputerait le `TouchSensor`, bouton dédié — est une décision de produit.
- **La hauteur de la réserve** (2 060 px pour 196 œuvres) : décision explicite d'Alexis du
  7 septembre 2026, on n'y revient pas.
- **La pagination du plateau** : idem, assumée dans le docstring de `getScoredLibrary`.
