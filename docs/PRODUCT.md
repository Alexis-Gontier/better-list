# Produit — Better-List

Ce document dit **quoi** on construit et **pourquoi**. Le **comment** (structure de fichiers,
conventions) est dans [ARCHITECTURE.md](./ARCHITECTURE.md), et **ce qui est construit à ce jour**
dans [STATE.md](./STATE.md).

Il décrit une cible, pas un avancement : aucune phrase d'ici ne devient fausse parce qu'un écran a
été livré. Si c'est le cas, elle appartient à STATE.md.

---

## 1. Le produit en une phrase

Un catalogue d'œuvres japonaises et asiatiques (animes, mangas, webtoons, light novels) adossé à
l'API AniList, sur lequel se greffent **le suivi de mon visionnage**, **la mémoire de ce que j'ai
vu et quand**, **le recensement de ce que je possède en physique**, et **des listes** qu'on peut
réarranger en classements ou en tier lists.

Références assumées : **AniList** et **MyAnimeList**. On ne réinvente pas la roue — on reprend
leurs conventions (statuts, progression, notes, saisons) et on se distingue sur la mémoire et les
listes.

## 2. Pour qui

**Un cercle privé : moi et quelques amis (~4 comptes).** Inscription sur invitation, pas
d'ouverture publique.

Ce n'est pas un détail de dimensionnement, ça retire du périmètre :

| On ne construit pas | Parce que |
| --- | --- |
| Découverte sociale (tendances des listes, catégories, pages créateurs) | Il n'y a pas de communauté à découvrir |
| Modération, signalement | Tout le monde se connaît |
| Commentaires, forum, messagerie | Coût récurrent pour zéro valeur à cette échelle |
| Vérification d'email, reset de mot de passe | Auth OAuth uniquement (voir §7) |
| Interface d'administration des comptes | L'approbation de la liste d'attente se fait dans Prisma Studio (§7.1) |
| Rate limiting applicatif, quotas par utilisateur | 4 comptes |

**Conséquence immédiate :** la navigation actuelle de
[src/config/navigation.ts](../src/config/navigation.ts) (Parcourir → Tendances / Modèles /
Catégories / Créateurs) décrit une plateforme publique de listes. Elle est à refaire selon §5.

Le partage se fait par **lien non listé** : une liste privée par défaut, qu'on rend accessible à
qui a l'URL. Pas de graphe social.

## 3. Périmètre des œuvres

Tout le catalogue AniList, sans restriction de type :

| Ce que ça couvre | Comment c'est représenté chez AniList |
| --- | --- |
| Anime (série TV, film, OVA, ONA, spécial, court) | `type: ANIME` + `format` |
| Manga, one-shot | `type: MANGA`, `format: MANGA / ONE_SHOT`, `countryOfOrigin: JP` |
| Webtoon / manhwa | `type: MANGA`, `countryOfOrigin: KR` |
| Manhua | `type: MANGA`, `countryOfOrigin: CN` |
| Light novel / novel | `type: MANGA`, `format: NOVEL` |

Les schémas Zod correspondants existent déjà dans
[src/features/media/schemas/media.schema.ts](../src/features/media/schemas/media.schema.ts).

**Hors périmètre**, parce qu'AniList ne les couvre pas : films et séries live-action, dramas,
jeux vidéo, romans non japonais. Si ça devient un besoin un jour, c'est une **seconde source**
(TMDB), pas une extension d'AniList — donc une décision structurante, à ne pas prendre par
accident.

**Les listes ne contiennent que des œuvres.** Pas de personnages, pas de studios, pas d'items en
texte libre. `ListItem` pointe donc directement un `Media`, sans polymorphisme.

## 4. Modèle de domaine

### 4.1 `Media` — le miroir local

**C'est la décision structurante du projet.** Les données utilisateur sont chez nous, mais une
partie des données AniList aussi, en miroir persistant.

Trois raisons, dont une bloquante :

1. **Le quota.** AniList plafonne à 30 req/min **par IP**, et en production cette IP est partagée
   par tous les visiteurs — c'est déjà documenté dans [src/lib/http/anilist.ts](../src/lib/http/anilist.ts).
   Afficher une bibliothèque de 600 titres en interrogeant AniList à la volée est impossible.
2. **Le tri et le filtre.** Trier une bibliothèque par note, année, format ou nombre d'épisodes
   suppose ces champs en base. Sans miroir, on ne peut paginer que dans l'ordre d'ajout.
3. **La durabilité.** Une liste doit survivre à une panne AniList ou à la suppression d'une
   entrée là-bas.

Ce qu'on stocke : le strict nécessaire pour afficher une carte et trier — `anilistId` (clé),
titres, cover + couleur dominante, `type`, `format`, `status`, `countryOfOrigin`, épisodes /
chapitres / volumes, `season` + `seasonYear`, `genres`, `meanScore`, `isAdult`, `syncedAt`.

Ce qu'on **ne** stocke **pas** : synopsis long, relations, personnages, staff, liens de
streaming, tags. Ces champs ne servent que sur la fiche détail — ils restent un appel AniList à
la volée, protégé par le `"use cache"` déjà en place dans
[media.queries.ts](../src/features/media/server/media.queries.ts).

Politique de fraîcheur :

| Statut du média | Périmé après | Rafraîchi en pratique |
| --- | --- | --- |
| `FINISHED`, `CANCELLED` | 30 jours | à la première passe qui suit |
| `RELEASING`, `NOT_YET_RELEASED`, `HIATUS`, statut inconnu | 12 h | **une fois par jour** (socle du planning V2) |

**Le cron passe une fois par jour**, à 4 h UTC — c'est ce que permet le plan Vercel Hobby, qui est
celui du projet. Les œuvres en cours de diffusion sont donc rafraîchies toutes les 24 h et non toutes
les 12 h. C'est une limite de plan, pas de modèle : la cadence est une ligne de `vercel.json`, et
aucun code n'en dépend.

**Le seuil de péremption reste plus court que la cadence, volontairement.** Un seuil de 12 h garantit
qu'une œuvre en cours est *toujours* périmée quand la passe arrive, donc reprise à chaque fois.
Aligner le seuil sur 24 h produirait l'inverse : une ligne rafraîchie à 4 h 02 ne serait pas encore
périmée à 4 h 00 le lendemain, et attendrait 48 h. Un seuil plus court que la cadence n'est jamais un
problème — il ne déclenche rien de lui-même.

**Un seul déclencheur pour les deux classes, et c'est le cron.** Le rafraîchissement paresseux « à
la lecture » qu'on avait prévu ici a été écarté à l'implémentation : il fait écrire en base pendant
le rendu d'une page, ce qui rend une requête `GET` coûteuse et non idempotente, et il ne visite que
ce que quelqu'un vient de regarder — jamais les six cents autres titres. Le cron n'a pas ces deux
défauts, et il est bon marché parce que `media(id_in: […])` ramène **cinquante fiches par requête** :
un miroir de mille titres se remet à jour en vingt requêtes, sous le quota d'une minute.

Ce qui reste du geste paresseux est un **garde-fou à l'écriture** : `ensureMediaMirror` ne réécrit
rien quand la ligne existe et n'est pas périmée. Sans lui, chaque « +1 » recopiait dix-huit colonnes
du catalogue partagé pour incrémenter un compteur personnel.

Un statut inconnu (`null`) est traité comme volatile : on ne sait pas ce qu'est l'œuvre, donc le
ranger dans la classe lente reviendrait à ne jamais découvrir son vrai statut.

Une œuvre qu'AniList ne renvoie plus **garde sa copie** — c'est la durabilité du point 3 — mais son
`syncedAt` avance quand même, sans quoi elle resterait périmée pour toujours et chaque passe du cron
dépenserait une place à la redemander en vain.

### 4.2 `Entry` — le suivi

Une ligne par couple `(user, media)`, unique.

Les statuts reprennent **exactement l'énumération `MediaListStatus` d'AniList** — `CURRENT`,
`PLANNING`, `COMPLETED`, `PAUSED`, `DROPPED`, `REPEATING` — pour qu'un import depuis AniList ou
MAL reste une correspondance triviale le jour où quelqu'un en a besoin.

Champs : `status`, `progress` (épisodes ou chapitres), `progressVolumes`, `score`,
`repeatCount`, `startedAt`, `finishedAt`, `notes`, `favorite`, `private`.

**`progress` est un curseur, pas un ensemble.** Un entier : « j'en suis à l'épisode 14 ». On ne
coche pas des épisodes individuellement, et on ne peut pas avoir vu le 4 sans avoir vu le 3 —
c'est le modèle d'AniList et de MAL, et il est juste : on regarde une série dans l'ordre.

C'est exactement l'inverse de la collection physique (§4.5), où l'on **peut** posséder les tomes
1 et 3 sans le 2. Les deux ne se modélisent donc pas pareil : un entier ici, une ligne par tome
là-bas. Confondre les deux est l'erreur à ne pas commettre.

**La note est stockée sur 0–100 et affichée sur cinq étoiles, par demies.** Le stockage est celui
d'AniList : il accueille sans perte les notes importées de là-bas, et il laisserait changer
d'échelle plus tard sans réécrire une ligne.

L'affichage, lui, **n'est plus un réglage** — il l'a été (10 points / 5 étoiles / 100), et le
choix a été retiré. Trois échelles pour quatre comptes, c'était trois façons de lire la même note
et une conversion à traîner dans chaque composant, pour un réglage que personne n'ouvre deux fois.
Les demi-étoiles sont ce qui rend l'abandon des dix points acceptable : cinq crans ne séparent pas
« bien » de « très bien », dix le font. Une demie vaut exactement dix points, donc elle survit à
l'aller-retour ; une note qui tombe entre deux crans — 85, importée — s'affiche arrondie **et**
suivie de sa valeur exacte.

### 4.3 `EntryEvent` — la mémoire

Table **append-only** : on y insère, on n'y modifie jamais rien.

`Entry` répond « où j'en suis » et est écrasée à chaque modification. `EntryEvent` répond « ce
qui s'est passé, et quand » : `PROGRESS`, `STATUS_CHANGED`, `SCORED`, `NOTE`, `REPEAT_STARTED`.

Un événement `PROGRESS` enregistre un **déplacement du curseur**, pas un épisode : `{ from: 12,
to: 14, at }`. Passer de l'épisode 5 à l'épisode 20 après une soirée produit **un** événement,
pas quinze — et l'information « 15 épisodes le 3 mars » se déduit de `to - from`. Compter les
épisodes vus dans le récap annuel reste donc exact, sans stocker une ligne par épisode.

Sans cette table, relancer une série en 2027 écrase la date de début de 2019 et ce premier
visionnage disparaît — il n'est reconstructible depuis rien. C'est elle qui porte :

- la timeline personnelle et le « il y a 2 ans, tu commençais X » ;
- le récap annuel (heures, genres, distribution des notes) ;
- l'historique des notes et les rewatchs comme événements distincts.

Coût : une ligne par action de l'utilisateur. À 4 comptes, négligeable. Non rétroactif : ce qui
n'est pas journalisé dès le premier jour est perdu.

### 4.4 `List`, `ListItem`, `ListView`

`List` : propriétaire, titre, description, `shareToken`, cover, `isTemplate`, `forkedFromId`.

**Le partage tient dans une seule colonne, et c'est une décision.** Une liste est partagée si et
seulement si elle porte un `shareToken` ; révoquer, c'est le mettre à `null`, et re-partager en
génère un autre — l'ancien lien meurt. L'énumération `visibility` (`PRIVATE` / `UNLISTED`) qui vivait
là a été retirée (migration `20260811093000_partage_par_jeton`) : elle disait le même fait une
seconde fois, et deux colonnes pour un fait finissent par se contredire — une liste `UNLISTED` sans
jeton n'est partagée avec personne, une liste `PRIVATE` avec un jeton est lisible par qui a le lien.

Un jeton et non l'`id` : celui-ci apparaît déjà dans les URL du propriétaire, donc le partage aurait
divulgué l'adresse privée, et révoquer serait devenu impossible sans changer l'identité de la liste.
Il est tiré du générateur cryptographique de Node (144 bits) : c'est le seul secret qui protège la
page, puisqu'elle répond sans session.

`ListItem` : `listId`, `mediaId`, `rank` (index fractionnaire — réordonner ne met à jour qu'une
ligne), note personnelle, `addedAt`. **Unicité sur `(listId, mediaId)`** : une œuvre n'apparaît
qu'une fois dans une liste.

**Le point d'architecture à ne pas rater : la collection et son arrangement sont deux objets
distincts.** Une tier list n'est pas un concurrent d'une liste, c'est une **vue** posée dessus :

```
ListView { listId, type: RANKED | TIERS | GRID, tiers: [{ label, color }] }
ListViewItem { viewId, listItemId, tierIndex, rank }
```

Une même liste de 40 animes devient ainsi classement, tier list ou grille sans recopier son
contenu, et ajouter un format (bracket, tournoi) plus tard n'impose aucune migration. Le modèle
inverse — une table par format — duplique le contenu à chaque nouveau format, et l'objectif
« réutiliser mes listes pour faire autre chose » ne se réalise jamais.

### 4.5 `Edition`, `OwnedVolume` — la collection physique

**Posséder et avoir lu sont deux axes indépendants.** On peut avoir lu 300 chapitres en ligne et
n'avoir que les tomes 1 à 12 sur l'étagère, ou posséder un coffret intégral sans l'avoir ouvert.
Un booléen `owned` sur `Entry` ne répondrait donc à rien, et surtout pas à la seule question qui
compte devant un rayon de librairie : **il me manque lesquels ?**

Deux tables, à la granularité du tome :

```
Edition      { mediaId, label, publisher, volumesTotal, isCompleted }
OwnedVolume  { userId, editionId, number, acquiredAt, price, condition, notes, lentTo }
```

**`Edition` est partagée entre les comptes, `OwnedVolume` est personnelle.** C'est le point à ne
pas rater : si chacun saisit « Glénat éd. simple » dans son coin, aucune comparaison entre membres
n'est possible et l'emprunt entre amis (§8) ne marche pas. Une édition est créée par le premier
qui en a besoin, puis réutilisée par les autres.

**Une édition par défaut est créée automatiquement** à la première saisie sur une série, pour
qu'on n'ait rien à remplir dans le cas courant. On ne précise l'édition que le jour où ça compte —
un coffret, une perfect edition, une VO.

L'édition n'est pas un détail cosmétique : « Glénat édition simple », « perfect edition », coffret
et édition originale japonaise sont quatre objets distincts, avec des nombres de tomes différents,
pour quiconque collectionne.

Une ligne par tome possédé — 12 lignes pour les tomes 1 à 12. C'est ce qui permet de représenter
un trou (posséder le 1 et le 3, mais pas le 2) et donc de calculer les manquants. La saisie, elle,
se fait **par plage** : personne ne créera 300 lignes à la main.

C'est la différence de nature avec la progression de lecture (§4.2) : on lit dans l'ordre, on
achète dans le désordre. Un curseur là-bas, un ensemble ici.

`lentTo` couvre le prêt à un autre membre du cercle — pertinent précisément parce qu'on est
quatre.

Ce modèle n'est pas limité au papier : un coffret Blu-ray d'un anime est une `Edition` avec des
`OwnedVolume`. On commence par l'imprimé, la structure n'interdit rien.

### 4.6 `User`

Géré par Better Auth (voir §7), avec un champ `status` (`PENDING` / `APPROVED` / `REJECTED`) qui
porte la liste d'attente (§7.1), plus une table de préférences : affichage des titres (romaji /
anglais / original), contenu adulte, langue. **L'échelle de notation n'y est plus** : les notes
sont sur cinq étoiles pour tout le monde (§4.2).

## 5. Architecture des routes

La carte que vise le produit. [src/config/routes.ts](../src/config/routes.ts) en est la mise en
œuvre, et **la colonne `Palier` ci-dessous dit l'intention, pas l'avancement** : ce qui est construit à ce
jour est dans [STATE.md](./STATE.md).

| Route | Rôle | Palier |
| --- | --- | --- |
| `/` | Accueil : en cours, à reprendre, mes listes, catalogue du moment, activité récente | V1 |
| `/search` | Recherche du catalogue (filtres en URL via nuqs) ; sans terme, les tendances | V0 |
| `/media/[id]` | Fiche d'une œuvre + actions de suivi | V0 |
| `/library` | Ma bibliothèque, filtrée par statut / type / genre | V1 |
| `/lists` · `/lists/[id]` | Mes listes, et une liste | V1 |
| `/lists/[id]/[viewId]` | Une vue (classement, tier list) | V1.5 |
| `/collection` | Mon étagère : séries possédées, tomes manquants | V1.5 |
| `/collection/[mediaId]` | Une série : tomes possédés, plages, prêts | V1.5 |
| `/l/[token]` | Une liste partagée, **hors de l'application authentifiée** | V1.5 |
| `/u/[username]` | Profil : statistiques, listes partagées | V1 |
| `/calendar` | Planning de diffusion | V2 |
| `/settings` | Préférences du compte | V1 |
| `/login` · `/signup` | Connexion GitHub | V0 |
| `/waitlist` | Compte créé, en attente d'approbation (§7.1) | V0 |

Une seule route `/media/[id]` pour tous les types : les ids AniList sont uniques entre `ANIME` et
`MANGA`, un préfixe par type n'apporterait qu'une URL plus jolie contre une duplication de
segment.

Une liste s'adresse elle aussi par son `id`, et non par un slug tiré de son titre. Le slug était plus
joli et coûtait trois choses : une contrainte d'unicité par propriétaire, un lien mort à chaque
renommage, et une lecture supplémentaire dans chaque mutation pour retrouver le chemin à revalider.
Les listes ne sont pas indexées (§4.4 — privées par défaut, derrière la garde d'accès) : personne
n'avait rien à gagner à ce que l'URL soit lisible.

**Il n'y a pas de `/browse`, et c'est une décision.** Le catalogue éditorialisé a existé comme page
à part, puis a été replié sur l'accueil. Trois raisons, dans l'ordre où elles pèsent :

- **Deux portes de découverte pour quatre comptes.** `/search` répond à une question qu'on a déjà,
  `/browse` en suggérait une — mais il fallait choisir laquelle ouvrir *avant* de savoir laquelle on
  posait. L'accueil n'a pas ce défaut : on y arrive sans rien choisir.
- **L'accueil était le seul écran qui pouvait être vide.** Une bibliothèque neuve n'affichait qu'un
  encadré et un bouton. Il montre maintenant de quoi la remplir, à l'endroit exact où ce manque se
  constate.
- **Le coût est nul.** Les cinq rangées viennent d'une requête AniList mémorisée une heure ; les
  descendre d'une page à l'autre ne change pas le budget de §4.1.

En contrepartie, l'accueil est **long**, et l'ordre y fait tout le travail : le suivi occupe la
première hauteur d'écran, parce que le « +1 » est le geste le plus fréquent du produit (§6) et
qu'il ne doit pas se payer d'un défilement.

## 6. Roadmap

**V0 — le socle.** Base de données + auth, miroir `Media`, recherche, fiche œuvre. À la fin de
V0 on peut consulter le catalogue mais rien suivre.

**V1 — le tracker est le produit.** Suivi (`Entry`) avec `+1` partout et palette de commandes
(`cmdk` est déjà installé), journal (`EntryEvent`), bibliothèque filtrable, listes simples,
profil, préférences.

**V1.5 — les listes deviennent manipulables, et l'étagère entre dans l'app.** Vues : classements,
tier lists en drag & drop, grilles. Partage par lien non listé avec image OG. Modèles et fork.
Ordre de visionnage d'une franchise (voir §8). Collection physique : saisie par plage, écran des
tomes manquants, prêts entre membres.

**Les vues (§4.4) sont reportées, et les tier lists avec elles** — décision d'Alexis, 11 août 2026.
Le raisonnement tient en une ligne : une liste **est déjà** un classement (`rank` en index
fractionnaire, glisser-déposer et clavier) et **est déjà** une grille. Des trois types prévus,
`RANKED` et `GRID` ne feraient donc que redessiner l'existant dans une URL de plus ; `TIERS` est le
seul qui apporte quelque chose, et c'est celui qu'on remet à plus tard. Construire
`/lists/[id]/[viewId]` maintenant reviendrait à payer l'aiguillage sans la destination.

Les tables `ListView` et `ListViewItem` **restent au schéma** : elles y sont depuis la migration
initiale, elles ne coûtent rien à laisser, et le modèle du §4.4 n'est pas remis en cause — il est
seulement encore inemployé. Ce que V1.5 garde, ce sont les deux besoins réels : **partager une
liste** et **la remplir sans peine**.

Les tables `Edition` et `OwnedVolume` sont posées **dès le schéma initial**, en V0 : les écrans
attendent V1.5, pas la migration. Ajouter deux tables plus tard ne coûte rien, mais découvrir
tardivement que la collection ne rentre pas dans le modèle du suivi en coûterait beaucoup.

**V2 — le temps.** Planning de diffusion depuis `airingSchedule`, « mes prochains épisodes »
filtré sur ce que je regarde, saison en cours et à venir, notifications. Repose entièrement sur
le cron de rafraîchissement posé en §4.1 : sans miroir à jour, le planning consomme le quota
AniList à chaque affichage. Côté collection : scan de code-barres ISBN pour cataloguer une
étagère sans rien taper (§8).

## 7. Décisions techniques actées

| Sujet | Décision |
| --- | --- |
| Base | PostgreSQL (Neon) + Prisma 7 — **impose un driver adapter**, ce n'est plus la config v6 |
| Auth | Better Auth, **OAuth GitHub uniquement**, pas de mot de passe |
| Inscription | Ouverte, mais **liste d'attente** : tout nouveau compte naît `PENDING` (§7.1) |
| Visibilité | Profils, statistiques et bibliothèques **visibles entre membres** par défaut |
| Œuvres | Tout part d'un `Media` AniList. Pas d'œuvre créée à la main |
| Données externes | AniList GraphQL uniquement. Pas de scraping |
| Drag & drop | `dnd-kit` |
| Ordre des items | `fractional-indexing` |
| Formulaires | `react-hook-form` + `next-safe-action` v8 |
| Tests | Vitest (unitaire) ; Playwright plus tard, sur les parcours critiques |
| Tâches planifiées | Vercel Cron |
| Images de partage | `next/og` |
| Langue | Français uniquement |
| Fuseau horaire | **`Europe/Paris`, écrit en dur** — jamais celui de la machine |

L'auth sans mot de passe supprime d'un coup la vérification d'email, le reset, l'envoi de mails
et la surface brute-force — pour un cercle privé, c'est du périmètre en moins sans perte.

**Le fuseau n'est pas une préférence, c'est une constante.** Une date rendue sans fuseau explicite
est calculée avec celui du serveur au rendu et celui du visiteur à l'hydratation : deux valeurs
pour la même donnée. `Europe/Paris` est donc écrit en dur (`src/features/tracking/lib/entry-format.ts`),
et le reste doit s'y conformer. Conséquence assumée : un membre en voyage voit ses soirées rangées
à l'heure de chez lui, ce qui est le comportement voulu pour un journal — pas un défaut à corriger
par un réglage.

**Écartés volontairement :** Redis / rate limiting distribué (4 comptes), TanStack Query (les
Server Components et `use cache` couvrent les lectures), TanStack Table tant que la bibliothèque
n'est pas une vraie vue tableau.

### 7.1 La liste d'attente

On ne peut pas inviter quelqu'un par avance en OAuth : son identité n'existe qu'au moment où il
se connecte, et on ne connaît pas son compte GitHub à l'avance. Le contrôle se fait donc **après**
la création du compte, pas avant.

| Pièce | Fichier | Rôle |
| --- | --- | --- |
| `user.additionalFields` | `src/lib/auth/server.ts` | `username` et `status`, tous deux `input: false` — jamais fournis par le client |
| `mapProfileToUser` | `src/lib/auth/server.ts` | Reprend le `login` GitHub comme `username` |
| `databaseHooks.user.create.before` | `src/lib/auth/server.ts` | Rend le `username` unique et **force** `PENDING` |
| `requireApprovedUser()` | `src/lib/auth/session.ts` | Session validée + statut contrôlé |
| Garde | `app/(app)/layout.tsx` | Appelle `requireApprovedUser()`, une seule fois |
| Approbation | Prisma Studio | À quatre comptes, un basculement à la main suffit |

La garde s'appuie sur `unauthorized()` / `forbidden()`, déjà activés par
`experimental.authInterrupts` dans `next.config.ts` — et `src/app/unauthorized.tsx` et
`forbidden.tsx` existent déjà.

Le point à ne pas rater : **la garde est dans le layout de `(app)`, pas dans chaque page.** Une
vérification oubliée sur une seule route ouvrirait tout le reste.

**Un seul fournisseur, GitHub.** Le risque assumé est qu'un membre du cercle n'ait pas de compte
GitHub. Ajouter Google plus tard coûte une application OAuth à déclarer et quelques lignes de
configuration — ce n'est pas une décision qui s'enferme.

Le risque « GitHub ne renvoie pas toujours d'email » que ce document signalait est **sans objet** :
vérification faite dans le code du fournisseur, Better Auth demande déjà `read:user` et
`user:email` par défaut, et interroge `api.github.com/user/emails` pour retomber sur l'adresse
principale quand le profil public n'en expose pas. Un compte sans email public s'inscrit
normalement.

## 8. Fonctionnalités différenciantes retenues

Au-delà de ce que font AniList et MAL :

1. **Mémoire et timeline** (§4.3) — la raison d'être du journal.
2. **Ordre de visionnage d'une franchise.** Les `relations` AniList permettent de générer le
   graphe suite / préquelle / spin-off / film récap d'une franchise. Problème universel, mal
   résolu partout, et la donnée est déjà disponible. Meilleur rapport valeur / effort du projet.
3. **Récap annuel.** Heures, genres, notes, « ton année en 12 titres ». Découle gratuitement du
   journal.
4. **Écran « à reprendre ».** Les séries en pause depuis longtemps, avec l'option de les
   abandonner proprement. Personne ne le propose.
5. **Tirage au sort filtré** dans le `PLANNING` (« moins de 13 épisodes, terminé, pas de
   romance »).
6. **Où le regarder** — `externalLinks` d'AniList donne les plateformes de streaming.
7. **Affinité entre deux bibliothèques** — corrélation des notes, « ce qu'il a aimé et que tu
   n'as pas vu ». Prend tout son sens à 4 comptes.

Autour de la collection physique (§4.5) :

8. **L'écran « il me manque ».** Les trous de chaque série, consultable sur téléphone en
   librairie. C'est la raison d'être du modèle par tome, et la fonctionnalité qu'on utilisera le
   plus souvent.
9. **Saisie par plage.** « J'ai les tomes 1 à 12 » en une action. Sans ça, personne ne saisira
   une étagère de 300 tomes et la fonctionnalité restera vide.
10. **Bibliothèque partagée du cercle.** Qui possède quel tome, et le prêt (`lentTo`) : à quatre,
    l'app devient une petite bibliothèque de prêt. Différenciateur réel, impossible à faire sur
    AniList ou MAL.
11. **Scan de code-barres ISBN** (V2). L'ISBN identifie exactement le tome **et** l'édition, ce
    qu'aucune recherche par titre ne fait. Cataloguer une étagère devient un geste par livre.
    Nécessite une source ISBN (Google Books) — voir §9.
12. **Statistiques d'étagère** : nombre de tomes, séries complètes contre séries en cours, budget
    cumulé si les prix sont saisis.

## 9. Limites connues

- **AniList n'a pas de titre français.** L'UI est en français, mais les titres seront en romaji
  ou en anglais, selon la préférence du compte. Les `synonyms` contiennent parfois un titre FR,
  jamais de façon fiable. À accepter, ou à traiter par une seconde source — décision reportée.
- **AniList n'a aucune donnée par tome.** Il fournit un nombre total de volumes, et seulement
  pour les séries terminées — ni titre, ni couverture, ni date de parution, ni ISBN, ni éditeur,
  ni notion d'édition. Toute la collection physique (§4.5) repose donc sur de la saisie
  manuelle : le nombre de tomes d'une édition, son éditeur, son libellé.

  La sortie de secours est une **seconde source bibliographique** — Google Books couvre les
  éditions françaises avec ISBN, éditeur et date. Elle débloquerait le scan de code-barres,
  et accessoirement les titres français (voir le point précédent). À évaluer avant la V2, pas
  avant : elle ajoute une deuxième API à cacher et à réconcilier avec AniList, et l'appariement
  série AniList ↔ édition papier n'a rien d'automatique.

  Le calendrier des **sorties VF à venir** n'est couvert par aucune source gratuite fiable.
  Ne pas le promettre.

- **Quota AniList partagé** (§4.1). Toute fonctionnalité qui interroge AniList par utilisateur et
  par affichage est à considérer comme un incident en puissance.

- ~~**Le planning ne peut pas être global.**~~ **Levée le 8 septembre 2026 — la limite reposait sur
  une mesure fausse.** Elle affirmait qu'une semaine toutes œuvres confondues comptait « cinq mille
  entrées, mesuré, pas estimé », soit cent requêtes sur les trente de la minute, et concluait qu'un
  planning « tout AniList » n'était pas finançable ni même proposable en réglage.

  **Le vrai chiffre est 248.** Relevé sur la semaine du 7 au 13 septembre 2026, en comptant les
  cases réellement rendues par `/calendar?portee=tout` : 248 diffusions, dont 240 hors bibliothèque,
  sans atteindre le plafond de pages que l'écran s'impose. Soit **cinq requêtes** à cinquante par
  page, pas cent.

  L'erreur a une cause précise et elle était déjà écrite ailleurs dans ce dépôt : les cinq mille
  venaient de `pageInfo.total`, **qu'AniList plafonne à 5000 quelle que soit la requête** —
  exactement ce que `ANILIST_TOTAL_CAP` documente dans `media.queries.ts` depuis le 6 septembre, et
  que la version précédente de ce paragraphe reconnaissait à demi-mot en parlant d'un « plancher »
  sans en tirer la conséquence. Un plafond de compteur avait été lu comme un volume de données.

  `/calendar` propose donc les deux portées, et le choix est un simple `?portee=`. Le filtrage par
  `mediaId_in` reste le défaut : il est plus utile — c'est là que le retard par épisode a un sens —
  et non parce qu'il serait le seul soutenable. Un plafond de pages dur borne malgré tout le mode
  global (`media.queries.ts`), pour qu'une semaine anormalement chargée ne puisse pas surprendre le
  quota.
- **CGU AniList** : usage non commercial, attribution attendue.
- **Import MAL / AniList** : personne n'a de compte à migrer aujourd'hui, donc hors périmètre. Le
  choix d'aligner les statuts sur `MediaListStatus` (§4.2) suffit à garder la porte ouverte.

## 10. Questions ouvertes

Aucune ne bloque le schéma. Deux évaluations restent à faire en temps voulu :

- **Une seconde source bibliographique** (Google Books) pour l'ISBN, le scan de code-barres et,
  accessoirement, les titres français. À trancher avant la V2, pas avant — voir §9.
- **Un second fournisseur OAuth** si un membre du cercle n'a pas de compte GitHub (§7.1).
