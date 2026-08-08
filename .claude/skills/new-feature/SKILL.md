---
name: new-feature
description: Scaffold a new domain feature in this project following docs/ARCHITECTURE.md — creates src/features/<domaine>/ with components, server queries/actions, hooks, schemas, and wires the route. Use when adding a new business domain, a new page backed by data, or when asked "crée la feature X", "ajoute le domaine X", "nouvelle page X".
---

# Créer une feature

Ce projet suit une architecture hybride décrite dans `docs/ARCHITECTURE.md`. Lire ce fichier
avant toute chose — ce qui suit en est la procédure d'application, pas un résumé complet.

## Avant de créer quoi que ce soit

**Ne pas créer un dossier `features/` par anticipation.** Poser d'abord la question :

- Le composant sert-il **une seule** route ? → il va dans `app/**/_components/`, point final.
  Pas de feature.
- Sert-il plusieurs routes, ou manipule-t-il des données d'un domaine ? → feature justifiée.

Si le besoin n'est pas clair, commencer par `_components/` et promouvoir plus tard. C'est la
règle de promotion : on ne remonte un fichier que quand un deuxième appelant existe vraiment.

## Procédure

### 1. Nommer le domaine

`kebab-case`, singulier ou pluriel selon ce qui se lit le mieux (`lists`, `profile`, `billing`).
Le nom du domaine sert de préfixe à tous les fichiers de `server/`.

### 2. Créer l'arborescence

Ne créer que les dossiers réellement utilisés. Une feature avec juste des composants n'a pas
besoin de `hooks/` vide.

```
src/features/<domaine>/
├── components/
├── server/
│   ├── <domaine>.queries.ts
│   └── <domaine>.actions.ts
├── hooks/
├── schemas/
│   └── <domaine>.schema.ts
├── lib/
└── types.ts
```

### 3. Écrire les fichiers `server/`

`queries.ts` — lectures. Ouvre **toujours** par `import "server-only";` :

```ts
import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function getItems() {
  return prisma.item.findMany();
}
```

`actions.ts` — mutations. Ouvre par `"use server";` et passe **toujours** par `actionClient`
(next-safe-action). Ne jamais écrire une Server Action à la main : elle renverrait une
exception brute au client.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/config/routes";
import { createItemSchema } from "@/features/<domaine>/schemas/<domaine>.schema";
import { actionClient } from "@/lib/safe-action";

export const createItem = actionClient
  .metadata({ actionName: "createItem" })
  .inputSchema(createItemSchema)
  .action(async ({ parsedInput }) => {
    // parsedInput est déjà validé et typé
    // logique métier → features/<domaine>/lib/ si elle grossit

    revalidatePath(routes.<domaine>.root);
    return { id: "..." };
  });
```

Notes qui font perdre du temps si on les rate :

- La méthode est `.inputSchema()` en v8 — `.schema()` est l'API v7 et n'existe plus.
- `.metadata({ actionName })` est **obligatoire** : le client déclare un schéma de métadonnées.
- Le client `flattened` renvoie `validationErrors.fieldErrors` / `.formErrors`.
- Une action qui exige une session utilisera `authActionClient` une fois Better Auth branché.

Côté client, consommer avec `useAction` / `useHookFormAction`, pas un appel direct.

**Ne jamais exporter du code server et du code client depuis le même fichier.**

### 4. Valider avec Zod

Ce projet utilise Zod pour la validation. Il n'y a **pas** de dossier `src/types/` : les types
sont dérivés des schémas avec `z.infer`, pas déclarés en double.

```ts
import { z } from "zod";

export const createItemSchema = z.object({
  title: z.string().min(1).max(120),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
```

### 5. Écrire les composants

Server Component par défaut. `"use client"` uniquement sur la feuille interactive — un
formulaire, un dialog, un composant qui utilise un hook navigateur. Jamais sur la page qui
la contient.

Quand un composant client doit envelopper du contenu serveur, passer ce contenu en `children`
plutôt que de convertir tout le sous-arbre.

### 6. Ajouter les routes

1. Ajouter les URLs dans `src/config/routes.ts`. **Aucun chemin en dur ailleurs.**
2. Si la route apparaît dans la navigation, l'ajouter à `src/config/navigation.ts` en
   référençant `routes`, jamais une string.
3. Créer `src/app/(app)/<segment>/page.tsx` qui importe depuis la feature. La page reste
   mince : elle compose, elle ne contient pas de logique.

### 7. Vérifier

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Le hook Biome formate déjà chaque fichier écrit, mais il ne remplace pas le typecheck.

## Rappels qui coûtent cher si oubliés

- Pas de barrel `index.ts` dans `features/` — casse le tree-shaking et brouille la frontière
  server/client.
- Un seul alias d'import : `@/*`. Pas de `../../`.
- `kebab-case` pour tous les fichiers et dossiers.
- Les primitives viennent de `components/ui/` via `pnpm dlx shadcn add <composant>` — on ne les
  écrit pas à la main.
- Jamais de `process.env.X` : passer par `import { env } from "@/config/env"`. Une nouvelle
  variable se déclare dans `src/config/env.ts` (et dans `experimental__runtimeEnv` si elle est
  `NEXT_PUBLIC_`).
- Les appels HTTP sortants passent par up-fetch (skill `upfetch`), pas par `fetch` nu : le
  schéma de réponse est validé comme le reste.
