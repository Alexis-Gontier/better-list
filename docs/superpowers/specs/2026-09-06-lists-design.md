# `/lists` — design

> Décidé le 6 septembre 2026, à l'ouverture de la branche des listes, à partir du
> [brief](./2026-09-06-lists-prompt.md). Ce document fixe **le périmètre et le câblage** ; la mise
> en page se valide passe par passe à l'écran, capture à l'appui, comme les trois écrans précédents.

## Le périmètre, et ce qu'il exclut

La branche livre **`/lists` seul**, plus le chemin qui le remplit depuis la fiche d'une œuvre.

| | |
| --- | --- |
| **Dedans** | `/lists` : grille de cartes, mosaïque de quatre jaquettes, décompte, état vide. Créer une liste, la renommer et la redécrire, la supprimer. Depuis `/media/[id]` : ranger une œuvre dans ses listes, et l'en retirer. |
| **Dehors** | `/lists/[id]`, `/l/[token]`, le partage, le réordonnancement. |

**Le glisser-déposer est reporté, et c'est une décision d'Alexis du 6 septembre 2026**, pas un
manque de temps. Le raisonnement tient à ce que le glisser réordonne : ce sont les `ListItem`
d'une liste, et ils ne s'affichent que sur `/lists/[id]`. Le modèle `List` lui-même n'a **aucune
colonne d'ordre** — son seul index est `@@index([ownerId, updatedAt])` — donc les cartes de
`/lists` se rangent par date de modification, et rien d'autre n'est possible sans migration. Prendre
le glisser dans cette branche aurait donc voulu dire, au choix, y ramener `/lists/[id]` ou ouvrir le
schéma dans une passe d'UI. Ni l'un ni l'autre.

`@dnd-kit`, `list-reorder.ts` et `share-token.ts` **restent donc au gel** de `knip.jsonc`, et ce gel
devient explicitement une décision de branche plutôt qu'un reste de la mise à blanc.

## Ce que la branche ne réécrit pas

Presque toute la logique existe, testée, gelée en attendant cet écran :
`features/lists/schemas/lists.schema.ts` porte les sept entrées d'action, et leurs docstrings
portent des décisions déjà prises — le rang calculé par le serveur et jamais reçu du client, le
jeton fabriqué côté serveur, le partage qui a ses propres actions et ne se mêle pas au renommage.
**Rien de tout cela n'est rouvert ici.**

Et une réserve, parce qu'elle a l'air d'un manquement à la règle de réemploi : **`catalogue-grid`
ne sert pas sur cet écran.** Elle pose sept colonnes de jaquettes ; une grille de cartes de liste en
pose trois, larges. C'est `/lists/[id]` qui héritera de la coquille du catalogue — avec `MediaCard`,
sa pastille et sa fenêtre d'édition —, et cette branche-ci n'a pas d'œuvre à ranger en grille.

## La mosaïque, et la requête qu'elle demande

`PRODUCT.md` §4.4 mentionne une `cover` sur `List`. **Elle n'existe pas au schéma**, et le modèle
n'a pas davantage de compteur d'items. Les quatre jaquettes de la carte se dérivent donc des
`ListItem`, et c'est le seul vrai problème de lecture de la branche : quatre jaquettes par carte,
sur une page de listes, sans N+1.

Une seule lecture porte les deux, dans `features/lists/server/lists.queries.ts` :

```
list.findMany({
  where: { ownerId }, orderBy: { updatedAt: "desc" },
  select: {
    id: true, title: true, description: true, updatedAt: true,
    _count: { select: { items: true } },
    items: {
      take: 4, orderBy: { rank: "asc" },
      select: { media: { select: { id, coverImage, titleRomaji, … } } },
    },
  },
})
```

`_count` compte en base plutôt qu'en mémoire ; `take: 4` évite de rapatrier quarante items pour en
montrer quatre. `Media.coverImage` est **une seule colonne `String?`** au miroir, et non l'objet
`extraLarge` / `large` d'AniList : la mosaïque prend une URL et un titre pour l'`alt`, elle n'a pas
besoin d'un `MediaCompact`.

**Le SQL émis est à vérifier, pas à supposer.** En Prisma 7 sur PostgreSQL, un `take` imbriqué doit
se compiler en fenêtre (`ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY rank)`) ou en `LATERAL`,
donc en un aller-retour. Si la stratégie par défaut sort une requête par liste, cette lecture passe
en `relationLoadStrategy: "join"`. La vérification se fait sur les requêtes réellement journalisées,
et son résultat est à consigner — c'est précisément la question que le brief a eu raison de nommer.

**Les quatre jaquettes se rangent par `rank`, jamais par `addedAt`.** C'est l'ordre que la liste a,
et celui que `/lists/[id]` montrera plus tard : deux ordres pour une même liste donneraient une
carte qui ment sur ce qu'elle ouvre.

## Les états de la carte, et de l'écran

Trois cas ont chacun leur dessin, et deux d'entre eux **n'ont aucune donnée au seed** — le jeu
d'essai fabrique cinq listes, toutes remplies.

| Cas | Ce qu'on montre |
| --- | --- |
| Liste remplie | La mosaïque, le titre, la description, le décompte. Moins de quatre items : la mosaïque se complète de cases vides plutôt que de se réorganiser — une liste de deux œuvres n'a pas à ressembler à autre chose qu'une liste. |
| Liste vide | Pas de mosaïque, une case qui dit que la liste attend sa première œuvre. C'est l'état qu'on obtient juste après avoir créé une liste, donc le plus fréquent des trois le premier jour. |
| Aucune liste | L'état vide de l'écran, avec le geste de création dedans. |

Ces deux derniers se regardent en créant une liste à la main. **Rien n'est supprimé en base pour les
obtenir** : la séance précédente a failli effacer trois entrées réelles en les prenant pour des
résidus de test.

## Le chemin depuis la fiche

Le bouton « Ajouter à une liste » existe déjà dans `entry-action-bar.tsx` et ne fait rien. Il ouvre
une fenêtre qui est **une liste de bascules** : cochée veut dire que l'œuvre est dans cette liste.

**C'est une bascule et pas un simple ajout, et la raison est le périmètre.** Sans `/lists/[id]`
dans cette branche, un ajout par erreur n'aurait aucun écran pour être défait : la case à décocher
est le seul chemin de retour. C'est aussi ce qui fait entrer `removeFromList` en même temps
qu'`addToList`, et ce qui permet à la fenêtre de dire où l'œuvre se trouve déjà — une information
qu'on veut de toute façon avant de choisir.

**On ne crée pas de liste depuis cette fenêtre** — décision d'Alexis du 6 septembre 2026. Une liste
naît à un seul endroit, `/lists`, donc il n'y a qu'un formulaire à dessiner et à tenir. Conséquence
à ne pas oublier au dessin : **la fenêtre d'un membre qui n'a aucune liste est vide**, et elle doit
alors dire quoi faire et mener à `/lists`, sinon le bouton s'ouvre sur du néant.

### Pas de route handler, et pourquoi

La fiche est un Server Component : elle lit les listes du membre **et lesquelles contiennent déjà
cette œuvre**, et les passe en props à l'îlot client qu'est la fenêtre. La règle de `CLAUDE.md` vise
une lecture qu'un composant client doit aller chercher lui-même ; ici il n'a rien à chercher, et une
poignée de lignes voyage avec le rendu de la page.

### Le miroir avant l'écriture

`ListItem.mediaId` porte une clé étrangère vers `Media`, exactement comme `Entry`. Ranger depuis la
fiche une œuvre absente du miroir échouerait au niveau de la base : **`ensureMediaMirror(mediaId)`
avant toute écriture qui pointe vers `Media`**, comme `saveEntry` le fait déjà.

## Les fichiers, et où ils atterrissent

| Fichier | Ce qu'il porte |
| --- | --- |
| `features/lists/server/lists.queries.ts` | `server-only`. La lecture de la page — listes, décomptes, quatre jaquettes — et celle qui dit, pour une œuvre, dans quelles listes elle est déjà. |
| `features/lists/server/lists.actions.ts` | `"use server"`. `createList`, `updateList`, `deleteList`, `addToList`, `removeFromList` — toutes par `authActionClient`, sur le modèle de `tracking.actions.ts`. |
| `app/(app)/lists/page.tsx` | Remplace le placeholder. Son docstring actuel parle de « huit Server Actions de `lists.actions.ts` » : **ce fichier n'existe pas**, et le commentaire part avec la page. |
| `app/(app)/lists/_components/` | La carte, la mosaïque, l'état vide, le formulaire de création, le menu de liste et sa confirmation de suppression. |
| `app/(app)/media/[id]/_components/` | La fenêtre de rangement. |

**Tout le rendu démarre dans le `_components/` de sa route**, y compris la fenêtre de rangement, qui
connaît pourtant `List` : elle n'a qu'un consommateur aujourd'hui, et elle montera dans
`features/lists/components/` le jour où une vignette du catalogue la demandera. C'est la règle de
promotion d'`ARCHITECTURE.md`, et le précédent est `entry-action-bar.tsx`, qui connaît `Entry` et
vit dans le `_components/` de la fiche.

**La seule action destructive de la branche est la suppression d'une liste**, qui emporte ses
`ListItem` en cascade : elle passe par `alert-dialog`, comme le retrait d'une œuvre du suivi.
Décocher une case de la fenêtre de rangement n'en est pas une — elle se recoche.

## Ce qui sort du gel, et ce qui y reste

`lists.schema.ts` passe de `["files"]` à `["exports"]` : cinq de ses sept entrées trouvent un
appelant, `shareListSchema` et `reorderListItemSchema` non. C'est le précédent exact de
`media.documents.ts`, dont la fiche a consommé une requête sur six.

Restent gelés, **et le fichier doit dire que c'est cette branche qui l'a décidé** :
`@dnd-kit`, `list-reorder.ts`, `share-token.ts`.

## La méthode

Celle des trois séances précédentes, et elle n'est pas négociable :

1. **L'UI d'abord, la logique après validation.** La mise en page se dicte passe par passe.
2. **Une capture à chaque passe, en 1440 et en 390.** C'est là qu'on a attrapé une pagination
   annonçant 238 pages dont 226 vides, une barre de défilement fantôme, et une carte qui restait
   allumée après la fermeture d'une fenêtre.
3. Après chaque passe : `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm knip`, `pnpm build`.
4. **Vérifier avec Alexis avant de commiter**, et mettre `docs/STATE.md` à jour dans le commit qui
   le périme.
