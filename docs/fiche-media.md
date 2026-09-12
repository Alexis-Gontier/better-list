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
- [x] `genres` — en badges `secondary`, dans l'onglet Aperçu. Traduits par `formatGenre` : dix-neuf valeurs fermées, donc une table est tenable
- [ ] `isAdult` — sert déjà de **filtre** côté serveur, sur l'œuvre comme sur ses relations, ses recommandations et ses tags ; reste à décider s'il se signale à l'écran

**Volume et durée**

- [x] `episodes` / `chapters` — le total, affiché comme dénominateur du suivi
- [ ] `volumes` — le nombre de tomes, et **seulement sur les séries terminées**
- [ ] `duration` — la durée d'un épisode, en minutes

**Temps**

- [x] `season` + `seasonYear` — « Printemps 2009 »
- [ ] `startDate` / `endDate` — dates floues : l'un des trois champs peut manquer
- [x] `nextAiringEpisode` — **sixième colonne de la ligne de faits**, pas une section : « Ép. 1178 · dans 2 j 7 h », date complète en infobulle. Le décompte est recalculé depuis `airingAt` au rendu, jamais lu dans `timeUntilAiring` — celui-ci est figé par le `cacheLife` d'un jour

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

- [x] `tags` — en badges `outline` avec leur `rank`, triés par pertinence décroissante, dans l'onglet Aperçu. **Les deux marqueurs de spoiler sont respectés** — `isMediaSpoiler` comme `isGeneralSpoiler` —, et ceux-là partent sous un repli dont le libellé dit ce qu'il cache. Les noms restent en anglais : plusieurs centaines de valeurs ouvertes, une table serait périmée à la semaine

**Les gens**

- [x] `studios` — le studio principal, en cinquième colonne de la ligne de faits, **sur les animes**
- [x] `staff` — l'auteur (« Story & Art »), même colonne, **sur les mangas** ; AniList n'a aucun éditeur (§9)
- [x] `characters` — au format AniList : personnage ancré à gauche, doubleur à droite, chacun tourné vers l'extérieur de la carte. **Six dans l'aperçu, vingt-cinq dans l'onglet**, qui a sa propre requête (`MEDIA_CHARACTERS_QUERY`)
- [x] `characters.voiceActors` — le doubleur japonais, à droite de son personnage, avec sa langue (`languageV2`). Le premier de la liste triée `[RELEVANCE]`, pas tous : un rôle redistribué entre deux saisons en compte plusieurs. Le côté droit **disparaît** quand il est vide — c'est le cas de tous les mangas
- [x] `staff` en entier — **quatre dans l'aperçu, vingt-cinq dans l'onglet** (`MEDIA_STAFF_QUERY`), avec leur rôle. Les rôles courants sont traduits et **la portée entre parenthèses est détachée puis raccrochée** (« Director (eps 1-278) » → « Réalisation (eps 1-278) ») : sans ça l'onglet d'une série longue restait presque tout en anglais

**Les liens vers d'autres œuvres**

- [x] `relations` — **groupées par nature de lien**, chaque groupe en jaquettes (`MediaCard`) sous son intitulé et son compte. C'est la première fois que cet écran ressemble à l'ordre de visionnage d'une franchise (PRODUCT.md §8) : la structure est la mise en page, pas une étiquette à lire ligne par ligne. Les groupes suivent `RELATION_ORDER` ; la colonne vertébrale — origine, préquelle, suite, œuvre principale, adaptation — reste dépliée, le contexte se replie. **Pas de requête dédiée** : le champ n'accepte aucune pagination chez AniList, donc la requête de fiche les a déjà toutes
- [x] `recommendations` — **six dans l'aperçu, vingt dans l'onglet** (`MEDIA_RECOMMENDATIONS_QUERY`), en `MediaCard` telle quelle : la même carte que `/search` et `/library`. Le `rating` n'est pas affiché — c'est l'ordre qui le porte

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

**La barre de suivi enregistre pour de bon depuis le 6 septembre 2026.** Elle a passé une séance en
coquille — ses contrôles répondaient au clic et leur état disparaissait au rechargement, le temps que
la mise en page soit validée. `saveEntry` et `removeEntry` existent
([`tracking.actions.ts`](../src/features/tracking/server/tracking.actions.ts)), et ce sont les
premières Server Actions du dépôt.

**Elle enregistre au geste**, là où la fenêtre d'édition enregistre au bouton : sur une fiche on
vient poser *un* geste, et un bouton « Enregistrer » ajouterait une confirmation à une décision déjà
prise. Dans les deux cas on n'envoie que **ce qui a changé**, jamais l'état complet (PRODUCT.md
§4.2).

**Et la fenêtre est là aussi**, depuis le 6 septembre : la barre porte le statut, la progression et
la note ; le bouton crayon ouvre le reste — les deux dates, les relectures, les notes personnelles.
C'est **exactement la même fenêtre** que sur une vignette de `/library` ou `/search`, son bouton
compris. Elle a remplacé le menu à trois points, qui promettait « Modifier les dates » sans le tenir.

### 2.1 Mon suivi — `Entry` (§4.2)

- [x] `status` — Prévu, En cours, Terminé, En pause, Abandonné, Relecture
- [x] `progress` — où j'en suis, en épisodes ou en chapitres. Les **déductions de la transition sont vérifiées à l'écran** : atteindre le dernier chapitre bascule le statut en « Terminé » et date la fin, sans que le client ait son mot à dire
- [ ] `progressVolumes` — où j'en suis en tomes, pour un manga suivi à la fois en chapitres et en volumes
- [x] `score` — ma note, stockée sur 0–100, affichée sur cinq étoiles par demies. **Effacer une note reste impossible** : `null` (« pas encore noté ») et zéro (« noté zéro », qui est un jugement) sont distincts en base, et les distinguer demande un geste à part qui n'existe pas encore
- [ ] `favorite` — le cœur
- [x] `startedAt` / `finishedAt` — **automatiques et rattrapables**, comme le §4.2 le demande : la transition date le début au premier épisode et la fin au dernier, et les deux champs de la fenêtre d'édition permettent de les corriger. Une date qu'on ne touche pas n'est pas effacée pour autant — le brouillon n'envoie que les différences
- [x] `repeatCount` — **compté automatiquement** quand une relecture se termine, et corrigeable à la main dans la fenêtre d'édition, pour rattraper un historique
- [x] `notes` — mes notes personnelles sur l'œuvre, dans la fenêtre d'édition
- [ ] `private` — masquer cette entrée aux autres membres du cercle
- [ ] Le retrait du suivi — **l'action existe et a été vue fonctionner**, sous confirmation `alert-dialog` comme ce document l'exigeait ; c'est son **appelant** qui a été retiré le 6 septembre, avec le menu à trois points (décision d'Alexis, le temps de redessiner ce qu'il doit porter). `removeEntry` est au gel de `knip.jsonc`, nommément
- [x] **Ajouter à ma bibliothèque** — et tant que l'œuvre n'y est pas, c'est le **seul** contrôle de la barre : un statut « Prévu », un compteur à zéro et cinq étoiles vides décrivent une entrée qui n'existe pas

### 2.2 Ma mémoire — `EntryEvent` (§4.3)

La table est *append-only*, et **non rétroactive** : ce qui n'est pas journalisé le jour même est
perdu pour toujours. C'est la raison d'être du produit.

**Elle se remplit depuis le 6 septembre 2026, et c'est la date qui compte.** `saveEntry` insère
l'entrée et ses événements **dans la même transaction** : une progression enregistrée dont
l'événement manquerait serait un trou qu'aucune reprise ne comble. Rien de ce qui suit n'est encore
**affiché** — les cases restent donc décochées — mais la matière, elle, s'accumule à partir
d'aujourd'hui. Tout ce qui s'est passé avant est définitivement perdu, et l'était déjà.

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

- [x] Le repli sur le miroir local quand AniList ne répond pas. **Son bandeau d'avis n'appartient plus à cette page** : il est rendu par le layout et vaut pour tout le site (`components/layout/anilist-outage-notice.tsx`) ; la fiche ne fait que rapporter par où sa lecture est passée
- [x] Le squelette de chargement, aux proportions du hero
- [x] L'œuvre pas encore suivie, distinguée de l'œuvre suivie à zéro — **par la barre entière, pas par une mention**. Non suivie : un bouton d'ajout, rien d'autre. Suivie : les trois contrôles. C'est la distinction la plus lisible possible, puisqu'on ne peut pas confondre deux écrans qui n'ont pas les mêmes objets

---

## Ce qui est à l'écran aujourd'hui, en une phrase

Un hero — bannière, jaquette, titre et titres secondaires, six faits (format, statut, compteur,
saison, studio ou auteur, prochain épisode) et une barre de suivi **qui enregistre pour de bon** —,
puis **cinq onglets** : Aperçu, Personnages, Équipe, Œuvres liées, Tags.

**L'aperçu donne l'inventaire, pas un chapitre** : synopsis, genres, six personnages, quatre
postes, trois liens et six recommandations, chaque bloc portant un « Tout voir » vers son onglet.
Ses chiffres sont exactement ce que la requête de fiche ramène, donc il ne coûte aucune lecture de
plus que le hero.

**Chaque onglet va chercher sa propre donnée.** Le serveur ne rend que le panneau désigné par
`?onglet=`, donc la lecture AniList part avec lui : Personnages en demande 25, Équipe 25,
Œuvres liées 20 recommandations. Tags et relations ne coûtent rien — les premiers voyagent
gratuitement avec la fiche, les secondes n'acceptent aucune pagination chez AniList.

**Le prix est explicite** : une visite qui reste sur l'aperçu coûte une requête, comme avant ;
chaque onglet ouvert en coûte une de plus, mise en cache pour la journée et partagée par les quatre
comptes. En échange, la recherche du navigateur ne trouve plus que l'onglet affiché.

**Un onglet vide n'est pas ouvert**, et la décision se prend sur l'échantillon de la fiche — jamais
en dépensant le crédit qui servirait à le remplir. C'est ce qui fait dégrader la fiche toute seule
un jour de coupure : le repli sur le miroir n'a ni personnages, ni équipe, ni relations, donc il ne
reste que l'aperçu.

Tout le reste de ce document attend encore.
