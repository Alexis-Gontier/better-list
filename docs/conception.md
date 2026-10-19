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

**Un cercle privé d'environ quatre comptes** (D1). Inscription par GitHub, puis liste d'attente.
Le partage passe par un lien non listé, sans graphe social (D16). Ce qui découle de cette taille :
pas de découverte sociale, pas de modération, pas d'administration, pas de quota par utilisateur.

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

### 4.4 `List`, `ListItem`, `ListView`

`List` : propriétaire, titre, description, `shareToken` (D16). `ListItem` : `rank` en index
fractionnaire (réordonner ne modifie qu'une ligne), unique par `(listId, mediaId)`. Une tier list
serait une **vue** posée sur une liste (`ListView`, `ListViewItem`), pas une liste de plus. Les
vues sont reportées (D17). `List` et `ListItem` n'ont pas de journal.

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
| `/` | Carrousel des tendances, « En cours » (épisodes sortis en tête), tendances, saison, recommandations | livré |
| `/search` | Le catalogue AniList, filtres dans l'URL, repli sur le miroir | livré, sans les facettes genres/tags |
| `/library` | Ma bibliothèque : statuts, 7 tris et leur sens, filtre 18+, synonymes | livré |
| `/media/[id]` | La fiche : hero, suivi, cinq onglets (Aperçu, Personnages, Équipe, Œuvres liées, Tags) | livré, sans le journal de l'œuvre ni les chiffres de la communauté |
| `/character/[id]` · `/staff/[id]` | Une personne : faits, biographie, apparitions | livré |
| `/lists` · `/lists/[id]` | Mes listes, une liste réordonnable (glisser et clavier), remplie depuis elle-même (D47) | livré |
| `/lists/[id]/[viewId]` | Une vue posée sur une liste | **déclaré, non construit** (D17) |
| `/l/[token]` | Une liste partagée, **sans session** | livré |
| `/u/[username]` | Profil : favoris, statistiques, calendrier d'activité, journal | livré |
| `/calendar` | Planning de diffusion, retard épisode par épisode | livré |
| `/collection` · `/collection/[mediaId]` | L'étagère, les tomes manquants | livré, une seule édition par série |
| `/settings` | Compte, langue des titres, 18+, webhook Discord | livré |
| `/login` · `/signup` · `/waitlist` | Connexion GitHub, liste d'attente | livré |

Route handlers (chacun porte sa propre garde) : `api/auth/[...all]`, `api/search` et
`api/notifications` (session approuvée), `api/cron/refresh-media` et `api/cron/discord`
(`Bearer $CRON_SECRET`), `api/og/episode/[mediaId]/[episode]` (signature HMAC).

## 6. La suite

Sans ordre imposé :

1. **Les facettes genres et tags de `/search`**, avec l'exclusion (`genre_not_in`, `tag_not_in`).
   Elles libèrent `FILTER_VOCABULARY_QUERY` et `MediaTagOption` du gel de `knip.jsonc`.
2. **Le bas de la fiche** : le journal de l'œuvre, les chiffres de la communauté (ils libèrent
   `formatListStatus`, `formatRanking`, `ScoreDistribution`) et le bloc des tomes possédés.
3. **Annoter les cartes de `/search`** par ce qu'on suit déjà (« déjà suivi · ép. 14 »).
4. **Plusieurs éditions par série** sur `/collection` : le modèle les gère, il manque l'écran.
5. **L'ordre de visionnage d'une franchise** (§8) : le meilleur rapport valeur/effort.
6. **Étendre Playwright** aux écrans qui ne lisent que la base (collection, listes, réglages).

## 7. Choix techniques

Next 16 (App Router, `cacheComponents`, React Compiler), React 19, PostgreSQL sur Neon avec
Prisma 7, Better Auth, Zod 4, Tailwind 4 et shadcn, déploiement Vercel Hobby (D26).

### 7.1 La liste d'attente

En OAuth, on ne peut pas inviter quelqu'un à l'avance : le contrôle a donc lieu **après** la
création du compte (D24). `databaseHooks.user.create.before` (`lib/auth/server.ts`) rend le
`username` unique et force `PENDING`. `requireApprovedUser()` (`lib/auth/session.ts`) vérifie la
session et le statut, et le layout `(app)` l'appelle une seule fois (D25). L'approbation se fait
dans Prisma Studio.

## 8. Ce qui nous distingue

Livré : la mémoire et le journal (§4.3) ; l'écran « il me manque » avec la saisie par plage (§4.5) ;
les statistiques d'étagère ; le retard épisode par épisode (`/calendar`, l'accueil, la cloche) ;
les notifications Discord ; les favoris.

En attente :
- **l'ordre de visionnage d'une franchise**, à partir des `relations` AniList ;
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
