# Ordre de visionnage d'une franchise — conception

Chantier de `conception.md` §6.5 (§8 : « l'ordre de visionnage d'une franchise, à partir des
`relations` AniList »). Validé avec Alexis le 7 novembre 2026.

## Ce que voit le membre

Un onglet **« Ordre »** sur la fiche, entre « Aperçu » et « Personnages ». C'est une liste numérotée
verticale de la franchise dans l'ordre où la regarder (ou la lire) :

```
1. Saison 1 · TV · 2013                    ✓ Terminé
   ↳ OAV · facultatif
2. Saison 2 · TV · 2017                    ← Vous êtes ici
3. Saison 3 · TV · 2018
```

- Chaque ligne : jaquette, titre (selon la préférence de langue), format, année, et ma pastille de
  statut avec la fenêtre d'édition (`CatalogueMediaCard` ou son équivalent en ligne).
- L'œuvre de la fiche est marquée « Vous êtes ici ».
- Les histoires parallèles sont en retrait, sous le maillon auquel elles se rattachent, et marquées
  « facultatif ».
- Si le parcours a été coupé (plafond ou panne AniList), une mention en bas de liste le dit :
  « Franchise tronquée » ou « Incomplet, AniList n'a pas tout rendu ».

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
5. Cache : `"use cache"` + `cacheLife("weeks")` + `cacheTag` par œuvre, clé `mediaId`. Une franchise
   vue depuis deux fiches coûte deux parcours : c'est accepté pour une dizaine de comptes.
6. **Échec en cours de route** (limite de débit, réseau) : on rend ce qui a été lu avec
   `incomplete: true`, et ce résultat **n'est pas mis en cache**. Le parcours est donc fait par une
   fonction non cachée, enveloppée par la fonction cachée qui lève une erreur sur un résultat
   incomplet. Elle est rattrapée hors du cache pour rendre la version partielle, sur le modèle de ce
   que `anilist.ts` documente sur les `null` mis en cache. Si rien n'a pu être lu, `null` :
   l'onglet affiche `TabUnavailable`.

Coût : la longueur de la chaîne, pas sa largeur. Une série de 10 saisons coûte au pire 5 à
6 requêtes, puisque le parcours avance dans les deux sens à la fois. Le budget est de 30 par minute,
partagé.

## Ordonnancement (fonction pure)

`src/features/media/lib/franchise-order.ts`, `orderFranchise(graph, currentId)` → liste ordonnée de
`{ media, role: "main" | "side", parentId? }` :

1. La chaîne principale forme un graphe orienté par les arêtes `SEQUEL` (et `PREQUEL` inversées).
   Tri topologique ; à égalité (bifurcation, deux suites d'un même maillon), départage par
   `seasonYear` puis `id` (l'id AniList croît avec la date d'ajout). Un `seasonYear` nul passe en
   dernier.
2. Un cycle restant est coupé de façon déterministe : on retire l'arête qui revient vers l'œuvre de
   plus petit id déjà placée.
3. Chaque parallèle se place juste après son maillon de rattachement. Rattachée à plusieurs
   maillons, elle va après le premier dans l'ordre. Plusieurs parallèles d'un même maillon sont
   triées par `seasonYear` puis `id`.
4. Une parallèle qui est aussi un maillon de la chaîne reste un maillon.

## Fichiers

- `src/features/media/server/media.documents.ts` : document `FRANCHISE_LEVEL_QUERY`.
- `src/features/media/schemas/media.schema.ts` : schéma de la réponse par niveau.
- `src/features/media/server/franchise.queries.ts` : `getFranchise`.
- `src/features/media/lib/franchise-order.ts` (+ `.test.ts`).
- `src/app/(app)/media/[id]/_lib/media-tab-params.ts` : onglet `ordre`, libellé « Ordre ».
- `src/app/(app)/media/[id]/_lib/media-panels.ts` : `hasFranchise(media)`.
- `src/app/(app)/media/[id]/_components/media-franchise.tsx` : le panneau (composant serveur).
- `src/app/(app)/media/[id]/page.tsx` : branchement de l'onglet.
- `docs/conception.md` §5, §6, §8 ; `docs/decisions.md` (nouvelle décision) ; maquette
  `docs/design/` (D54).

## Tests

- `franchise-order.test.ts` : chaîne linéaire, chaîne vue depuis le milieu, bifurcation, cycle,
  parallèles (simple, multiple, double rattachement, parallèle qui est aussi maillon), 18+ masqué
  sans rupture.
- `franchise.queries` avec AniList simulé : nombre de requêtes par niveau, découpage par tranches
  de 50, plafond de 6 requêtes et 80 œuvres, `incomplete` sur une limite de débit, pas d'exploration
  des parallèles.
- À l'écran, en 1440 et 390 px : *L'Attaque des Titans* (chaîne longue, parallèles), une œuvre
  sans suite (pas d'onglet), un manga.
