---
paths:
  - "src/components/**"
  - "src/features/*/components/**"
---

# Où vit un composant

Quatre maisons, sans recouvrement :

| Dossier | Contenu | Connaît le métier ? |
| --- | --- | --- |
| `components/ui/` | primitives shadcn, générées (`pnpm dlx shadcn add`) | non |
| `components/layout/` | le chrome : en-tête, nav, menus du shell | non |
| `components/shared/` | composites réutilisables assemblés depuis `ui/` | non |
| `features/<d>/components/` | UI qui manipule une entité du domaine | oui |

- Dès qu'un composant connaît `Entry`, `Media`, `List`… il quitte `shared/` ou `layout/` pour
  `features/`.
- Server Component par défaut. `"use client"` seulement sur l'îlot interactif.
- Après chaque `shadcn add` : relire `git diff package.json`. Le CLI a déjà ajouté deux fois un
  paquet parasite `cn`, et il ne réécrit pas toujours l'import `@/lib/utils`.
- Visuel : la jaquette est la seule chose colorée de l'écran. L'accent n'a que quatre emplois
  autorisés, et shadcn ne se restyle pas ([decisions.md](../../docs/decisions.md), D33 à D36).
