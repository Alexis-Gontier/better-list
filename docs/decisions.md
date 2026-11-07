# Registre des décisions

Les décisions **en vigueur**, une ligne par décision. Le code peut les citer en commentaire (« D18 »)
et chacun y renvoie ici. Une décision est un choix du moment, pas un dogme : si elle gêne, on en
écrit une nouvelle qui la révise, et on met cette page à jour dans la même PR.

Établi le 19 octobre 2026 à partir de l'ancien `PRODUCT.md`, de `STATE.md`, du journal et des specs
de `docs/superpowers/`. Leur texte complet, avec le raisonnement et les mesures, reste dans
l'historique git (`git show e122516:docs/`). Les numéros continuent après **D45**.

## Produit et périmètre

- **D1** — Cercle privé d'environ quatre comptes. Pas de découverte sociale, de modération, de
  commentaires, de messagerie, d'interface d'administration ni de rate limiting applicatif. *(Révisée par D55.)*
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
  du profil regardé. *(Révisée par D64.)*
- **D8** — `robots.ts` interdit tout. `/login`, `/signup` et `/waitlist` sont en `noindex`. *(Révisée par D58.)*

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

- **D23** — Better Auth, OAuth GitHub seul, pas de mot de passe ni d'e-mail. *(Révisée par D56.)*
- **D24** — Liste d'attente : tout compte naît `PENDING` (forcé côté serveur). L'approbation se
  fait à la main dans Prisma Studio. *(Révisée par D57.)*
- **D25** — La garde est `requireApprovedUser()` dans `app/(app)/layout.tsx`, une seule fois. Le
  proxy ne fait qu'une redirection optimiste sur la présence du cookie.

## Technique

- **D26** — Stack : Prisma 7 (driver adapter `pg`), `dnd-kit`, `fractional-indexing`,
  `next-safe-action` v8, Vitest et Playwright, `next/og`. Écartés : Redis, TanStack Query et
  TanStack Table.
- **D27** — Une lecture demandée par un composant client passe par un route handler `GET`
  (annulable, et les réponses ne se doublent pas). Les Server Actions ne servent qu'aux mutations.
- **D28** — Une panne AniList se rattrape hors du `"use cache"`, et l'erreur se reconnaît à son
  `name` (révisée par D51 : son `digest`).
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
  palette, `Entrée` mène à `/search`. *(Révisée par D53 : plus de « +1 » sur les vignettes.)*
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
- **D46** — Une liste se remplit aussi depuis elle-même : la fenêtre « Ajouter des œuvres » de
  `/lists/[id]` cherche et range sans passer par la fiche. Révise la décision du 6 septembre 2026
  (« on remplit une liste depuis la fiche ») : dix-sept œuvres demandaient dix-sept allers-retours.
- **D47** — Une liste a un genre : Sélection, Classement, À voir, Quand c'est fini. Il décide de
  son affichage (rangs et ligne de coupe, progression, sections « Prêtes » et « Déjà vues ») ;
  l'ordre reste unique. Précise D17 : le genre n'est pas une vue, et les vues restent reportées.
- **D48** — Une liste peut aussi naître depuis la fiche d'une œuvre, avec un nom et un genre, et
  l'œuvre y est rangée d'emblée. Révise la décision du 6 septembre 2026 (« une liste ne naît qu'à
  un seul endroit ») : « je veux mettre ça dans une nouvelle liste » coûtait deux visites. Le
  formulaire complet reste sur `/lists`. *(Révisée par D53 : créée depuis le sélecteur, une liste
  prend le genre « Sélection ».)*
- **D49** — Sur la page partagée, une œuvre 18+ arrive floutée, titre masqué, et se révèle d'un
  clic ; l'aperçu du lien n'en montre jamais. Rien n'est retiré, le décompte reste juste. Révise la
  décision du 6 septembre 2026 (« rien n'est masqué ») : le lien peut sortir du cercle. *(Révisée par D64.)*
- **D50** — Quand une œuvre d'une liste « Quand c'est fini » termine (ou arrête) sa parution, le
  cron Discord horaire l'annonce une fois, si son lecteur ne l'a pas déjà finie. On part de zéro :
  une œuvre déjà prête à l'ajout, au passage d'une liste dans ce genre ou à la mise en service n'est
  pas une nouvelle. `ListItem.readyNotifiedAt` retient l'annonce, posé seulement après l'envoi.
- **D51** — Une panne AniList se reconnaît à son `digest`, posé à la construction de l'erreur, et
  non plus seulement à son `name`. Révise D28 : en production, une erreur qui traverse
  `"use cache"` n'emporte que son `digest`, et l'accueil est tombé le 21 octobre 2026 pendant une
  vraie coupure au lieu de se replier.
- **D52** — Aucune lecture AniList au build : un prérendu échoue sur toute erreur d'un
  `"use cache"`, même rattrapée, si bien qu'une panne d'AniList bloquait tout déploiement. Le mur
  de jaquettes de `/login` et `/signup` est lu à la requête (`connection()`). *(Révisée par D61.)*
- **D53** — La fenêtre d'édition rapide d'une vignette range aussi l'œuvre dans mes listes, dans
  une colonne à droite du formulaire comme l'éditeur d'AniList, avec la jaquette et le cœur en
  en-tête ; le « +1 » posé au-dessus de la jaquette disparaît (révise D39). Ranger passe partout
  par un sélecteur `Command` : un champ qui cherche et crée, une ligne par liste cochée à droite.
  Créer depuis ce champ pose le genre « Sélection », modifiable sur `/lists` (révise D48, qui
  demandait le genre à la création). Les cases s'enregistrent aussitôt, le reste de la fenêtre
  attend « Enregistrer » (D37). Listes et cœur sont lus à l'ouverture (`api/lists/membership`,
  `api/favorites/media`), pas au rendu de la grille. Maintenus, les crans +/− répètent et
  accélèrent (400 ms, puis de 120 à 30 ms).
- **D54** — Les maquettes vivent dans un fichier OpenPencil, `docs/design/better-list.fig`, qui
  **suit** le code et ne le précède pas : `globals.css` reste la source des tokens et les
  composants de `src/` celle des composants. Une variable du fichier porte le nom de sa variable
  CSS ; ce que Tailwind écrit avec une opacité (`bg-input/30`) y devient un token `mix/…`, parce
  qu'OpenPencil ne lie pas une variable et une opacité sur la même peinture. Écrans en 1440 et
  390 px, thème Obsidienne seul. Mode d'emploi : `docs/design/README.md`. *(Révisée par D59.)*
- **D55** — Une dizaine de comptes, plus quatre (révise D1). Le social se limite aux likes, aux
  copies et aux notifications (lots 3 à 5 de la refonte). Rien n'est public hormis la landing et le
  lien de partage.
- **D56** — Connexion par GitHub, Discord ou Google, sans mot de passe ni e-mail (révise D23). Une
  même adresse vérifiée lie les comptes : revenir par un autre fournisseur retrouve le sien au lieu
  d'en créer un second. Le dernier fournisseur utilisé porte la pastille « Dernière » (plugin
  `lastLoginMethod`, cookie seul, rien en base).
- **D57** — Approuver, refuser, bannir (7 jours, 30 jours, définitif) et nommer un administrateur
  se font depuis `/admin/users` (révise D24 ; plugin `admin`, usurpation désactivée). `status`
  garde la liste d'attente, `role` dit qui peut faire entrer les autres. Chaque décision s'annule
  depuis son toast. Le premier administrateur se pose une fois par `scripts/set-admin.ts`.
- **D58** — `/` sert la landing à qui n'a pas de cookie de session, par une réécriture du proxy :
  l'adresse reste `/`. Elle seule est indexable (`allow: "/$"`) ; tout le reste demeure fermé
  (révise D8). `/signup` redirige vers `/login` : en OAuth seul, les deux gestes n'en font qu'un.
- **D59** — La maquette d'un écran nouveau ou modifié **précède** le code et Alexis la valide ;
  une fois l'écran livré, elle se réaligne sur lui (révise D54). `docs/design/refonte.fig` prend le
  relais de `better-list.fig`, qui a atteint la limite de nœuds d'OpenPencil.
- **D60** — Chacun peut supprimer son compte depuis `/settings`, en recopiant son identifiant
  (comme pour une liste, D40) ; tout part en cascade. Le dernier administrateur est refusé : plus
  personne ne pourrait approuver les demandes.
- **D61** — La landing suit Letterboxd et `/login` suit Linear, après deux essais écartés (une
  colonne « discrète », puis un cadre à la Firecrawl) : ce sont les images d'œuvres qui donnent
  envie, pas l'outil. Hero sur la bannière d'une tendance du moment, trois phrases et un bouton,
  six jaquettes, six tuiles « vous permet de… », connexion en fin de page ; `/login` est une
  colonne centrée sur cette bannière floutée. La vitrine (`getShowcase`) réutilise la requête des
  tendances de l'accueil, déjà en cache, et coûte une fiche par jour pour la bannière. Le mur de
  jaquettes incliné disparaît (révise D52 pour ce qui le concerne ; la règle « rien au build »
  tient toujours). *(Révisée par D71 pour la landing ; `/login` ne change pas.)*
- **D62** — Discord et Google sont facultatifs : sans leur paire d'identifiants, le fournisseur
  n'est pas déclaré à Better Auth, son bouton disparaît de `/login` et de la landing, et la phrase
  « Avec GitHub, Discord ou Google » se raccourcit (`ENABLED_PROVIDERS`). GitHub reste obligatoire.
  On peut ainsi déployer avant d'avoir créé les applications OAuth, et les ajouter ensuite sans
  toucher au code.
- **D63** — La landing et le README montrent l'app par quatre captures (accueil, fiche, bibliothèque,
  profil) en 1440 × 900, thème sombre, JPEG qualité 82, dans `public/screenshots/`. Elles se prennent
  au navigateur Playwright, l'indicateur de Next et la barre de défilement masqués, et se refont
  quand un de ces écrans change. **Jamais sur un vrai compte** : le profil affiche nom et avatar. On
  prend `@demo` (« Membre démo », sans avatar), rempli par `pnpm db:seed --user=demo`.
- **D64** — Chaque membre règle ce que les autres voient de son profil (révise D7) : « Profil
  visible des membres », puis journal, statistiques, calendrier d'activité et favoris, tous ouverts
  par défaut, et « Œuvres 18+ », fermé par défaut. Un profil caché ne montre que l'avatar, le pseudo,
  un encart et les listes « Membres ». Le propriétaire voit toujours tout. Le 18+ d'un profil
  n'apparaît à un autre que si le propriétaire le montre **et** si le lecteur l'accepte. Une liste
  est « Membres » (défaut) ou « Privée » ; la liste d'un autre membre s'ouvre en lecture, sans ajout,
  réorganisation ni menu, et son lien de partage n'est jamais renvoyé. Toutes ces lectures passent
  par `canViewProfileSection`, `profileAdultFilter` et `visibleListsWhere` ; aucun écran ne filtre
  lui-même. Sur `/l/[token]`, les œuvres 18+ sont **retirées pour tout visiteur** et comptées sous
  la grille, « + N œuvres réservées aux membres » (révise D49) : la page reste publique et ne lit
  aucune session, un membre retrouve la liste entière dans l'app. Un classement garde ses rangs.
- **D65** — Les listes deviennent sociales (lot 3 de la refonte). On aime la liste « Membres »
  d'un autre (`ListLike`, pas de compteur dénormalisé) et on la copie : la copie reprend titre,
  description, genre, coupe et rangs, jamais le jeton de partage, les likes ni les notes, et naît
  **privée**. Copier ne redirige pas : un toast « Copiée dans vos listes, en privé » propose
  « Ouvrir », on reste sur la liste qu'on lisait. La copie dit « Copiée de *Titre* · Pseudo » tant
  que l'original existe et m'est visible ; l'original compte ses copies **visibles du lecteur**.
  `/lists/community` (segment statique, précise D6) montre les listes « Membres » non vides des
  autres, triées par likes ou par date, « Voir plus » étant un lien ; le genre s'y écrit en toutes
  lettres. La carte reste un lien entier, le ♥ passe par-dessus. La fiche montre « Dans les listes »
  (quatre mini-cartes, « Tout voir » au-delà). Les notifications sociales sont **stockées**
  (`Notification` : like, copie, demande d'inscription ; précise D31, le retard d'épisodes reste
  calculé), écrites dans la transaction du geste, sans doublon non lu, et effacées non lues au
  retrait d'un like. La cloche prend deux onglets, « Épisodes » et « Activité » ; ouvrir
  « Activité » marque tout lu, d'où l'absence de « Tout marquer comme lu ». Le fournisseur d'une
  demande se lit à l'affichage (le hook de création ne le connaît pas), et trancher une demande la
  marque lue chez tous les administrateurs.
- **D66** — L'accueil reste celui d'avant la refonte, plus une rangée (lot 4). « Listes de la
  communauté » se pose **sous les tendances** : les huit listes « Membres » les plus aimées des
  autres, la carte de `/lists/community` (montée dans `features/lists/components/`), le titre menant
  à la page entière. Cachée sans liste, lecture de base seule, sa propre frontière `<Suspense>`. La
  rangée défile en carrousel de cartes **debout et de largeur fixe** (`HomeRail` `layout="wide"` :
  300 px sur téléphone, 340 au-delà), la suivante dépassant toujours du bord. Les onglets Anime,
  Manga, Manhwa, Light novel et un « Top 10 » ont été maquettés puis écartés le 2 novembre 2026 :
  ils rouvraient le second catalogue retiré le 14 septembre 2026, que `/search` fait mieux.
- **D67** — La tier list est un **genre de liste**, pas une vue (lot 5 ; révise D17, dont les
  tables `ListView` et `ListViewItem`, vides, sont supprimées). Une tier list est donc une liste
  comme les autres : likes, copie, Communauté, visibilité et lien de partage s'y appliquent sans
  rien d'autre. Les paliers vivent en JSON sur la liste (S, A, B, C, D par défaut, huit au plus, au
  nuancier de TierMaker), le placement sur l'item (`tierIndex`, `null` = la réserve, où arrive toute
  œuvre ajoutée). **Exception à D33** : les étiquettes portent leur pastel, le nom en noir dessus,
  seule couleur hors jaquettes. On range en glissant (souris, appui long, ou Espace puis flèches)
  ou d'un clic, par le menu « Ranger dans… » ; le menu d'un palier renomme, recolore, ajoute,
  déplace, vide et supprime, et ses œuvres reviennent à la réserve sans confirmation. Chaque geste
  part aussitôt (D37). La carte montre les trois premiers paliers à la place de la mosaïque
  (maquette, plus récente que la spec qui disait la mosaïque du palier le plus haut), la fiche le
  palier au lieu du rang. « Copier » une tier list demande : **faire ma version** (défaut ; mêmes
  œuvres et paliers, tout à classer, liée par `versionOfId`, notification `LIST_VERSIONED`) ou
  copier avec son classement. L'original compte ses versions visibles, sans avatars (maquette).
- **D68** — L'ordre de visionnage d'une franchise est un onglet « Ordre » de la fiche, ouvert
  seulement s'il y a une préquelle ou une suite visible, sans requête de plus pour le savoir. Il
  suit `PREQUEL`/`SEQUEL` de proche en proche et place les `SIDE_STORY` en « Facultatif », sans
  les explorer ; spin-offs, adaptations et « alternative » restent dans « Œuvres liées ». Ordre par
  tri topologique des suites, une bifurcation départagée par l'année puis l'id. Parcours par
  niveaux, un lot de 50 par requête, plafonné à 6 requêtes et 80 œuvres ; chaque niveau est caché
  seul (des semaines), si bien qu'un parcours coupé par une panne n'est jamais mis en cache. La
  grille reprend la carte d'« Œuvres liées », l'étape à la place du type de lien. L'ordre est celui
  d'AniList : une préquelle d'histoire (un OAV sorti après) passe avant la saison 1.
- **D69** — Sur `/search`, chaque carte porte une ligne sous le titre : « En cours · ép. 14 / 24 »
  (le statut seul tant que rien n'est commencé) sur une œuvre suivie, son format et son année
  (« Série TV · 2017 ») sinon. Annoter plutôt que filtrer, pour ne pas trouer la pagination
  d'AniList. La ligne est **toujours** là, une espace insécable au besoin : `MediaCard` exige le
  même nombre de lignes sur toute la grille.
- **D70** — Le bas de l'Aperçu, sous « Dans les listes », porte trois blocs masqués quand ils
  n'ont rien à dire. **Mon journal** : mes seuls événements sur l'œuvre (pas ceux du cercle), les
  dix derniers groupés par jour, sans jaquette. **Ma collection**, pour un manga ou un light novel :
  « 12 tomes sur 30 · il manque … » et le lien vers `/collection/[id]`, ou le seul lien
  « Ajouter à ma collection ». **Communauté** : les trois meilleurs classements, la répartition des
  notes (le graphe du profil, monté dans `components/shared/`) et celle des statuts, lus dans la
  requête de fiche, donc sans requête AniList de plus et absents quand la fiche vient du miroir.
  Les deux lectures en base ont chacune leur frontière `<Suspense>` (D29).
- **D71** — La landing suit les landings SaaS (Linear, Raycast, Vercel) et révise D61 pour elle
  seule : barre à trois ancres, hero centré (annonce, titre, deux actions) et la capture de
  l'accueil en grand, recadrée en 4:5 en 390 plutôt que réduite. Suivent le bandeau de douze
  tendances, six tuiles dont chacune montre **le vrai composant de l'app** (le journal du profil,
  les cartes « En cours », l'étagère, `TierRows`, la répartition par statut, les interrupteurs de
  `/settings`), promu dans `features/` à ce deuxième appelant, la palette Ctrl K, les trois temps de
  l'entrée, une FAQ en `<details>` natifs et l'appel final sur la bannière du jour. La leçon de
  D61 tient : les jaquettes sont partout, et toutes viennent de la vitrine (`getShowcase`), sans
  requête AniList de plus (`getShowcase` rend aussi les œuvres entières). Les fragments sont des
  illustrations `inert`, nourries d'exemples : leurs dates, épisodes et chiffres ne sont le suivi
  d'aucun membre. Le mouvement est en CSS lié au défilement (`reveal`, `settle`), sans JavaScript,
  et s'efface sous `prefers-reduced-motion`. Maquette :
  `refonte.fig`, page « Refonte — Landing · SaaS » (D59).
