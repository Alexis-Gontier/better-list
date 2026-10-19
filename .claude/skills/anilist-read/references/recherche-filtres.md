# Les filtres du catalogue — inventaire de ce qu'on peut y mettre

> Référence de la skill `anilist-read`, déplacée depuis `docs/` le 19 octobre 2026. Les cases
> cochées disent ce qui était branché ce jour-là : vérifier dans le code avant de s'y fier. Les
> « §4.1 », « §8 »… renvoient à [docs/conception.md](../../../../docs/conception.md).

> **Ce document est une liste à cocher, pas une spécification.** Une case cochée veut dire
> « ce filtre est utilisable sur `/search` aujourd'hui », pas « c'est décidé ». Ce qui reste
> décoché n'est pas une promesse : c'est du disponible, et la question de savoir si ça mérite une
> place dans la barre se tranche au cas par cas.

Même rôle que [fiche-media.md](./fiche-media.md), sur l'autre écran : celui-ci ne parle que de
**ce par quoi on peut restreindre une liste d'œuvres**. [conception.md](../../../../docs/conception.md) dit ce qu'on
veut construire ; [conception.md §5](../../../../docs/conception.md) dit où en est le dépôt.

Relevé le **6 septembre 2026**.

> **Dix-huit cases sur soixante-six.** La barre porte le terme, le type et le tri ; le panneau
> dépliant porte le format, le statut, le pays d'origine, les genres, la saison, la plage d'années
> et la note minimale. Une rangée de puces dit lesquelles sont posées et permet d'en retirer une
> sans rouvrir le panneau.
>
> **La grille de résultats existe, et elle lit l'adresse.** C'était la réserve du relevé de la
> veille : une case cochée voulait dire « le contrôle est à l'écran », pas « la requête part ».
> Elle est levée — les quinze filtres cochés partent réellement chez AniList, et trois lignes
> passent au vert avec la grille : la pagination, le repli sur le miroir local, et l'anti-rebond
> de la frappe.
>
> Ce qui reste décoché se répartit en trois familles, et c'est la carte du travail restant :
> les **tags** (plus d'un millier, et seul `MediaTagCollection` les connaît), les **exclusions**
> (`genre_not_in`, `tag_not_in` — la moitié de l'usage réel d'une liste de genres), et tout le
> §2, qui demande d'abord qu'on tranche comment filtrer sur nos propres lignes sans trouer la
> grille. **`/library` en a tranché une part par l'issue 3** le même jour, en emmenant ces
> facettes sur l'écran qui pagine en base plutôt qu'en les forçant sur celui-ci.

---

## Comment cet inventaire a été établi, et ce qu'il vaut

**L'endpoint GraphQL est toujours coupé** — 403, « temporarily disabled due to severe stability
issues », vérifié le jour même. L'introspection du schéma vivant reste donc impossible, comme
pour fiche-media.md.

**Mais la documentation, elle, répond.** C'est la différence avec le relevé de la fiche, qui
avait dû se contenter de miroirs GitHub : `docs.anilist.co` est en ligne et à jour, et c'est de
là que vient la liste ci-dessous.

| Source | Ce qu'elle vaut |
| --- | --- |
| [`docs.anilist.co/reference/query`](https://docs.anilist.co/reference/query) | **Fait autorité.** La documentation officielle, servie par AniList, avec les arguments, leurs types et leurs plafonds. |
| [`data/schema.graphql` d'AniTrend/anitrend-v2](https://github.com/AniTrend/anitrend-v2/blob/develop/data/schema.graphql) | Recoupement. Dépôt vivant, poussé le jour du relevé — **il concorde argument pour argument** avec la doc officielle. |
| [`schema.graphql` de TehNut/AniLinker](https://github.com/TehNut/AniLinker/blob/master/schema.graphql) | Le miroir employé par fiche-media.md. Gardé pour comparaison, et **il a montré sa limite** : voir ci-dessous. |
| `features/media/schemas/search-media.schema.ts` | Ce qu'on accepte aujourd'hui — quatorze champs, dont six seulement partent chez AniList. |

**Le recoupement a payé, et disqualifie le miroir daté.** Cinq arguments existent dans la doc
officielle et manquent chez AniLinker : `countryOfOrigin_in`, `countryOfOrigin_not_in`,
`isLicensed`, `licensedById`, `licensedById_in`. Même leçon que sur la fiche — un miroir daté est
fiable sur la **structure**, pas sur la liste des champs. **La doc officielle est désormais la
source à citer**, et l'introspection au retour du service ne servira qu'à confirmer.

---

## Le prix d'un filtre, qui décide de tout le reste

Un filtre n'est pas un composant, c'est une **clé de cache**. Chaque combinaison distincte de
facettes est une requête AniList de plus, sur les **trente que la minute partage entre tous les
visiteurs** — le plafond nominal est de 90, la doc officielle prévient qu'il est *temporairement*
ramené à 30 le temps que l'API se remette. On dimensionne sur 30.

Trois conséquences, à garder en tête en lisant les cases :

1. **Une facette close coûte peu** — cinq statuts, c'est cinq clés. Une facette continue coûte
   cher : une note au point près, c'est cent clés par cran d'un autre filtre. Les curseurs que
   demande la spec du 2 septembre doivent donc **s'arrêter par paliers** (dizaines pour la note,
   années pour les dates), pas au point près.
2. **Un filtre appliqué après coup n'est pas un filtre.** AniList pagine avant qu'on voie quoi
   que ce soit. C'est tout l'objet du §2, et c'est le point dur de cet écran.
3. **La disposition n'est pas un filtre.** `view` change la grille sans changer la requête : il
   n'entre pas dans la clé de cache aujourd'hui, et ne doit jamais y entrer.

---

## 1. Ce qu'AniList sait filtrer — `Page.media(...)`

Soixante-dix arguments, regroupés par ce qu'ils permettent de **demander**, pas par ordre
alphabétique. Une case = une intention d'écran, même quand trois arguments la servent.

Un plafond vaut pour toutes les listes : **`_in` et `_not_in` acceptent au plus 10 000 valeurs**.
Aucun risque de le toucher — notre garde-fou maison est à 20 (`MAX_FILTER_VALUES`), parce
qu'au-delà l'URL n'est plus une URL.

### 1.1 Le terme

- [x] `search` — le terme, cherché sur tous les titres à la fois *(contrat : `q`)*

### 1.2 Nature de l'œuvre

- [x] `type` — Anime ou Manga. **La facette structurante** : elle décide du sens de la moitié des autres — épisodes ou chapitres, saison ou pas *(contrat : `type`)*
- [x] `status` / `status_in` / `status_not` / `status_not_in` — en cours, terminé, à paraître, en pause, annulé *(contrat : `status`, **une seule valeur** ; `status_in` ouvrirait la multi-sélection)*
- [x] `format` / `format_in` / `format_not` / `format_not_in` — TV, TV court, Film, Spécial, OVA, ONA, Musique, Manga, Light novel, One-shot. **En cases à cocher, à choix multiple** et branché de bout en bout : le document envoie `format_in`, le schéma déclare `formats`, l'URL porte une liste. La **seule** facette multiple avec les genres — « film ou spécial » est une question qu'on se pose, « en cours ou terminé » beaucoup moins
- [x] `countryOfOrigin` / `_in` / `_not_in` — **ce qui distingue manga (JP), manhwa (KR) et manhua (CN)**, et le seul chemin vers un webtoon. En puces (Japon, Corée du Sud, Chine, Taïwan), à choix unique
- [ ] `source` / `source_in` — l'œuvre d'origine : `ORIGINAL`, `MANGA`, `LIGHT_NOVEL`, `WEB_NOVEL`, `NOVEL`, `VISUAL_NOVEL`, `VIDEO_GAME`, `GAME`, `ANIME`, `COMIC`, `DOUJINSHI`, `LIVE_ACTION`, `MULTIMEDIA_PROJECT`, `PICTURE_BOOK`, `OTHER`. Jamais demandé. « Les animes originaux » est une requête qu'on se formule vraiment
- [ ] `isLicensed` — l'œuvre a-t-elle un licencié officiel, ou est-ce une parution amateur. Jamais demandé
- [ ] `isAdult` — **déjà envoyé, et jamais depuis l'URL.** Il se dérive de la préférence du compte côté serveur, et `searchFormSchema` l'omet exprès : sinon il suffirait de l'ajouter à l'adresse pour le contourner. **Cette ligne restera décochée même l'écran fini** — ce n'est pas une facette, c'est une garde

### 1.3 Classification

- [x] `genre` / `genre_in` — la liste courte et officielle *(contrat : `genre`, envoyé en `genre_in`)*
- [ ] `genre_not_in` — **l'exclusion.** « Tout sauf de l'Ecchi » n'a aucun autre chemin, et c'est la moitié de l'usage réel d'une liste de genres
- [ ] `tag` / `tag_in` — bien plus fins que les genres *(contrat : `tag`, envoyé en `tag_in`)*
- [ ] `tag_not_in` — même argument, en plus utile encore : les tags portent les tropes qu'on fuit
- [ ] `minimumTagRank` — ne retenir un tag qu'au-dessus de ce rang de pertinence. **Défaut 18** ; sans lui, un tag anecdotique pèse autant qu'un tag central
- [ ] `tagCategory` / `_in` / `_not_in` — filtrer par **famille** de tags plutôt que par tag. C'est ce qui permet un « sans contenu sexuel » sans énumérer trente tags à la main

### 1.4 Temps

- [x] `season` — le trimestre de diffusion *(contrat : `season`)*
- [ ] `seasonYear` — son année *(contrat : `year`, borné 1940–2100)*. **Décoché volontairement, et ce n'est pas une régression** : plus aucun contrôle ne l'écrit. Voir l'encadré
- [x] `startDate` / `_greater` / `_lesser` — la date de début, en `FuzzyDateInt` : un entier de 8 chiffres `YYYYMMDD`, **`0` pour la partie inconnue** (2016 s'écrit `20160000`). C'est ce qui porte la **plage d'années** du curseur *(contrat : `yearMin` / `yearMax`)*
- [ ] `startDate_like` — la même chose en motif (`"2024%"`). Redondant avec la plage ci-dessus tant qu'on ne cherche qu'une année pleine
- [ ] `endDate` / `_greater` / `_lesser` / `_like` — la date de fin. Sert à « terminé avant telle date », donc à chercher dans l'achevé

> **⚠️ Le piège de `seasonYear` a été contourné, pas résolu.** La doc officielle dit « Requires
> season argument » ; notre contrat acceptait pourtant `?year=2026` seul. Faute de pouvoir
> trancher — l'API est coupée —, **le curseur d'années ne passe plus du tout par `seasonYear`** :
> il écrit `yearMin` / `yearMax`, qui partiront en `startDate_greater` / `startDate_lesser`, et
> qui n'ont aucune dépendance à la saison. La saison, de son côté, se filtre désormais **sans
> millésime** — quatre puces, `season` seul, ce qu'AniList accepte.
>
> Le paramètre `year` reste au contrat pour qu'une adresse déjà partagée se relise, mais plus
> rien ne l'écrit. **À la réouverture de l'API** : vérifier si `seasonYear` seul fonctionne, puis
> soit le retirer du contrat, soit lui redonner un contrôle.

### 1.5 Volume et durée

- [ ] `episodes` / `_greater` / `_lesser` — **« une série courte, moins de 13 épisodes »** est la requête qu'on formule le plus souvent sans pouvoir l'écrire nulle part
- [ ] `chapters` / `_greater` / `_lesser` — son équivalent manga
- [ ] `volumes` / `_greater` / `_lesser` — en tomes. Rappel de fiche-media.md : `volumes` **n'existe que sur les séries terminées**, donc ce filtre écarte silencieusement tout ce qui est en cours
- [ ] `duration` / `_greater` / `_lesser` — la durée d'un épisode, en minutes. Sépare un format court d'une série normale mieux que `format` ne le fait

### 1.6 Chiffres de la communauté

- [x] `averageScore` / `_greater` / `_lesser` / `_not` — la note moyenne, **sur 100**. La facette « au-dessus de 75 », à poser par paliers de 10 (voir le prix d'un filtre)
- [ ] `popularity` / `_greater` / `_lesser` / `_not` — le nombre de comptes qui l'ont en liste. Utile surtout **en plancher** : écarter ce que personne n'a lu

### 1.7 Identité

- [ ] `id` / `id_in` / `id_not` / `id_not_in` — surtout en **exclusion** : « autre chose que ce que je viens de voir »
- [ ] `idMal` / `idMal_in` / `idMal_not` / `idMal_not_in` — le même par identifiant MyAnimeList. Sans emploi tant qu'on n'importe rien depuis MAL

### 1.8 Où le regarder

- [ ] `licensedBy` / `licensedBy_in` — par **nom** de plateforme
- [ ] `licensedById` / `licensedById_in` — par **identifiant** de plateforme, la forme robuste : un nom se renomme, un id non

**La réserve de conception.md §9 s'applique en entier** : cette donnée est communautaire et
régionale, elle **ne garantit pas** que la plateforme diffuse l'œuvre dans le pays du visiteur.
Un filtre « disponible sur Crunchyroll » qui ment est pire que pas de filtre du tout.

### 1.9 Les vocabulaires à charger — trois requêtes, une fois pour toutes

Genres, tags et plateformes ne s'inventent pas : ce sont des listes qu'AniList tient, et qu'il
faut aller chercher pour peupler les puces du panneau.

- [ ] `GenreCollection` — la liste plate des genres. Une requête, **et elle ne bouge presque jamais** : le meilleur candidat du dépôt à un `"use cache"` très long
- [ ] `MediaTagCollection` — les tags avec leur `category`, leur `description`, et surtout leurs `isAdult` / `isMediaSpoiler` / `isGeneralSpoiler`. **Les marqueurs de spoiler valent aussi dans la barre de filtres** : proposer « meurt à la fin » en puce cliquable, c'est le spoiler lui-même
- [ ] `ExternalLinkSourceCollection(mediaType, type)` — les plateformes, avec `id`, `site`, `color`, `icon`, `language`. Nécessaire à `licensedById_in`, inutile sans lui

Trois lectures qui ne dépendent d'**aucun** visiteur ni d'aucun filtre : elles se cachent une
fois pour tout le monde et ne pèsent donc sur le quota qu'au premier appel.

### 1.10 Le tri — 19 champs, pas 7

`MediaSort` porte 37 valeurs, soit **19 champs**, dont 18 en deux directions (`SEARCH_MATCH` n'a
pas de pendant ascendant, ce que le schéma sait déjà). On en expose sept.

- [x] Les sept offerts : `SEARCH_MATCH`, `POPULARITY`, `SCORE`, `TRENDING`, `FAVOURITES`, `START_DATE`, `TITLE_ROMAJI` *(contrat : `sort` + `dir`)*
- [ ] `EPISODES` et `UPDATED_AT` — **acceptés par `sortFieldSchema`, absents de `SORT_OPTIONS`.** Deux tris que le contrat sait relire et que personne ne peut choisir : à offrir, ou à retirer du schéma, mais pas à laisser à mi-chemin
- [ ] Les dix jamais déclarés : `CHAPTERS`, `VOLUMES`, `DURATION`, `END_DATE`, `FORMAT`, `STATUS`, `TYPE`, `ID`, `TITLE_ENGLISH`, `TITLE_NATIVE`
- [ ] `TITLE_ENGLISH` / `TITLE_NATIVE` méritent un sort à part : **le tri par titre devrait suivre `titleLanguage`**, sinon on trie en romaji un écran qui affiche l'anglais

Ce qui est déjà écrit et qu'il ne faut pas refaire : `toAniListSort` recompose l'énumération à
partir d'un champ et d'une direction, `sortFieldHasDirection` connaît l'exception, et
`resolveSort` bascule sur `TRENDING` quand aucun terme n'est saisi.

### 1.11 Ce qu'AniList ne sait pas filtrer — à ne jamais promettre

Le pendant du §1.3 de fiche-media.md. Ces manques sont **structurels** : aucun argument
supplémentaire ne les comble.

- **Aucun filtre par studio.** `Page.media` n'a pas d'argument de studio : « tout le Ghibli » passe par `Studio(search:)` puis la pagination **de ce studio** — un autre écran et une autre requête, pas une facette de celui-ci.
- **Aucun filtre par auteur ni par membre du staff.** Même mécanique, avec `Staff`.
- **Aucun filtre par personnage, ni par doubleur.**
- **Aucune recherche dans le synopsis** : `search` ne regarde que les titres.
- **Aucun filtre de langue de diffusion**, donc rien qui ressemble à « disponible en VF ».
- **Rien sur la franchise** : « les séries d'au moins trois saisons » n'est pas exprimable. Les `relations` vivent sur la fiche, pas dans la recherche (conception.md §8).
- `onList` existe, mais il désigne **la liste AniList du visiteur** — or on ne s'authentifie jamais auprès d'eux. Notre équivalent est en base, et c'est tout le §2.

---

## 2. Ce que nous seuls pouvons filtrer — et pourquoi c'est le point dur

Ces facettes n'existent nulle part ailleurs : ce sont **nos** lignes, celles de quatre comptes.
Ce sont aussi celles qui font la différence avec AniList et MyAnimeList (conception.md §8).

> **⚠️ Aucune ne peut être un filtre au sens d'AniList.** La page de 24 résultats arrive déjà
> découpée : appliquer « pas encore dans ma bibliothèque » ensuite retire des cartes d'une page
> qu'AniList a remplie sans le savoir. On obtient une grille à trous, une page 2 qui répète des
> résultats de la page 1, et un compteur qui ment. **Trois issues, à trancher avant d'en poser
> une seule :**
>
> 1. **Annoter plutôt que filtrer** — un badge « déjà suivi · ép. 14 » sur la carte. Coût nul, aucun mensonge, et ça répond à la question qu'on se pose vraiment en cherchant.
> 2. **Sur-demander puis filtrer** — tirer 50 pour en montrer 24. Ça tient pour un filtre peu sélectif, ça ment dès qu'il l'est.
> 3. **Changer de source** — ces facettes sont chez elles sur `/library`, qui lit Prisma et pagine en base. La bascule « chercher dans ma bibliothèque » devient alors un lien vers l'autre écran, pas une case de plus.
>
> **L'issue 1 est la seule qui ne coûte rien et ne mente jamais.** Les cases ci-dessous se lisent
> avec ça en tête : ce sont des intentions, pas des cases au même prix que celles du §1.
>
> **L'issue 3 a été prise le 6 septembre 2026, et elle est livrée.** `/library` lit Prisma, pagine
> en base et porte le statut de suivi en tête d'écran plutôt qu'au fond d'un panneau : les facettes
> du §2.1 y sont chez elles, sans grille à trous ni compteur qui ment. Elles restent décochées
> **ici** parce que ce document ne parle que de `/search` — et parce que l'issue 1, l'annotation de
> la carte du catalogue, n'est pas faite pour autant : elle demande une lecture de plus, les `Entry`
> du compte pour les ids affichés.

### 2.1 Mon suivi — `Entry` (§4.2)

- [ ] Déjà dans ma bibliothèque / **pas encore** — l'existence d'une ligne `Entry`, et de loin la plus demandée en cherchant
- [ ] Mon statut de suivi — les six d'`EntryStatus`
- [ ] Ma note — présente, absente, au-dessus d'un seuil
- [ ] Ma progression — commencé, jamais ouvert, terminé
- [ ] `favorite` — le cœur
- [ ] Masquer ce que j'ai abandonné, ou déjà terminé

### 2.2 Mes listes — `List`, `ListItem` (§4.4)

- [ ] Déjà dans une de mes listes / dans aucune
- [ ] Dans **cette** liste précisément — ce qui transforme la recherche en écran d'alimentation de liste

### 2.3 Mon étagère — `Edition`, `OwnedVolume` (§4.5, V1.5)

- [ ] Possédé en physique, ou pas
- [ ] Série commencée en physique et **incomplète** — la requête qui justifie l'étagère

### 2.4 Le cercle (§8)

Ces données sont en base dès aujourd'hui : ce sont les `Entry` des trois autres comptes.

- [ ] Suivi par au moins un membre du cercle
- [ ] Noté au-dessus de tant par un membre
- [ ] Possédé en physique par quelqu'un — donc empruntable, ce qui est pertinent précisément parce qu'on est quatre

### 2.5 Réglages appliqués, pas affichés

- [ ] `includeAdult` — appliqué **dans la requête**, jamais par un masque d'affichage. Même règle que sur la fiche
- [ ] `titleLanguage` — décide du titre de chaque carte, et devrait décider du tri par titre (§1.10)

---

## 3. Ce qui vit dans la barre sans être un filtre

- [x] Le tri — champ **et** direction, séparés (§1.10) *(contrat : `sort`, `dir`)*
- [ ] La densité — grille ou liste dense. **N'entre pas dans la clé de cache** *(contrat : `view`)*
- [x] La pagination *(contrat : `page`)* — **et elle ne croit pas le compteur d'AniList**, voir §5
- [ ] ~~Le compte de facettes actives, porté par le bouton « Filtres · 3 »~~ — **posé puis retiré, décision d'Alexis.** La spec du 2 septembre le demandait, mais la rangée de puces le rend inutile : elle dit *lesquelles* sont posées, pas seulement *combien*, et elle reste visible panneau replié. Un compte à côté d'une liste est un doublon qui peut mentir
- [x] La ligne de puces de filtres actifs, chacune avec sa croix
- [x] « Tout effacer » — `EMPTY_FILTERS` est déjà écrit et attend son bouton
- [x] Le retour à la page 1 dès qu'une facette change — sans quoi on atterrit sur une page 7 vide

---

## 4. Ce que l'URL sait déjà écrire

Treize paramètres — les onze gelés par la mise à blanc, **à ne pas casser** parce que ce sont des
adresses qu'on peut s'envoyer, plus les deux qu'a ajoutés le
panneau. Les ajouter n'a rien invalidé : un paramètre absent reste un filtre absent, donc tout
lien écrit avant cette passe se relit à l'identique.

| Paramètre | Ce qu'il porte | Argument AniList |
| --- | --- | --- |
| `q` | le terme | `search` |
| `type` | Anime / Manga | `type` |
| `status` | un statut, **un seul** | `status` |
| `genre` | liste séparée par des virgules | `genre_in` |
| `tag` | idem | `tag_in` |
| `season` | le trimestre | `season` |
| `year` | l'année — **plus aucun contrôle ne l'écrit**, voir §1.4 | `seasonYear` |
| `sort` + `dir` | le tri, recomposé par `toAniListSort` | `sort` |
| `format` | une **liste** de formats | `format_in` |
| `country` | un pays d'origine, **un seul** | `countryOfOrigin` |
| `yearMin` / `yearMax` | la plage d'années du curseur | `startDate_greater` / `_lesser` |
| `score` | la note minimale, **sur 100** | `averageScore_greater` |
| `view` | grille ou liste dense | — |
| `page` | la page | `Page(page:)` |

`country` plutôt que `countryOfOrigin`, `score` plutôt que `averageScore` : ces clés sont visibles
dans l'adresse, donc courtes. Les noms longs restent ceux du schéma, qui parle à AniList et non au
lecteur.

**La colonne de droite n'est plus une intention.** `startDate_greater` / `_lesser` et
`averageScore_greater` étaient annoncés et absents de `SEARCH_MEDIA_QUERY` ; la grille de résultats
les y a mis le 6 septembre 2026, comme cette ligne le prévoyait. Les quatorze paramètres que
`searchMedia` sait traduire partent donc réellement — seul `year` reste sans écrivain, et `view`
n'a jamais eu d'argument en face.

Ce que le schéma accepte **et que l'URL n'expose toujours pas** : `perPage`. Et ce que l'URL porte
sans qu'aucun contrôle ne l'écrive : `tag` et `dir`.

---

## 5. États de l'écran

- [x] Aucun terme saisi — `resolveSort` bascule sur les tendances, et la grille est donc pleine ; le message « Rien à montrer » ne sert que si le miroir est muet lui aussi (7 septembre 2026)
- [x] Aucun résultat, filtres actifs — `mostSelectiveFacet` désigne la facette active la plus étroite et un lien ne retire qu'elle, page remise à 1. L'ordre est un **jugement**, pas une mesure : mesurer coûterait une requête AniList par facette (7 septembre 2026)
- [x] Aucun résultat, aucun filtre — « Vérifiez l'orthographe, ou cherchez le titre original » (7 septembre 2026)
- [x] Le squelette de chargement, aux proportions de la grille
- [x] **Le repli sur le miroir local quand AniList tombe** — `searchMediaInMirror`, paginé en base et filtré par ce que les colonnes du miroir permettent : le terme (titres et synonymes), le type, le format, le statut, le pays, la saison, les genres, la plage d'années et la note. **Il dit ce qu'il a perdu** : les tags, qu'on ne stocke pas (§4.1), et les tris par tendance, popularité ou favoris, que le miroir ne copie pas. Un repli muet vaut moins qu'une erreur — il laisse croire à un résultat. Rappel à ne pas perdre de vue : le miroir ne contient que ce que ce cercle a déjà croisé, donc une recherche y trouve **beaucoup** moins qu'AniList
- [ ] Un filtre invalide dans l'URL retombe sur son défaut **sans effacer les autres** — la règle est écrite dans `parseAsBoundedYear`, elle vaut pour chaque parseur ajouté
- [ ] ~~Le compteur de résultats~~ **Écarté le 13 septembre 2026 (décision d'Alexis) : aucun compteur n'est affiché.** Le raisonnement qui suit reste valable si la question revient — **et il ne peut pas venir de `pageInfo.total` tel quel.** AniList le **plafonne à 5000**, vérifié en interrogeant l'endpoint le 6 septembre 2026 : `type: ANIME` seul, puis avec la saison, puis avec la plage d'années, puis avec la note minimale — les quatre répondent exactement `5000`. Ce n'est pas un compte, c'est une butée, et `lastPage` en hérite : la pagination annonçait **238 pages dont 226 vides**. La pagination s'en est affranchie — sous le plafond `lastPage` est exact, au plafond on ne suit plus que `hasNextPage` —, mais un compteur affiché devrait dire « plus de 5000 » et non « 5000 »
- [x] L'anti-rebond de la frappe — 300 ms, posé **au niveau de l'URL** (`limitUrlUpdates` de nuqs) et non sur la valeur du champ : c'est l'aller-retour serveur qu'il faut espacer. Ici chaque caractère est une requête AniList, contrairement à `/library` qui cherche en base et n'a rien à espacer

---

## Ce qui est à l'écran aujourd'hui, en une phrase

Une barre — terme, type, tri —, un panneau dépliant en trois colonnes qui porte le format (à choix
multiple), le statut, le pays d'origine, les genres, la saison, la plage d'années et la note
minimale, et sous elle une rangée de puces qui dit ce qui filtre, chacune avec sa croix, et qui
porte le seul « Tout effacer » de l'écran — le panneau n'a pas de pied.

En dessous, **la grille de résultats** : vingt et une `MediaCard` servies par AniList, avec les
filtres de l'adresse, et sa pagination. Quand AniList ne répond pas, les mêmes cases viennent du
miroir local, avec un mot qui dit ce que ce détour a perdu.

Tout s'écrit dans l'adresse, **et tout est lu** : les quinze filtres cochés partent réellement dans
la requête. Ce qui manque désormais n'est plus le chemin, ce sont les facettes — les tags, les
exclusions, et l'annotation des cartes par ce qu'on suit déjà (§2, issue 1).
