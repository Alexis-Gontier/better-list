# Registre des décisions

Les décisions **en vigueur**, une ligne par décision. Le code peut les citer en commentaire (« D18 »)
et chacun y renvoie ici. Une décision est un choix du moment, pas un dogme : si elle gêne, on en
écrit une nouvelle qui la révise, et on met cette page à jour dans la même PR.

Établi le 19 octobre 2026 à partir de l'ancien `PRODUCT.md`, de `STATE.md`, du journal et des specs
de `docs/superpowers/`. Leur texte complet, avec le raisonnement et les mesures, reste dans
l'historique git (`git show e122516:docs/`). Les numéros continuent après **D45**.

## Produit et périmètre

- **D1** — Cercle privé d'environ quatre comptes. Pas de découverte sociale, de modération, de
  commentaires, de messagerie, d'interface d'administration ni de rate limiting applicatif.
- **D2** — Tout part d'un `Media` AniList : pas d'œuvre saisie à la main, pas de scraping. Une
  seconde source (TMDB pour le live-action, la BnF pour les tomes) serait une décision structurante
  à prendre exprès.
- **D3** — Une liste ne contient que des œuvres : `ListItem` pointe directement un `Media`.
- **D4** — Français uniquement. Fuseau `Europe/Paris` écrit en dur, jamais celui de la machine
  (`config/locale.ts`) : un journal se range à l'heure de chez soi.
- **D5** — Pas de `/browse` : la découverte vit sur l'accueil, sous le suivi.
- **D6** — Une seule route `/media/[id]` pour tous les types (les ids AniList sont uniques). Une
  liste s'adresse par son `id`, pas par un slug.
- **D7** — Profils, statistiques et bibliothèques sont visibles entre membres. `Entry.private`
  cache l'entrée **partout**, compteurs compris. `includeAdult` dépend du compte qui regarde, pas
  du profil regardé.
- **D8** — `robots.ts` interdit tout. `/login`, `/signup` et `/waitlist` sont en `noindex`.

## Données

- **D9** — Miroir local `Media` (quota, tri, durabilité). On n'y stocke que ce qu'une carte et un
  tri demandent ; synopsis, relations, personnages, staff et tags restent des lectures AniList
  cachées.
- **D10** — Fraîcheur du miroir : 30 jours pour une œuvre finie ou annulée, 12 h pour tout le reste
  (statut inconnu compris). Un seul déclencheur : le cron quotidien de 4 h UTC, dont le seuil reste
  volontairement plus court que la cadence. Pas de rafraîchissement paresseux à la lecture.
- **D11** — `ensureMediaMirror` passe avant toute écriture qui pointe vers `Media`, et ne réécrit
  rien quand la ligne est fraîche. Une œuvre qu'AniList ne renvoie plus garde sa copie, et son
  `syncedAt` avance quand même.
- **D12** — Les statuts de suivi reprennent exactement `MediaListStatus` d'AniList.
- **D13** — `progress` est un curseur (un entier) ; la collection est un ensemble (une ligne par
  tome). On lit dans l'ordre, on achète dans le désordre.
- **D14** — Une note est stockée sur 0–100 et affichée sur cinq étoiles par demies. L'échelle n'est
  pas un réglage.
- **D15** — `EntryEvent` est append-only. `PROGRESS` enregistre un déplacement `{ from, to }`, pas
  un épisode. Il s'écrit dans la même transaction que l'`Entry`.
- **D16** — Le partage d'une liste tient en une colonne, `shareToken` (144 bits, généré côté
  serveur) : `null` veut dire non partagée, et révoquer tue le lien.
- **D17** — Les vues (`ListView`, tier lists) sont reportées : une liste est déjà un classement et
  une grille. Les tables restent au schéma.
- **D18** — Favoris : une table `Favorite` indépendante du suivi. Une personne y est stockée en
  instantané (nom et portrait au moment du like), donc le profil ne lit rien chez AniList. Ordre :
  les plus récents d'abord.
- **D19** — Personnages et staff : AniList seul, rien en base, aucun repli de panne.
- **D20** — `Edition` est partagée entre les comptes, `OwnedVolume` est personnel. Une édition par
  défaut naît à la première saisie.
- **D21** — Le nombre de tomes n'est jamais recopié depuis AniList (`volumes` est `null` tant que
  la série paraît) : il se résout à la lecture, la saisie manuelle d'abord. Une série en cours dit
  « à jour », jamais « complète ».
- **D22** — Prêt entre membres abandonné. Prix, date d'achat, état et notes d'un tome n'ont plus
  d'écran. Leurs colonnes restent au schéma : les retirer coûterait une migration pour rien.

## Authentification

- **D23** — Better Auth, OAuth GitHub seul, pas de mot de passe ni d'e-mail.
- **D24** — Liste d'attente : tout compte naît `PENDING` (forcé côté serveur). L'approbation se
  fait à la main dans Prisma Studio.
- **D25** — La garde est `requireApprovedUser()` dans `app/(app)/layout.tsx`, une seule fois. Le
  proxy ne fait qu'une redirection optimiste sur la présence du cookie.

## Technique

- **D26** — Stack : Prisma 7 (driver adapter `pg`), `dnd-kit`, `fractional-indexing`,
  `next-safe-action` v8, Vitest et Playwright, `next/og`. Écartés : Redis, TanStack Query et
  TanStack Table.
- **D27** — Une lecture demandée par un composant client passe par un route handler `GET`
  (annulable, et les réponses ne se doublent pas). Les Server Actions ne servent qu'aux mutations.
- **D28** — Une panne AniList se rattrape hors du `"use cache"`, et l'erreur se reconnaît à son
  `name`.
- **D29** — Pas de `loading.tsx` de segment : une frontière `<Suspense>` par zone, avec un squelette
  à la forme de cette zone.
- **D30** — Notifications Discord : un webhook par compte, posté par `api/cron/discord` qu'appelle
  GitHub Actions chaque heure (Vercel Hobby n'autorise qu'un cron par jour). La carte d'épisode est
  signée par HMAC et ne lit que le miroir.
- **D31** — La cloche de l'en-tête n'a pas de table : le retard d'épisodes *est* l'état non lu.
- **D32** — Une facette continue s'arrête par paliers (dizaines pour la note, années pour les
  dates) : chaque combinaison de filtres est une clé de cache, donc une requête AniList.

## Interface

- **D33** — La jaquette est la seule chose colorée de l'écran. L'accent n'a que quatre emplois : le
  bouton d'action principal (un seul par écran), l'élément actif ou sélectionné, le halo du focus
  clavier, le marqueur de suivi sur une jaquette.
- **D34** — Direction « Obsidienne » : fond quasi noir, accent iris, titrage Archivo, rayon 6 px,
  halo réservé au focus. Le mode sombre est le canon, le clair reste supporté.
- **D35** — On ne modifie pas le style des composants shadcn. Trois variants seulement : `Badge
  overlay`, `Button icon-sm`, `Card` sans bordure.
- **D36** — Six couleurs de statut de suivi, en pastille seulement : chroma bas, aucune teinte
  proche de l'iris, ni fond ni bordure.
- **D37** — Deux façons d'enregistrer : sur la fiche, chaque geste part tout de suite ; dans la
  fenêtre d'édition, un bouton valide. Dans les deux cas, on n'envoie que ce qui a bougé.
- **D38** — Une œuvre non suivie n'a sur sa fiche qu'un bouton « Ajouter à ma bibliothèque ».
- **D39** — Le « +1 » vit sur les vignettes des œuvres suivies, pas dans la palette ⌘K. Dans la
  palette, `Entrée` mène à `/search`.
- **D40** — Supprimer une liste demande de recopier son nom : c'est le seul geste qu'on ne peut pas
  défaire.
- **D41** — `/search` et `/library` partagent leur coquille. Les filtres qui portent sur nos propres
  données vivent sur `/library` ; pas de compteur de résultats sur `/search`.
- **D42** — L'accueil met le suivi au-dessus d'un trait, la découverte en dessous. « Recommandé pour
  vous » est un tirage pondéré par le score, pas un classement.
- **D43** — `/calendar` est une liste verticale par jour, pas une grille de sept colonnes. Deux
  portées : ce que je suis, ou tout.
- **D44** — Les réglages s'enregistrent un par un, sans bouton.
- **D45** — Chaque écran prévoit ses états : chargement, vide, aucun résultat, et le repli quand
  AniList ne répond pas.
- **D47** — Une liste se remplit aussi depuis elle-même : la fenêtre « Ajouter des œuvres » de
  `/lists/[id]` cherche et range sans passer par la fiche. Révise la décision du 6 septembre 2026
  (« on remplit une liste depuis la fiche ») : dix-sept œuvres demandaient dix-sept allers-retours.
