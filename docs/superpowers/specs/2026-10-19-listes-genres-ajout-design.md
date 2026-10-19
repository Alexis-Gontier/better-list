# Listes : un genre, et un ajout depuis la liste

Spec du 19 octobre 2026. Document de chantier : une fois fusionné, ses décisions passent dans
`docs/decisions.md` (D46, D47), `docs/conception.md` §5 et §6 est mis à jour, et ce fichier est
supprimé.

## Pourquoi

L'audit des listes a relevé qu'une liste ressemble à un résultat de recherche : rien ne dit ce
qu'elle est. La base de production montre trois usages que l'écran traite pareil :

| Usage | Listes en production | Ce qui manque |
| --- | --- | --- |
| Classement | « Top 10 anime » (18), « Top 10 webtoon » (18) | le rang n'est visible qu'en mode réorganisation ; rien ne marque la 10e place |
| File d'attente | « A voir (anime) » (14), « Webtoon à lire » (2), « Randil recommendation » (0) | une œuvre terminée reste mêlée aux autres ; aucune progression |
| Attente de la fin | « A lire une fois fini (pw) » (17) | 8 des 17 œuvres sont déjà terminées, et rien ne le montre |

Et **remplir une liste est long** : chaque œuvre demande de la chercher, d'ouvrir sa fiche, d'ouvrir la
fenêtre, de cocher, puis de revenir. Une liste de 17 œuvres, c'est 17 allers-retours.

## Découpage

Une spec, **deux PR** sur des branches successives :

1. **Ajouter depuis la liste** — sans migration.
2. **Les genres de liste** — migration, formulaire, écrans.

## PR 1 — Ajouter depuis la liste

### Le geste

- `/lists/[id]` gagne un bouton **« Ajouter des œuvres »** dans sa barre d'actions, avant
  « Réorganiser ». C'est l'action principale de l'écran : il porte l'accent (D33). Il n'est pas
  rendu en mode réorganisation.
- Il ouvre une fenêtre qui **reste ouverte** tant qu'on ne la ferme pas :
  - un champ de recherche ; à partir de deux caractères, cinq résultats (jaquette, titre dans la
    langue du compte, format, année, pastille de suivi) ;
  - chaque ligne est une **bascule** : « Ajouter », ou « Dans la liste » (coché) pour retirer ;
  - **`Entrée` ajoute le résultat surligné et vide le champ** ; les flèches déplacent le surlignage.
    On enchaîne donc sans souris : taper, Entrée, taper, Entrée.
- **Champ vide : des suggestions tirées de ma bibliothèque**, sans requête AniList. En PR 1 : mes
  œuvres `PLANNING` qui ne sont pas déjà dans la liste, les plus récemment modifiées d'abord, huit au
  plus. La PR 2 les fait dépendre du genre (voir plus bas).
- La grille derrière la fenêtre se met à jour à chaque geste : `addToList` et `removeFromList`
  appellent déjà `revalidateLists`.
- La fenêtre « Ajouter à une liste » de la fiche reste : elle sert le cas inverse, une œuvre rangée
  dans plusieurs listes.

### La mécanique

- **La recherche réutilise `/api/search`** tel quel : un GET annulé à chaque frappe
  (`AbortController`), `searchMedia` sous `"use cache"` d'une heure, et le repli sur le miroir
  quand AniList ne répond pas. Aucune lecture AniList nouvelle.
- L'appartenance à la liste se calcule **côté client** à partir des `mediaId` de la liste, passés
  en prop par la page ; la réponse de `/api/search` n'a pas à la connaître.
- Les suggestions sont lues par la page (Server Component) et passées en prop, comme
  `getListMembership` pour la fenêtre de la fiche : nouvelle requête `getListSuggestions(listId)`
  dans `lists.queries.ts`.
- Chaque ligne tient ses propres `useAction`, comme `ListToggle` : deux ajouts rapides ne
  partagent pas un `isPending`. La bascule bouge avant la réponse et revient en arrière sur erreur,
  avec un toast.
- Composant dans `src/app/(app)/lists/[id]/_components/add-media-dialog.tsx` (un seul appelant ;
  règle de promotion). Si la ligne de résultat recoupe celle de la palette ⌘K, on extrait ce qui est
  commun au deuxième appelant, pas avant.

### États

- Moins de deux caractères : les suggestions, ou une phrase si la bibliothèque n'en donne aucune.
- Recherche en cours : un `Spinner` dans le champ, les résultats précédents restent affichés.
- Aucun résultat : « Rien ne correspond à « … » ».
- Repli du miroir (`fromMirror`) : une ligne discrète « AniList ne répond pas, résultats de la
  copie locale » (D45).
- Œuvre 18+ et préférence qui les masque : `searchMedia` les écarte déjà.

### Décision

**D47** — Une liste se remplit aussi depuis elle-même : la fenêtre « Ajouter des œuvres » de
`/lists/[id]` cherche et range sans passer par la fiche. Révise la décision du 6 septembre 2026
(« on remplit une liste depuis la fiche »), que l'usage a démentie.

## PR 2 — Les genres de liste

### Le modèle

```prisma
enum ListKind {
  SELECTION
  RANKING
  WATCHLIST
  WAIT_FOR_END
}

model List {
  // …
  kind   ListKind @default(SELECTION)
  /// Ligne de coupe d'un classement (« Top 10 »). Lue seulement quand `kind = RANKING`, mais
  /// conservée si la liste change de genre : y revenir retrouve son Top 10.
  cutoff Int?
}
```

- La migration pose `SELECTION` partout : **rien ne change à l'écran** tant qu'on ne reclasse pas
  une liste. Les sept listes de production se reclassent à la main.
- Écartés : réemployer `ListView` (une vue suppose plusieurs regards sur une liste ; le genre est
  unique, et D17 garde les vues reportées) ; une colonne JSON de réglages (Postgres valide une
  énumération gratuitement, et des réglages un par un reviendraient aux interrupteurs refusés).

### Ce qu'on calcule sans le stocker

- **Prête** : `media.status` vaut `FINISHED` ou `CANCELLED` — une œuvre annulée n'aura pas de suite.
  `RELEASING`, `HIATUS`, `NOT_YET_RELEASED` et `null` sont « en parution ». Le miroir suffit : le
  cron quotidien rafraîchit toute œuvre en parution vieille de plus de 12 heures, y compris celles
  qui ne sont que dans une liste.
- **Déjà vue** : mon suivi vaut `COMPLETED`. `DROPPED` ne compte pas : en production il veut souvent
  dire « mis en pause en attendant la fin ».
- **Un seul ordre** : le rang fractionnaire existant. Les sections filtrent cet ordre sans le
  changer.

La répartition est une fonction pure, `src/features/lists/lib/list-sections.ts` :
`listSections(kind, cutoff, items)` → sections ordonnées `{ key, label, items, collapsed }`.

| Genre | Sections, dans l'ordre |
| --- | --- |
| `SELECTION` | une seule, sans intitulé |
| `RANKING` | « Top N » puis « Prétendants » si `cutoff` est posé et dépassé ; sinon une seule |
| `WATCHLIST` | « À voir », puis « Déjà vues » (repliée) |
| `WAIT_FOR_END` | « Prêtes », « En parution », puis « Déjà vues » (repliée) |

Une section vide n'est pas rendue. Une section repliée est un `<details>` natif : pas de
JavaScript.

### Les écrans

**Formulaire de liste** (`ListFormDialog`, création et modification). Après le nom et la
description, **Genre** : quatre choix, chacun avec une phrase. `RadioGroup` de shadcn, à ajouter
(`pnpm dlx shadcn add radio-group`, puis relire `git diff package.json` : le paquet parasite `cn`) :

- Sélection — des œuvres, sans ordre ;
- Classement — l'ordre compte ;
- À voir — une file à vider ;
- Quand c'est fini — j'attends la fin de parution.

Le champ **« Top … »** (nombre, facultatif) n'apparaît que pour un classement. L'entrée du menu
« Renommer » devient « Modifier ».

**`/lists/[id]`**, en consultation :

- La ligne de métadonnées nomme le genre : « Classement · 18 œuvres », « À voir · 3 sur 14 vues »,
  « Quand c'est fini · 8 prêtes sur 17 ».
- Les sections de `listSections`, chacune une `CatalogueGrid` sous un intitulé.
- **Classement** : un grand chiffre de rang (Archivo 800, chiffres tabulaires, couleur du texte —
  D33 n'est pas touché) sur le coin bas-gauche de chaque jaquette. `MediaCard` gagne une prop
  `rank?: number` : `marker` porte déjà la pastille de suivi et `action` occupe le coin bas-droit.
  Le rang reste le rang dans toute la liste, Prétendants compris (11, 12…).
- En mode réorganisation, **pas de sections** : on réordonne la liste entière, sinon un glisser
  d'une section à l'autre n'aurait pas de sens.

**Suggestions de la fenêtre d'ajout** (PR 1), selon le genre :

| Genre | Suggestions |
| --- | --- |
| `SELECTION`, `RANKING` | mes œuvres modifiées récemment, tous statuts |
| `WATCHLIST` | mes `PLANNING` |
| `WAIT_FOR_END` | mes œuvres en parution suivies en `PAUSED`, `DROPPED` ou `PLANNING` |

**Carte de `/lists`** — la mosaïque ne change pas ; la ligne du bas dépend du genre :
« Top 10 · 18 œuvres », « 11 à voir », « 8 prêtes · 17 œuvres », « 4 œuvres ». Lire le statut de
parution et le suivi pour le décompte s'ajoute à `getLists` (une requête sur les items de mes
listes, qu'elle rapatrie déjà).

**Fenêtre « Ajouter à une liste » de la fiche** — chaque ligne affiche le genre et le décompte en
petit sous le nom.

**Page partagée `/l/[token]`** — rangs et sections, **sauf « Déjà vues »** : le visiteur n'a pas le
suivi du propriétaire, et le montrer dévoilerait sa bibliothèque. Une `WATCHLIST` partagée est
donc une grille unique, une `WAIT_FOR_END` montre « Prêtes » et « En parution ».

### Décision

**D46** — Une liste a un genre : Sélection, Classement, À voir, Quand c'est fini. Il décide de son
affichage (rangs et ligne de coupe, progression, sections « Prêtes » et « Déjà vues ») ; l'ordre,
lui, reste unique. Précise D17 : le genre n'est pas une vue, et les vues restent reportées.

## Hors chantier

- **Annonce Discord** quand une œuvre d'une liste « Quand c'est fini » termine sa parution —
  demandée, prochain chantier, à brancher sur le cron Discord existant.
- La note par œuvre (`ListItem.note`, en base et inutilisée), pour la provenance d'une
  recommandation.
- La refonte de la carte de `/lists` (podium, pile) et de l'état vide.
- La puce « Lien actif » dans l'en-tête et le partage sorti du menu.

## Tests

- **Vitest** : `listSections` sur chaque genre et les cas limites — `HIATUS`, `CANCELLED`, `null`,
  `DROPPED`, œuvre sans suivi, `cutoff` supérieur à la longueur, `cutoff` posé sur un autre genre,
  liste vide. Les schémas Zod : `kind` hors énumération refusé, `cutoff` borné à 1–100 ou `null`.
- **Requêtes** : `getListSuggestions` exclut ce qui est déjà dans la liste et respecte la
  préférence 18+.
- **Playwright** (`e2e/lists.spec.ts`, sans `@anilist` pour la partie qui ne lit que la base) :
  créer une liste « Quand c'est fini », lui ajouter deux œuvres depuis les suggestions, vérifier les
  sections. La recherche par AniList est taguée `@anilist`.
- **Au navigateur**, en 1440 et en 390 px : chaque genre, la fenêtre d'ajout enchaînée au clavier,
  la page partagée.
