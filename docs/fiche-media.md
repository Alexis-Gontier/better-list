# La fiche d'une œuvre — inventaire de ce qu'on peut y mettre

> **Ce document est une liste à cocher, pas une spécification.** Une case cochée veut dire
> « c'est affiché sur `/media/[id]` aujourd'hui », pas « c'est décidé ». Ce qui reste décoché
> n'est pas une promesse : c'est du disponible, et la question de savoir si ça mérite une place à
> l'écran se tranche au cas par cas.

Il répond à une question qu'on se pose à chaque séance de refonte — *qu'est-ce qu'on a, au juste ?*
— et évite d'y répondre de mémoire. [PRODUCT.md](./PRODUCT.md) dit ce qu'on veut construire ;
[STATE.md](./STATE.md) dit où en est le dépôt ; celui-ci ne parle que d'un écran.

Relevé le **6 septembre 2026**.

---

## Comment cet inventaire a été établi, et ce qu'il vaut

**L'API AniList était coupée le jour du relevé** (403, « temporarily disabled due to severe
stability issues »), donc l'introspection du schéma vivant était impossible. Trois sources croisées,
et la précaution n'est pas de forme : le premier miroir trouvé était périmé — il lui manquait
`seasonYear`, que nos propres requêtes utilisent pourtant sans erreur.

| Source | Ce qu'elle vaut |
| --- | --- |
| [`schema.graphql` de TehNut/AniLinker](https://github.com/TehNut/AniLinker/blob/master/schema.graphql) | Daté. Fiable sur la **structure** des sous-objets, pas sur la liste des champs. |
| [pyanilist 0.9.0](https://pypi.org/project/pyanilist/) | Récent. Sa sélection confirme les champs modernes que le miroir ignore. |
| `features/media/server/media.documents.ts` | **La meilleure preuve** : ces requêtes tournent contre l'API réelle. |

**À revérifier par introspection au retour du service** avant d'écrire une requête sur un champ que
seul le miroir mentionne.

---

## 1. Ce qu'AniList fournit

### 1.1 Déjà ramené par `MEDIA_BY_ID_QUERY`

**Tout ce qui suit arrive déjà, en une seule requête, et ne coûte rien de plus.** Une case décochée
ici ne demande donc aucun budget de quota : la donnée est dans l'objet, elle attend un composant.

**Identité**

- [x] `title` — `romaji` / `english` / `native`, choisi selon la préférence du compte (§4.6)
- [x] Les titres secondaires, ceux qu'on n'a pas retenus en tête
- [ ] `synonyms` — titres officieux et traductions ; contient **parfois** un titre français, jamais de façon fiable
- [ ] `id` / `idMal` — les identifiants AniList et MyAnimeList
- [ ] `siteUrl` — le lien vers la fiche AniList (attribution attendue par leurs CGU, §9)

**Nature de l'œuvre**

- [x] `format` — Série TV, Film, OVA, Manga, Light novel…
- [x] `status` — En cours, Terminé, Annoncé, En pause, Annulé
- [ ] `countryOfOrigin` — ce qui distingue manga (JP), manhwa (KR) et manhua (CN)
- [ ] `source` — l'œuvre d'origine : manga, light novel, jeu vidéo, original…
- [ ] `genres` — la liste courte et officielle, à ne pas confondre avec les `tags`
- [ ] `isAdult` — sert déjà de **filtre** côté serveur ; reste à décider s'il se signale à l'écran

**Volume et durée**

- [x] `episodes` / `chapters` — le total, affiché comme dénominateur du suivi
- [ ] `volumes` — le nombre de tomes, et **seulement sur les séries terminées**
- [ ] `duration` — la durée d'un épisode, en minutes

**Temps**

- [x] `season` + `seasonYear` — « Printemps 2009 »
- [ ] `startDate` / `endDate` — dates floues : l'un des trois champs peut manquer
- [ ] `nextAiringEpisode` — quel épisode, à quelle heure, dans combien de temps

**Images**

- [x] `coverImage` — quatre tailles, plus `color`, la couleur dominante
- [x] `bannerImage` — **nulle sur la plupart des mangas et webtoons**, le cas est déjà traité
- [ ] `coverImage.color` — la couleur dominante, aujourd'hui stockée mais jamais employée
- [ ] `trailer` — `id`, `site` (YouTube ou Dailymotion), `thumbnail` ; les deux hôtes sont déjà autorisés dans `next.config.ts`

**Chiffres de la communauté**

- [ ] `averageScore` / `meanScore` — deux moyennes distinctes, toutes deux sur 100
- [ ] `popularity` — le nombre de comptes qui ont l'œuvre en liste
- [ ] `favourites` — le nombre de comptes qui l'ont mise en favori
- [ ] `stats.scoreDistribution` — l'histogramme des notes, par paliers de 10
- [ ] `stats.statusDistribution` — combien la regardent, l'ont finie, l'ont abandonnée
- [ ] `rankings` — « #1 des mieux notés de l'automne 2024 » ; `formatRanking` sait déjà les traduire

**Classification**

- [ ] `tags` — bien plus fins que les genres, avec un `rank` de pertinence, et **des marqueurs de spoiler à respecter** (`isMediaSpoiler`, `isGeneralSpoiler`)

**Les gens**

- [x] `studios` — le studio principal, en cinquième colonne de la ligne de faits, **sur les animes**
- [x] `staff` — l'auteur (« Story & Art »), même colonne, **sur les mangas** ; AniList n'a aucun éditeur (§9)
- [ ] `characters` — 12 demandés : rôle, nom, portrait
- [ ] `characters.voiceActors` — les doubleurs japonais, déjà demandés
- [ ] `staff` en entier — les 8 demandés, avec leur rôle

**Les liens vers d'autres œuvres**

- [ ] `relations` — suite, préquelle, adaptation, spin-off, film récap. **C'est la matière de l'ordre de visionnage d'une franchise** (PRODUCT.md §8, meilleur rapport valeur/effort du projet)
- [ ] `recommendations` — 12 œuvres proches, avec leur score de recommandation

**Ailleurs**

- [ ] `externalLinks` — les plateformes de streaming et les sites officiels, avec `color` et `icon`. **Communautaire et régional** : une indication, pas une garantie
- [ ] `streamingEpisodes` — les épisodes chez les diffuseurs, avec vignette et lien
- [x] `description` — le synopsis. **En anglais uniquement**, AniList n'en a pas de français (§9)

### 1.2 Disponible, mais pas encore demandé

Ces trois-là **coûteraient une requête chacune**, sur les trente de la minute que le serveur partage
entre tous les visiteurs (§4.1). À ne pas ajouter sans une raison qui vaut ce prix.

- [ ] `airingSchedule(page, perPage, notYetAired)` — **toute** la grille horaire de l'œuvre, et pas seulement le prochain épisode : chaque épisode passé et à venir, avec sa date
- [ ] `trends(...)` — `MediaTrend { date, trending, averageScore, popularity, inProgress, episode }`, soit la courbe de la note et de la popularité **dans le temps**, semaine par semaine
- [ ] `reviews(...)` — les critiques rédigées : `summary`, `body`, `score`, `rating`, auteur

Et des champs simples qu'on ne demande pas, faute d'emploi : `hashtag` (le mot-dièse de diffusion),
`updatedAt`, `trending` (score de tendance courant, distinct de `popularity`), `isLicensed`,
`seasonInt`, `isLocked`. Sans objet ici : `mediaListEntry` — c'est le suivi *chez AniList*, or on ne
s'authentifie jamais auprès d'eux.

**Des champs en plus sur ce qu'on demande déjà**, gratuits eux aussi : `tags.description` ;
`externalLinks.language` / `notes` / `isDisabled` ; sur un personnage `description`, `gender`, `age`,
`dateOfBirth`, `favourites`, `name{first, last, native, alternative}` ; sur un membre du staff
`primaryOccupations`, `dateOfBirth`/`dateOfDeath`, `yearsActive`, `homeTown`, `languageV2` ; sur un
studio `isAnimationStudio`. Les `voiceActors` peuvent être demandés dans **toutes** les langues, pas
seulement en japonais. Et `characters` / `staff` / `recommendations` sont paginés : nos plafonds de
12 / 8 / 12 sont notre choix, pas une limite de l'API.

### 1.3 Ce qu'AniList n'a pas — à ne jamais promettre

Ces quatre points sont déjà dans PRODUCT.md §9. Ils sont rappelés ici parce que c'est sur cette page
qu'on est tenté de les oublier.

- **Ni synopsis ni titre français.**
- **Rien par tome** : pas d'ISBN, pas d'éditeur, pas de date de parution, pas de couverture de tome. Seul `volumes` existe, et seulement sur les séries terminées.
- **Aucun calendrier de sorties VF**, et aucune source gratuite fiable pour en fabriquer un.
- `externalLinks` **ne garantit pas** qu'une plateforme diffuse l'œuvre dans le pays du visiteur.

---

## 2. Ce que le site fournit lui-même

C'est ici que se joue la différence avec AniList et MyAnimeList : ces données n'existent nulle part
ailleurs, et ce sont elles qui font le produit (PRODUCT.md §8).

**Aucune case n'est cochée, et c'est exact.** La barre de suivi du hero est posée, mais elle
**n'écrit rien** : son état vit dans le composant et disparaît au rechargement. Les Server Actions
viendront quand la mise en page sera validée.

### 2.1 Mon suivi — `Entry` (§4.2)

- [ ] `status` — Prévu, En cours, Terminé, En pause, Abandonné, Relecture *(le sélecteur existe, il n'enregistre pas)*
- [ ] `progress` — où j'en suis, en épisodes ou en chapitres *(le champ existe, il n'enregistre pas)*
- [ ] `progressVolumes` — où j'en suis en tomes, pour un manga suivi à la fois en chapitres et en volumes
- [ ] `score` — ma note, stockée sur 0–100, affichée sur cinq étoiles par demies *(les étoiles existent, elles n'enregistrent pas)*
- [ ] `favorite` — le cœur
- [ ] `startedAt` / `finishedAt` — mes dates, **automatiques par défaut et rattrapables à la main**
- [ ] `repeatCount` — combien de fois je l'ai revue
- [ ] `notes` — mes notes personnelles sur l'œuvre
- [ ] `private` — masquer cette entrée aux autres membres du cercle
- [ ] Le retrait du suivi — action destructive, **doit demander confirmation** (`alert-dialog` est installé)

### 2.2 Ma mémoire — `EntryEvent` (§4.3)

La table est *append-only*, et **non rétroactive** : ce qui n'est pas journalisé le jour même est
perdu pour toujours. C'est la raison d'être du produit.

- [ ] La timeline de cette œuvre : ce qui s'est passé, et quand
- [ ] Les événements `PROGRESS` — « 15 épisodes le 3 mars », déduit de `to - from`
- [ ] Les changements de statut, dans l'ordre
- [ ] L'historique des notes — `SCORED` garde toutes les notes successives, pas seulement la dernière
- [ ] Les relectures comme passages distincts — `REPEAT_STARTED`
- [ ] « Il y a 2 ans, tu commençais cette série »

### 2.3 Mes listes — `List`, `ListItem` (§4.4)

- [ ] Dans quelles listes cette œuvre se trouve déjà
- [ ] L'ajouter à une liste, l'en retirer *(le bouton existe, il n'enregistre pas)*
- [ ] La note personnelle attachée à l'œuvre **dans cette liste** — distincte de `Entry.notes`
- [ ] Créer une liste depuis la fiche, sans la quitter

### 2.4 Mon étagère — `Edition`, `OwnedVolume` (§4.5, V1.5)

- [ ] Les tomes que je possède, et **ceux qui me manquent** — la fonctionnalité qu'on utilisera le plus souvent
- [ ] L'édition concernée (simple, perfect, coffret, VO)
- [ ] Le prêt en cours — `lentTo`, pertinent précisément parce qu'on est quatre

### 2.5 Le cercle (§8)

Ces données existent en base dès aujourd'hui : ce sont les `Entry` des autres comptes. Rien à
récupérer, tout à afficher.

- [ ] Ce que les autres membres ont mis comme note sur cette œuvre
- [ ] Qui la suit, et où il en est
- [ ] Qui la possède en physique, et accepterait de la prêter

### 2.6 Réglages appliqués, pas affichés

- [x] `titleLanguage` — choisit le titre principal, déjà en place
- [x] `includeAdult` — filtre appliqué **dans la requête**, jamais par un masque d'affichage

### 2.7 États de l'écran

- [x] Le repli sur le miroir local quand AniList ne répond pas, et son bandeau d'avis
- [x] Le squelette de chargement, aux proportions du hero
- [ ] L'œuvre pas encore suivie, distinguée de l'œuvre suivie à zéro

---

## Ce qui est à l'écran aujourd'hui, en une phrase

Bannière, jaquette, titre et titres secondaires, cinq faits (format, statut, compteur, saison,
studio ou auteur), une barre de suivi **qui n'enregistre rien**, et le synopsis. Tout le reste de ce
document attend.
