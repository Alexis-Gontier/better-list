---
paths:
  - "src/lib/http/**"
  - "src/features/media/**"
  - "src/features/people/**"
---

# AniList

Toute nouvelle lecture passe par la skill `anilist-read`. Les pièges qui ne se voient pas dans le code :

- Chaque lecture porte `"use cache"` + `cacheLife` + `cacheTag`. Elle valide ses entrées **avant**
  d'entrer dans le cache et n'y filtre rien par utilisateur (`includeAdult` reste hors de la clé).
- **Une panne se rattrape hors du `"use cache"`** (`tryAniList`). Si la fonction cachée renvoyait
  `null`, ce `null` serait mis en cache et l'écran resterait vide même après le retour de l'API.
- **Une erreur ne traverse pas `"use cache"` intacte** : en développement, `name` et `message`
  survivent ; **en production, seul le `digest`**. La panne se lit donc dans le `digest` posé à la
  construction (`isAniListOutage`), jamais par `instanceof` ni par le seul `name` (D51).
- Le quota est de 30 requêtes par minute, partagé entre les visiteurs et le cron.
- Sans en-tête `Referer`, AniList répond 403 « API temporarily disabled ». Le message est trompeur :
  l'API n'est pas coupée. Le test `anilist.test.ts` vérifie que l'en-tête est bien envoyé.
- `pageInfo.total` est plafonné à 5000 : c'est une limite, pas un compte. Au plafond, se fier à
  `hasNextPage`.
- `volumes` vaut `null` pour toute série encore en parution.
