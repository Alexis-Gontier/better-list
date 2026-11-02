# Refonte : entrée, confidentialité, listes sociales, accueil, tier lists

Spec du 1er novembre 2026, validée section par section avec Alexis. Document de chantier : une fois
fusionné, ses décisions passent dans `docs/decisions.md` et la spec est supprimée (CLAUDE.md).

## Contexte et périmètre

Better-List sort du cercle de deux personnes pour **une dizaine de comptes** (cent au plus, jamais
visé). Le social est donc dimensionné pour dix : pas de classement par période, pas de
gamification, pas de file de modération, pas de fil d'activité.

**Rien n'est public**, hormis une landing page et le lien de partage d'une liste, qui existe déjà.
Pas de profil public, pas de fiche publique, pas de SEO au-delà de `/`. C'est ce qui garde le quota
AniList (§4.1) à l'abri des visiteurs et des robots.

Inspirations retenues (analyse des sites du 1er novembre 2026) : les « Collections de la
communauté » de mangas-origines (mosaïque, ♥, tri « plus aimées / récentes », « Signaler »), les
rangées de listes de Letterboxd, la vitrine d'AniList pour l'anonyme.

**Écarté explicitement** par Alexis : fil d'activité, like d'une activité, abonnements entre
membres, chiffres des membres sur la fiche, affinité, commentaires sur une liste, note par œuvre
d'une liste (`ListItem.note` reste au schéma sans écran), « X % vu » sur une liste, slugs de liste,
listes mises en avant, position « Publique » d'une liste.

## Livraison

Cinq lots, une PR chacun, dans cet ordre. Chaque lot laisse l'app cohérente et déployable.

**Maquettes d'abord** (révise D54, demande d'Alexis) : les écrans nouveaux ou modifiés de chaque
lot sont dessinés dans `docs/design/better-list.fig` (lot 1) puis `docs/design/refonte.fig` (lots 2 à 5,
le premier fichier ayant atteint la limite de nœuds d'OpenPencil), en 1440 et 390 px, et **validés par Alexis
avant le code** du lot. Les tokens restent ceux de `globals.css` et les composants ceux de `src/` :
la maquette compose l'existant, elle n'invente pas de style. Une fois le lot livré, la maquette se
réaligne sur le code (D54 reste vrai après livraison).

1. **Entrée et comptes** (§1)
2. **Confidentialité** (§2)
3. **Listes sociales et notifications** (§3, §4) — les notifications naissent des likes et des forks
4. **Accueil** (§5) — sa rangée communautaire réutilise la carte du lot 3
5. **Tier lists** (§6) — s'appuie sur les likes, la copie et les notifications du lot 3

## 1. Entrée et comptes

### Routes

- **`/`** : sans cookie de session, `proxy.ts` **réécrit** (`NextResponse.rewrite`, l'URL reste `/`)
  vers une route publique `/welcome`, hors du groupe `(app)`. Avec un cookie, c'est l'accueil actuel.
  La réécriture, et pas un test dans la page, parce que la garde vit dans le layout `(app)` (D25) et
  ne doit pas avoir de trou. Un cookie expiré mène à `/login` par la garde, comme aujourd'hui : c'est
  le comportement attendu, pas la landing.
- **`/welcome`** : la landing (§5.2). Accessible directement aussi ; `routes.welcome`.
- **`/login`** : le bloc shadcn `login-02`, formulaire centré à gauche, mur de jaquettes à droite
  (caché sur mobile). Trois boutons `outline` identiques, logo de marque et libellé centrés : GitHub,
  Discord, Google. Sur celui de la fois précédente, une pastille « Dernière » (badge `default`)
  posée à cheval sur le bord supérieur droit, comme chez Neon ou Clerk. Le nom accessible du bouton
  la contient.
- **`/signup` disparaît**, fusionné dans `/login` : en OAuth seul, s'inscrire et se connecter sont le
  même geste. Une redirection permanente `/signup` → `/login` garde les anciens liens.
- **`/waitlist`** : inchangé.
- **`/admin/users`** : réservé au rôle `admin` (§1.3).
- **`robots.ts`** : autorise `/` seulement, interdit tout le reste. `/welcome` porte une balise
  `canonical` vers `/`. `/login` et `/waitlist` restent `noindex`.

### Fournisseurs et liaison

- Better Auth : GitHub (existant), **Discord**, **Google**. Variables d'environnement ajoutées à
  `config/env.ts` et à `docs/deploiement.md`.
- **`account.accountLinking`** activé, avec `trustedProviders: ["github", "discord", "google"]` : une
  personne qui arrive par deux fournisseurs avec le même e-mail vérifié a **un seul compte**, et ne
  repasse pas par la liste d'attente.
- `databaseHooks.user.create.before` dérive aujourd'hui le `username` du login GitHub. Il le dérive
  désormais du profil du fournisseur (login GitHub, nom d'utilisateur Discord, partie locale de
  l'e-mail Google), normalisé et rendu unique comme aujourd'hui.

### Plugins Better Auth

- **`admin`** : ajoute `role`, `banned`, `banReason`, `banExpires` à `User` et `impersonatedBy` à
  `Session` (migration Prisma). Utilisé pour : lister les comptes, poser un rôle, bannir et débannir
  avec un motif, révoquer les sessions, supprimer un compte. Un compte banni ne peut plus se
  connecter, c'est Better Auth qui le refuse. **L'usurpation (`impersonateUser`) est désactivée**
  par les permissions du plugin : entre amis, ce serait lire leur compte.
- **`lastLoginMethod`** : cookie seul (`storeInDatabase: false`), lu par `/login` pour le badge.
- `status` (`PENDING` / `APPROVED` / `REJECTED`) **reste** : la liste d'attente n'est pas couverte par
  le plugin. `REJECTED` sert au refus d'une demande ; le bannissement d'un membre approuvé passe par
  `banned`. `requireApprovedUser()` est inchangé.

### Administration

`/admin/users`, garde `requireAdmin()` (session approuvée **et** `role === "admin"`), appelée dans
le layout du segment.

Composée comme le bloc shadcn `dashboard-01` (maquette validée le 1er novembre 2026) : trois
onglets avec compteurs, **En attente**, **Membres**, **Bannis**, chacun une `Table`.

- **En attente** : les comptes `PENDING`, du plus ancien au plus récent, avec avatar, pseudo,
  fournisseur (logo) et ancienneté de la demande. « Refuser » et « Approuver » par ligne, et une
  sélection multiple avec une barre « Approuver la sélection ». Chaque action confirme par un toast
  avec « Annuler ».
- **Membres** : avatar, comptes liés (logos), rôle, date d'arrivée, et un menu « ⋯ » : Voir le
  profil, Nommer administrateur, Bannir….
- **Bannir** ouvre un `AlertDialog` : durée (7 jours, 30 jours, définitif — `banExpires`) et motif,
  visible des seuls administrateurs. Les listes d'un membre banni sortent de la communauté et de
  « Présente dans N listes » ; rien n'est supprimé.
- **Bannis** : le motif, la fin du bannissement et « Réintégrer ».
- Sur mobile, chaque ligne devient une carte.
- Un administrateur ne peut ni se bannir ni retirer son propre rôle.
- Le premier administrateur se pose une fois à la main (Prisma Studio, ou un script de `scripts/`).

Approuver ne prévient pas le demandeur : il n'y a pas d'e-mail. `/waitlist` le dit (« Revenez plus
tard, ou prévenez Alexis »).

### Suppression de compte

Dans `/settings`, une zone « Supprimer mon compte » qui demande de recopier son pseudo (comme D40).
Supprime l'utilisateur ; le schéma cascade déjà tout (suivi, journal, listes, collection, favoris,
webhook, notifications). Une liste copiée par d'autres perd sa mention d'origine (`SetNull`). Le
dernier administrateur ne peut pas se supprimer.

## 2. Confidentialité entre membres

Tout se joue entre membres connectés : il n'y a plus de public.

### Profil

Dans `/settings`, rubrique « Confidentialité », enregistrement un par un (D44). Colonnes booléennes
ajoutées à `UserPreferences`, toutes à `true` par défaut (l'état actuel) :

- `profileVisible` — « Profil visible des membres ». Faux : mon profil ne montre aux autres que mon
  avatar, mon pseudo et mes listes « Membres ».
- `showJournal`, `showStats`, `showActivityCalendar`, `showFavorites` — une par section du profil,
  lues seulement si `profileVisible`.

- `showAdult` — « Œuvres 18+ sur mon profil », **`false` par défaut**. Faux : mes œuvres 18+ sont
  traitées comme `Entry.private` pour les autres sur tout le profil (journal, favoris,
  statistiques), compteurs compris. Vrai : elles apparaissent, mais seulement aux membres qui ont
  eux-mêmes `includeAdult` (D7 reste vrai). Les listes n'en dépendent pas : le filtre du lecteur
  s'y applique déjà.

C'est ainsi que se règle le « suivi privé » : couper journal et statistiques cache ce que je
regarde. `Entry.private` reste, pour cacher une seule œuvre partout. Le propriétaire voit toujours
tout son profil.

### Listes

- Colonne `List.visibility` : enum `ListVisibility { PRIVATE MEMBERS }`, défaut `MEMBERS`
  (l'état actuel). Choisie dans le formulaire de liste et dans son menu d'actions.
- **Privée** : visible de son propriétaire seul. Absente de la page Communauté, de « Présente dans
  N listes », du profil, des compteurs de copies.
- **Le lien de partage `/l/[token]` reste** (D16) et fonctionne quelle que soit la visibilité : le
  partager est un geste volontaire.
- **Sur `/l/[token]`, les œuvres 18+ sont retirées** pour un visiteur sans session, avec la mention
  « + N œuvres réservées aux membres ». Révise D49 (floutées jusqu'ici). L'aperçu du lien n'en
  montre toujours aucune.

### Où la règle s'applique

Deux helpers serveur, testés en unitaire, par lesquels passent **toutes** les requêtes concernées :

- `canViewProfileSection(viewerId, owner, section)` dans `features/profile/lib/` ;
- `visibleListsWhere(viewerId)` dans `features/lists/server/` : une clause Prisma `where` (mes
  listes, ou celles des autres en `MEMBERS`).

Aucun écran ne filtre lui-même.

## 3. Listes sociales

### Likes

- Table `ListLike` : `userId`, `listId`, `createdAt` ; `@@unique([userId, listId])`,
  `@@index([listId])` ; cascade des deux côtés.
- On ne like pas sa propre liste ; on ne like qu'une liste visible (`visibleListsWhere`).
- Bouton ♥ + compteur en tête de `/lists/[id]` (liste d'un autre) et sur chaque carte. Mise à jour
  optimiste, Server Action `toggleListLike`.
- Pas de compteur dénormalisé : `_count` suffit à dix comptes.

### Fork

- « Copier dans mes listes » (icône de copie, bouton `outline`) sur la liste d'un autre membre, à
  côté du bouton ♥ qui porte le compteur ; l'en-tête dit « Sora · Top 10 · copiée 2 fois ». Un
  toast confirme « Copiée dans vos listes, en privé » avec « Ouvrir ». Une transaction crée la copie : titre,
  description, `kind`, `cutoff`, et tous les items avec leurs `rank`. La copie naît **`PRIVATE`**.
  `forkedFromId` (déjà au schéma) pointe vers l'original. On est redirigé vers la copie.
- Ne sont pas recopiés : `shareToken`, likes, `ListItem.note`, `readyNotifiedAt`.
- La copie affiche « Copiée de *Titre* · Pseudo » avec un lien, si l'original existe et m'est
  visible. Original supprimé : `SetNull`, la mention disparaît.
- L'original affiche « Copiée N fois », en ne comptant que les copies visibles du lecteur.
- Copier une de ses propres listes n'est pas proposé (le formulaire de création suffit).

### Page Communauté

- Route **`/lists/community`** (segment statique, prioritaire sur `[id]` ; précise D6).
  `routes.lists.community`.
- Les listes `MEMBERS` des **autres** membres, non vides. Tri `?tri=aimees` (défaut : nombre de
  likes, puis `updatedAt`) ou `?tri=recentes` (`createdAt`). Pagination « Voir plus » par l'URL.
- Carte : `ListCoverMosaic` existante, titre, avatar et pseudo de l'auteur, nombre d'œuvres, ♥ et
  compteur, glyphe du genre. Cette carte est partagée avec la rangée de l'accueil (§5).
- `/lists` devient « Mes listes » ; un onglet en tête bascule entre « Mes listes » et
  « Communauté ».
- États (D45) : aucune liste dans la communauté ; chargement.

### « Présente dans N listes » sur la fiche

- Bloc « Dans les listes · N » de `/media/[id]` : les listes visibles qui contiennent l'œuvre, les
  miennes comprises. Quatre petites cartes au plus (deux jaquettes, titre, auteur, et le rang de
  l'œuvre si la liste est un classement), puis « Tout voir » (une fenêtre avec la liste complète).
  Caché si N = 0.
- Lecture de base uniquement, frontière `<Suspense>` propre (D29).

## 4. Notifications sociales

### Modèle

Table `Notification` :

- `id`, `recipientId`, `actorId`, `type` (enum `NotificationType`), `listId?`, `createdAt`,
  `readAt?`.
- `@@index([recipientId, readAt, createdAt])` ; cascade sur destinataire, acteur et liste.
- Précise D31 : le retard d'épisodes reste calculé, seules les notifications sociales sont stockées.

Types :

- `LIST_LIKED` — « Sora a aimé *Best of isekai* ».
- `LIST_FORKED` — « Léo a copié *Best of isekai* ».
- `SIGNUP_PENDING` — pour chaque administrateur : « Nouvelle demande : Pseudo (via Discord) »,
  lien vers `/admin/users`. Écrite par le hook de création de compte.

### Règles

- Écrite dans la même transaction que le like ou le fork.
- Retirer un like supprime sa notification **non lue**. Un like remis ne crée pas de doublon non lu
  (on cherche une `LIST_LIKED` non lue du même acteur sur la même liste avant d'écrire).
- Approuver ou refuser une demande marque lues les `SIGNUP_PENDING` qui la concernent, chez tous les
  administrateurs.
- Pas de regroupement, pas de préférences par type, pas d'envoi Discord ni e-mail.

### La cloche

- `notifications-menu.tsx` prend deux onglets : « Épisodes » (l'existant) et « Activité ».
- Pastille : épisodes en retard + notifications non lues.
- Ouvrir l'onglet « Activité » marque lues ses notifications (Server Action `markNotificationsRead`).
- `api/notifications` renvoie les deux sources (D27). Sa garde reste la sienne (session approuvée).

## 5. Accueil

### 5.1 Accueil connecté

De haut en bas :

1. Carrousel « À la une » — inchangé.
2. « En cours » — inchangé.
3. Trait — inchangé.
4. **« Listes de la communauté »** (nouveau) : les 8 listes les plus aimées des autres, carte de
   §3, lien « Tout voir » vers `/lists/community`. Cachée s'il n'y en a aucune. Lecture de base.
5. « Tendances » — inchangé (animes, sans onglets). **Décision du 2 novembre 2026** : l'accueil
   reste celui d'aujourd'hui, on n'y ajoute que la rangée des listes. Les onglets Anime, Manga,
   Manhwa, Light novel et un « Top 10 » numéroté ont été maquettés puis écartés : ils rouvraient le
   second catalogue retiré le 14 septembre 2026, que `/search` fait mieux. Pour mémoire, un vrai
   « Top 10 de la semaine » est faisable (`Page.mediaTrends`, relevés quotidiens, environ
   8 requêtes par type et par jour) si la question revient.
6. « Cette saison » — inchangé (animes seulement).
7. « Recommandé pour vous » — inchangé.

### 5.2 Landing (`/welcome`)

Maquette validée le 1er novembre 2026 (page « Refonte — Lot 1 » de `better-list.fig`). Direction
« split stage » tirée par la skill `design-taste-frontend`, dans les couleurs et la typographie
Obsidienne. L'idée : le mur des jaquettes reste fixe pendant qu'on lit.

1. **Hero** : à gauche, le mur de jaquettes (`position: sticky`) ; à droite, la navigation (Le
   suivi, Le journal, Les listes, L'étagère, « Se connecter » en contour), la phrase « Le carnet
   privé où une dizaine d'amis suivent leurs animes, mangas et webtoons, épisode par épisode. » et le
   seul bouton d'accent, « Se connecter ». Le nom « better-list » en très grand (`h1`) traverse le
   coin du mur.
2. **Un épisode, une trace** : deux champs côte à côte, le geste (« ép. 13 → 14 ») et le journal
   qu'il produit (calendrier d'activité, entrées datées).
3. **Le carnet complet** : le titre tient pendant que passent quatre blocs, chacun un fragment
   d'interface et une liste courte : le suivi, l'étagère, les listes, entre vous.
4. **Entrez dans le cercle** : la vraie fenêtre de connexion, déjà ouverte.
5. Pied sur une ligne : ce que c'est, les liens, l'attribution AniList.

Les fragments ne montrent aucune donnée de membre réelle. Mur de jaquettes lu à la requête (D52),
sans 18+.

## 6. Tier lists

Inspirées de TierMaker (analyse du 1er novembre 2026) : ses rangées pastel, son menu de palier, sa
réserve d'œuvres non classées et son principe de « modèle » qu'on classe chacun à sa façon. On
comble ses manques : pas de clavier, glisser pénible sur mobile, enregistrement local.

### Modèle

- `ListKind.TIER`, cinquième genre de liste. Une tier list est une liste : likes, copie,
  Communauté, visibilité et lien de partage s'y appliquent sans rien d'autre.
- `List.tiers` (JSON) : `[{ label: "S", color: "#FF7F7F" }, …]`. Défaut S, A, B, C, D aux pastels de
  TierMaker (`#FF7F7F`, `#FFBF7F`, `#FFDF7F`, `#FFFF7F`, `#BFFF7F`). Huit au plus. Validé par Zod.
- `ListItem.tierIndex Int?` : le palier ; `null` = réserve « Pas encore classées », où arrive toute
  œuvre ajoutée. `rank` ordonne les œuvres dans leur palier.
- Une liste qui quitte le genre garde ses paliers et ses `tierIndex` (comme `cutoff`, D47).
- Supprimer un palier renvoie ses œuvres dans la réserve et décale les `tierIndex` au-dessus, dans
  une transaction.
- `List.versionOfId` (distinct de `forkedFromId`, `onDelete: SetNull`) relie une « version » à
  l'original.
- Les tables `ListView` et `ListViewItem` sont supprimées par migration : **révise D17**, la tier
  list est un genre, pas une vue.
- **Exception à D33** : les étiquettes de palier portent leur couleur pastel. C'est le code visuel
  universel des tier lists ; elles sont la seule couleur hors jaquettes.

### L'éditeur (`/lists/[id]`, genre Tier list, propriétaire)

- Une rangée par palier : étiquette colorée à gauche (le nom, en noir sur le pastel), jaquettes au
  milieu, menu « ⋯ » à droite. La réserve en bas, sur fond `card`.
- Déplacer : glisser-déposer `dnd-kit` (souris, appui long au doigt, clavier : Espace puis flèches,
  comme le réordonnancement actuel). Geste rapide : un clic sur une jaquette ouvre un menu « Mettre
  en S / A / … / Retirer du classement ».
- Menu d'un palier : renommer, couleur (11 pastels et 4 gris de TierMaker), ajouter au-dessus ou en
  dessous, monter ou descendre, vider (vers la réserve), supprimer.
- Chaque geste part aussitôt (D37) : Server Actions `moveTierItem` et `updateTiers`, mises à jour
  optimistes.
- « Ajouter des œuvres » (D46) verse dans la réserve.

### Ailleurs

- Lecture (liste d'un autre) : les mêmes rangées, sans poignées ni réserve, ♥ et « Copier ».
- Carte de liste : la mosaïque prend les jaquettes du palier le plus haut ; glyphe du genre.
- Fiche, « Dans les listes » : le palier remplace le rang (« Sora · S »).
- `/l/[token]` : les rangées, 18+ retirées avec « + N réservées aux membres » (§2).

### Copier une tier list

« Copier » ouvre un choix :

- **Copier avec son classement** : la copie du §3, paliers et placements compris.
- **Faire ma version** : mêmes œuvres et mêmes paliers, tout dans la réserve ; privée ; liée par
  `versionOfId`. L'original affiche « N versions » avec les avatars, chaque version mène à
  l'original. Notification `LIST_VERSIONED` à l'auteur : « Léo a fait sa version de *…* ».

Hors périmètre pour l'instant : l'export en image (proposé, non tranché), le classement moyen des
versions (à la « Community Rank » de TierMaker), roue aléatoire, sondage.

## Données : récapitulatif des migrations

- `User` : champs du plugin `admin` (`role`, `banned`, `banReason`, `banExpires`).
- `Session` : `impersonatedBy` (exigé par le plugin, inutilisé).
- `UserPreferences` : `profileVisible`, `showJournal`, `showStats`, `showActivityCalendar`,
  `showFavorites` (défaut `true`), `showAdult` (défaut `false`).
- `List` : `visibility ListVisibility @default(MEMBERS)`.
- Nouvelles tables : `ListLike`, `Notification` ; nouveaux enums : `ListVisibility`,
  `NotificationType`.
- Lot 5 : `ListKind.TIER`, `List.tiers`, `List.versionOfId`, `ListItem.tierIndex`,
  `NotificationType.LIST_VERSIONED` ; suppression de `ListView` et `ListViewItem` (vides).

Toutes additives (sauf la suppression des deux tables vides), avec des défauts qui reproduisent le comportement actuel : déployables sans
reprise de données.

## Erreurs et cas limites

- Liker, copier ou voir une liste devenue privée entre-temps : l'action renvoie une erreur métier
  (« Cette liste n'est plus disponible »), la page passe en `notFound()`.
- Fork d'une liste de plusieurs centaines d'œuvres : un `createMany` dans la transaction.
- Compte banni pendant une session : Better Auth révoque ses sessions au bannissement.
- Fournisseur qui ne renvoie pas d'e-mail vérifié : pas de liaison, un compte distinct naît
  `PENDING` — c'est le comportement sûr.
- AniList en panne : la landing (mur de jaquettes) a son repli ; l'accueil garde les siens.

## Tests

- **Unitaires (Vitest)** : `canViewProfileSection`, `visibleListsWhere`, la copie d'une liste (ce
  qui est recopié ou non), les règles de notification (pas de doublon, suppression au retrait),
  la dérivation du `username` par fournisseur, `requireAdmin`, les paliers (suppression d'un palier,
  décalage des `tierIndex`, « Faire ma version » qui vide les placements).
- **E2E (Playwright)** : `/` anonyme montre la landing et `/` connecté l'accueil ; `/signup`
  redirige ; liker et copier une liste d'un autre compte ; une liste privée absente de la
  Communauté ; `/l/[token]` sans session ne montre pas une œuvre 18+ ; `/admin/users` refusé à un
  non-admin ; ranger une œuvre dans un palier au clavier. Comptes de test de la skill `e2e-test`.
- Vérification visuelle de chaque écran touché, en 1440 et 390 px.

## Documentation à mettre à jour (dans les PR des lots)

- `docs/decisions.md` : révise **D1** (dizaine de comptes, social limité aux likes, forks et
  notifications), **D7** (confidentialité réglable), **D8** (`/` indexable), **D23** (trois
  fournisseurs), **D24** (approbation dans l'app), **D31**, **D49**, **D17** (tier list = genre),
  **D33** (couleurs de palier) ; précise **D6**, **D16**.
  Nouvelles décisions à partir de **D55**.
- `docs/conception.md` : §2, §4.4, §4.6, §5 (routes), §6, §7.1.
- `CLAUDE.md` : « cercle privé d'environ quatre comptes, connexion GitHub seule ».
- `docs/deploiement.md` : identifiants OAuth Discord et Google, URL de rappel.
- `docs/design/better-list.fig` : maquettes validées avant chaque lot, réalignées après (D54 révisée).
- `docs/decisions.md` : nouvelle décision qui révise D54 (maquette avant le code pour un écran
  nouveau ou modifié, réalignée après livraison).
