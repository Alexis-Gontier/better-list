# Better-List — conception

L'état présent du produit et de son modèle. Les choix un par un, avec leur numéro, sont dans le
[registre des décisions](decisions.md). Le déploiement est décrit dans [deploiement.md](deploiement.md).
Les conventions de code sont dans [CLAUDE.md](../CLAUDE.md) et [.claude/rules/](../.claude/rules/).

Le code cite les sections de ce fichier (« conception.md §4.1 ») : **garder leur numérotation**.

## 1. Le produit

Un catalogue d'œuvres japonaises et asiatiques (animes, mangas, webtoons, light novels) adossé à
l'API AniList. On s'y greffe **le suivi** de ce qu'on regarde, **la mémoire** de ce qu'on a vu et
quand, **la collection physique**, et **des listes** réordonnables. On reprend les conventions
d'AniList et de MyAnimeList (statuts, progression, notes, saisons). On se distingue par la mémoire
et par les listes.

## 2. Pour qui

**Un cercle privé d'une dizaine de comptes** (D55). Inscription par GitHub, Discord ou Google
(D56), puis liste d'attente, que les administrateurs tiennent depuis `/admin/users` (D57). Le
partage passe par un lien non listé (D16). Ce qui découle de cette taille : pas de découverte
publique, une modération réduite au bannissement, pas de quota par utilisateur.

## 3. Les œuvres

Tout le catalogue AniList : anime (`type: ANIME` + `format`), manga et one-shot
(`countryOfOrigin: JP`), webtoon et manhwa (`KR`), manhua (`CN`), light novel (`format: NOVEL`).
Hors périmètre, parce qu'AniList ne les couvre pas : le live-action, les dramas, les jeux vidéo.
Une liste ne contient que des œuvres (D3).

## 4. Modèle de domaine

### 4.1 `Media` — le miroir local

La décision structurante du projet (D9). AniList limite à **30 requêtes par minute par IP**, et en
production cette IP est partagée par tous les visiteurs. Sans copie locale, impossible d'afficher
600 titres, de les trier ou de survivre à une panne.

On stocke ce qu'une carte et un tri demandent : `anilistId`, titres et synonymes, jaquette et
couleur, `type`, `format`, `status`, pays, compteurs, saison, genres, `meanScore`, `isAdult`,
`syncedAt`. Synopsis, relations, personnages, staff et tags restent des lectures AniList sous
`"use cache"`.

Fraîcheur (D10) : 30 jours pour une œuvre finie ou annulée, 12 h pour le reste. Le cron passe une
fois par jour à 4 h UTC (`api/cron/refresh-media`), par lots de 50 fiches et au plus 20 requêtes.
Les plus anciennes passent d'abord. `ensureMediaMirror` sert de garde-fou à l'écriture (D11).

### 4.2 `Entry` — le suivi

Une ligne par couple `(user, media)`. Les statuts sont ceux d'AniList (D12) : `CURRENT`,
`PLANNING`, `COMPLETED`, `PAUSED`, `DROPPED`, `REPEATING`. Champs : `progress` (épisodes ou
chapitres, un curseur — D13), `progressVolumes`, `score` (0–100, affiché en cinq étoiles — D14),
`repeatCount`, `startedAt`, `finishedAt`, `notes`, `private`.

### 4.3 `EntryEvent` — la mémoire

Une table append-only (D15) : `PROGRESS`, `STATUS_CHANGED`, `SCORED`, `NOTE`, `REPEAT_STARTED`.
C'est elle qui porte le journal du profil, le calendrier d'activité et, plus tard, le récap annuel.
Elle n'est pas rétroactive : ce qui n'a pas été journalisé est perdu.

### 4.4 `List`, `ListItem`

`List` : propriétaire, titre, description, `shareToken` (D16). `ListItem` : `rank` en index
fractionnaire (réordonner ne modifie qu'une ligne), unique par `(listId, mediaId)`. `List` et
`ListItem` n'ont pas de journal.

Une liste a un **genre** (`kind`, D47) : sélection, classement (avec une ligne de coupe facultative,
`cutoff`), à voir, quand c'est fini, tier list (D67). Il ne change que l'affichage ; l'ordre reste `rank`. « Prête »
(parution terminée ou annulée, lue dans le miroir) et « vue » (suivi `COMPLETED`) se calculent, rien
n'est stocké (`features/lists/lib/list-sections.ts`). Le cron Discord annonce une œuvre d'une liste « Quand c'est fini » quand elle devient prête (D50).

Une liste « Membres » d'un autre s'aime (`ListLike`, unique par `(userId, listId)`) et se copie :
`forkedFromId` pointe vers l'original (`SetNull` s'il disparaît), la copie naît privée (D65).
`Notification` stocke les seules notifications sociales (like, copie, demande d'inscription), avec
`readAt` ; le retard d'épisodes reste calculé (D31, D65).

Une **tier list** est une liste de genre `TIER` (D67) : ses paliers vivent en JSON sur la liste
(`List.tiers`, huit au plus, validés par `tiersSchema`), le placement sur l'item
(`ListItem.tierIndex`, `null` = la réserve « Pas encore classées ») et `rank` ordonne dans le palier.
Toute la logique des paliers est pure (`features/lists/lib/tier-list.ts`). « Faire ma version »
copie œuvres et paliers, tout dans la réserve, et se lie à l'original par `versionOfId` (`SetNull`).

### 4.5 `Edition`, `OwnedVolume` — la collection physique

Posséder et avoir lu sont deux axes indépendants. `Edition` (série, libellé, éditeur, total de
tomes) est partagée entre les comptes ; `OwnedVolume` (une ligne par tome possédé) est personnel
(D20). Ce modèle permet de dire **ce qui manque**. La saisie se fait au clic sur la grille des
tomes, et un glissé pose une plage. Le total de tomes se résout à la lecture (D21).

### 4.6 `User`, `UserPreferences`, `Favorite`, `DiscordWebhook`

`User` est géré par Better Auth, avec `username` (le login GitHub) et `status`
(`PENDING`/`APPROVED`/`REJECTED`, §7.1). Préférences : la langue des titres (romaji, anglais ou
original) et le contenu adulte. `Favorite` concerne une œuvre, un personnage ou un membre du staff
(D18). `DiscordWebhook` : un webhook par compte (D30).

## 5. Les écrans

Tous les chemins viennent de [`src/config/routes.ts`](../src/config/routes.ts).

| Route | Rôle | État |
| --- | --- | --- |
| `/` (anonyme) · `/welcome` | La landing, servie à `/` par réécriture du proxy (D58, D71, D72) : barre collante, hero et capture de l'app, bandeau des tendances, six tuiles de fragments, recherche, entrée, FAQ, connexion sur la bannière du jour, pied de page en colonnes | livré |
| `/` | Carrousel des tendances, « En cours » (épisodes sortis en tête), tendances, listes de la communauté (D66), saison, recommandations | livré |
| `/search` | Le catalogue AniList, filtres dans l'URL, repli sur le miroir ; chaque carte dit où j'en suis, ou son format et son année (D69) | livré, sans les facettes genres/tags |
| `/library` | Ma bibliothèque : statuts, 7 tris et leur sens, filtre 18+, synonymes | livré |
| `/media/[id]` | La fiche : hero, suivi, six onglets (Aperçu, Ordre (D68), Personnages, Équipe, Œuvres liées, Tags), « Dans les listes » (D65), puis mon journal, ma collection et les chiffres de la communauté (D70) | livré |
| `/character/[id]` · `/staff/[id]` | Une personne : faits, biographie, apparitions | livré |
| `/lists` · `/lists/[id]` | Mes listes, « Membres » ou « Privée » ; la liste d'un autre membre en lecture, qu'on aime ou copie (D64, D65) ; une liste réordonnable (glisser et clavier), remplie depuis elle-même (D46), affichée selon son genre (D47) ; une tier list rangée par paliers, à la souris, au doigt ou au clavier, dont on fait sa version (D67) | livré |
| `/lists/community` | Les listes « Membres » des autres, triées par likes ou par date (D65) | livré |
| `/l/[token]` | Une liste partagée, **sans session**, 18+ retirées et comptées (D64) | livré |
| `/u/[username]` | Profil : listes, favoris, statistiques, calendrier d'activité, journal, chacun selon les réglages du membre (D64) | livré |
| `/calendar` | Planning de diffusion, retard épisode par épisode | livré |
| `/collection` · `/collection/[mediaId]` | L'étagère, les tomes manquants | livré, une seule édition par série |
| `/settings` | Compte et fournisseurs à lier ou délier, appareils connectés (D74), langue des titres, 18+, confidentialité (D64), webhook Discord, suppression du compte (D60) | livré |
| `/login` · `/waitlist` | Connexion GitHub, Discord ou Google, pastille « Dernière » (D56) ; liste d'attente. `/signup` redirige vers `/login` | livré |
| `/admin/users` | Demandes, membres, bannis : approuver, refuser, bannir, nommer (D57) | livré, réservé aux administrateurs |

Route handlers (chacun porte sa propre garde) : `api/auth/[...all]`, `api/search` et
`api/notifications` (session approuvée ; épisodes et activité, D65), `api/cron/refresh-media` et `api/cron/discord`
(`Bearer $CRON_SECRET`), `api/og/episode/[mediaId]/[episode]` (signature HMAC).

## 6. La suite

Sans ordre imposé :

1. **Les facettes genres et tags de `/search`**, avec l'exclusion (`genre_not_in`, `tag_not_in`).
   Elles libèrent `FILTER_VOCABULARY_QUERY` et `MediaTagOption` du gel de `knip.jsonc`.
2. **Plusieurs éditions par série** sur `/collection` : le modèle les gère, il manque l'écran.
3. **Étendre Playwright** aux écrans qui ne lisent que la base (collection, réglages).
4. **La note par œuvre d'une liste** (`ListItem.note`, en base et inutilisée) : d'où vient une
   recommandation, pourquoi tel rang.
5. **Un compte de démonstration ouvert à tous**, en **lecture seule** : un bouton « Essayer sans
   compte » sur la landing ouvre une session `@demo` (« Membre démo », celui des captures, D63)
   pour naviguer dans le site, sans **aucune** action possible. Il ne voit que son propre contenu,
   les membres ne le voient pas, et il est soumis à une limite de requêtes stricte pour épargner le
   quota AniList. À faire après le lot 2 de la refonte, dont les règles de visibilité portent
   l'isolation.
6. **Les suites des tier lists** (D67) : l'export en image (proposé, non tranché), et le
   classement moyen des versions d'une tier list, à la « Community Rank » de TierMaker.

## 7. Choix techniques

Next 16 (App Router, `cacheComponents`, React Compiler), React 19, PostgreSQL sur Neon avec
Prisma 7, Better Auth, Zod 4, Tailwind 4 et shadcn, déploiement Vercel Hobby (D26).

### 7.1 La liste d'attente

En OAuth, on ne peut pas inviter quelqu'un à l'avance : le contrôle a donc lieu **après** la
création du compte (D24). `databaseHooks.user.create.before` (`lib/auth/server.ts`) rend le
`username` unique et force `PENDING`. `requireApprovedUser()` (`lib/auth/session.ts`) vérifie la
session et le statut, et le layout `(app)` l'appelle une seule fois (D25). L'approbation se fait
sur `/admin/users`, derrière `requireAdmin()` posé dans le layout du segment ; ses actions passent
par `adminActionClient`. Le bannissement et le rôle sont ceux du plugin `admin` de Better Auth, qui
refuse lui-même la connexion d'un banni (D57).

## 8. Ce qui nous distingue

Livré : la mémoire et le journal (§4.3) ; l'écran « il me manque » avec la saisie par plage (§4.5) ;
les statistiques d'étagère ; le retard épisode par épisode (`/calendar`, l'accueil, la cloche) ;
les notifications Discord ; les favoris ; l'ordre de visionnage d'une franchise (D68).

En attente :
- **le récap annuel**, tiré du journal ;
- **un tirage au sort filtré** dans ce qu'on a prévu de voir ;
- **où le regarder**, à partir des `externalLinks` ;
- **l'affinité entre deux bibliothèques** ;
- **le scan d'ISBN**, qui demande une seconde source (§9).

## 9. Limites connues

- **AniList n'a ni titre ni synopsis en français.**
- **AniList n'a rien au niveau du tome** : ni ISBN, ni éditeur, ni date de parution. `volumes` n'est
  rempli qu'à la fin de la parution. La sortie de secours serait l'API SRU de la BnF (gratuite, sans
  clé), mais il faudrait apparier ses notices aux séries AniList. Aucune source gratuite fiable ne
  donne les sorties VF à venir.
- **Le quota AniList est partagé** (§4.1). Une lecture AniList faite à chaque affichage, pour
  chaque utilisateur, est un incident en puissance.
- **`pageInfo.total` est plafonné** (5000 en recherche, 500 sur une liste paginée) : c'est une
  limite, pas un compte.
- **AniList ne sait pas filtrer** par studio, auteur, personnage, langue de diffusion, ni chercher
  dans le synopsis.
- **CGU AniList** : usage non commercial, attribution attendue (elle est dans le pied de page).
- **Aucun import depuis MAL ou AniList** : personne n'en a besoin, et les statuts alignés (D12)
  laissent la porte ouverte.

L'inventaire détaillé de ce qu'AniList fournit, champ par champ et filtre par filtre, est dans la
skill `anilist-read` ([references/](../.claude/skills/anilist-read/references/)).

## 10. Questions ouvertes

- **Une seconde source bibliographique** (la BnF) pour l'ISBN et les titres français, à trancher
  avant le scan de code-barres.
- **Un second fournisseur OAuth**, si un membre du cercle n'a pas de compte GitHub.
