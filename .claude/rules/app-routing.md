---
paths:
  - "src/app/**"
---

# `src/app/` — le routing seulement

- Un fichier de `app/` est une convention Next (`page`, `layout`, `route`, `error`…) ou vit dans un
  dossier privé `_components/` / `_lib/` colocalisé. Aucun code métier réutilisable : il va dans
  `src/features/<domaine>/`.
- Un composant ou un helper démarre dans le `_components/` / `_lib/` de sa route. Il ne monte dans
  `features/` qu'au **deuxième appelant réel**.
- `"use client"` ne se pose jamais sur une `page.tsx` ou un `layout.tsx` (le hook refuse). On le
  pose sur la feuille interactive et on passe le contenu serveur en `children`.
- **Pas de `loading.tsx` de segment.** Chaque zone qui attend porte son propre `<Suspense>`, avec un
  squelette nommé d'après elle et fidèle au pixel près (`text-sm` = 20 px → `h-5`). La page n'`await`
  pas `searchParams` : elle passe la promesse à ses enfants.
- La garde est `requireApprovedUser()` dans `app/(app)/layout.tsx`, **une seule fois**. Ne pas la
  répéter page par page.
- `export const instant = false` seulement sur un segment qui dépend de l'identité du visiteur.
- Toute destination de redirection venue de l'URL passe par `safeRedirectPath`, au moment où on
  l'utilise.

Décisions liées : D25 (garde) et D29 (chargement), dans [decisions.md](../../docs/decisions.md).
