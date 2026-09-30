# Favoris — design

> Demande d'Alexis, 30 septembre 2026 : « qu'on puisse liker media, staff, character et que ça
> s'affiche sur le profil, comme AniList dans l'idée ».

## Décisions

| Question | Décision | Pourquoi |
| --- | --- | --- |
| Liker une œuvre hors bibliothèque ? | **Oui** — table dédiée, indépendante d'`Entry` | Comme AniList ; un seul mécanisme pour les trois types |
| `Entry.favorite` | **Supprimé** | Jamais écrit (STATE.md) ; deux sources de vérité sinon |
| Ordre sur le profil | **Ordre d'ajout, récents d'abord** | Pas d'écran de tri ; une colonne `position` s'ajoutera si le besoin vient |
| Nom et image d'un personnage / staff | **Instantané au like** | Le profil ne fait aucune requête AniList et survit à une panne |

## 1. Données

```prisma
enum FavoriteKind {
  MEDIA
  CHARACTER
  STAFF
}

model Favorite {
  id        String       @id @default(cuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      FavoriteKind
  /// L'id AniList de l'œuvre, du personnage ou du staff.
  anilistId Int

  /// Rempli pour `MEDIA` seulement : clé étrangère vers le miroir, garantie par
  /// `ensureMediaMirror` avant l'écriture. Titre, jaquette et type se lisent là.
  mediaId Int?
  media   Media? @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  /// Instantané pris au like, pour `CHARACTER` et `STAFF`. Nul pour `MEDIA`.
  name  String?
  image String?

  createdAt DateTime @default(now())

  @@unique([userId, kind, anilistId])
  @@index([userId, kind, createdAt])
  @@map("favorites")
}
```

Même migration : `Entry.favorite` disparaît, avec ses traces dans `tracking.schema.ts`,
`entry-draft.ts` (et son test) et `library.queries.ts`.

## 2. Feature `src/features/favorites/`

- `schemas/favorites.schema.ts` — `toggleFavoriteInput` : union discriminée sur `kind`.
  `MEDIA` → `{ kind, anilistId }` ; `CHARACTER | STAFF` → `{ kind, anilistId, name, image }`,
  `image` étant une URL `https://…anili.st/…` ou nulle. Types dérivés par `z.infer`.
- `server/favorites.actions.ts` (`"use server"`) — `toggleFavoriteAction` via `authActionClient` :
  si la ligne existe, la supprime ; sinon `ensureMediaMirror` (pour `MEDIA`) puis la crée.
  Renvoie `{ favorite: boolean }`. Revalide le profil de l'auteur.
- `server/favorites.queries.ts` (`import "server-only"`) —
  - `isFavorite(userId, kind, anilistId)` : l'état initial du bouton ;
  - `getProfileFavorites(userId, { includeAdult })` : les lignes, jointure `media`, triées par
    `createdAt desc`, filtre 18+ appliqué sur le miroir.
- `lib/favorites-groups.ts` — fonction pure qui répartit les lignes en
  `{ anime, manga, characters, staff }` (le type anime/manga vient de `media.type`).
- `components/favorite-button.tsx` (`"use client"`) — cœur, `useOptimistic` + `useAction`,
  état initial reçu du parent serveur ; en échec, l'optimisme retombe et un toast le dit.

## 3. Points d'entrée

- **Fiche œuvre** (`app/(app)/media/[id]`) : le bouton à côté de la barre d'actions de suivi.
- **`/character/[id]` et `/staff/[id]`** : le bouton dans `PersonHeader`, près du compteur de
  favoris AniList. Le parent serveur passe `name` et `image` qu'il a déjà en main.
- Pas de bouton sur les cartes de grille (hors périmètre).

## 4. Profil `/u/[username]`

Nouvelle section « Favoris », dans son propre `<Suspense>` avec squelette. Quatre sous-blocs —
Anime, Manga, Personnages, Staff — en grille de vignettes (image + nom au survol), chacune
liée à sa route via `src/config/routes.ts`. Un sous-bloc vide est masqué ; la section entière si
tout est vide. Visible par les autres membres, comme le reste du profil ; le filtre 18+ suit les
préférences de celui qui regarde.

## 5. Erreurs

- Profil : aucune lecture externe, rien à rattraper.
- Like d'une œuvre : `ensureMediaMirror` peut échouer (AniList en panne) → l'action renvoie une
  erreur serveur, le bouton revient à son état, toast.
- Double clic : la contrainte unique protège ; l'action est idempotente dans son effet final.

## 6. Tests

- `favorites.schema.test.ts` : l'union accepte chaque forme, refuse une image hors AniList, refuse
  un `name` manquant pour un personnage.
- `favorites-groups.test.ts` : répartition anime/manga/personnages/staff, ordre conservé.
- Lint, typecheck, knip, build verts ; vérification manuelle du like sur les trois pages et de
  l'affichage du profil.

## Hors périmètre

Réorganisation des favoris, favoris de studios, bouton sur les cartes, compteur de favoris du
cercle sur la fiche.
