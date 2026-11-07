# Ordre de visionnage d'une franchise — conception

Chantier de `conception.md` §6.5 (§8 : « l'ordre de visionnage d'une franchise, à partir des
`relations` AniList »). Validé avec Alexis le 7 novembre 2026.

## Ce que voit le membre

Un onglet **« Ordre »** sur la fiche, entre « Aperçu » et « Personnages ». C'est la franchise dans
l'ordre où la regarder (ou la lire), **dans la grille de cartes d'« Œuvres liées »** : même carte
(`CatalogueMediaCard`, avec ma pastille et la fenêtre d'édition), et sous chaque carte une étiquette
qui remplace le type de lien.

- Maillon de la chaîne : « N° 3 ». L'œuvre de la fiche : « N° 3 · Vous êtes ici », en couleur
  primaire.
- Histoire parallèle : « Facultatif », juste après le maillon auquel elle se rattache, non numérotée.
- Titre du bloc : « Ordre de visionnage » pour un anime, « Ordre de lecture » sinon.
- Si le parcours a été coupé, une phrase sous la grille : « Franchise tronquée » (plafond) ou
  « Liste incomplète » (AniList n'a pas tout rendu).

La grille plutôt qu'une liste verticale : elle se lit dans l'ordre de lecture, et la fiche garde une
seule forme de carte pour ses deux onglets d'œuvres.

**L'onglet n'existe que si la fiche a au moins une relation `PREQUEL` ou `SEQUEL`**, ce qui se lit
dans la requête de fiche, sans requête de plus (`_lib/media-panels.ts`, comme `hasRelated`).

## Périmètre de la franchise

- **La chaîne principale** : on suit `PREQUEL` et `SEQUEL` dans les deux sens, de proche en proche,
  jusqu'à épuisement ou jusqu'au plafond.
- **Les parallèles** : les `SIDE_STORY` de chaque maillon de la chaîne sont collectées, mais **ne
  sont pas explorées** à leur tour.
- Hors périmètre : `SPIN_OFF`, `ALTERNATIVE`, `ADAPTATION`, `SOURCE`, `PARENT`, `CHARACTER`,
  `SUMMARY`, `COMPILATION`, `CONTAINS`, `OTHER`. Ils restent dans l'onglet « Œuvres liées ».
- Filtre 18+ : appliqué **après** le cache, comme `visibleRelations`. Une œuvre adulte masquée
  disparaît de la liste sans couper la chaîne (ses suites restent).

## Parcours (approche retenue : par niveaux, en lots)

`src/features/media/server/franchise.queries.ts`, `getFranchise(mediaId)` :

1. Niveau 0 : les relations de l'œuvre, lues par la requête de fiche (`getMediaById`, déjà en cache)
   pour ne rien dépenser.
2. Niveau n : les maillons de chaîne **nouveaux** du niveau précédent partent en **une** requête
   `Page(perPage: 50) { media(id_in: [...]) { id relations { edges { relationType node {
   ...MediaCompactFields } } } } }`. Au-delà de 50 identifiants, le niveau coûte une requête par
   tranche de 50.
3. Un ensemble `seen` des identifiants empêche de revisiter une œuvre (AniList a des cycles et des
   arêtes en double sens).
4. **Plafond** : au plus **6 requêtes** et **80 œuvres** par parcours. Au-delà, on s'arrête et le
   résultat porte `truncated: true`.
5. Cache : **par niveau**, pas par franchise. `fetchFranchiseLevel(ids)` porte `"use cache"` et
   `cacheLife("weeks")`, avec les ids triés pour la clé. Le parcours, lui, n'est pas caché : il
   recompose la franchise depuis des niveaux déjà en cache.
6. **Échec en cours de route** (limite de débit, panne) : `tryAniList` rend `null`, le parcours
   s'arrête et rend ce qu'il a avec `incomplete: true`. Seuls les niveaux réussis sont en cache,
   donc un résultat partiel ne survit pas à la panne. Le niveau 0 vient de la fiche : l'onglet a
   toujours au moins les voisins directs.

Coût : la longueur de la chaîne, pas sa largeur. Une série de 10 saisons coûte au pire 5 à
6 requêtes, puisque le parcours avance dans les deux sens à la fois. Le budget est de 30 par minute,
partagé.

## Ordonnancement (fonction pure)

`src/features/media/lib/franchise-order.ts`, `orderFranchise(graph, currentId)` → liste ordonnée de
`{ media, role: "main" | "side", position: number | null, current: boolean }` :

1. La chaîne principale forme un graphe orienté par les arêtes `SEQUEL` (et `PREQUEL` inversées).
   Tri topologique ; à égalité (bifurcation, deux suites d'un même maillon), départage par
   `seasonYear` puis `id` (l'id AniList croît avec la date d'ajout). Un `seasonYear` nul passe en
   dernier.
2. Un cycle (aucun maillon prêt alors qu'il en reste) est coupé de façon déterministe : on place
   le maillon restant le mieux classé par le même départage.
3. Chaque parallèle se place juste après son maillon de rattachement. Rattachée à plusieurs
   maillons, elle va après le premier dans l'ordre. Plusieurs parallèles d'un même maillon sont
   triées par `seasonYear` puis `id`.
4. Une parallèle qui est aussi un maillon de la chaîne reste un maillon.

## Fichiers

- `src/features/media/server/media.documents.ts` : document `FRANCHISE_LEVEL_QUERY`.
- `src/features/media/schemas/media.schema.ts` : schéma de la réponse par niveau.
- `src/features/media/server/franchise.queries.ts` : `getFranchise`.
- `src/features/media/lib/franchise-order.ts` (+ `.test.ts`) : l'ordonnancement.
- `src/features/media/lib/franchise-walk.ts` (+ `.test.ts`) : le parcours, lecteur de niveau injecté.
- `src/app/(app)/media/[id]/_lib/media-tab-params.ts` : onglet `ordre`, libellé « Ordre ».
- `src/app/(app)/media/[id]/_lib/media-panels.ts` : `hasFranchise(media)`.
- `src/app/(app)/media/[id]/_components/media-franchise.tsx` : le panneau (composant serveur).
- `src/app/(app)/media/[id]/page.tsx` : branchement de l'onglet.
- `docs/conception.md` §5, §6, §8 ; `docs/decisions.md` (D68) ; maquette
  `docs/design/` (D54).

## Tests

- `franchise-order.test.ts` : chaîne linéaire, chaîne vue depuis le milieu, bifurcation, cycle,
  parallèles (simple, multiple, double rattachement, parallèle qui est aussi maillon), 18+ masqué
  sans rupture.
- `franchise-walk.test.ts`, avec un lecteur de niveau simulé : nombre de requêtes par niveau, découpage par tranches
  de 50, plafond de 6 requêtes et 80 œuvres, `incomplete` sur une limite de débit, pas d'exploration
  des parallèles.
- À l'écran, en 1440 et 390 px : *L'Attaque des Titans* (chaîne longue, parallèles), une œuvre
  sans suite (pas d'onglet), un manga.
