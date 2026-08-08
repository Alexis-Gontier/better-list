# Journal de bord

[PRODUCT.md](./PRODUCT.md) dit **quoi** et **pourquoi**, [ARCHITECTURE.md](./ARCHITECTURE.md) dit
**comment**. Ce fichier dit **où on en est** : ce qui est construit, ce qui ne l'est pas encore, et
ce qui a été décidé en chemin sans être une décision de produit.

**Comment le tenir.** Une entrée par séance de travail, datée, la plus récente en haut. Trois
choses y suffisent : ce qui a été fait, ce qui a été tranché en passant, ce qui reste ouvert. Un
journal trop cher à tenir ne se tient pas — deux lignes valent mieux qu'une entrée parfaite qu'on
n'écrit jamais. Ce qui n'y est pas noté le jour même est perdu : c'est exactement le raisonnement
qui a fait exister `EntryEvent` (PRODUCT.md §4.3), appliqué au projet lui-même.

Ce qui n'a **rien à faire ici** : une décision de modélisation ou de périmètre (elle va dans
PRODUCT.md), une convention de fichier (ARCHITECTURE.md), le détail d'une implémentation (le
commentaire du fichier concerné, où il sera lu). Le journal renvoie vers eux, il ne les recopie
pas.

---

## Où on en est — 8 août 2026

| Chantier | État |
| --- | --- |
| Socle : Next 16.3, Biome, Lefthook, CI, Vitest, knip | fait |
| Base PostgreSQL + Prisma 7, migration `init` | fait — **toutes** les tables de PRODUCT.md §4, y compris `Edition` / `OwnedVolume` dont les écrans n'arrivent qu'en V1.5 |
| Auth GitHub + liste d'attente (§7.1) | fait, garde unique dans `app/(app)/layout.tsx`, proxy verrouillé par `src/proxy.test.ts` |
| Recherche `/search` | fait — filtres en URL (nuqs), pagination, filtre 18+ côté serveur |
| Fiche `/media/[id]` | fait — hero, onglets, `"use cache"` sur les lectures AniList |
| Miroir `Media` (§4.1) | fait — copie au premier suivi, péremption 12 h / 30 jours, cron Vercel une fois par jour |
| Suivi `Entry` (§4.2) | fait — panneau de suivi, transition d'état pure et testée |
| Journal `EntryEvent` (§4.3) | écrit **et lu** trois fois — journal d'une œuvre, survol du tableau de bord, timeline complète du profil |
| Bibliothèque `/library` | fait — filtres statut et type, quatre tris, pagination |
| Tableau de bord `/` | fait — en cours, à reprendre, activité récente |
| « +1 » depuis la grille | fait — sur les vignettes du tableau de bord et de la bibliothèque |
| Profil `/u/[username]` | fait — identité, chiffres, journal complet paginé |
| Réglages `/settings` | fait — et les trois préférences sont **branchées**, plus seulement stockées |
| Préférences `UserPreferences` (§4.6) | fait — échelle de notes, langue des titres, filtre 18+, tous lus par les écrans |
| Listes `/lists` · `/lists/[slug]` | fait — créer, renommer, décrire, remplir depuis une fiche, retirer, supprimer |
| Réordonner une liste (V1.5) | fait — glisser-déposer et clavier, une seule ligne réécrite |
| `/browse` | fait — cinq rangées éditorialisées, une seule requête AniList |
| Cron de fraîcheur (§4.1) | fait — `/api/cron/refresh-media`, jeton porteur, lots de 50 |
| Palette de commandes `⌘K` | fait — recherche bibliothèque + catalogue, et « +1 » sans quitter la page |
| Limitation de débit | fait — Better Auth en `storage: "database"`, et un plafond par compte sur `/api/command` |
| `/calendar`, `/collection` | n'existent pas — la nav pointe déjà dessus (V2 et V1.5) |

**V0 et V1 sont bouclées**, et **V1.5 est entamée** par le réordonnancement des listes. Le récap
annuel (§8.3) est écarté pour l'instant : c'est un choix, pas un oubli — il reste disponible, il ne
bloque rien.

### Le prochain pas

Dans l'ordre où je le prendrais :

1. **Commiter.** Tout le projet est un unique arbre de travail non commité posé sur `Initial commit
   from Create Next App`. C'est le point le plus risqué de l'état actuel, et le moins intéressant à
   réparer tard. À découper en commits thématiques plutôt qu'en un bloc de cinquante fichiers.
2. **Les vues** (`ListView`, §4.4) : `/lists/[slug]/[viewId]`, classement, tier list, grille. Tout est
   posé pour — dnd-kit est installé, le calcul de voisinage est écrit et testé, et `ListViewItem` a
   déjà son `tierIndex` et son propre `rank`. C'est la suite directe de ce qui vient d'être fait.
3. **La collection physique** (§4.5) : `/collection`, saisie par plage, écran des tomes manquants,
   prêts. Le plus gros morceau de V1.5, sans aucune dépendance, et celui que §8 désigne comme le plus
   utilisé au quotidien.
4. **Le partage par lien non listé**, qui demande d'abord une décision : `slug` étant unique par
   propriétaire, il faut trancher entre un segment de propriétaire et un jeton. À poser avant de
   coder, pas pendant.

Candidat hors programme, indépendant et peu cher : **l'ordre de visionnage d'une franchise** (§8.2).
Les `relations` sont déjà chargées par la requête de fiche, et PRODUCT.md le désigne lui-même comme le
meilleur rapport valeur/effort du projet.

---

## 8 août 2026 — `src/lib/` rangé par sujet

Douze fichiers à plat dans `lib/`, dont trois qui formaient un système sans que rien ne le dise :
`auth.ts`, `auth-client.ts` et `auth-session.ts` se rangeaient alphabétiquement à côté
d'`anilist.ts`. Quatre sujets maintenant — `auth/`, `db/`, `http/`, `security/` —, la convention
est écrite dans [ARCHITECTURE.md](./ARCHITECTURE.md) et le hook `conventions-guard.mjs` refuse
désormais un nouveau fichier posé à la racine de `lib/`.

- **La frontière server/client passe dans le nom du fichier.** `@/lib/auth/server`,
  `@/lib/auth/client`, `@/lib/auth/session` : la règle « jamais de server et de client dans le même
  fichier » était jusqu'ici une consigne, elle est maintenant lisible à l'import. Pas de barrel
  `index.ts` — `@/lib/auth` ne résout rien, et c'est voulu : il faut nommer le côté qu'on prend.
- **`utils.ts` ne bouge pas, et ce n'est pas un oubli.** `components.json` déclare
  `aliases.utils: "@/lib/utils"` ; tout ce que shadcn génère importe depuis là. Le déplacer casserait
  la génération et une trentaine de fichiers. C'est écrit dans l'allowlist du hook, à côté de
  `safe-action.ts` qui reste à la racine faute de famille.
- **Un dossier se crée quand un deuxième fichier arrive**, même règle de promotion que `features/`.
  L'exception assumée est `db/`, seul avec `prisma.ts` : c'est la porte de la base, et on sait ce
  qui viendra s'y ranger.
- Le renommage a suffi à déclasser un import dans `media.mirror.ts` — l'ordre alphabétique change
  quand les chemins changent. Rattrapé par `biome check --write`, mais c'est le genre de détail que
  `pnpm format` seul ne voit pas : le tri des imports est un *assist*, pas du formatage.

---

## 8 août 2026 — audit de sécurité Better Auth : la limite de débit devient réelle

Passage de la configuration d'authentification au crible de la checklist Better Auth. L'essentiel
tenait déjà — secret validé au build, origines de confiance explicites, CSRF non désactivé,
redirections désinfectées des deux côtés, jeton du cron comparé en temps constant. Trois écarts,
dont un seul était un vrai trou.

- **`rateLimit` était annoncé mais ne tenait pas.** Sans `storage`, Better Auth résout le défaut
  `"memory"` : sur Vercel, un compteur par instance de fonction, remis à zéro à chaque démarrage à
  froid. Corrigé en `storage: "database"`, ce qui impose la table `RateLimit` — sa forme n'est pas
  un choix, elle est dictée par `getAuthTables()`. Vérifié en conditions réelles : la onzième
  requête sur `/api/auth/get-session` répond 429 et la ligne est bien écrite en base.
- **`/api/command` n'avait aucun plafond.** C'était l'exposition la plus concrète : le `matcher` du
  proxy exclut `api/` en entier, donc un route handler n'a rien devant lui, et chaque frappe peut
  déclencher un appel AniList sur un quota de 30/minute partagé. Vingt recherches par minute et par
  compte, via `@/lib/security/rate-limit`.
- **Deux tables plutôt qu'une, et c'est le point qui méritait d'être tranché.** Partager la table de
  Better Auth aurait été plus court : sa purge supprime *toutes* les lignes plus vieilles que sa
  propre fenêtre, donc baisser `rateLimit.window` un jour aurait raccourci en silence une fenêtre
  qui n'a rien à voir avec l'authentification. `ApiRateLimit` est à nous, et n'a pas besoin de purge
  tant que ses clés restent de la forme `"<quoi>:<userId>"` — une ligne par compte, réécrite sur
  place. C'est écrit dans le schéma, parce que c'est la condition qui rend l'absence de purge
  correcte.
- **La fenêtre est fixe, pas glissante**, et la course sur le compteur est assumée : deux requêtes
  simultanées peuvent laisser passer une unité de trop. Sur un garde-fou de quota c'est sans effet ;
  la note est dans le fichier pour que personne ne prenne ce limiteur pour une protection de secret.

Ce que l'audit a **trouvé sans corriger**, faute d'être des bugs :

- Les jetons OAuth GitHub (`Account.accessToken` et ses voisins) sont stockés en clair, alors que le
  projet ne s'en sert pour rien — AniList est la seule API appelée. `account.encryptOAuthTokens` ou
  ne pas les stocker du tout : les deux sont des décisions à prendre, et la première demande de
  vider les colonnes existantes puisque les lignes en clair ne seront pas déchiffrables.
- **`session.cookieCache` décale le contrôle de statut de cinq minutes.** `getSession()` lit le
  cookie et non la base, donc une remise en attente depuis Prisma Studio met jusqu'à cinq minutes à
  fermer la porte. Le commentaire de `/api/command` promettait l'inverse ; il dit maintenant ce qui
  se passe vraiment. `disableCookieCache` sur `requireApprovedUser()` rendrait la révocation
  immédiate contre une lecture base par navigation — arbitrage non tranché.

Reste ouvert : la palette ne distingue pas un 429 d'une panne, elle vide la liste dans les deux cas.
Un plafond atteint mériterait un message plutôt qu'un écran vide.

---

## 8 août 2026 — réordonner une liste : V1.5 est ouverte

Le glisser-déposer sur `/lists/[slug]`. C'est la promesse que `rank` portait **depuis la première
migration** : la colonne était remplie en index fractionnaire à chaque ajout, sans que rien ne s'en
serve encore. Elle sert.

- **Un déplacement réécrit une ligne, pas quarante.** `rank` étant une chaîne et non un entier,
  `generateKeyBetween(avant, après)` insère entre deux clés sans renuméroter la suite. C'était tout
  l'arbitrage de §7 (`fractional-indexing`), et il se paie aujourd'hui.
- **Le calcul du voisinage est pur, isolé et testé** (`list-reorder.ts`, 8 cas). La partie visuelle
  est prise en charge par dnd-kit ; ce qui restait à écrire est un raisonnement d'index qui a
  exactement deux façons de se tromper d'une case. Le cas qui compte : **on retire l'élément déplacé
  avant de chercher ses voisins**, sinon un déplacement vers l'avant le compte encore à son ancienne
  place et il atterrit une case trop tôt. Deux tests prennent ce cas de face.
- **Le client envoie une position, jamais un rang.** Laisser le navigateur calculer la clé serait plus
  court d'une lecture et faux : la clé serait alors une donnée client, dérivée d'un ordre qui a pu
  changer depuis le rendu, et n'importe quoi pourrait finir dans la colonne. Le serveur relit l'ordre
  réel — même principe que le plafond de progression, dont le client n'est jamais juge.
- **Reposer une œuvre là où elle était n'écrit rien.** `rankAfterMove` renvoie `null`, l'action sort,
  et `updatedAt` ne bouge pas : sans ça, un glisser sans effet ferait remonter la liste en tête de
  l'index pour rien.
- **Les vignettes sont rendues par le serveur et passées en `children`.** `MediaCard` est asynchrone
  — il lit lui-même la préférence de langue —, donc un composant client ne peut pas l'appeler ; il
  peut recevoir son résultat. C'est ce qui rend la grille interactive **sans faire basculer son
  contenu côté client**, et c'est le motif que ARCHITECTURE.md décrivait sans qu'on l'ait encore
  utilisé pour de bon.
- `MediaGrid` est réutilisé tel quel plutôt que ses classes recopiées — c'est exactement ce que ce
  fichier partagé existe pour empêcher.
- **Une poignée dédiée, pas la carte entière.** La jaquette est déjà un lien et porte un bouton
  « retirer » : un troisième comportement au même endroit rendrait les trois ambigus. La poignée est
  au coin haut-gauche, le retrait au coin droit. Seuil d'activation à 8 px, ce qui laisse passer les
  clics — vérifié, un clic franc ouvre toujours la fiche.
- **Le clavier fonctionne**, et ce n'était pas gratuit : les annonces par défaut de dnd-kit sont en
  anglais, or ce sont les seules informations qu'un lecteur d'écran reçoit d'un geste par définition
  visuel. Elles sont réécrites en français, avec la position et le total.
- L'ordre affiché est optimiste puis le serveur reprend la main, par ajustement d'état pendant le
  rendu plutôt que par un `useEffect` qui rendrait une frame de trop. C'est aussi ce qui fait qu'un
  retrait d'œuvre resynchronise la grille sans la laisser mentir.

Vérifié dans l'application sur une liste de quatre œuvres créée pour l'occasion puis supprimée
(la liste `test` n'a pas été touchée) : déplacement **au clavier** — espace, trois flèches, espace —
avec l'annonce « Déposé en position 1 sur 4 », puis déplacement **à la souris** vers l'avant, qui est
le cas qui se décale quand le calcul est faux. Les deux confirmés par rechargement serveur. Clic sur
une jaquette qui ouvre toujours la fiche, et retrait d'une œuvre qui resynchronise la grille.

**Reste ouvert :** `browser_drag` de Playwright ne suffit pas à piloter dnd-kit — il envoie un seul
`pointermove`, là où le capteur en attend une succession pour franchir son seuil puis suivre. Le geste
a dû être simulé événement par événement. À savoir le jour où les parcours passeront sous Playwright.
Et l'ordre reste celui de la liste : les **vues** (classements, tier lists, §4.4) sont le chantier
suivant, et elles réutiliseront tout ce qui vient d'être posé.

## 8 août 2026 — modifier une liste, et un formulaire qui s'effaçait

`updateList` est revenue avec son écran, six semaines de dette en moins — l'action avait été écrite
puis retirée faute de dialogue, et knip l'aurait signalée morte.

- **Le `slug` n'est pas recalculé.** C'était la consigne laissée en commentaire, et c'est la seule
  chose à retenir : le dériver du nouveau titre paraîtrait cohérent et casserait toute adresse déjà
  ouverte, mise en favori ou — dès V1.5 — partagée. Le slug **identifie** la liste, il ne la décrit
  pas. Renommer « Top 2026 » en « Mes tops » laisse donc l'URL sur `/lists/top-2026`, et le dialogue
  **affiche l'adresse** pour que ça ne se découvre pas après coup.
- **Pas d'interrupteur de visibilité**, alors que la colonne existe. Passer une liste en `UNLISTED`
  n'a de sens qu'avec un lien de partage, qui est du V1.5 et qui bute encore sur l'adressage
  (`@@unique([ownerId, slug])`). L'offrir maintenant promettrait un partage qui n'existe pas.
- Les règles de titre et de description sont **définies une fois** et partagées entre création et
  modification. Un titre accepté ici et refusé là serait incompréhensible pour qui le subit.
- `updateMany` et non `update`, comme le reste du domaine : c'est la seule forme qui accepte un
  `where` non unique, donc `ownerId`. Et `description: description ?? null` — vider le champ
  **efface**, là où `undefined` laisserait en place. Même distinction que `saveEntrySchema`.

**Le vrai enseignement de la séance est un bug que je n'ai pas écrit.** Passer une fonction à
`<form action={…}>` fait **posséder le formulaire par React**, qui l'enveloppe en
`requestFormReset(form); action(formData)` — lisible tel quel dans la source de `react-dom`. Le
formulaire est donc vidé à **chaque** envoi, avant même que l'action réponde. Conséquence : on tape
une description, on se trompe de titre, la validation refuse — et la description a disparu. C'est une
perte de saisie silencieuse, sur le seul geste où l'utilisateur a écrit quelque chose de long.

`onSubmit` avec `preventDefault` donne exactement le même confort — `Entrée` dans un champ déclenche
la soumission native, donc le handler — sans céder le formulaire.

**Un `grep` a montré que le projet en comptait trois, pas un.** `create-list-dialog.tsx` et
`add-to-list-dialog.tsx` portaient le même défaut depuis la séance des listes. Les trois sont
corrigés : connaître le bug et n'en réparer qu'un revenait à le garder. Le troisième a demandé un
traitement à part — dans « Ajouter à une liste », vider le champ **après un succès** est justement ce
qu'on veut, et seul l'échec doit préserver la saisie. Le champ y est donc **contrôlé**, et c'est
`onSuccess` qui le remet à zéro : l'état local sépare les deux cas que le reset de React confondait.

Vérifié dans l'application, sur des listes créées pour l'occasion puis supprimées : renommage effectif
avec **URL inchangée** (`/lists/top-2026` pour « Mes tops de l'été »), confirmé par rechargement
serveur ; description effacée quand on vide le champ ; titre fait de trois espaces refusé par le
`trim()` du schéma ; et surtout le scénario du bug rejoué avant/après — description perdue avant,
conservée après. L'index reflète le nouveau titre en gardant l'ancien `href`. Le troisième dialogue a
été éprouvé dans les deux sens : saisie conservée après un titre refusé, champ vidé après un succès.

**Reste ouvert :** aucun test unitaire ajouté, faute de logique pure à tester — l'action n'orchestre
que la validation et l'écriture. Le défaut du formulaire, lui, n'est attrapable qu'à l'écran ou par un
test de composant, et Vitest tourne en environnement `node` (voir *Dettes connues*).

## 8 août 2026 — la palette de commandes, et la fin de V1

`⌘K` savait naviguer. Elle **cherche** et elle **agit** maintenant, ce qui ferme la dernière promesse
de V1 (§6). Saisie vide : les séries en cours, `Entrée` avance d'un épisode — deux touches pour le
geste le plus fréquent du produit. Saisie remplie : ma bibliothèque, puis l'avancement, puis le
catalogue AniList.

- **Sixième feature, `command`.** Elle compose du suivi et du catalogue sans appartenir à ni l'un ni
  l'autre — exactement la raison qui avait fait naître `profile`. La mettre dans `tracking`
  l'obligerait à connaître AniList ; dans `media`, à connaître les entrées.
- **La palette a changé de maison.** Elle vivait dans `components/layout/` quand elle n'était qu'une
  table de raccourcis ; elle manipule maintenant des entités métier, donc la règle des quatre
  dossiers la fait descendre dans `features/command/components/`.
- **Un route handler, pas une Server Action**, et c'est le point technique de la séance : une action
  est un `POST` que Next **sérialise**, donc sur une recherche à la frappe la réponse à « fri »
  arriverait après celle à « frieren ». Un `GET` se laisse annuler par un `AbortController` dès la
  frappe suivante — la course disparaît, et le quota est rendu. Inscrit dans ARCHITECTURE.md, avec la
  contrepartie : un route handler porte sa propre garde, puisque ni le layout `(app)` ni le proxy ne
  le couvrent.
- **Deux sources, deux coûts, et l'asymétrie est assumée.** La bibliothèque vient du miroir local,
  donc gratuite : on l'interroge à chaque frappe. Le catalogue vient d'AniList, donc plafonné : il
  passe par le `"use cache"` de `searchMedia`, et **une saisie vide ne part pas du tout** chez AniList.
- **Le serveur envoie des libellés finis**, titres et statuts compris. La palette est un composant
  client : elle ne peut pas lire la préférence de langue des titres, qui est une lecture serveur. Lui
  faire mettre en forme des données brutes aurait rendu le réglage du compte sans effet (§4.6).
- **L'ordre des groupes protège de l'écriture accidentelle.** Avec une saisie, « Ma bibliothèque »
  passe avant « Avancer » : une frappe distraite suivie d'`Entrée` **ouvre une fiche**, elle n'écrit
  pas. Sans saisie, « Reprendre » est premier et `Entrée` avance — mais c'est alors un geste
  délibéré, et le toast nomme l'œuvre et l'épisode pour qu'une erreur se voie tout de suite.
- `useDebouncedValue` dans `src/hooks/` (générique, sans métier) : 220 ms. Sans lui, « frieren »
  coûtait sept requêtes dont six jetées.

**Un bug trouvé à l'écran, et pas autrement.** cmdk choisit la ligne sélectionnée **au montage** et
ne revient pas sur son choix quand la liste s'allonge. Les résultats arrivant après l'ouverture, la
sélection restait sur « Rechercher » — donc `⌘K` puis `Entrée` naviguait au lieu d'avancer, ce qui
retirait à la palette la seule chose qui la rend utile. Corrigé en **construisant les sections en
données avant de les rendre** : la première ligne est `sections[0].items[0]`, donc l'ordre d'affichage
n'est écrit qu'une fois. La première version le calculait deux fois, et les deux avaient divergé.

Vérifié dans l'application, au clavier : `⌘K` sélectionne bien le premier « +1 » ; « chainsaw » ramène
six résultats de catalogue et fait disparaître le groupe Navigation ; « frieren » donne les trois
groupes ; `↓` puis `Entrée` sur « Avancer » a fait passer *Frieren* de 0/28 à 1/28, avec sa ligne de
journal et le toast « Sousou no Frieren · épisode 2 sur 28 ». L'endpoint répond 401 sans session.

**Une leçon de méthode, pas de code.** J'avais annoncé la veille une progression « remise à 2 » en
relisant la **valeur du champ**, qui est l'état local de l'îlot client — la base était restée à 3. Le
panneau enregistre sur `onBlur` (volontairement : « une frappe n'est pas une intention »), or un
`fill()` suivi d'`Entrée` ne provoque aucun blur. **Une écriture ne se vérifie qu'après
rechargement**, jamais en relisant le contrôle qu'on vient de remplir. Les deux progressions de test
ont été remises à leur valeur d'origine et confirmées de cette façon.

**Reste ouvert :** la palette ne sait pas changer un statut ni ajouter à une liste — seulement avancer.
Et quand la seule œuvre du catalogue est déjà dans la bibliothèque, le dédoublonnage laisse le groupe
« Catalogue » réduit à son « tout chercher » : honnête, mais un peu nu.

## 8 août 2026 — la fraîcheur du miroir, et `/browse`

Deux chantiers dans la même séance, parce qu'ils tirent sur la même corde : le quota AniList.
Le premier ferme la réserve qui traînait sur V0, le second la dernière route V1 en 404.

### Le miroir se périme enfin

`syncedAt` était écrit depuis la première migration et **personne ne le regardait**. C'est réparé,
et la politique de §4.1 est maintenant du code : `media-freshness.ts`, pur, 14 tests.

- **Le rafraîchissement paresseux « à la lecture » a été écarté**, et PRODUCT.md le dit maintenant.
  Il fait écrire en base pendant le rendu d'une page — une requête `GET` coûteuse et non idempotente
  —, et il ne visite que ce qu'on vient de regarder, jamais les six cents autres titres. Ce qui
  restait de l'idée est devenu un **garde-fou à l'écriture** : `ensureMediaMirror` ne réécrit rien
  quand la ligne est fraîche. Sans lui, chaque « +1 » recopiait dix-huit colonnes du catalogue
  partagé pour incrémenter un compteur personnel.
- **`media(id_in: […])` est ce qui rend le cron tenable** : cinquante fiches par requête. Un miroir
  de mille titres se remet à jour en vingt requêtes, là où une boucle par œuvre épuiserait le quota
  au trente-et-unième titre. Vérifié en vrai : sept lignes rafraîchies pour **une** requête.
- **C'est la seule lecture AniList non cachée du projet, et c'est délibéré.** Mémoriser la lecture
  qui remplit le miroir revient à rafraîchir une copie avec une copie. La query vit donc dans
  `media.mirror.ts` et non dans `media.queries.ts` — la frontière entre les deux fichiers est
  exactement celle-là.
- **Un `status` nul a sa propre branche dans le `where`.** En SQL, `status IN (…)` *et*
  `status NOT IN (…)` sont tous deux faux quand la colonne vaut `NULL` : une ligne sans statut
  échapperait aux deux conditions et ne serait jamais reprise. Le piège est silencieux, d'où le
  commentaire à côté.
- **Une œuvre disparue d'AniList garde sa copie mais avance quand même son `syncedAt`.** Sans ça
  elle reste périmée pour toujours, et chaque passe dépense une place de lot à la redemander en vain.
- Une transaction par lot de cinquante, et non cinquante `await` en file : le second dépasserait le
  délai d'une fonction serverless bien avant d'épuiser le quota AniList.
- Le handler ne contient aucune logique — il authentifie, il appelle, il rend compte. La comparaison
  du jeton porteur passe par `timingSafeEqual` : un `===` s'arrête au premier octet différent et rend
  le temps de réponse dépendant du préfixe fourni.
- **Une passe par jour, à 4 h UTC**, parce que le plan Vercel est Hobby et ne permet pas mieux. D'où
  un point qui a l'air d'une incohérence et n'en est pas : le seuil de péremption des œuvres en cours
  reste à 12 h, plus court que la cadence. C'est ce qui garantit qu'une ligne volatile est *toujours*
  périmée quand la passe arrive. Aligner le seuil sur 24 h ferait l'inverse — une ligne rafraîchie à
  4 h 02 ne serait pas encore périmée à 4 h 00 le lendemain, et attendrait le surlendemain.

**Au passage, un vrai bug trouvé en chemin :** le matcher du proxy n'excluait que `api/auth`, donc
l'appel du cron aurait été **redirigé vers `/login`** — il n'a pas de cookie de session. Une 307 vers
du HTML est une réponse absurde à un appel programmatique, et un route handler porte de toute façon sa
propre garde. Le matcher exclut maintenant `api/` en entier, et `proxy.test.ts` a gagné un bloc qui
teste le matcher lui-même : c'est de la configuration, donc ça n'échoue jamais bruyamment.

Vérifié de bout en bout, sur les trois chemins qui comptent : 401 sans en-tête, 401 avec un faux
jeton **de la bonne longueur** (donc `timingSafeEqual` est bien exercé, pas seulement le test de
taille), puis miroir vieilli de quarante jours en base → `{stale: 7, refreshed: 7, batches: 1}`, et
passe suivante à `{stale: 0}` — ce qui prouve que `syncedAt` a avancé. La branche « œuvre disparue » a
été éprouvée avec un id inventé : `{vanished: 1}`, puis plus jamais redemandé. Ligne de test supprimée.

### `/browse`

- **Cinq rangées, une seule requête.** Le document aligne cinq champs `Page` sous des alias
  distincts. Cinq lectures séparées prendraient cinq crédits sur les trente de la minute, partagés
  par tous les visiteurs ; la page entière en prend un, et zéro dès la deuxième visite dans l'heure.
- **La saison est un argument, jamais une lecture faite dans le cache.** `currentSeason()` change
  quatre fois par an : la lire à l'intérieur du `"use cache"` y figerait la saison du premier
  remplissage, et la page annoncerait encore l'automne au mois de janvier.
- `media-season.ts` : décembre appartient à l'**hiver de l'année suivante**, c'est le découpage
  d'AniList (« décembre à février ») et le seul endroit du calcul où l'année bouge avec la saison.
  Le calcul passe par `Europe/Paris` — le 30 novembre à 23 h 30 UTC on est déjà en décembre à Paris,
  et un calcul en UTC se tromperait d'un trimestre entier. Un test prend exactement ce cas.
- **Deux rangées n'ont pas de « Tout voir », et c'est volontaire.** La recherche n'a pas de paramètre
  de saison : un lien depuis « Cette saison » perdrait le filtre en chemin et enverrait sur une page
  qui ne montre pas ce qu'on a cliqué. Mieux vaut pas de lien qu'un lien qui ment.
- Une rangée vide ne s'affiche pas — « la saison prochaine » l'est en début de saison, AniList
  remplissant les fiches au fil des annonces.
- Une seule frontière de suspension pour les cinq rangées : elles viennent de la **même** requête,
  donc elles sont prêtes ensemble, et les éclater ne multiplierait que les sauts de mise en page.

Vérifié dans l'application : les cinq rangées rendues, « été 2026 » et « automne 2026 » corrects,
« Tout voir » qui atterrit sur `/search` avec le tri « Tendances » et les mêmes premiers résultats que
la rangée. Un « +1 » a aussi été fait puis défait sur *Gachiakuta* (2 → 3 → 2), pour éprouver le
nouveau garde-fou d'`ensureMediaMirror` sur une ligne fraîche : le geste passe, le journal a gagné ses
lignes — qu'une table append-only ne reprend pas.

**Reste ouvert :** `/browse` n'a pas d'onglet anime/manga ni de sélecteur de saison — c'est une page
éditoriale, pas un second moteur de recherche, mais un jour il faudra choisir. Et le `perPage` des
rangées est figé à douze dans le document, donc non réglable par écran.

## 8 août 2026 — les listes

`/lists` et `/lists/[slug]` : créer une liste, la remplir depuis une fiche, en retirer une œuvre, la
supprimer. **Réordonner reste du V1.5** (§6), et c'est ce qui rend ce lot tenable.

- **La porte d'entrée est la fiche, pas la page des listes.** Une liste ne se remplit pas depuis
  l'écran qui les énumère : elle se remplit là où l'on regarde une œuvre. Le dialogue « Ajouter à une
  liste » sait déjà lesquelles la contiennent — une requête au rendu, aucune à l'ouverture — et
  **crée une liste à la volée** en enchaînant sur l'ajout. Sans ça, le premier usage du produit
  obligeait à quitter la fiche pour aller créer la liste ailleurs.
- **`ownerId` est dans le `where` de chaque mutation**, jamais dans une vérification en amont. Un
  `listId` vient toujours du navigateur ; un contrôle séparé laisserait une fenêtre entre la lecture
  et l'écriture, et surtout il pourrait être oublié dans la prochaine action. C'est aussi pour ça que
  les mutations passent par `updateMany`/`deleteMany` : ce sont les seules formes qui acceptent un
  `where` non unique, donc qui acceptent le propriétaire.
- **`rank` est rempli dès maintenant**, avec `fractional-indexing` (installé pour l'occasion, il
  était déjà arbitré §7). Un ajout appelle `generateKeyBetween(dernier, null)` et ne touche aucune
  ligne existante. Le glisser-déposer de V1.5 insérera *entre* deux clés avec la même fonction — et
  l'écran de liste n'aura rien à changer.
- **Ajouter deux fois la même œuvre est un non-événement**, pas une erreur : `upsert` sur la
  contrainte `(listId, mediaId)`, avec un `update` vide pour garder le rang et la note d'origine.
- Les slugs sont dérivés du titre, accents retirés, avec un suffixe numérique en cas de collision —
  `top-2026`, `top-2026-2`, lisibles et devinables. Sept tests couvrent les titres accentués, les
  emojis et le cas « titre entièrement en japonais », qui produirait sinon `/lists/`.
- **Confirmation pour supprimer une liste, aucune pour en retirer une œuvre.** Le second geste se
  défait en deux clics ; le premier emporte tout le contenu, et la boîte compte ce qu'on perd.

Une action de renommage a été écrite puis **retirée** : elle n'avait pas d'écran, donc c'était du
code mort — knip l'a signalée, et la retirer valait mieux que la laisser dormir. Ce qu'il faudra
savoir quand elle reviendra est resté en commentaire dans le schéma.

Vérifié dans l'application, du début à la fin : dialogue vide sur une fiche, liste créée à la volée
(« Séries à revoir cet été » → `series-a-revoir-cet-ete`), œuvre présente dans l'index et sur la page
de la liste, retrait depuis la vignette, puis suppression de la liste — qui a ramené l'index à son
état vide. Aucune trace laissée en base, contrairement au journal du suivi qui, lui, est append-only.

**Reste ouvert :** le partage. `slug` est unique **par propriétaire** (`@@unique([ownerId, slug])`),
donc `/lists/[slug]` ne peut pas désigner la liste de quelqu'un d'autre. Le lien non listé de V1.5
demandera soit un segment de propriétaire, soit un jeton — c'est écrit dans `lists.queries.ts`.

## 8 août 2026 — les réglages, et la fin des préférences mortes

`/settings` existe, mais **l'écran n'est que la moitié du travail** : la dette n'était pas l'absence
de page, c'était trois colonnes en base que personne ne lisait. Les trois sont branchées.

- **Langue des titres.** `mediaTitle` prend la préférence et l'ordre de repli part du choix demandé.
  Au passage, `userPreferred` d'AniList ne gagne plus : c'est le titre choisi d'après les réglages du
  compte **qui interroge l'API** — le nôtre, anonyme et identique pour tous —, donc le laisser
  passer devant rendait le réglage sans effet. Le test qui affirmait le contraire disait l'ancienne
  règle : il dit maintenant la nouvelle.
- **Contenu adulte.** Le filtre reste un **argument de requête**, jamais une lecture faite à
  l'intérieur d'un `"use cache"` : les données AniList sont les mêmes pour tout le monde, et lire une
  préférence dedans empoisonnerait le cache d'un compte à l'autre. `includeAdult` fait donc partie de
  la clé de cache, ce que la signature de `getMediaById` prévoyait déjà.
- **Échelle de notes.** L'affichage *et* la saisie. `SCORE_STEP` fait l'aller-retour en un seul
  endroit, ce qui tient la promesse du §4.2 : une note saisie « 8/10 » se relit « 4/5 » sans avoir
  bougé en base. Cinq étoiles gardent leur composant — à cette granularité on vise, on ne tape pas —,
  au-delà c'est un champ numérique. Quatre tests couvrent l'aller-retour et le bornage.

**Le point d'architecture** : les composants lisent la préférence **eux-mêmes** plutôt que de la
recevoir en propriété. `getPreferences` porte le `cache` de React, donc les vingt-quatre vignettes
d'une page ne coûtent qu'une requête. Sans cette déduplication, il aurait fallu faire descendre les
réglages à travers cinq niveaux de composants — ou, plus probablement, ne pas les brancher du tout.
Ça n'est possible que parce qu'aucun composant client ne rend `MediaCard`.

Le reste suit la même ligne : chaque contrôle enregistre seul, sans bouton « Enregistrer » — trois
réglages ne forment pas un formulaire —, et l'action revalide `"/"` en `layout` plutôt que trois
chemins, parce qu'un changement d'échelle touche potentiellement chaque page rendue.

Vérifié dans l'application, réglage par réglage : titres passés en anglais dans toute la
bibliothèque, champ de note devenu « Ma note sur 100 » avec la valeur convertie (3 étoiles → 60), et
journal du profil affichant « Noté 60/100 », « Noté 80/100 ». Les réglages ont été remis à leurs
valeurs d'origine ensuite.

**Reste ouvert :** la langue de l'interface est en base mais n'a pas de sélecteur — l'application est
en français uniquement (§7), et un menu à un seul choix serait une promesse creuse. Le filtre 18+ n'a
pas pu être éprouvé sur une vraie œuvre adulte.

## 8 août 2026 — le profil et la timeline complète

`/u/[username]` : l'identité du membre, ses chiffres, et **le journal entier, paginé**. `EntryEvent`
a maintenant ses trois lectures — les dernières lignes d'une œuvre sur la fiche, un survol sur le
tableau de bord, tout ici.

- **Troisième feature, `profile`.** Elle compose des données de compte et de suivi sans appartenir à
  ni l'un ni l'autre. Ses composants, eux, restent dans le `_components/` de la route : ils ne
  servent qu'à elle, et la règle est de ne promouvoir qu'au deuxième appelant.
- **La règle de visibilité tient dans une fonction.** Profils et bibliothèques sont visibles entre
  membres (§7), sauf les entrées `private`. Le filtre est appliqué dans `profile.queries.ts` et
  nulle part ailleurs — une exception oubliée dans une requête publierait le suivi de quelqu'un
  d'autre. `isSelf` se déduit de la session, jamais de l'URL.
- **Un compte non approuvé n'a pas de profil.** Compte inconnu et compte en liste d'attente donnent
  la même page introuvable : les distinguer confirmerait l'existence d'un compte que personne n'a
  validé.
- **Épisodes et chapitres comptés séparément.** Les additionner donnerait un nombre qui ne veut rien
  dire — c'est la même raison qui fait de `progress` un curseur par œuvre et non un total (§4.2).
- `groupBy` pour la répartition par statut, plutôt que six `count` : une requête, et un septième
  statut ne demanderait pas une septième requête.
- La liste d'activité du tableau de bord est montée dans `features/tracking/components/` — deuxième
  appelant, donc promotion. Les deux ne diffèrent que par le nombre d'événements passés.
- **`src/config/locale.ts`** rassemble enfin la langue et le fuseau, jusque-là enfermés dans
  `entry-format.ts`. La décision du fuseau français (§7) est désormais une constante que tout
  `Intl.*` du projet doit recevoir, et ARCHITECTURE.md le dit dans son tableau `config/`.
- Au passage : le menu du compte pointait vers un `/profile` **écrit en dur** qui n'existe pas, et
  l'en-tête affichait un nom et un e-mail codés en dur depuis l'échafaudage. Les deux sont branchés
  sur la session, que le layout `(app)` obtient déjà — elle est passée en propriété plutôt que
  relue, pour que l'en-tête ne puisse pas s'afficher sans sa garde.

Vérifié dans l'application : profil rendu avec ses six œuvres et ses 22 événements, `?page=99`
ramené à la première page, profil inexistant qui affiche la page introuvable, et le lien « Profil »
du menu qui mène enfin quelque part.

**Reste ouvert :** le `notFound()` vit dans un composant suspendu, donc la réponse est un 200 avec
la page introuvable — même compromis que `/media/[id]`, assumé par le même raisonnement (la coquille
part avant qu'on sache si la ressource existe). Le filtre des entrées privées n'a pas pu être vérifié
en vrai : il faudrait un second compte.

## 8 août 2026 — le « +1 » depuis la grille

Le geste le plus fréquent du produit (§6, V1) ne demande plus d'ouvrir la fiche : un bouton sur la
jaquette, dans la bibliothèque comme sur le tableau de bord.

- **Le bouton est un frère du lien, pas son descendant.** Un `<button>` dans une `<a>` est du HTML
  invalide, et les technologies d'assistance n'ont alors aucun moyen d'annoncer deux commandes qui
  n'en font qu'une. `MediaCard` a donc gagné une fente `action`, rendue en dehors du lien et
  positionnée sur le coin de la jaquette — position qui ne dépend pas de la hauteur du titre, lequel
  fait une ou deux lignes selon l'œuvre.
- Le bouton **n'envoie que la progression**, comme le panneau : la transition serveur en déduit le
  reste (passage en cours, fin de série, date de début). Rien n'est réécrit côté client.
- Le compteur du bouton est optimiste, **le texte sous la vignette vient du serveur**. C'est voulu :
  le serveur est seul juge du plafond, et voir le compteur s'arrêter à 12/12 vaut mieux qu'une
  interface qui promet un treizième épisode inexistant.
- `saveEntry` revalide maintenant **trois chemins**. La même entrée s'affiche à trois endroits, et
  le tableau de bord est le plus sensible : sa section « en cours » est triée par date de
  modification, donc un seul geste en réordonne la grille.
- Au passage, les libellés d'unité (`ENTRY_UNIT_LABELS`). `EntryUnit` est un jeton technique, et
  l'écrire tel quel donnait « Avancer d'un episode » et « Nombre de episodes vus » à lire au lecteur
  d'écran. Les tournures sont écrites en entier, parce que le français élide (« nombre **d'**épisodes »
  contre « nombre **de** chapitres ») et accorde au support — on *voit* des épisodes, on *lit* des
  chapitres.

Vérifié dans l'application, et cette fois **en écrivant** : impossible de tester un bouton d'écriture
autrement. Un « +1 » cliqué depuis le tableau de bord sur *Tsuihou Sareta* — le compteur est passé de
rien à « 1 / 26 » sans rechargement manuel (la revalidation fait son travail), et le journal a gagné
sa ligne « Épisode 1 · +1 ». La progression a ensuite été remise à 0 depuis le panneau de la fiche ;
restent deux lignes de journal dans la base de développement, qu'une table append-only ne reprend
pas.

## 8 août 2026 — le tableau de bord

`/` n'affiche plus `<div>page</div>`. Trois sections, dans l'ordre où on se pose les questions en
ouvrant l'application : **en cours**, **à reprendre**, **activité récente**. L'écran n'invente rien
— il compose ce que le suivi, le journal et le miroir avaient déjà posé.

- **« En cours » et « à reprendre » sont disjointes par construction.** Une série `CURRENT` touchée
  il y a moins de trente jours est en cours ; au-delà, elle est à reprendre, avec les `PAUSED`. Sans
  cette coupure, la même œuvre apparaîtrait deux fois sur un écran qui tient en une hauteur de page.
  Le seuil est un choix de produit et porte son nom (`STALLED_AFTER_DAYS`) : plus court, on accuse
  une semaine de vacances ; plus long, l'écran arrive après l'oubli.
- `formatSince` — « il y a trois mois ». C'est **toute** l'information de la section : savoir qu'une
  série est en pause n'apprend rien, savoir depuis quand décide (§8.4). Une durée et non une date,
  donc aucun fuseau n'intervient — contrairement aux intitulés de journée.
- **Une seule requête, un seul `Promise.all`, une seule frontière de suspension.** Les quatre
  lectures sont locales et indépendantes ; les éclater en trois composants suspendus ferait relire
  la session trois fois pour rien.
- `groupEventsByDay` est devenu générique sur l'événement. L'activité du tableau de bord joint le
  titre de l'œuvre à chaque ligne, et une signature figée sur `EntryEventView` lui aurait fait
  perdre ce champ au premier regroupement.
- Une section vide ne s'affiche pas ; une bibliothèque vide affiche une seule porte d'entrée vers la
  recherche, pas trois sections creuses.

Vérifié dans l'application. « À reprendre » ne pouvait pas apparaître sur cette base — rien n'y est
en pause ni vieux d'un mois —, donc le seuil a été abaissé à zéro le temps d'un rendu : la section
est apparue, « En cours » a disparu, ce qui confirme la disjonction du même coup. Seuil remis à 30.

**Reste ouvert :** l'activité répète le titre quand plusieurs gestes suivent la même œuvre — lisible
tant que le journal est court, à regrouper le jour où il ne le sera plus.

## 8 août 2026 — la bibliothèque

`/library` : la première liste d'`Entry`, et le premier écran servi **entièrement par le miroir
local** — aucune requête AniList, ce pour quoi la table `Media` existe (§4.1).

- Filtres par statut et par type, quatre tris (activité récente, titre, note, progression),
  pagination par 24. Tout dans l'URL, avec les parseurs nuqs partagés entre le client qui écrit et
  le serveur qui lit — même schéma que la recherche.
- **Le filtre par statut est en liens serveur, pas en boutons.** C'est l'axe principal — « qu'est-ce
  que je regarde en ce moment » — donc il doit être partageable, préchargé et cliquable avant
  l'hydratation. Seuls le type et le tri sont un îlot client, parce qu'un `<Select>` en a besoin.
- Chaque changement de filtre **repart de la page 1**, et la page demandée est ramenée dans les
  bornes côté serveur : un `?page=40` forgé afficherait sinon une grille vide qu'on lirait comme
  « rien ne correspond ».
- Les tris se terminent tous par `id`. Sans clé de départage, deux entrées de même note peuvent
  changer de place entre deux requêtes, et la pagination répète alors une œuvre page 2 en en
  sautant une autre. Même raisonnement que pour le journal, autre conséquence.
- `compactFromMirror` (dans `features/media/lib/media-format.ts`) est la couture entre les colonnes
  plates du miroir et la forme imbriquée qu'attendent les composants de catalogue. En un seul
  endroit : sinon `MediaCard` finirait par accepter deux formes.

Deux promotions au passage, prévues par la règle d'ARCHITECTURE.md (« dès qu'un deuxième endroit en
a besoin ») : la pagination et la grille de vignettes sont montées de `search/_components/` vers
`components/shared/`. La grille et son squelette vivent dans le **même fichier** — c'est la seule
façon de garantir qu'ils ne divergent pas, et un squelette resté en cinq colonnes décalerait la page
à chaque fin de chargement.

Vérifié dans l'application : tri par titre effectif, filtre `type=MANGA` qui ne laisse qu'un
manhua, statut vide qui donne l'état vide avec `aria-current` sur l'onglet. Deux fausses alertes en
chemin, toutes deux dues à une lecture de l'URL avant la fin de la navigation client — les mesures
refaites en navigation directe sont conformes.

**Reste ouvert :** aucun geste depuis la grille (il faut ouvrir la fiche pour faire « +1 »), et pas
de recherche par titre dans la bibliothèque — à ajouter quand elle dépassera quelques pages.

## 8 août 2026 — la lecture du journal

`EntryEvent` avait un écrivain et aucun lecteur. Il a maintenant les deux : la fiche œuvre affiche
l'**activité récente** sous le panneau de suivi.

- `lib/entry-format.ts`, pur et testé : libellés des statuts, description d'un événement en une
  phrase, regroupement par journée. Isomorphe à dessein — le panneau est un îlot client, la
  timeline un Server Component, et c'est le seul moyen de leur faire partager des libellés.
- **Fuseau horaire fixe (`Europe/Paris`), pas celui de la machine.** Un `toLocaleDateString` nu
  prend le fuseau du serveur au rendu et celui du visiteur à l'hydratation : deux valeurs pour la
  même date, donc un écart d'hydratation, et « aujourd'hui » qui bascule à l'heure de l'Ohio.
  Tranché depuis : **l'heure française quoi qu'il arrive**, ce n'est pas un repli en attendant une
  préférence de compte. Inscrit dans PRODUCT.md §7.
- Le tri de la lecture est `[createdAt desc, id desc]`. Le départage n'est pas décoratif : un « +1 »
  qui termine une série écrit deux événements dans le **même `createMany`**, donc au même
  horodatage, et Postgres est alors libre de les rendre dans n'importe quel ordre. Le `cuid()` de
  Prisma (v1) étant préfixé par l'horodatage puis un compteur, son ordre lexicographique est celui
  de la création — un départage juste, pas seulement stable.
- **Huit événements, et le titre le dit** : « Activité récente », pas « Journal ». La colonne est
  `sticky` ; une timeline complète la rendrait plus haute que l'écran. Un « voir tout » aurait été
  une promesse rompue tant que l'écran de profil n'existe pas.
- Le composant ne rend **rien** quand l'œuvre n'est pas suivie — un encadré vide sur chaque fiche
  annoncerait une panne là où il n'y a rien à raconter.
- `SCORE_STARS` / `SCORE_POINTS_PER_STAR` et les libellés de statut ont quitté les composants
  clients pour ce module : ils étaient dupliqués, et un Server Component ne peut rien importer d'un
  fichier `"use client"`.

Vérifié dans l'application, en lecture seule, sur trois cas : une œuvre à treize événements (le
plafond de huit s'applique, les jours se regroupent), une œuvre à un seul événement (« Ajouté à la
bibliothèque · En cours »), une œuvre non suivie (aucune section). L'heure affichée a semblé
décalée de deux heures avant vérification : la colonne `createdAt` est un `timestamp without time
zone` où Prisma écrit de l'UTC, donc 01:55 en base est bien 03:55 à Paris. Rien à corriger.

**Reste ouvert :** la timeline multi-œuvres du profil, et le rafraîchissement après mutation qui
repose sur le `revalidatePath` déjà posé par `saveEntry` — non vérifié à la main, puisque ça
supposait d'écrire dans la base de développement.

## 8 août 2026 — le suivi et son journal

Première brique de V1 : `src/features/tracking/`.

- **La transition d'état est pure et vit à part** (`lib/entry-transition.ts`, 14 tests). La Server
  Action ne décide rien : elle lit, appelle, écrit. C'est la logique qui se trompe, donc c'est
  elle qu'on isole du reste.
- **L'état et son journal partent dans la même transaction.** Sans elle, une panne entre les deux
  écritures laisse soit une progression sans trace, soit un journal qui raconte un épisode que
  l'état ignore — et la table étant append-only, le second cas ne se corrige jamais.
- **Le journal est diffé à la fin**, pas enregistré au fil des règles : un « +1 » qui termine la
  série, laquelle recale la progression sur le total, produirait sinon deux événements de
  progression pour un seul geste.
- **`undefined` ≠ `null` dans `saveEntrySchema`** : « je n'y touche pas » contre « efface ». C'est
  ce qui rend les dates et le `repeatCount` automatiques par défaut **et** rattrapables à la main.
  Confondre les deux effacerait toute date posée automatiquement au premier clic voisin.
- Les dates de suivi sont stockées **à midi UTC** : à minuit, un visiteur à l'ouest de Greenwich
  verrait sa date reculer d'un jour à l'affichage.
- Panneau de suivi en Server Component (`entry-panel.tsx`) avec un îlot client mince
  (`entry-controls.tsx`), affichage optimiste, dans son propre `<Suspense>` sur la fiche — la
  lecture de l'entrée n'est pas cachée, la fiche AniList l'est.
- Notes en **5 étoiles pleines** via kibo-ui, une étoile = 20 points ; le stockage reste sur
  0–100. Dix demi-étoiles feraient ~20 px chacune, sous le minimum tactile.
- `ensureMediaMirror` copie l'œuvre AniList en base avant toute écriture qui y pointe : première
  utilisation réelle du miroir de §4.1.

**Reste ouvert :** la lecture du journal (voir *Le prochain pas*), et la politique de fraîcheur du
miroir — `syncedAt` est écrit, personne ne le regarde.

## 8 août 2026, nuit — la fiche œuvre

`/media/[id]` complète : hero, aperçu, personnages, équipe, œuvres liées, recommandations, tags,
liens externes, bande-annonce, épisodes en streaming.

- La page **n'attend pas `params`** : elle passe la promesse au composant suspendu, ce qui rend la
  navigation instantanée et laisse le contenu arriver en flux.
- Les onglets vides ne s'affichent pas — un manga n'a pas de casting vocal.
- Deux lectures AniList (`generateMetadata` et le contenu) ne coûtent qu'une requête grâce au
  `"use cache"` de `media.queries.ts`.
- Un id d'URL non numérique est rejeté **avant** de partir chez AniList : `/media/1e999` produirait
  un `Infinity`.

## 7 → 8 août 2026 — la recherche

`/search` avec filtres dans l'URL (nuqs), pagination, tri, et filtre 18+ appliqué côté serveur.
Palette de commandes de recherche dans le header (`search-command.tsx`). Première feature
`src/features/media/` — schémas Zod des réponses AniList, documents GraphQL isolés dans
`lib/media-documents.ts`, formatage dans `lib/media-format.ts`.

## 7 août 2026 — le socle, la base, l'auth

- Socle Next 16.3 / React 19 : layouts, pages d'erreur (`error`, `global-error`, `not-found`,
  `loading`, `forbidden`, `unauthorized`), providers, thème, polices, shadcn.
- `src/lib/http/anilist.ts` : client GraphQL sur upfetch, avec le quota 30 req/min documenté.
- `prisma/schema.prisma` + migration `20260807200302_init` : le modèle complet de PRODUCT.md §4
  d'un coup, y compris les tables dont les écrans n'arrivent qu'en V1.5.
- Better Auth, GitHub uniquement, liste d'attente : `username` et `status` en champs additionnels
  `input: false`, `PENDING` forcé par un hook base, garde `requireApprovedUser()` appelée **une
  seule fois** dans le layout `(app)`.
- `src/proxy.ts` : redirection optimiste sur présence de cookie, jamais d'appel session. La règle
  « le proxy ne renvoie jamais un porteur de cookie hors des routes publiques » est verrouillée par
  `src/proxy.test.ts` — un cookie périmé boucherait sinon à l'infini avec la garde du layout.
- `safeRedirectPath` sur toute destination venue de l'URL, **à la consommation**.
- Outillage agent : `.claude/hooks/conventions-guard.mjs` (refuse une écriture qui viole une règle
  non négociable), `biome-format.mjs`, skills `new-feature` et `anilist-read`, agents
  `convention-reviewer` et `next-docs`, et `.claude/SKILLS.md` qui tient lieu de lock.

---

## Dettes connues

Petites, mais elles se paient plus cher chaque semaine :

- **Rien n'est commité.** Voir *Le prochain pas*.
- **`src/app/not-found.tsx` rend son propre `<main>`**, qui se retrouve imbriqué dans celui du
  layout `(app)` quand une route authentifiée appelle `notFound()`. Deux `<main>` sur une page, ce
  qui n'est pas valide. Visible depuis le profil, mais le défaut est dans le fichier partagé.
- **knip est en `warn`** sur `files`, `dependencies` et `exports`, le temps que les routes V0
  soient câblées. À repasser en `error` — le commentaire est dans `knip.jsonc`.
- **Aucun test de composant React.** Vitest tourne en environnement `node` ; la logique testée est
  celle des `lib/`. Playwright est prévu pour les parcours critiques, pas encore installé. Ce trou
  a un coût mesuré : le formulaire qui s'effaçait sur erreur de validation (voir l'entrée du jour) a
  vécu deux séances sans que lint, typecheck ni tests ne bronchent — il n'était visible qu'à l'écran.
- **La nav pointe vers deux routes qui n'existent pas** : `/collection` (V1.5) et `/calendar` (V2).
  Assumé — elles sont au programme, pas oubliées.
- **`CRON_SECRET` doit être posé sur Vercel**, sinon le cron répond 401 deux fois par jour sans que
  rien ne le signale ailleurs que dans les logs. Le nom de la variable n'est pas libre : Vercel
  n'envoie l'en-tête `Authorization` que pour celle-là.
- **Le cron ne passe qu'une fois par jour** (`0 4 * * *`), parce que le plan Vercel est Hobby. Les
  œuvres en cours de diffusion sont donc rafraîchies toutes les 24 h là où le seuil de §4.1 en
  voudrait 12. Ce n'est pas une dette de code — c'est une ligne de `vercel.json` à changer si le plan
  change un jour, et le seuil est volontairement gardé plus court que la cadence pour qu'aucune ligne
  ne rate sa passe.

Deux dettes de la liste précédente étaient **périmées** et ont été retirées : `/settings` est bien
dans le menu du compte (`user-menu.tsx`), et `/lists` existe depuis la séance des listes.
