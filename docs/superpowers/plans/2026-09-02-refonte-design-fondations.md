# Refonte design — fondations et coquille catalogue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser la direction artistique « Obsidienne » dans les tokens, signer la MediaCard, et fondre `/search` et `/library` dans une coquille catalogue unique à filtres avancés.

**Architecture:** Tout l'habillage passe par `src/styles/globals.css` — les composants shadcn héritent des tokens et ne sont pas restylés, à deux variants près qui remplacent des contournements déjà écrits en dur. La coquille catalogue est un composant partagé de `components/shared/`, paramétré par des `children` : les deux routes lui passent leurs propres facettes et leur propre grille, et gardent chacune leurs frontières `<Suspense>`.

**Tech Stack:** Next 16 (App Router, `"use cache"`), React 19 Server Components, Tailwind v4, shadcn/ui (style `radix-vega`), nuqs pour l'état d'URL, Zod, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-02-refonte-design-ui-design.md](../specs/2026-09-02-refonte-design-ui-design.md) — les valeurs exactes de la direction sont dans [le fichier de prompts](../specs/2026-09-02-refonte-design-ui-prompt.md#la-direction-retenue--obsidienne).

## Global Constraints

- **Conventions du projet** : `docs/ARCHITECTURE.md` fait foi. `src/app/` ne contient que du routing ; le métier vit dans `src/features/<domaine>/`. Un composant démarre dans le `_components/` de sa route et n'est promu que quand une deuxième route en a besoin.
- **Server-first** : `"use client"` sur la feuille interactive, jamais sur la page parente.
- **Aucune URL en dur** : tout chemin passe par `src/config/routes.ts`.
- **Jamais de `process.env.X`** : `import { env } from "@/config/env"`.
- **Fichiers et dossiers en `kebab-case`.** Pas de barrel `index.ts` dans `features/`. Alias unique `@/*` → `src/*`.
- **Un hook `PreToolUse`** (`.claude/hooks/conventions-guard.mjs`) refuse les écritures qui violent ces règles. S'il bloque, c'est le code qu'il faut corriger, pas le hook.
- **La règle des quatre emplois de l'accent** (spec §« Le principe directeur ») : l'accent ne sert qu'au bouton d'action principal, à l'élément actif, au halo de focus, et au marqueur de suivi. Tout autre texte est `--foreground` ou `--muted-foreground`.
- **Valeurs de la direction « Obsidienne »**, à copier telles quelles :
  ```
  fond #0A0A0C · surface #141417 · surface élevée #1C1C21 · bordure #26262C
  texte #FAFAFA · texte secondaire #8B8B94 · accent #7C6CF5 · destructive #E5484D
  titrage Archivo · corps Inter · rayon 6px
  ```
- **Après chaque tâche** : `pnpm typecheck` et `pnpm lint` doivent passer. `pnpm test` doit passer dès qu'un test existe.
- **Commits fréquents**, un par tâche, message en français au format `feat(portée): …` ou `refactor(portée): …` comme le reste de l'historique.

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `src/components/shared/catalogue-shell.tsx` | La coquille : en-tête d'écran, emplacement de barre, emplacement de panneau, emplacement de grille. Aucun métier. |
| `src/components/shared/filter-bar.tsx` | La barre compacte et le bouton « Filtres · N » qui déplie le panneau. Îlot client. |
| `src/components/shared/filter-panel.tsx` | Le panneau en trois colonnes, et son jumeau en `Sheet` sous `lg`. |
| `src/components/shared/filter-chips.tsx` | Une facette rendue en puces cliquables (genres, tags, saisons). |
| `src/lib/filters/count-active.ts` | Compte les facettes actives d'un objet de filtres. Pur, testé. |
| `src/lib/filters/count-active.test.ts` | Ses tests. |
| `src/components/ui/{checkbox,accordion,sheet,slider,scroll-area,radio-group}.tsx` | Installés par la CLI shadcn, non modifiés. |

**Modifiés :**

| Fichier | Ce qui change |
| --- | --- |
| `src/styles/fonts.ts` | Ajout d'Archivo sur `--font-heading`. |
| `src/styles/globals.css` | Les deux palettes réécrites, quatre tokens ajoutés, `--font-heading` désaliasé. |
| `src/components/ui/badge.tsx` | Variant `overlay`. |
| `src/components/ui/card.tsx` | Variant sans bordure. |
| `src/features/media/components/media-card.tsx` | Les trois leviers de signature. |
| `src/components/shared/media-grid.tsx` | Palier à 8 colonnes. |
| `src/app/(app)/layout.tsx` | Conteneur élargi à `max-w-7xl`. |
| `src/components/layout/header.tsx` | Champ de recherche inline, effacé sur la coquille catalogue. |
| `src/app/(app)/search/page.tsx` · `src/app/(app)/library/page.tsx` | Passent par la coquille. |

**Supprimés en fin de parcours :** `src/app/(app)/search/_components/filter-popover.tsx`, `src/app/(app)/library/_components/library-genre-select.tsx` — remplacés par `filter-chips.tsx`. `pnpm knip` doit le confirmer.

---

### Task 1 : La police de titrage

**Files:**
- Modify: `src/styles/fonts.ts`
- Modify: `src/styles/globals.css:11` (la ligne `--font-heading: var(--font-sans);`)

**Interfaces:**
- Produces: la variable CSS `--font-heading`, consommée par la classe Tailwind `font-heading` dans toutes les tâches suivantes.

- [ ] **Step 1 : Charger Archivo**

Dans `src/styles/fonts.ts`, à côté d'Inter :

```ts
import { Archivo, Geist_Mono, Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

/**
 * Le titrage. Une grotesque large et lourde, qui donne son caractère à la direction « Obsidienne »
 * là où la couleur reste volontairement neutre — l'identité passe par la typographie et la matière,
 * pas par la teinte (docs/superpowers/specs/2026-09-02-refonte-design-ui-design.md).
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const fonts = [inter, archivo, geistMono];
export const fontVariables = fonts.map((font) => font.variable);
```

- [ ] **Step 2 : Désaliaser `--font-heading`**

Dans `src/styles/globals.css`, remplacer la ligne du bloc `@theme inline` :

```css
  --font-heading: var(--font-archivo);
```

- [ ] **Step 3 : Vérifier**

Run: `pnpm typecheck && pnpm lint`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/styles/fonts.ts src/styles/globals.css
git commit -m "feat(style): le titrage prend sa propre police"
```

---

### Task 2 : Les tokens « Obsidienne »

**Files:**
- Modify: `src/styles/globals.css` (le bloc `:root` et le bloc `.dark`, plus le bloc `@theme inline`)

**Interfaces:**
- Produces: `--overlay`, `--surface-raised`, `--ring-accent` et leurs classes Tailwind `bg-overlay`, `bg-surface-raised`, `ring-ring-accent`.

**Contexte pour l'implémenteur :** le mode sombre devient le canon, mais le mode clair reste supporté — le `ThemeToggle` existe et fonctionne. Les valeurs hexadécimales de la direction sont converties en `oklch`, comme tout le reste du fichier. Un convertisseur suffit ; les valeurs ci-dessous sont déjà converties.

- [ ] **Step 1 : Déclarer les trois nouveaux tokens dans `@theme inline`**

Ajouter dans le bloc `@theme inline`, à côté des autres `--color-*` :

```css
  --color-overlay: var(--overlay);
  --color-surface-raised: var(--surface-raised);
  --color-ring-accent: var(--ring-accent);
```

- [ ] **Step 2 : Réécrire le bloc `.dark`**

C'est le canon. Remplacer intégralement le contenu du bloc `.dark` :

```css
/* « Obsidienne » — quasi-noir neutre, accent iris. Le mode canon. */
.dark {
  --background: oklch(0.1448 0.0032 285.82);
  --foreground: oklch(0.9851 0 0);
  --card: oklch(0.1822 0.0032 285.82);
  --card-foreground: oklch(0.9851 0 0);
  --popover: oklch(0.2103 0.0038 285.87);
  --popover-foreground: oklch(0.9851 0 0);
  --primary: oklch(0.5854 0.2041 277.12);
  --primary-foreground: oklch(0.9851 0 0);
  --secondary: oklch(0.2103 0.0038 285.87);
  --secondary-foreground: oklch(0.9851 0 0);
  --muted: oklch(0.2103 0.0038 285.87);
  --muted-foreground: oklch(0.6368 0.0119 285.94);
  --accent: oklch(0.2603 0.0055 286.03);
  --accent-foreground: oklch(0.9851 0 0);
  --destructive: oklch(0.5916 0.2073 22.16);
  --border: oklch(0.2603 0.0055 286.03);
  --input: oklch(0.2603 0.0055 286.03);
  --ring: oklch(0.5854 0.2041 277.12);

  /* Le fond d'une pastille posée sur une jaquette. Il remplace le `bg-background/95` que
     media-card.tsx écrivait deux fois en dur : le contraste d'un texte sur une image quelconque
     n'est garanti par rien, donc ce fond est presque opaque, et il suit le thème. */
  --overlay: oklch(0.1448 0.0032 285.82 / 0.92);

  /* Le second niveau d'élévation. shadcn n'a que `card` ; en dark-first, une carte posée et un
     panneau flottant qui partagent la même surface s'aplatissent l'un dans l'autre. */
  --surface-raised: oklch(0.2103 0.0038 285.87);

  /* Le halo du focus clavier — le seul endroit de l'interface où quelque chose brille. */
  --ring-accent: oklch(0.5854 0.2041 277.12);

  --chart-1: oklch(0.5854 0.2041 277.12);
  --chart-2: oklch(0.6368 0.0119 285.94);
  --chart-3: oklch(0.5106 0.0093 285.94);
  --chart-4: oklch(0.3715 0.0072 285.98);
  --chart-5: oklch(0.2603 0.0055 286.03);
  --sidebar: oklch(0.1822 0.0032 285.82);
  --sidebar-foreground: oklch(0.9851 0 0);
  --sidebar-primary: oklch(0.5854 0.2041 277.12);
  --sidebar-primary-foreground: oklch(0.9851 0 0);
  --sidebar-accent: oklch(0.2603 0.0055 286.03);
  --sidebar-accent-foreground: oklch(0.9851 0 0);
  --sidebar-border: oklch(0.2603 0.0055 286.03);
  --sidebar-ring: oklch(0.5854 0.2041 277.12);
}
```

- [ ] **Step 3 : Accorder le bloc `:root` (mode clair)**

Le mode clair n'est plus le canon mais doit rester cohérent : même accent iris, même neutre, inversé.

```css
/* Le mode clair, tenu par cohérence : même accent, même neutre, inversés. */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.1448 0.0032 285.82);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.1448 0.0032 285.82);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.1448 0.0032 285.82);
  --primary: oklch(0.5106 0.2301 276.97);
  --primary-foreground: oklch(0.9851 0 0);
  --secondary: oklch(0.967 0.0029 286.35);
  --secondary-foreground: oklch(0.1448 0.0032 285.82);
  --muted: oklch(0.967 0.0029 286.35);
  --muted-foreground: oklch(0.552 0.0143 285.94);
  --accent: oklch(0.967 0.0029 286.35);
  --accent-foreground: oklch(0.1448 0.0032 285.82);
  --destructive: oklch(0.5916 0.2073 22.16);
  --border: oklch(0.92 0.0039 286.32);
  --input: oklch(0.92 0.0039 286.32);
  --ring: oklch(0.5106 0.2301 276.97);
  --overlay: oklch(1 0 0 / 0.92);
  --surface-raised: oklch(1 0 0);
  --ring-accent: oklch(0.5106 0.2301 276.97);
  --radius: 0.375rem;
  --chart-1: oklch(0.5106 0.2301 276.97);
  --chart-2: oklch(0.552 0.0143 285.94);
  --chart-3: oklch(0.4419 0.0146 285.79);
  --chart-4: oklch(0.3407 0.0134 285.81);
  --chart-5: oklch(0.2103 0.0038 285.87);
  --sidebar: oklch(0.9851 0 0);
  --sidebar-foreground: oklch(0.1448 0.0032 285.82);
  --sidebar-primary: oklch(0.5106 0.2301 276.97);
  --sidebar-primary-foreground: oklch(0.9851 0 0);
  --sidebar-accent: oklch(0.967 0.0029 286.35);
  --sidebar-accent-foreground: oklch(0.1448 0.0032 285.82);
  --sidebar-border: oklch(0.92 0.0039 286.32);
  --sidebar-ring: oklch(0.5106 0.2301 276.97);
}
```

Noter le `--radius: 0.375rem` — c'est le 6 px de la direction, contre `0.5rem` (8 px) avant. Il est déclaré une seule fois, dans `:root`, et le bloc `.dark` en hérite : ne pas le dupliquer.

- [ ] **Step 4 : Le titrage prend sa police dans `@layer base`**

Ajouter dans le bloc `@layer base` de `globals.css` :

```css
  h1, h2, h3 {
    @apply font-heading tracking-tight;
  }
```

- [ ] **Step 5 : Vérifier à l'œil**

Run: `pnpm dev`, puis ouvrir `/` et `/search` dans les deux thèmes.
Expected: fond quasi-noir, un seul élément iris par écran (le bouton principal), aucun texte secondaire coloré, angles à 6 px.

Si un texte secondaire ressort en iris, c'est un `text-primary` employé comme couleur de texte quelque part : le remplacer par `text-muted-foreground`. C'est exactement le défaut que les maquettes avaient.

- [ ] **Step 6 : Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(style): l'interface passe en Obsidienne"
```

---

### Task 3 : Les six composants shadcn

**Files:**
- Create: `src/components/ui/checkbox.tsx`, `accordion.tsx`, `sheet.tsx`, `slider.tsx`, `scroll-area.tsx`, `radio-group.tsx`

**Interfaces:**
- Produces: `Checkbox`, `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`, `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetFooter`, `Slider`, `ScrollArea`, `RadioGroup`/`RadioGroupItem`.

- [ ] **Step 1 : Installer**

```bash
pnpm dlx shadcn@latest add checkbox accordion sheet slider scroll-area radio-group
```

- [ ] **Step 2 : Ne rien modifier**

Ces fichiers héritent des tokens de la tâche 2. Ne pas les restyler : c'est la règle du spec. Vérifier seulement que le style installé est bien `radix-vega` (celui de `components.json`) et que rien d'autre n'a été touché :

Run: `git status --short`
Expected: exactement six fichiers créés sous `src/components/ui/`, plus éventuellement `package.json`/`pnpm-lock.yaml` si une dépendance Radix manquait.

- [ ] **Step 3 : Vérifier**

Run: `pnpm typecheck && pnpm lint`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "feat(ui): six composants pour les filtres avancés"
```

---

### Task 4 : Les deux variants

**Files:**
- Modify: `src/components/ui/badge.tsx` (le `cva` `badgeVariants`)
- Modify: `src/components/ui/card.tsx`

**Interfaces:**
- Produces: `<Badge variant="overlay">`, consommé par la tâche 5 ; et `<Card variant="flat">`, **qui n'a pas de consommateur dans ce plan** — les cartes de liste du second plan en sont les seules clientes. Le poser ici parce que c'est le fichier qu'on ouvre, pas parce qu'on en a besoin tout de suite ; si le second plan glisse, `pnpm knip` finira par le signaler et ce sera le bon moment pour le retirer.

**Contexte :** le spec annonçait trois variants. `Button size="icon-sm"` **existe déjà** (`button.tsx`, dans le `cva` `size`) : il n'y a rien à ajouter de ce côté. Il en reste deux.

- [ ] **Step 1 : Le variant `overlay` du Badge**

Dans le bloc `variants.variant` de `badgeVariants`, ajouter après `ghost` :

```ts
        /**
         * Une pastille posée sur une jaquette.
         *
         * Fond presque opaque, et c'est tout l'intérêt : le contraste d'un texte sur une image
         * quelconque n'est garanti par rien. `media-card.tsx` repeignait le Badge à la main pour
         * obtenir ça — trois fois, avec un commentaire d'excuse à chaque fois.
         */
        overlay: "bg-overlay text-foreground shadow-sm backdrop-blur-[2px]",
```

- [ ] **Step 2 : Le variant sans bordure de la Card**

Ouvrir `src/components/ui/card.tsx`. Si la Card n'a pas encore de `cva`, en introduire un minimal plutôt que de multiplier les `className` chez les appelants :

```ts
const cardVariants = cva("flex flex-col gap-6 rounded-xl text-card-foreground", {
  variants: {
    variant: {
      default: "border bg-card py-6 shadow-sm",
      /**
       * Sans bordure ni ombre : dans une grille dense, un liseré par carte dessine une trame qui
       * se lit avant son contenu. La séparation vient de l'espacement, pas d'un trait.
       */
      flat: "bg-transparent",
    },
  },
  defaultVariants: { variant: "default" },
});
```

Puis brancher `variant` sur le composant `Card` via `VariantProps<typeof cardVariants>`, comme le fait `badge.tsx`.

- [ ] **Step 3 : Vérifier que rien n'a bougé ailleurs**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: aucune erreur. Le `variant` par défaut doit reproduire exactement l'apparence d'avant — aucun appelant existant ne passe `variant`, donc aucun ne doit changer.

- [ ] **Step 4 : Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/card.tsx
git commit -m "feat(ui): deux variants pour les surfaces posées sur une image"
```

---

### Task 5 : La MediaCard signée

**Files:**
- Modify: `src/features/media/components/media-card.tsx`
- Modify: `src/features/media/components/media-row.tsx` (le marqueur de suivi, pour la cohérence)

**Interfaces:**
- Consumes: `<Badge variant="overlay">` (tâche 4).
- Produces: une propriété `tracked?: boolean` sur `MediaCard` et `MediaRow`, consommée par toutes les grilles (tâches 8 et suivantes).

**Contexte :** la carte est déjà très arbitrée, et ses commentaires expliquent chaque choix. **Ne pas défaire ce qui est justifié** : le « 18+ » en haut à gauche, les pastilles empilées en haut à droite, le titre sur une seule ligne, l'encart de survol déclenché par le lien, le bouton d'action rendu à côté du lien. Les trois leviers s'ajoutent, ils ne remplacent rien.

- [ ] **Step 1 : Levier 1 — le liseré interne**

Remplacer la classe du conteneur de jaquette :

```tsx
<div className="relative aspect-2/3 overflow-hidden rounded-lg bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-shadow group-hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]">
```

Le `ring-1 ring-border/60` disparaît : il dessinait un cadre **autour** de la jaquette, qui s'évanouissait sur les jaquettes sombres. Le liseré interne encastre l'image au lieu de l'encadrer.

- [ ] **Step 2 : Levier 3 — le marqueur de suivi**

Ajouter la propriété au composant :

```tsx
  /**
   * L'œuvre est-elle déjà suivie.
   *
   * C'est la seule fonction nouvelle de la refonte : dans une grille de résultats de recherche, on
   * ne voyait pas ce qu'on suit déjà. Un liseré d'accent de 2 px au bord gauche de la jaquette —
   * le coin biseauté, testé à côté, mangeait l'illustration.
   *
   * Séparé de `progress` alors que les deux vont presque toujours ensemble : une œuvre peut être
   * suivie sans progression (statut « prévu »), et c'est justement là que le marqueur sert.
   */
  tracked?: boolean;
```

Et, dans le conteneur de jaquette, juste après l'`<Image>` :

```tsx
{tracked ? (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-primary"
  />
) : null}
```

`aria-hidden` parce que l'information est déjà portée textuellement par la pastille de progression ou par `meta` : un lecteur d'écran l'annoncerait deux fois.

- [ ] **Step 3 : Levier 2 — le voile montant**

Le bloc `action` actuel pose le bouton en bas de la jaquette au survol. Le remplacer par un voile qui porte le bouton **et** la progression :

```tsx
{action || progress?.total ? (
  <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-2/3 flex-col justify-end">
    <div className="pointer-events-auto translate-y-full bg-linear-to-t from-black/85 to-transparent p-2 pt-6 opacity-0 transition-[opacity,transform] duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:translate-y-0 pointer-coarse:opacity-100">
      {progress?.total ? (
        <div
          aria-hidden="true"
          className="mb-2 h-0.5 w-full overflow-hidden rounded-full bg-white/25"
        >
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, (progress.value / progress.total) * 100)}%` }}
          />
        </div>
      ) : null}
      {action}
    </div>
  </div>
) : null}
```

L'image ne bouge plus : retirer `group-hover:scale-105` de l'`<Image>`. Cinquante jaquettes qui respirent au passage de la souris font vibrer la grille — c'est l'argument qui a écarté l'agrandissement en maquette.

`progress.value / progress.total` reprend enfin les deux nombres que la propriété portait sans les employer, ce que son commentaire actuel signale explicitement.

- [ ] **Step 4 : Les pastilles passent au variant**

Remplacer les trois `Badge` repeints à la main :

```tsx
<Badge className="pointer-events-none absolute top-1.5 left-1.5" variant="destructive">18+</Badge>
```
— non : le « 18+ » doit rester **opaque et rouge**, et `destructive` est translucide. Utiliser :
```tsx
<Badge className="pointer-events-none absolute top-1.5 left-1.5 bg-destructive font-semibold text-white" variant="overlay">
  18+
</Badge>
```

Et pour les deux pastilles du coin droit, remplacer `className="bg-background/95 text-foreground tabular-nums shadow-sm"` par `variant="overlay"` plus `className="tabular-nums"`.

- [ ] **Step 5 : Même marqueur sur `MediaRow`**

Ajouter la même propriété `tracked` et le même liseré de 2 px au bord gauche de la miniature, pour que les deux vues disent la même chose.

- [ ] **Step 6 : Vérifier à l'œil**

Run: `pnpm dev`, ouvrir `/library` (des œuvres suivies) et `/search` (mélange).
Expected: liseré iris à gauche sur les seules œuvres suivies, voile qui monte au survol sans que l'image bouge, pastilles lisibles sur jaquette claire comme sombre.

- [ ] **Step 7 : Commit**

```bash
git add src/features/media/components/media-card.tsx src/features/media/components/media-row.tsx
git commit -m "feat(media): la vignette porte enfin sa signature"
```

---

### Task 6 : La grille dense

**Files:**
- Modify: `src/components/shared/media-grid.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Produces: une grille à huit colonnes au-delà de `xl`, employée par toutes les grilles de l'app.

**Contexte, à lire avant de toucher quoi que ce soit :** le commentaire de `media-grid.tsx` pose deux contraintes, et elles tiennent toujours. **Chaque palier doit diviser `CATALOGUE_PAGE_SIZE` (24)**, sinon la page finit sur une rangée trouée qui se lit comme un chargement raté — 8 divise 24 (trois rangées pleines), 7 ne le divise pas. Et **le conteneur plafonne à `max-w-6xl`** (1152 px), où huit colonnes donneraient des vignettes de 130 px, sous le seuil de lisibilité des pastilles que le même commentaire fixe à ~150 px. Il faut donc élargir le conteneur en même temps, pas après.

- [ ] **Step 1 : Élargir le conteneur**

Dans `src/app/(app)/layout.tsx`, remplacer `max-w-6xl` par `max-w-7xl` sur le conteneur du `main`. Faire le même remplacement dans `src/components/layout/header.tsx`, sinon l'en-tête et le contenu ne s'alignent plus.

- [ ] **Step 2 : Ajouter le palier**

```ts
const GRID =
  "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
```

- [ ] **Step 3 : Mettre le commentaire à jour**

Le commentaire du fichier dit « il n'y a pas de palier au-delà : le `main` est plafonné à `max-w-6xl` ». C'est maintenant faux. Le corriger — un commentaire qui ment coûte plus cher qu'un commentaire absent :

```
 * Le palier `xl:grid-cols-8` est arrivé avec la refonte, et il a fallu élargir le `main` à
 * `max-w-7xl` pour le tenir : à `max-w-6xl`, huit colonnes donnaient des vignettes de 130 px, sous
 * le seuil de ~150 px fixé plus haut. 8 divise 24, donc la dernière rangée reste pleine — c'est la
 * même contrainte qu'avant, et c'est elle qui a écarté 7.
```

- [ ] **Step 4 : Vérifier**

Run: `pnpm dev`, ouvrir `/search` en 1440 px de large.
Expected: huit colonnes, trois rangées pleines, aucune rangée trouée en bas de page.

- [ ] **Step 5 : Commit**

```bash
git add src/components/shared/media-grid.tsx "src/app/(app)/layout.tsx" src/components/layout/header.tsx
git commit -m "feat(grille): la grille passe à huit colonnes sur grand écran"
```

---

### Task 7 : Le compteur de filtres actifs

**Files:**
- Create: `src/lib/filters/count-active.ts`
- Create: `src/lib/filters/count-active.test.ts`

**Interfaces:**
- Produces: `countActiveFilters(values: Record<string, unknown>, ignored?: string[]): number`, consommé par `filter-bar.tsx` (tâche 8) pour le libellé « Filtres · N ».

**Pourquoi une fonction pure et testée :** c'est la seule logique réelle de la coquille, et elle est facile à écrire faux — un tableau vide, une chaîne vide et `null` doivent compter pour zéro, alors que `false` sur `includeAdult` est une valeur par défaut et non un filtre. Le reste de la coquille est de l'assemblage, que le projet ne teste pas encore (STATE.md : les composants React ne sont couverts par aucun test).

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";

import { countActiveFilters } from "@/lib/filters/count-active";

describe("countActiveFilters", () => {
  it("ne compte pas les valeurs vides", () => {
    expect(
      countActiveFilters({ search: "", genres: [], status: null, seasonYear: undefined }),
    ).toBe(0);
  });

  it("compte une facette par clé renseignée, quelle que soit sa cardinalité", () => {
    expect(countActiveFilters({ genres: ["Action", "Drame"], type: "ANIME" })).toBe(2);
  });

  it("ignore les clés de pagination et de tri", () => {
    expect(
      countActiveFilters({ page: 3, sort: "POPULARITY_DESC", genres: ["Action"] }, [
        "page",
        "sort",
      ]),
    ).toBe(1);
  });

  it("ne compte pas un booléen à false", () => {
    expect(countActiveFilters({ includeAdult: false })).toBe(0);
  });

  it("compte un booléen à true", () => {
    expect(countActiveFilters({ includeAdult: true })).toBe(1);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm test count-active`
Expected: FAIL — « Failed to resolve import "@/lib/filters/count-active" ».

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
/**
 * Combien de facettes sont actives, pour le libellé « Filtres · N » de la barre.
 *
 * **Une facette renseignée compte pour un, quelle que soit sa cardinalité** : trois genres cochés
 * font une facette, pas trois. C'est ce que le bouton promet — le nombre de restrictions posées,
 * pas le nombre de valeurs — et les puces de filtres actifs disent le détail juste en dessous.
 *
 * `false` ne compte pas : c'est la valeur par défaut d'`includeAdult`, pas une restriction que
 * quelqu'un a posée. `true`, si.
 */
export function countActiveFilters(
  values: Record<string, unknown>,
  ignored: string[] = [],
): number {
  return Object.entries(values).filter(([key, value]) => {
    if (ignored.includes(key)) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
}
```

- [ ] **Step 4 : Lancer le test pour le voir passer**

Run: `pnpm test count-active`
Expected: PASS, 5 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/filters/count-active.ts src/lib/filters/count-active.test.ts
git commit -m "feat(filtres): compter les facettes actives"
```

---

### Task 8 : La coquille catalogue

**Files:**
- Create: `src/components/shared/catalogue-shell.tsx`
- Create: `src/components/shared/filter-bar.tsx`
- Create: `src/components/shared/filter-panel.tsx`
- Create: `src/components/shared/filter-chips.tsx`

**Interfaces:**
- Consumes: `countActiveFilters` (tâche 7), `Sheet`/`Accordion`/`Checkbox`/`Slider`/`ScrollArea` (tâche 3).
- Produces:
  - `CatalogueShell({ title, description, count, bar, chips, tabs, children })` — Server Component.
  - `FilterBar({ activeCount, search, controls, children })` — client, gère l'ouverture du panneau et le basculement en `Sheet` sous `lg`.
  - `FilterPanel({ children })` — la grille de trois colonnes.
  - `FilterChips({ label, options, selected, onToggle })` — client.

**Contexte :** ces quatre composants ne connaissent **aucune entité métier** — ils reçoivent des `children` et des libellés. C'est ce qui les autorise à vivre dans `components/shared/` plutôt que dans `features/media/` (ARCHITECTURE.md, les quatre maisons d'un composant). La recherche y met des facettes AniList, la bibliothèque des facettes de suivi.

- [ ] **Step 1 : `catalogue-shell.tsx`**

Server Component, aucun `"use client"`. Il rend l'en-tête d'écran (titre en `font-heading`, compteur de résultats en `text-muted-foreground`), puis les emplacements dans l'ordre du geste : barre, puces de filtres actifs, onglets facultatifs, contenu.

```tsx
export function CatalogueShell({
  title,
  count,
  bar,
  chips,
  tabs,
  children,
}: {
  title: string;
  /** Déjà formaté par l'appelant : « 1 248 résultats », « 412 œuvres ». La coquille ne compte pas. */
  count?: ReactNode;
  bar: ReactNode;
  chips?: ReactNode;
  /** Les onglets de statut de la bibliothèque. La recherche n'en a pas. */
  tabs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-heading font-semibold text-2xl tracking-tight">{title}</h1>
        {count ? <p className="text-muted-foreground text-sm">{count}</p> : null}
      </header>
      {bar}
      {chips}
      {tabs}
      {children}
    </div>
  );
}
```

Le sous-titre des deux pages actuelles (« Animes, mangas, webtoons et light novels. ») disparaît au profit du compteur : il décrivait ce que la grille montre déjà.

- [ ] **Step 2 : `filter-bar.tsx`**

`"use client"`. Une barre en `flex` : le champ de recherche qui prend la place restante, les contrôles courts (type, tri) passés en propriété, et à droite le bouton `Filtres · N` en `variant="outline"` — **pas en accent** : ce n'est pas l'action principale de l'écran, et la règle des quatre emplois s'applique. Le compte vient de `countActiveFilters`.

L'état d'ouverture du panneau est un `useState` local, **pas un paramètre d'URL** : c'est une préférence d'affichage momentanée, et la mettre dans l'URL la ferait voyager dans les liens partagés.

Sous `lg`, le même contenu part dans un `Sheet` ancré en bas, avec « Tout effacer » et un bouton d'accent « Voir les N résultats » en pied collant. Un seul rendu des facettes, monté à deux endroits selon la largeur : dupliquer le balisage garantirait qu'il diverge.

- [ ] **Step 3 : `filter-panel.tsx`**

La grille de trois colonnes qui se replie en une seule sous `md` :

```tsx
<div className="grid gap-6 rounded-lg border bg-surface-raised p-4 md:grid-cols-3 md:divide-x md:divide-border md:*:not-first:pl-6">
```

Chaque colonne porte un titre en `text-muted-foreground text-xs uppercase tracking-wide`.

- [ ] **Step 4 : `filter-chips.tsx`**

`"use client"`. Une facette en puces : `ToggleGroup` en `type="multiple"`, une puce par valeur, la puce active portant l'accent (emploi n° 2 de la règle). Au-delà de douze valeurs, la liste est enveloppée dans une `ScrollArea` de hauteur bornée.

C'est ce composant qui remplace `filter-popover.tsx` et `library-genre-select.tsx` : les deux disparaîtront en tâche 10.

- [ ] **Step 5 : Vérifier**

Run: `pnpm typecheck && pnpm lint`
Expected: aucune erreur. Rien ne consomme encore ces composants — c'est normal, `pnpm knip` les signalera comme inutilisés jusqu'à la tâche 9. Ne pas le lancer maintenant.

- [ ] **Step 6 : Commit**

```bash
git add src/components/shared/catalogue-shell.tsx src/components/shared/filter-bar.tsx src/components/shared/filter-panel.tsx src/components/shared/filter-chips.tsx
git commit -m "feat(catalogue): la coquille partagée des écrans à filtres"
```

---

### Task 9 : `/search` passe par la coquille

**Files:**
- Modify: `src/app/(app)/search/page.tsx`
- Modify: `src/app/(app)/search/_components/search-filters.tsx`
- Modify: `src/app/(app)/search/_components/active-filters.tsx`
- Modify: `src/components/layout/header.tsx`

**Interfaces:**
- Consumes: `CatalogueShell`, `FilterBar`, `FilterPanel`, `FilterChips` (tâche 8).

**Contexte :** les trois frontières `<Suspense>` de la page actuelle sont justifiées par un commentaire et **doivent être conservées** : le vocabulaire (genres, tags) est caché en jours, les résultats en heures, et les puces de filtres actifs ne lisent que l'URL — elles s'affichent donc avant qu'AniList réponde. Ne pas les fusionner en une seule.

- [ ] **Step 1 : Réécrire la page autour de la coquille**

Le corps devient un `CatalogueShell` dont `bar` reçoit le `SearchFiltersLoader` suspendu, `chips` les `ActiveFilters` hors frontière, et `children` les `SearchResults` suspendus. Le `<header>` local disparaît, la coquille le porte.

- [ ] **Step 2 : Reconstruire `search-filters.tsx` sur la barre**

Les facettes se répartissent dans les trois colonnes du panneau :
- **Type & format** — `Checkbox` pour `type` et `format`, puis les statuts d'œuvre en puces.
- **Genres & tags** — deux `FilterChips`, alimentés par `genres` et `tags` déjà reçus en propriétés.
- **Année, saison, note** — `Slider` de plage sur `seasonYear` (bornes `MIN_MEDIA_YEAR`/`MAX_MEDIA_YEAR` de `search-media.schema.ts`, soit 1940–2100), les quatre saisons en puces.

Le champ de recherche, `type` et le tri restent dans la barre compacte. Chaque changement continue de remettre `page` à 1 — c'est déjà le cas et le commentaire du fichier dit pourquoi.

- [ ] **Step 3 : Effacer le champ de l'en-tête sur cette route**

Dans `header.tsx`, le champ inline ne se rend pas quand le chemin est celui de la coquille catalogue. La comparaison se fait sur `routes.search` et `routes.library`, jamais sur une chaîne en dur. Il ne reste que l'icône, qui ouvre la palette.

C'est la correction relevée en maquette : sans ça, `/search` porte deux champs de recherche l'un au-dessus de l'autre.

- [ ] **Step 4 : Vérifier**

Run: `pnpm dev`, ouvrir `/search`, poser trois filtres, recharger la page.
Expected: les filtres survivent au rechargement (ils sont dans l'URL), le bouton affiche « Filtres · 3 », les puces actives s'affichent avant la grille, un seul champ de recherche à l'écran.

Run: `pnpm typecheck && pnpm lint && pnpm test`

- [ ] **Step 5 : Commit**

```bash
git add "src/app/(app)/search" src/components/layout/header.tsx
git commit -m "feat(recherche): la recherche entre dans la coquille catalogue"
```

---

### Task 10 : `/library` rejoint la coquille, et le double emploi disparaît

**Files:**
- Modify: `src/app/(app)/library/page.tsx`
- Modify: `src/app/(app)/library/_components/library-filters.tsx`
- Modify: `src/app/(app)/library/_components/library-results.tsx` (passer `tracked`)
- Delete: `src/app/(app)/library/_components/library-genre-select.tsx`
- Delete: `src/app/(app)/search/_components/filter-popover.tsx`

**Interfaces:**
- Consumes: tout ce que la tâche 9 a mis en place.

**Contexte :** `library-genre-filter.tsx` et `library-genre-select.tsx` ne sont pas encore commités (`git status` les donne comme non suivis). Le second est remplacé par `FilterChips` ; le premier, qui lit la base pour ne proposer que les genres réellement suivis, est conservé — il alimente désormais un `FilterChips`.

- [ ] **Step 1 : Réécrire la page autour de la coquille**

`CatalogueShell` avec `tabs` qui reçoit le `LibraryStatusNav` suspendu — c'est la seule différence structurelle avec `/search`, et elle est portée par un emplacement prévu pour ça. Conserver les trois frontières `<Suspense>` et la hauteur exacte des replis, qui évite un décalage de la grille à l'arrivée des compteurs.

- [ ] **Step 2 : Les facettes propres à la bibliothèque**

Mêmes trois colonnes, contenu différent : mon statut de suivi, ma note (`Slider`), la progression. Les genres viennent de `LibraryGenreFilter`.

- [ ] **Step 3 : Toutes les vignettes de la bibliothèque sont suivies**

Dans `library-results.tsx`, passer `tracked` à chaque `MediaCard` — une entrée de bibliothèque est par définition suivie. Faire de même partout où une grille rend des œuvres dont on connaît le suivi : `dashboard.tsx`, `list-detail.tsx`, et `search-results.tsx` (qui dispose de `getEntryStatesFor`).

C'est le point que les maquettes avaient oublié : le marqueur n'existait que sur sa propre planche.

- [ ] **Step 4 : Supprimer les deux composants remplacés**

```bash
git rm "src/app/(app)/search/_components/filter-popover.tsx"
rm "src/app/(app)/library/_components/library-genre-select.tsx"
```

- [ ] **Step 5 : Vérifier qu'il ne reste rien de mort**

Run: `pnpm knip`
Expected: aucun signalement. S'il en reste, c'est un composant que la coquille a rendu inutile — le supprimer plutôt que de l'exempter.

- [ ] **Step 5 bis : Repasser les quatre états que la coquille doit encore servir**

Le spec les liste comme non négociables, et ils existent déjà dans le code — il s'agit de vérifier que la coquille ne les a pas cassés, pas de les réécrire :

| État | Comment le provoquer |
| --- | --- |
| chargement | recharger `/search` en bridant le réseau ; les squelettes doivent occuper la place exacte de la grille |
| zéro résultat | chercher une chaîne absurde ; l'état vide doit rappeler les filtres actifs |
| bibliothèque vide | un compte sans entrée, ou `/library?status=DROPPED` sur un compte qui n'en a pas |
| catalogue injoignable | couper le réseau ou forcer une erreur dans `tryAniList` ; `catalogue-unavailable.tsx` doit s'afficher **sans** que la page tombe sur `app/error.tsx` |

Le dernier est celui qu'on ne voit jamais tourner, et c'est précisément pour ça que STATE.md le donne comme prochain chantier de test.

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: tout passe. `pnpm build` doit toujours annoncer ses pages en rendu partiel.

- [ ] **Step 6 : Mettre `docs/STATE.md` à jour dans ce commit**

C'est la règle du projet : STATE.md se met à jour dans le commit qui le périme. Ce qui change — `/search` et `/library` partagent désormais une coquille, la date du contrôle de santé, et le prochain pas, qui redevient « poser Playwright ».

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat(bibliotheque): les deux ecrans de catalogue n'en font plus qu'un"
```

---

## Ce que ce plan ne fait pas

La fiche `/media/[id]` en deux colonnes, `/lists` et sa mosaïque, `/lists/[id]`, et l'accueil font l'objet d'un **second plan**, écrit une fois celui-ci passé. Ils dépendent tous du vocabulaire posé ici (tokens, MediaCard signée, grille dense) et n'ont aucune dépendance entre eux — les écrire maintenant produirait des tâches périmées avant d'être exécutées.

L'accueil vient en dernier de ce second plan, comme prévu depuis le début : il ne fait qu'assembler ce que les autres écrans définissent.
