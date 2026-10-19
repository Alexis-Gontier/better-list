---
paths:
  - "src/features/*/server/**"
  - "src/features/*/lib/**"
  - "src/app/api/**"
  - "src/lib/**"
---

# Côté serveur : lectures, actions, route handlers

- `*.queries.ts` commence par `import "server-only";`, `*.actions.ts` par `"use server"`. Un helper
  de `features/*/lib/` dont **tous** les consommateurs sont dans `server/` porte aussi
  `import "server-only";`.
- Ne jamais exporter du code serveur et du code client depuis le même fichier.
- Toute Server Action passe par `actionClient`, ou `authActionClient` si elle exige un membre
  connecté (`@/lib/safe-action`). C'est next-safe-action **v8** :
  `.metadata({ actionName }).inputSchema(schema).action(...)`. `.schema()` est l'API v7.
- Une action reste mince : le schéma valide, le corps orchestre, on revalide. Au-delà d'environ 20
  lignes, la logique descend dans `features/<d>/lib/`.
- **Une lecture demandée par un composant client passe par un route handler `GET`**, pas par une
  action : une action est un POST que Next exécute l'une après l'autre, et qu'on ne peut pas annuler.
- **Un route handler porte sa propre garde** (session approuvée, ou `Bearer $CRON_SECRET` comparé
  en temps constant). Il répond `401`, jamais par un `redirect()`.
- Une écriture qui fait avancer la progression d'une `Entry` journalise un `EntryEvent` **dans la
  même transaction**. Toute écriture qui pointe vers `Media` passe d'abord par `ensureMediaMirror`.
- Après un refactor qui touche des Server Actions : **redémarrer `next dev`**. Les identifiants
  d'action sont générés à la compilation, et un bundle client périmé peut appeler la mauvaise action.
- `src/lib/` est rangé par sujet (`auth/`, `db/`, `http/`, `security/`). Seuls `utils.ts` et
  `safe-action.ts` restent à la racine.
