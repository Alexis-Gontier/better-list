# Pages Personnage et Staff — design

Validé avec Alexis le 26 septembre 2026. Périmètre retenu : **« Essentiel »** — ce qu'AniList
montre, moins le sélecteur de langue, le tri et le filtre « dans ma bibliothèque ».

## Pourquoi

Les onglets Personnages et Équipe de `/media/[id]` montrent des cartes qui ne mènent nulle part.
AniList a une page par personnage et par membre du staff ; on les reproduit, et on relie les trois
sortes de pages entre elles.

## Ce qu'on a relevé sur AniList

Relevé au navigateur le 26 septembre 2026 (Luffy, `character/40` ; Kazuhiko Inoue, `staff/95021`)
et par requête directe sur l'API.

- **Personnage** : portrait, nom, nom natif et surnoms, favoris ; anniversaire, âge, genre, groupe
  sanguin ; biographie ; puis une grille des apparitions — jaquette de l'œuvre, doubleur en
  médaillon, tri par popularité.
- **Staff** : même en-tête ; naissance, âge, genre, années d'activité, ville natale, groupe
  sanguin ; biographie ; puis les rôles de doublage **groupés par année** (« TBA », 2026, 2025…),
  puis les rôles d'équipe anime et manga.

Quatre faits de l'API qui pèsent sur le code :

1. `Character.age` est une **chaîne** (`"17-"`) ; `Staff.age` est un **nombre**.
2. `pageInfo.total` d'une liste paginée (`media`, `characterMedia`, `staffMedia`) **plafonne à
   500**, comme le 5000 de la recherche : on ne suit que `hasNextPage`.
3. `dateOfDeath` arrive en objet dont les trois champs sont `null` pour une personne vivante.
4. `staffMedia(type: MANGA, perPage: 1) { pageInfo { total } }` rend `0` quand il n'y a rien :
   c'est un test de vacuité fiable, puisque sous le plafond.

La biographie est du markdown de contributeurs : `__Gras:__`, `[texte](url)`, spoilers `~!…!~`
(y compris sur plusieurs lignes, et contenant du gras), liens vers `anilist.co/character/…`,
`/staff/…`, `/anime/…`, `/manga/…`.

## Routes

| Clé | Chemin | Groupe |
| --- | --- | --- |
| `routes.character(id)` | `/character/[id]` | `(app)` — derrière la garde |
| `routes.staff(id)` | `/staff/[id]` | `(app)` |

En anglais comme `/media` ; un seul segment, l'id AniList. `searchParams` : `?page=` sur les deux,
`?onglet=doublage|anime|manga` sur le staff.

## Données — `src/features/people/`

Nouvelle feature : personnage et staff sont des entités métier que ni `media` ni `tracking` ne
portent.

- `schemas/people.schema.ts` — `characterSchema`, `staffSchema`, leurs arêtes. Tout champ
  qu'AniList peut rendre à `null` est `.nullish()` ; un tableau passe par
  `.nullish().transform(v => v ?? [])` (leçon du 26 septembre, JOURNAL.md). Les nœuds d'œuvre
  réutilisent `mediaCompactSchema`.
- `server/people.documents.ts` — `CHARACTER_QUERY` et `STAFF_QUERY`. Les nœuds d'œuvre utilisent le
  fragment `MEDIA_COMPACT_FIELDS`, exporté depuis `media.documents.ts` pour l'occasion.
- `server/people.queries.ts` — `getCharacter(id, page, { includeAdult })` et
  `getStaff(id, onglet, page, { includeAdult })`. Même structure que `getMediaById` : une lecture
  brute en `"use cache"` + `cacheLife("days")` qui rattrape le 404 **dans** le cache et laisse
  passer la panne, puis le filtre 18+ **hors** du cache sur les œuvres de la liste.
- `lib/` — fonctions pures, testées : le parseur de biographie, le groupement par année, les
  libellés des faits.

**Coût : une requête AniList par affichage**, cachée un jour par (id, onglet, page) et partagée
par les quatre comptes.

- Personnage : fiche + 21 apparitions de la page, `sort: [POPULARITY_DESC]`, avec le doubleur
  japonais (`voiceActors(language: JAPANESE, sort: [RELEVANCE])`, le premier).
- Staff : fiche + les 21 lignes de l'onglet actif (`sort: [START_DATE_DESC]`), et les deux autres
  listes en `perPage: 1` pour savoir lesquelles sont vides — c'est ce qui décide des onglets
  affichés, sans requête de plus. Trois alias dans le même document : `characterMedia`,
  `staffMedia(type: ANIME)`, `staffMedia(type: MANGA)`, avec un `perPage` par variable.

21 par page : les paliers 3 et 7 de `CatalogueGrid`.

## Écrans

**En-tête commun** (`features/people/components/`, deux appelants dès le départ) : portrait, nom,
nom natif et surnoms, favoris. Les surnoms `alternativeSpoiler` sont masqués derrière le même
geste que les spoilers de la biographie.

**Faits** : une liste `dt/dd`, une ligne omise quand la donnée manque.
- Personnage : anniversaire (jour et mois, année si connue), âge (la chaîne telle quelle), genre,
  groupe sanguin.
- Staff : naissance, décès (seulement si l'année ou le jour est connu), âge, années d'activité
  (« 1973 – aujourd'hui » ; deux bornes si AniList en donne deux), ville natale, métiers.
  Les libellés de genre et de métier courants sont traduits ; le reste passe tel quel.

**Biographie** : `parseBio(text)` rend des paragraphes de segments `text | strong | link |
spoiler`, rendus en éléments React — **jamais** par injection de HTML brut (même règle que le
synopsis).
- Un lien `anilist.co/{character|staff}/<id>` devient `routes.character|staff(id)` ;
  `anilist.co/{anime|manga}/<id>` devient `routes.media(id)`. Tout autre lien reste externe
  (`target="_blank" rel="noreferrer"`), et seuls les schémas `http(s)` sont acceptés.
- Un spoiler est masqué et se révèle au clic : c'est la **seule** feuille `"use client"`.
- Texte replié au-delà de quelques lignes, avec « Lire la suite » (`<details>` natif si ça suffit,
  sinon la même feuille client).
- Vide → la section n'est pas rendue.

**Personnage — « Apparitions »** : `CatalogueGrid` de `MediaCard`, avec la pastille de suivi et le
« +1 » comme sur `/search`. Sous le titre, le rôle (`formatCharacterRole`) et le doubleur,
**cliquable** vers sa page staff. `MediaCard` gagne pour ça un emplacement `footer?: ReactNode`,
rendu **hors** du `<Link>` pour la même raison que `action` (pas d'ancre dans une ancre). Tous les
appelants d'une grille le passent à toutes leurs cartes. Pagination : `CataloguePagination`, avec
`hasNextPage` pour seule borne, comme `/search` au plafond.

**Staff — onglets** `?onglet=` : Doublage, Anime, Manga, dans cet ordre ; seuls les non vides sont
affichés ; sans paramètre, le premier non vide. Chaque onglet est une grille groupée par année
(`startDate.year`, décroissante, « À venir » pour une année inconnue, en tête comme sur AniList).
- Doublage : la carte de l'œuvre, et sous le titre le personnage doublé, cliquable, avec son rôle.
  Une œuvre où il double plusieurs personnages les liste tous.
- Anime / Manga : la carte de l'œuvre et le rôle, traduit par `formatStaffRole`. Une même œuvre
  peut revenir avec deux rôles (deux arêtes) : on fusionne les rôles sur une carte.

Le groupement se fait **dans la page** : une année peut donc être coupée entre deux pages. C'est
ce que fait AniList en défilement infini, et c'est le prix d'une pagination par liens.

**Liens entrants**
- Fiche d'une œuvre, onglets Aperçu, Personnages, Équipe : le nom du personnage, celui du doubleur
  et celui du membre d'équipe deviennent des liens (le portrait aussi).
- Page personnage → staff (doubleur) ; page staff → personnage (rôle de doublage).
- Biographies → les trois routes, par la réécriture ci-dessus.

## Erreurs et cas limites

- Id inconnu → `notFound()`.
- AniList en panne : **aucun repli**, rien n'est stocké en base (PRODUCT.md §4.1 ne retient ni
  personnages ni staff). La page rend un état « AniList ne répond pas » à la place du contenu, via
  le même `tryAniList` que la fiche, et `ReportAniListStatus` alimente le bandeau global.
- Contenu adulte : filtré sur les œuvres des grilles, hors cache, selon la préférence du compte.
  La page d'une personne elle-même n'est pas filtrée — elle n'a pas d'`isAdult`.
- Une page vide après filtrage (tout y était 18+) montre un état vide, pas une grille blanche.
- `?page=` ou `?onglet=` invalide → valeur par défaut (parseur Zod, comme les autres contrats d'URL).

## Tests

Vitest, sur le pur :
- `parseBio` : gras, liens réécrits et externes, schéma non `http(s)` refusé, spoiler sur une
  ligne et sur plusieurs, spoiler contenant du gras, texte sans balise, `null`.
- Groupement par année et fusion des rôles d'une même œuvre.
- Libellés des faits (âge chaîne ou nombre, années d'activité à une ou deux bornes, décès vide).
- Schémas : les `null` relevés ci-dessus passent.
- Contrat d'URL : `?page=` et `?onglet=` invalides retombent sur les défauts.

Vérification à l'écran sur Luffy (40), Kazuhiko Inoue (95021), et un auteur de manga, en 1440 et
en 390.

## Hors périmètre

Sélecteur de langue du doubleur, tri, filtre « dans ma bibliothèque », favoris, section « sur mes
listes ». Rien de tout ça n'est stocké : aucune migration.

## Docs à mettre à jour avec le code

STATE.md (la carte, les features), PRODUCT.md §5 (les routes), fiche-media.md (les liens des
onglets), `knip.jsonc` si un export reste sans appelant.
