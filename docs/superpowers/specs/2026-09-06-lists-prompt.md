# Prompt de séance — les listes

Le brief d'ouverture de la branche `/lists`, écrit le 6 septembre 2026, à la fin de la séance qui a
livré l'édition rapide du suivi et les deux premières Server Actions du dépôt.

**Il se périme.** Il décrit l'état du dépôt à un instant précis — trois écrans réels, aucun remote
git, `removeEntry` sans appelant. Avant de l'envoyer, vérifier que
[docs/STATE.md](../../STATE.md) dit toujours la même chose ; si les deux se contredisent, c'est
STATE.md qui a raison.

Même convention que [le prompt du 2 septembre](./2026-09-02-refonte-design-ui-prompt.md) : le texte
à envoyer est dans le bloc ci-dessous.

---

````
On continue la refonte de Better-List : au tour des **listes**.

## Avant tout : lis la doc du dépôt

`CLAUDE.md` à la racine, puis `docs/STATE.md` (où on en est), `docs/ARCHITECTURE.md` (les règles
non négociables), et **`docs/PRODUCT.md` §4.4** (le modèle `List` / `ListItem` / `ListView`) **et
§6** (pourquoi les vues sont reportées — c'est une décision, pas un retard).

Lis aussi le paragraphe « Les listes » de
`docs/superpowers/specs/2026-09-02-refonte-design-ui-design.md`. Il dit deux choses :

- `/lists` — grille de cartes de liste avec **un aperçu en mosaïque des quatre premières
  jaquettes**. La carte est textuelle aujourd'hui : « dans une app d'images, une liste sans image
  ne donne pas envie d'être ouverte ».
- `/lists/[id]` — la coquille de grille du catalogue, plus les poignées de réordonnancement et la
  barre d'actions de liste.

## L'état du dépôt

`main` porte tout, l'arbre est propre, les cinq vérifications sont vertes. **Trois écrans réels** :
`/search`, `/library`, `/media/[id]`. **Le dépôt enregistre depuis le 6 septembre** — `saveEntry` et
`removeEntry` sont ses deux premières Server Actions.

**Il n'y a aucun remote git.** Pas de push possible tant qu'on n'en ajoute pas un.

## Ce qui existe déjà, et qu'il ne faut surtout pas réécrire

C'est la particularité de cette branche : **presque toute la logique est là, testée, et gelée dans
`knip.jsonc` en attendant précisément cet écran.**

| Fichier | Ce qu'il porte |
| --- | --- |
| `features/lists/schemas/lists.schema.ts` | **Les sept entrées d'action**, déjà écrites : `createList`, `updateList`, `deleteList`, `shareList`, `addToList`, `removeFromList`, `reorderListItem`. Gelé en `["files"]` — il sort du gel avec les actions. |
| `features/lists/lib/list-reorder.ts` | `rankAfterMove`, **testé**. C'est le calcul qui se trompe d'une case, isolé exprès. `server-only`. |
| `features/lists/lib/share-token.ts` | `generateShareToken`, **testé**. 144 bits de `randomBytes`. `server-only`, et c'est une garde, pas une hygiène. |
| `@dnd-kit` | Au `package.json`, gelé dans `ignoreDependencies` — il sort avec le réordonnancement. |

Lis ces trois fichiers avant d'écrire quoi que ce soit : leurs docstrings portent des décisions déjà
prises (le rang calculé **par le serveur** et jamais reçu du client, le jeton qui n'entre jamais par
le navigateur, le partage qui a ses propres actions et ne se mêle pas au renommage).

Et le modèle de Server Action est posé : lis `features/tracking/server/tracking.actions.ts`.

## Ce qu'on réutilise, et qui ne doit pas être redessiné

`components/shared/` : `catalogue-grid`, `catalogue-pagination`, `filter-bar`.
`features/media/components/media-card` porte deux slots — `marker` (la pastille de statut) et
`action` (le bouton posé sur la jaquette). `features/tracking/components/` porte `entry-quick-edit`
et `entry-status-dot`.

Une liste est une grille d'œuvres : **elle a droit à la même carte, la même pastille et la même
fenêtre d'édition que le catalogue.** Si tu réécris une carte, c'est que quelque chose ne va pas.

## ⚠️ Cinq pièges propres à cette branche

**1. `ListItem` porte une clé étrangère vers `Media`.** Ajouter une œuvre à une liste depuis
`/search` échouera en base si l'œuvre n'est pas au miroir. **`ensureMediaMirror(mediaId)` avant
toute écriture qui pointe vers `Media`** — c'est écrit dans `media.mirror.ts`, et c'est exactement
le piège que le suivi a rencontré.

**2. Le partage tient dans une seule colonne, et c'est une décision.** `shareToken` nul = non
partagée. Il n'y a **pas** d'énumération `visibility` — elle a été retirée par migration parce que
deux colonnes pour un fait finissent par se contredire. Révoquer, c'est mettre à `null` ;
re-partager génère un autre jeton et **tue l'ancien lien**.

**3. `PRODUCT.md` §4.4 mentionne une `cover` sur `List` — elle n'existe pas au schéma.** Vérifie
`prisma/schema.prisma` : le modèle n'a ni `cover` ni compteur d'items. La mosaïque de quatre
jaquettes que demande la spec doit donc se dériver des `ListItem`, et **c'est une requête à
concevoir** — quatre jaquettes par carte, sur une page de listes, sans faire N+1.

**4. `/l/[token]` vit hors du groupe `(app)`** et ne bénéficie donc **pas** de
`requireApprovedUser()`. Il porte sa propre garde. `app/robots.ts` interdit déjà tout le site : un
lien secret indexé n'est plus un secret.

**5. Supprimer une liste est destructif** — les `ListItem` partent en cascade. Ça doit passer par
`alert-dialog`, comme le retrait d'une œuvre du suivi.

## Les questions à poser à Alexis d'entrée

1. **Le périmètre de la branche.** `docs/STATE.md` annonce l'ordre `/lists`, puis `/lists/[id]`,
   puis `/l/[token]`. Est-ce qu'on prend les trois, ou seulement `/lists` d'abord ?
2. **Le glisser-déposer maintenant ou plus tard ?** `rankAfterMove` est testé et `@dnd-kit` est
   prêt, mais c'est la partie la plus coûteuse à dessiner. Une liste ordonnée sans poignées est
   déjà utile.
3. **Comment on remplit une liste.** Depuis la fiche (« Ajouter à une liste », le bouton existe et
   ne fait rien), depuis une vignette du catalogue, ou depuis la liste elle-même ? Les trois
   demandent des écrans différents.

## La méthode, qui n'est pas négociable

1. **L'UI d'abord, la logique après validation.** Alexis dicte la mise en page passe par passe.
2. **Une capture d'écran à chaque passe**, en 1440 **et** en 390. C'est là qu'on trouve les vrais
   problèmes — les trois dernières séances ont attrapé comme ça une pagination annonçant 238 pages
   dont 226 vides, une barre de défilement horizontale fantôme, et une carte qui restait allumée
   après la fermeture d'une fenêtre.
3. Après chaque passe : `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm knip`, `pnpm build`. Tous
   verts.
4. **Vérifie avec Alexis avant de commiter.** Mets `docs/STATE.md` à jour **dans le commit qui le
   périme**.

Pour Playwright, il y a une mémoire projet (`playwright-auth-access`) :
`node scripts/dev-session-cookie.mjs` rejoue une session. **Ne redemande pas ses identifiants
GitHub.** Si le profil est verrouillé (« Browser is already in use »), c'est un Chrome
d'automatisation d'une séance précédente — pas son navigateur personnel.

**Vérifie toujours si une donnée en base vient de toi avant de la supprimer.** La dernière séance a
failli effacer trois entrées d'Alexis en les prenant pour des résidus de test ; c'est le journal
`EntryEvent` qui a tranché.

## Ce qui est su et non fait, et qui n'appartient pas à cette branche

Les **états vides** des trois écrans livrés ne sont pas dessinés. Le **journal** n'a pas d'écran
alors que `EntryEvent` se remplit. Le **retrait d'une œuvre du suivi** n'a plus de bouton
(`removeEntry` est au gel de `knip.jsonc`, nommément). Et la **note écrit une ligne de journal par
cran** — six lignes pour un ajustement continu, question posée à Alexis et non tranchée.
````
