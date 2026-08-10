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

## 11 août 2026 — Une liste sort du cercle

L'étape 2 du chantier des listes : le lien non listé, décidé « ouvrable sans compte ». C'est la
première fois que ce projet répond à quelqu'un qui n'est pas connecté, et tout le travail découle de
là.

### `visibility` disparaît, le jeton reste

L'énumération `PRIVATE` / `UNLISTED` et un jeton de partage auraient dit le même fait deux fois. Une
liste `UNLISTED` sans jeton n'est partagée avec personne ; une liste `PRIVATE` avec un jeton est
lisible par qui a le lien. **Une liste est donc partagée si et seulement si `shareToken IS NOT
NULL`** (migration `20260811093000_partage_par_jeton`, écrite à la main pour la même raison que
celle de la notation : `migrate dev` refuse le non-interactif dès qu'une colonne pleine disparaît).

- **Un jeton, pas l'`id`.** L'`id` figure déjà dans les URL du propriétaire : le partager aurait
  divulgué l'adresse privée, et révoquer serait devenu impossible sans changer l'identité de la
  liste. Le jeton fait 144 bits, tirés du générateur cryptographique de Node — c'est le seul secret
  qui protège la page, puisqu'elle répond sans session.
- **Aucune donnée reprise à la migration.** Les listes `UNLISTED` existantes étaient des intentions
  sans effet : le partage n'avait jamais été servi, donc aucun lien n'était en circulation. Leur
  fabriquer un jeton aurait publié des listes que personne n'avait encore partagées.
- Révoquer, c'est mettre le jeton à `null` ; re-partager en génère un autre, et l'ancien lien meurt.
  Rien n'est conservé de l'ancien — un jeton révoqué qu'on garderait quelque part serait un jeton
  qu'on peut ressusciter par erreur. `shareList` est en revanche **idempotente** : une liste déjà
  partagée rend le jeton qu'elle a, sinon un second clic sur « Partager » invaliderait en silence un
  lien déjà envoyé.

### La route sort de `(app)`, et c'est une contrainte, pas un rangement

La garde `requireApprovedUser()` est dans `app/(app)/layout.tsx` et couvre tout ce qui vit dessous.
Une page qui doit s'ouvrir sans session ne peut donc pas y être — pas « ne devrait pas », **ne peut
pas**. D'où un groupe `(share)`, frère de `(auth)`, avec son propre chrome.

- **Le proxy laisse passer par préfixe**, ce qu'il ne savait pas faire : `publicRoutes` compare des
  chemins entiers, or le dernier segment est un jeton. `publicRoutePrefixes` est une liste séparée
  exprès — un préfixe ouvre *tout ce qui commence par*, ce qui est une promesse bien plus large qu'un
  chemin exact. Deux tests neufs la tiennent, dont un qui vérifie que `/library`, `/lists` et `/l`
  restent fermés : une comparaison bâclée aurait ouvert toute la bibliothèque.
- **Aucun lien vers l'application depuis cette page.** Tout y est derrière la garde, donc chaque lien
  mènerait un visiteur sans compte à une connexion qu'il ne peut pas franchir — l'inscription passe
  par une liste d'attente. Le nom du site est écrit, pas cliquable ; le nom du propriétaire ne
  renvoie pas à son profil.
- Les jaquettes ne sont donc **pas** des `MediaCard` : cette carte-là mène à `/media/[id]`, et une
  grille entière de liens vers un mur n'est pas une grille. `SharedListGrid` rend l'image et le
  titre, rien d'autre — tout le reste (progression, note, « +1 ») suppose un compte. `MediaGrid` est
  en revanche réutilisé tel quel : les paliers de colonnes sont un calcul, pas un style.

### Le soft 404, mesuré puis vérifié dans la documentation

Un jeton inconnu rend la bonne page — titre « Liste introuvable », aucune fuite — mais **un statut
200**. La documentation embarquée (`not-found.md`) le dit noir sur blanc : avec Cache Components,
toute route dynamique diffuse une coquille statique avant d'exécuter quoi que ce soit, donc la
réponse a commencé quand `notFound()` survient, et un statut ne se change plus une fois le flux
ouvert. `export const instant = false` n'y change rien — essayé, mesuré, retiré.

Le seul vrai 404 passerait par un contrôle **dans le proxy**, ce que la documentation recommande et
que ce projet s'interdit : `src/proxy.ts` ne lit jamais la base, sous peine d'un aller-retour par
requête pour tout le monde. Le `noindex` est la parade que la documentation indique elle-même, et il
était déjà là. L'échange n'en valait pas la peine pour une page qu'aucun moteur n'indexe.

En revanche, la validation de Cache Components signalait une vraie erreur : la page lisait la base
sans frontière de suspension. Le contenu est passé dans un `<Suspense>` avec son squelette, comme
toutes les autres pages du projet.

### Deux corrections attrapées en chemin

- **`metadataBase` manquait au layout racine.** Sans elle, Next assemble les URL d'`openGraph` sur
  `localhost:3000` : invisible en développement, et fatal en production — une carte de partage dont
  l'image pointe une machine locale ne s'affiche chez personne.
- **`lang="en"` sur une interface française.** Un `lang` qui ment fait prononcer la page avec les
  phonèmes de l'autre langue par un lecteur d'écran, et c'est précisément sur une page publique,
  ouverte par des gens qu'on ne connaît pas, que ça se paie.

**Vérifié dans l'application**, et la vérification a demandé un contrôle : les requêtes de test
partent en `credentials: "omit"`, donc **sans cookie**, plutôt qu'en cassant la session du
navigateur. Le contrôle est que `/library` et `/lists/<id>` répondent bien une redirection dans les
mêmes conditions — sans lui, un 200 sur le lien partagé n'aurait rien prouvé. Résultats : lien
partagé en 200 avec la liste rendue, `noindex` présent, `og:image` absolue, aucun `href="/media/…"`
dans la page ; image de partage produite en PNG 1200×630 avec les quatre jaquettes ; jeton faux et
jeton révoqué donnant la même page introuvable sans fuite de contenu ; création et révocation
répercutées sur l'en-tête de la liste sans rechargement. La liste d'essai est revenue à son état
d'origine, non partagée.

**Reste ouvert :** la page publique est une surface nouvelle et n'a aucun plafond de débit — le jeton
est imprévisible et la lecture est locale, donc rien d'urgent, mais c'est la première route du projet
qui répond sans session et elle mérite d'être surveillée. Les modèles et le fork (`isTemplate`,
`forkedFromId`) restent inutilisés dans le schéma.

---

## 11 août 2026 — Une liste se remplit depuis elle-même, et les vues attendront

Deux décisions d'Alexis ouvrent la séance : **les tier lists passent à bien plus tard**, et ce qu'il
faut aux listes, c'est **un moyen de partager** et **d'ajouter ou retirer des œuvres plus
facilement**. La première décide de ce qu'on ne construit pas.

### `ListView` n'avait plus de raison d'être maintenant

Des trois types du §4.4 — `RANKED`, `TIERS`, `GRID` —, une liste **est déjà** les deux extrêmes :
`rank` est un index fractionnaire rempli à chaque ajout, le glisser-déposer et le clavier marchent
depuis le 8 août, et `MediaGrid` la rend en grille. Sans les tier lists, `/lists/[id]/[viewId]`
n'aurait donc redessiné l'existant que dans une URL de plus — payer l'aiguillage sans la
destination. Les tables restent au schéma, elles n'ont jamais rien coûté à attendre. Le
raisonnement est écrit en PRODUCT.md §6, à côté de la roadmap qu'il modifie.

Ce qui a libéré la séance pour le premier des deux besoins réels.

### Remplir une liste sans la quitter

Le geste existait, mais seulement sur la fiche d'une œuvre : remplir une liste de dix titres
demandait dix allers-retours vers dix fiches. `AddToListSearch` le ramène là où l'intention est
déjà posée — sur la liste.

**Rien à écrire côté serveur, et c'est le point intéressant.** `addToList` faisait déjà tout :
`ensureMediaMirror` copie l'œuvre absente du miroir, et l'`upsert` sur `(listId, mediaId)` fait d'un
double ajout un non-événement plutôt qu'une erreur. Le chantier était entièrement un chantier
d'écran.

- **La recherche part vers `/api/command`, la route de la palette ⌘K, inchangée.** Elle cherche déjà
  les deux sources voulues — la bibliothèque dans le miroir local, le catalogue chez AniList — et
  elle porte le plafond de débit par compte qui protège le quota partagé (§4.1). Une seconde route
  de recherche aurait voulu dire un second plafond, et un jour un seul des deux mis à jour.
- On en accepte la contrepartie sans regret : les libellés arrivent **déjà mis en forme par le
  serveur**, titres selon la préférence de langue comprise. Un composant client ne peut pas lire ce
  réglage.
- **Les œuvres déjà présentes sont marquées, pas masquées.** Les cacher ferait croire que la
  recherche ne les trouve pas ; or la question qu'on se pose devant un résultat est « est-ce que je
  l'ai déjà mise ? ». Un « Déjà dans la liste » y répond, une absence non. La ligne est désactivée
  plutôt que cliquable pour rien — l'`upsert` encaisserait le clic sans broncher, ce qui est pire
  qu'un refus : rien ne se passerait, et on ne saurait pas pourquoi.
- **Deux sources de vérité pour « déjà présente », et il en faut deux.** `presentMediaIds` vient du
  rendu serveur et ne bougera qu'à la revalidation ; sans un ensemble local des ajouts de la session,
  une œuvre qu'on vient de cliquer resterait proposée pendant tout l'aller-retour. L'ensemble local
  est repris en cas d'échec, sinon la liste afficherait une œuvre qu'elle ne contient pas.
- **Le focus retourne au champ après chaque ajout**, et c'est la ligne qui rend le geste répétable :
  un clic sur une ligne emporte le focus hors de la saisie, donc la frappe suivante ne va nulle part
  et il faut recliquer entre chaque ajout — la friction qu'on venait supprimer. Au clavier le défaut
  n'existe pas, cmdk gardant la saisie active : il ne se voit qu'à la souris, c'est-à-dire la plupart
  du temps. Trouvé à l'écran, comme d'habitude pour ce genre-là.

**Ce qui n'est pas optimiste, et pourquoi.** La vignette ajoutée n'apparaît dans la grille qu'au
retour du serveur. `MediaCard` est asynchrone — elle lit elle-même la préférence de langue —, donc
un composant client ne peut pas en fabriquer une ; l'afficher d'avance supposerait d'en écrire une
seconde version côté client, et deux vignettes pour une même chose finiraient par diverger. Le retour
immédiat est donc porté par la ligne du panneau, qui se coche à l'instant du clic.

**Vérifié dans l'application**, session rejouée : trois œuvres ajoutées d'affilée sans fermer le
panneau (4 → 7), les lignes correspondantes cochées à mesure, le focus resté dans le champ entre
chaque, et l'état « Déjà dans la liste » toujours juste **après rechargement serveur** — donc lu du
serveur et plus seulement de l'état local. Les trois ajouts ont été retirés ensuite : la liste est
revenue à ses quatre œuvres d'origine.

**Puis le panneau est devenu une fenêtre** (décision d'Alexis, même jour) : `CommandDialog`, celui de
la palette ⌘K, plutôt qu'un `Popover` ancré au bouton. C'est le geste le plus proche de ce que fait
déjà la palette — on tape un titre, on choisit une ligne —, et lui donner la même forme évite
d'apprendre deux fois la même chose ; la fenêtre offre en prime la hauteur qu'un panneau ancré sous
une barre de commandes n'a pas, où les six résultats du catalogue tombaient à quelques pixels du bas
de l'écran sur un portable. Le prix est assumé : la grille passe derrière le voile, donc les
vignettes ajoutées ne se voient qu'à la fermeture — c'est la ligne cochée qui rend compte de chaque
ajout, et elle nomme l'œuvre, là où une vignette de plus au fond d'une grille de vingt ne se
remarque pas. Tout le reste est inchangé, et revérifié à l'écran : ligne cochée, focus conservé,
fenêtre qui reste ouverte.

L'état vide de la liste renvoyait vers la fiche pour ajouter quelque chose ; il nomme maintenant le
champ, et garde sa porte vers la recherche — les deux ne répondent pas à la même question, « laquelle
ajouter ? » contre « ajoute celle-ci ». Cet état-là n'a pas été vu à l'écran, faute de liste vide sous
la main.

### Le prochain pas, et la décision qui l'attend

Le partage par lien public, décidé en séance : **le lien doit s'ouvrir sans compte**. Deux
conséquences déjà identifiées, à traiter en tête de chantier plutôt qu'en chemin :

1. **La route sort de `(app)`.** `requireApprovedUser()` est dans `app/(app)/layout.tsx` et couvre
   tout ce qui est dessous ; une page qui s'ouvre sans session ne peut pas y vivre. Elle ira à côté
   des pages d'authentification, avec son propre chrome et sa propre garde.
2. **Une seule source de vérité pour « partagée ».** Je proposerai de **remplacer l'énumération
   `visibility` par une colonne `shareToken`** : une liste est partagée si et seulement si elle a un
   jeton, révoquer c'est le supprimer, re-partager c'est en générer un autre. Garder les deux, ce
   serait deux colonnes qui disent la même chose et qui finiront par se contredire. **Non tranché** —
   c'est la seule pièce du plan que je ne prendrai pas sans accord.

S'y ajouteront le `noindex` (« non listé » veut dire non indexé), une image `next/og`, et une page
publique **en lecture seule** : ni glisser-déposer, ni retrait, ni « +1 ».

---

## 10 août 2026 — L'arbre de travail devient une histoire, et la grille sait suivre

Séance de dette : le point 1 du « prochain pas » traînait depuis quatre séances — **93 fichiers non
commités**, deux migrations Prisma dedans, posés sur un dépôt qui s'arrêtait à la palette ⌘K. C'est
réparé, et deux autres trous avec.

### Onze commits, et ce que le découpage a coûté

L'arbre est parti en neuf commits thématiques — listes par `id`, `/browse` et l'accueil, notation en
étoiles, poste de commande, catalogue à deux dispositions, recherche sur les tendances, planning,
seed, docs — puis deux de plus pour le travail de la séance. **Sur `main` directement** : le dépôt
n'a aucun remote et une seule branche, donc une branche n'aurait protégé de rien et aurait demandé
une fusion à personne.

Deux compromis, tous deux du même genre — le découpage est **par sujet, à fichier entier** :

- **Les fichiers-carrefours partent avec le premier sujet qui les touche.** `prisma/schema.prisma`
  est parti avec les listes en portant déjà le retrait de `scoreFormat`, dont la migration arrive
  deux commits plus loin ; `tracking.queries.ts` est parti avec l'accueil en portant les lectures de
  la bibliothèque. Les séparer proprement aurait demandé de découper des fichiers hunk par hunk, pour
  une histoire que personne ne rejouera commit par commit.
- **Les renommages déjà indexés voyagent avec le premier commit**, quel que soit son sujet : les
  quatre fichiers du groupe `(home)` étaient dans l'index avant la séance et sont donc partis avec
  les listes, leurs modifications de contenu suivant au commit d'après.

**Seul l'état final est vérifié** — lint, typecheck, 158 tests, knip —, pas chaque commit
intermédiaire. C'est la contrepartie assumée du découpage à fichier entier : un `git bisect` sur ces
neuf-là ne compilerait pas forcément. Le prix à payer pour un historique lisible valait mieux qu'un
bloc de 93 fichiers, qui ne se relit ni ne se bissecte non plus.

### `/collection` ne se fait plus cliquer

La nav **et** la palette pointaient sur `routes.collection.root`, qui n'a pas de route : le seul lien
mort de l'app, et le seul défaut qu'un membre du cercle rencontrait en cliquant normalement. Les deux
entrées sont retirées.

`routes.collection` **reste déclaré**, et c'est la différence avec `/browse` dont l'entrée avait été
supprimée de `routes` en même temps que la page : `/browse` était une décision de produit
définitive, `/collection` est un chantier de V1.5 dont PRODUCT.md §5 fixe déjà le chemin. Une entrée
de nav qui répond 404 se lit comme une panne, pas comme un chantier ; un segment déclaré sans écran
ne se lit pas du tout, ce qui est exactement ce qu'on veut en attendant.

### Suivre depuis une grille de résultats

Le pas « court » annoncé la séance précédente. Le formulaire savait déjà créer une entrée
(`entry === null`) ; il ne manquait que le bouton, et de quoi savoir quelles vignettes en avaient
besoin.

- **`getEntryStatesFor` croise les résultats AniList avec les suivis du compte**, en une requête
  locale par page. C'est ce qui permet à la même carte de porter « suivre » ou « modifier » : sans
  elle, la vignette n'aurait pu proposer que « suivre », y compris sur une série déjà en cours — où
  le geste aurait écrasé un statut et une progression. Le quota de §4.1 n'est pas concerné, le suivi
  est chez nous.
- Sur l'accueil, la lecture est faite **une fois pour les cinq rangées**, ids dédupliqués : une œuvre
  apparaît volontiers dans deux rangées, et cinq sections auraient fait cinq requêtes pour une
  question qui en demande une. Elle vit dans `Discovery` et non dans `DiscoverySection` pour ça, et
  parce qu'elle dépend du compte là où `getBrowseCatalogue` est mémorisé une heure pour tout le monde.
- **Pas de « +1 » sur une œuvre non suivie.** Il créerait un suivi à l'épisode 1 avec un statut choisi
  par personne. Commencer à suivre est une décision — quel statut, où j'en suis déjà —, pas un
  incrément, et c'est précisément ce que la fenêtre sait demander.
- **Le bouton est plein et permanent** là où celui d'une œuvre suivie n'apparaît qu'au survol : il est
  seul sur la jaquette, donc il n'a personne à qui céder le premier rôle, et une grille de résultats
  est justement l'endroit où l'on ne sait pas encore qu'on peut suivre quelque chose.
- **Un marque-page, et surtout pas un `+`.** Le `+` est déjà pris sur une vignette : c'est le « +1 »
  qui avance d'un épisode. Les deux ne sont jamais visibles sur la même carte, mais ils cohabitent
  dans la même grille à quelques centimètres — deux gestes très différents sous la même icône
  finissent par s'apprendre l'un pour l'autre. Défaut repéré à l'écran, pas au typecheck, comme
  toujours pour ce genre-là.

Les rangées de découverte passent `total={null}` : leur document AniList ne demande ni `episodes` ni
`chapters`, et les ajouter invaliderait une heure de cache pour une information utile seulement après
la première saisie — dès que le suivi existe, `ensureMediaMirror` a copié le total dans le miroir que
tous les autres écrans lisent. La recherche, elle, a déjà ces colonnes et affiche le vrai total.

**Vérifié dans l'application**, session rejouée : les neuf résultats de `?q=frieren` sur « Suivre »,
création par « Enregistrer » qui bascule la carte en « +1 » + « Modifier » sans recharger,
persistance confirmée **après rechargement serveur**, puis retrait qui ferme la fenêtre et rend les
deux cartes à leur état initial. Le manga homonyme est resté sur « Suivre » pendant que l'anime
basculait — le croisement se fait bien par œuvre, pas par titre. Le suivi d'essai a été supprimé ; il
reste sa ligne de `Media`, qui est du catalogue partagé.

**Reste ouvert :** la recherche et la découverte n'ont toujours pas de retour visible après un
« suivre » réussi — la carte change de bouton, ce qui est discret pour une écriture en base ; un
`toast` serait cohérent avec le reste des actions. Et le tableau « Où on en est » plus bas dans ce
fichier a été remis à jour, mais il reste enterré sous les entrées de séance : le jour où il sert
vraiment, il faudra le remonter en tête.

---

## 10 août 2026 — La vignette rend sa jaquette

Retour en arrière assumé sur l'entrée précédente : la carte s'était couverte de pastilles, et c'est
l'image qu'elles recouvraient. La jaquette est rendue nue, et tout ce qui se lit passe dessous.

- **La moyenne AniList disparaît de la grille.** Elle reste sur la fiche, où elle est comparable au
  reste. Dans une grille, le verdict d'une foule qu'on ne connaît pas ne fait pas ouvrir une œuvre,
  et il tenait la place de ce qui la fait ouvrir. Ma note, elle, reste — mais sous la jaquette.
- **Les genres au survol partent aussi**, et avec eux la propriété `genres` de `MediaCard`. Le
  raisonnement du 10 août tenait — un contenu jamais nécessaire a le droit de se cacher — mais il
  justifiait le survol, pas le calque : la surcouche mangeait le tiers bas de chaque jaquette dès
  qu'on passait dessus. `MediaRow` les garde : en liste, ils ont leur colonne et ne masquent rien.
- **Note et progression descendent sous l'image**, sur une ligne. Elles n'ont plus besoin du fond
  opaque qu'exigeait un texte posé sur une jaquette de couleur inconnue.
- **Le titre tient sur une ligne, coupé aux points de suspension** (`truncate`, plus `line-clamp-2`).
  Deux lignes faisaient varier la hauteur des cartes d'une colonne à l'autre et décalaient tout ce
  qui suit — la rangée se lisait comme un escalier. Le titre complet reste dans l'attribut `title`.
- **La recherche perd « Série TV · 2026 » en grille.** Répétée sous vingt-quatre jaquettes, elle
  répondait à une question que personne ne posait là. La vue liste la garde, et la fiche aussi.

Restent sur la jaquette : le « 18+ », parce qu'il qualifie l'image et doit se lire avant elle, et la
barre de progression, parce qu'elle se voit sans se lire — c'est ce qui permet de repérer une série
presque finie en balayant la grille.

Vérifié à l'écran sur `/`, `/library` et `/search` : les rangées s'alignent, ce qui n'était pas le
cas avec les titres à deux lignes.

---

## 10 août 2026 — Une liste s'adresse par son id

`/lists/[slug]` devient `/lists/[id]`, et la colonne `slug` disparaît de `List` (migration
`20260810120000_lists_url_par_id`). Le slug était le seul identifiant du projet à être **dérivé
d'un champ modifiable**, et il payait ça trois fois : une contrainte `@@unique([ownerId, slug])` à
tenir, un lien qui se périmait au renommage — d'où l'avertissement affiché dans le dialogue de
modification, désormais sans objet —, et une relecture en base dans chaque mutation pour retrouver
le chemin à revalider. Les listes étant privées et derrière la garde d'accès, personne ne lisait ces
URL : on payait la lisibilité pour rien.

- **Ce que ça simplifie côté serveur.** `updateList`, `removeFromList` et `reorderListItem` ne
  relisent plus la liste après l'écriture : le `listId` reçu **est** le chemin. `createList` ne lit
  plus non plus les slugs déjà pris avant d'insérer. Quatre requêtes en moins, et une fonction pure
  de moins à tester (`list-slug.ts` et son test sont supprimés).
- **La garde ne change pas de nature, mais change de forme.** `getListBySlug` devient
  `getListById`, en `findFirst` sur `{ id, ownerId }` là où la clé composite `ownerId_slug`
  permettait un `findUnique`. C'est la forme des mutations du domaine, pour la même raison : le
  `where` porte le propriétaire, donc une liste étrangère reste indiscernable d'une inexistante.
- **L'index composite servait aussi de chemin d'accès** à `where: { ownerId }`. Le remplacer par
  rien aurait fait un balayage à chaque page de listes ; il devient `@@index([ownerId, updatedAt])`,
  qui est exactement l'ordre dans lequel `getMyLists` lit.
- **Le partage par lien non listé (V1.5) n'a plus de question d'adressage** — l'`id` désigne la
  liste sans ambiguïté, y compris celle d'un autre membre. Il reste à décider ce qui *autorise* à
  la lire : `UNLISTED` seul, ou un jeton. C'est une question d'accès, plus une question d'URL, et
  le point 4 du « prochain pas » du 10 août ci-dessous tombe donc de moitié.

Le reste est mécanique : dossier de route renommé, `routes.lists.detail/view` prennent un `id`,
`ListCardData` porte `id` au lieu de `slug`, le seed n'écrit plus de slug. Les vues de V1.5 viseront
`/lists/[id]/[viewId]`.

---

## 10 août 2026 — La vignette devient un poste de commande

La carte savait dire ce qu'est une œuvre, pas où j'en suis avec elle. Elle porte maintenant les
deux, et de quoi agir dessus : progression chiffrée, ma note, le « +1 » déjà là, et une fenêtre qui
ouvre **tous** les réglages du suivi sans quitter la grille.

### Ce que la jaquette montre en permanence

La fraction (« 13 / 25 ») est passée de la ligne de contexte à une pastille sur la jaquette,
au-dessus de la barre. Elle n'était pas absente avant — chaque appelant la recopiait dans son
`meta`, et l'accueil l'oubliait dans « à reprendre ». La faire porter par la carte règle l'oubli et
libère la ligne de contexte pour ce que rien d'autre ne dit : le statut, l'ancienneté.

- **Ma note prend la place de la moyenne AniList, elle ne s'y ajoute pas.** Sur une œuvre que je
  suis et que j'ai notée, mon verdict est celui qui décide ; la moyenne reste sur la fiche, où elle
  est comparable au reste. Deux pastilles d'étoiles superposées auraient surtout appris à ne plus
  les lire. La teinte les distingue — pleine pour la mienne, posée pour celle de la communauté.
- Elle arrive en **chaîne déjà formatée**, comme `meta` et la progression : mettre une note à
  l'échelle du compte est une affaire de `tracking` (§4.2), et `MediaCard` n'a aucune raison de
  connaître ce domaine. C'est le même refus de couplage que celui des six libellés de statut.
- `MediaCard` et `MediaRow` ont reçu les deux propriétés **ensemble**. La règle du 8 août tient :
  une information exclusive à l'une des deux vues ferait de la bascule un piège.

### La fenêtre d'édition, et pourquoi ce sont les mêmes contrôles

`EntryDialog` rend `EntryControls` — le composant de la fiche, pas une version réduite. Une fenêtre
qui n'aurait su changer que trois champs sur huit aurait obligé à deviner lequel manque, et le
retour à la fiche aurait coûté les deux navigations qu'on voulait supprimer.

- Deux conséquences à faire vivre ce panneau en vingt-quatre exemplaires : ses `id` de champs sont
  désormais dérivés d'un `useId` (constants, ils se seraient dupliqués et un `<label for>` aurait
  désigné le champ d'une autre carte), et « retirer de ma liste » ferme la fenêtre via `onRemoved`
  — elle éditerait sinon un suivi qui n'existe plus, que le premier clic recréerait.
- `EntryCardActions` réunit le « +1 » et la fenêtre : le bloc était déjà copié entre l'accueil et la
  bibliothèque, une troisième copie les aurait fait diverger.

### Le total qu'on ignore s'écrit

`formatEntryProgress` rendait « 145 » tout court quand AniList ne connaît pas le nombre d'épisodes
— ce qui se lit comme un total, sur une série qui est encore en cours. C'est « 145 / ? »
désormais, et « sur ? » dans le panneau de la fiche comme dans le formulaire. La constante vit dans
`entry-format.ts` et le test dit pourquoi.

### La fenêtre est un formulaire, la fiche reste au geste

Sur maquette, la fenêtre est passée en trois colonnes avec une bannière et un bouton
« Enregistrer ». Ce bouton change le contrat d'enregistrement, et c'est la seule divergence
assumée entre les deux éditeurs :

- **le panneau de la fiche enregistre au geste** — il est visible en permanence à côté de l'œuvre,
  chaque contrôle y est une décision isolée ;
- **la fenêtre enregistre au bouton** — on l'ouvre exprès pour remettre trois choses d'aplomb, et
  enregistrer chacune en passant ferait trois écritures et trois lignes de journal pour une seule
  intention.

L'invariant du §4.2 tient dans les deux cas : **seuls les champs modifiés partent**. Le formulaire
l'obtient par différence (`entry-draft.ts`, pur et testé) au lieu de l'obtenir par construction.
C'est là que vivent les décisions qui se trompent — une saisie numérique illisible est ignorée
plutôt que ramenée à zéro (vider « épisode » pour le retaper n'enregistre pas un recul), effacer
une date se distingue de ne pas y toucher, et sur une œuvre pas encore suivie le statut part
toujours, sinon « Enregistrer » sur un formulaire intact ne ferait rien.

- Enregistrer sans avoir rien changé **n'écrit pas** : l'action vide coûterait une revalidation de
  trois pages et remonterait `updatedAt`, donc réordonnerait un accueil trié par date de
  modification.
- Le formulaire est monté par la fenêtre, donc remonté à chaque ouverture : le brouillon repart de
  l'état que le serveur vient de rendre, sans synchronisation à écrire.
- « Favori » n'était pas sur la maquette. Il est passé avec les commandes du bas plutôt que dans la
  grille : c'est un marquage, pas une donnée de suivi, et lui donner une cellule l'aurait mis sur le
  même plan qu'une date.

### Les étoiles passent au demi-cran, et le composant descend dans `ui/`

`npx shadcn add @kibo-ui/rating` réinstalle dans `components/kibo-ui/rating/index.tsx` ; le fichier
vit désormais dans `components/ui/rating.tsx`, là où `components.json` range les primitives. La
copie du registre a été supprimée, ainsi que `@radix-ui/react-use-controllable-state` qu'elle
tirait : le paquet parapluie `radix-ui` expose déjà ce hook, et deux copies à deux versions ne
valent pas mieux ici qu'ailleurs.

**Le registre n'a pas bougé en amont** : la réinstallation a écrasé les trois correctifs de la
première fois — boutons sans nom accessible, `aria-label="Rating"` en dur, import Radix. Ils sont
remis, et deux s'y ajoutent (`role="radio"` + `aria-checked`, et un cran tabulable quand la note
est vide — sans quoi on ne pouvait pas noter au clavier tant qu'on n'avait pas noté à la souris).
Tout est listé en tête du fichier, parce qu'une prochaine réinstallation l'écrasera encore.

**Une note sur cinq sans demie est une note sur cinq valeurs**, ce qui est trop peu pour séparer
« bien » de « très bien ». Chaque étoile porte donc deux zones de clic, et deux calques superposés
dont le supérieur est rogné à la fraction voulue — plutôt qu'une icône « demi-étoile », qui aurait
figé le pas et n'aurait marché qu'avec l'étoile.

Côté domaine, le maximum et le pas d'une échelle **ne se déduisent plus l'un de l'autre** : cinq
étoiles vont jusqu'à 5 par crans de 0,5. Le stockage ne change pas (0–100, §4.2) — une demie vaut
dix points, donc une note saisie « 7/10 » se relit « 3,5/5 » sans avoir bougé en base.

- `exactScoreIfRounded` teste désormais **l'aller-retour** et non un reste de division : une échelle
  perd de la précision exactement quand la note n'y survit pas au passage. Vrai du pas entier comme
  du demi-cran.
- Les valeurs s'écrivent avec le séparateur de la locale — « 3,5/5 » —, y compris dans les noms
  accessibles des crans, qu'un lecteur d'écran francophone prononce alors correctement.
### Puis l'échelle a cessé d'être un réglage

Décision d'Alexis en séance : **cinq étoiles pour tout le monde**, les dix points et les cent
points disparaissent. Un réglage à une seule valeur n'en étant pas un, ce n'est pas l'énumération
qui a été réduite mais la préférence entière qui a été retirée — colonne `scoreFormat`, type
`ScoreFormat`, ligne des paramètres, et le paramètre `format` de toutes les conversions.
Migration `20260810014700_retire_echelle_notation`.

- **`Entry.score` ne bouge pas** : toujours 0–100. C'est ce qui garde leur précision aux notes
  importées d'AniList, et ce qui laisserait revenir en arrière sans réécrire une ligne. Ce que la
  migration supprime, c'est une préférence d'affichage, pas une note.
- `scoreToScale`/`scaleToScore` sont devenus `scoreToStars`/`starsToScore` : sans échelle à
  choisir, le nom peut dire ce que la fonction fait.
- `ScoreInput` — l'aiguillage entre le champ numérique et les étoiles — n'avait plus rien à
  aiguiller et a été supprimé. `ScoreStars` est le seul éditeur de note.
- La migration a dû être **écrite à la main** : `prisma migrate dev` refuse de tourner sans
  terminal interactif dès qu'il détecte une colonne à supprimer contenant des valeurs, et
  `--create-only` bute sur le même garde-fou. Écrite puis appliquée par `migrate deploy`.

### Trois retouches de finition, dont une qui méritait un diagnostic

- **Les étoiles sont en `foreground`** et non plus en ambre. L'ambre reste à la moyenne AniList sur
  les vignettes : deux sources de note, deux teintes, et plus d'ambiguïté sur qui a noté quoi. Pas
  de blanc en dur — sur le thème clair, des étoiles blanches disparaîtraient.
- **Dans le formulaire, la note est posée dans un `InputGroup`**, la primitive même du compteur
  d'épisodes voisin. Une rangée d'icônes nues dans une grille de six champs encadrés n'avait pas de
  ligne de base : elle se lisait comme un reste d'affichage plutôt que comme une chose à remplir.
  C'est ce qui a fait sortir le « 95/100 » permanent, qui débordait du champ : il ne s'affiche plus
  que lorsque les étoiles perdent la valeur, ce que la règle disait déjà.
- **Le liseré clair sous la bannière** n'était ni le dégradé ni l'image : la fenêtre est centrée par
  translation, donc posée sur des demi-pixels, et le bord bas du calque ne coïncidait pas tout à
  fait avec celui de la bande — le `bg-muted` du conteneur transparaissait dans l'interstice, sur
  toute la largeur. Le fond de la bande est désormais celui du panneau : l'arrondi du navigateur
  n'a plus rien à révéler. Le dégradé, lui, atteint l'opacité pleine à 88 % de la hauteur plutôt
  qu'au dernier pixel — deux causes possibles, les deux traitées.

### Ce que ça coûte, et ce qui reste ouvert

- **L'état complet du suivi part avec la page**, `notes` comprises, pour des cartes qu'on n'ouvrira
  pas. C'est le prix d'une fenêtre qui s'ouvre sans requête ; l'alternative était un aller-retour
  par ouverture. Compromis assumé pour une grille de vingt-quatre — à revoir si les notes
  s'allongent. `ENTRY_STATE_SELECT` rassemble ces colonnes en un point, partagé avec l'écriture :
  la liste **doit** rester exactement `EntryState`, sinon la transition réécrit ce qu'elle ne
  devrait pas.
- Le catalogue et la recherche n'ont toujours que la fiche pour commencer à suivre une œuvre : le
  formulaire sait pourtant créer une entrée (`entry === null`), c'est le bouton qui manque sur ces
  grilles-là. Suivre depuis une grille de résultats est le pas suivant, et il est court.
- **Deux éditeurs pour une même entité**, le panneau et le formulaire, avec deux dispositions et
  deux moments d'enregistrement. C'est justifié plus haut, mais c'est une dette : le jour où un
  champ s'ajoute au suivi, il faudra penser aux deux. Les unifier supposerait de trancher si la
  fiche gagne elle aussi un bouton « Enregistrer ».
- La ligne du planning garde le seul « +1 » : elle répond à « qu'est-ce qui sort », pas à « où j'en
  suis », et son bouton n'apparaît déjà que dans un cas précis (§ du 8 août).

---

## 8 août 2026 — Catalogue et bibliothèque : la vignette, la grille, et le trou en bas de page

Reprise des deux écrans qui listent des œuvres. Le point de départ était un défaut visuel — « trois
rangées pleines et une quatrième à deux » —, et il s'est avéré n'être ni du CSS ni un manque de
résultats.

### Le trou était de l'arithmétique

La recherche servait **20** résultats dans une grille qui passait à **6 colonnes**, la bibliothèque
**24** dans un palier à **5**. Dans les deux cas la dernière rangée était incomplète, et un bas de
grille amputé se lit comme un chargement raté, pas comme une fin de page.

`CATALOGUE_PAGE_SIZE = 24` vit désormais dans `config/catalogue.ts`, et les paliers de colonnes
(2, 3, 4, 6) ont été choisis pour être **ses diviseurs**. C'est la contrainte qui a fixé les
paliers, pas l'inverse — le palier à 5 colonnes a disparu pour ça. Un test la verrouille : il
échoue si quelqu'un remonte la taille de page à un nombre qui rouvre le trou.

- Le `perPage` par défaut du schéma de recherche dérive de la même constante. Il entre dans la clé
  de cache des lectures AniList : le changement invalide les entrées existantes, ce qui est correct
  mais n'est pas gratuit.
- **La même arithmétique s'applique à tous les appelants de `MediaGrid`**, et l'accueil n'y est pas
  encore conforme : la rangée « à reprendre » compte 6 vignettes, donc 4 + 2 au palier `md`. Seuls
  les multiples de 12 sont propres aux quatre paliers. Laissé en l'état — c'est un compte de
  produit documenté (`DASHBOARD_STALLED_COUNT`), pas une valeur technique à changer en passant.

### La vignette montre maintenant ce qu'elle taisait

`MediaCard` porte la note AniList, le marqueur 18+, une barre de progression, et révèle les genres
en surcouche au survol. La règle qui a tranché chaque arbitrage : **rien de ce qui décide n'est
derrière un survol**. Note, progression et titre sont permanents ; les genres, eux, servent à
confirmer une intuition avant de cliquer, jamais à choisir — ils peuvent donc dépendre d'un geste
qui n'existe ni au doigt ni au clavier.

- La surcouche est `aria-hidden` **et** `pointer-events-none`, et les deux vont ensemble : son
  contenu est déjà sur la fiche, et un calque qui intercepterait le clic empêcherait d'y aller.
- Le titre est passé **avant** la ligne de méta. À hauteur variable, un titre placé sous une méta
  démarre à une hauteur constante ; l'inverse fait commencer chaque méta à un endroit différent.
- Pas d'anneau de focus ajouté sur la jaquette : le contour natif cerne déjà tout le lien, titre
  compris, et le doubler donnait deux cadres concentriques.

### Une deuxième disposition, et ce qu'elle a coûté

`MediaRow` + `MediaList` : une ligne par œuvre, bascule dans l'URL (`?view=list`) sur les deux
pages. Les deux vues montrent **les mêmes données** rangées autrement — une information exclusive à
l'une ferait de la bascule un piège.

- **La liste n'a pas de squelette, et c'est assumé.** Les deux pages transmettent `searchParams`
  sans l'attendre : elles ne connaissent pas la disposition au moment de rendre le repli d'un
  `<Suspense>`. Le décalage ne se voit qu'au premier chargement d'une adresse `?view=list`
  partagée — changer de vue depuis la page est une navigation, où React garde l'ancien rendu.
  L'alternative coûtait la coquille statique instantanée de la page. Dette connue, écrite dans le
  fichier.
- La bascule est le seul contrôle des deux barres qui **ne remet pas `page` à 1** : elle ne change
  ni le nombre de résultats ni leur ordre.

### La bibliothèque cherche enfin chez elle

Champ de recherche sur `/library`, sur les trois colonnes de titre du miroir. Il ne part jamais
chez AniList, donc une frappe ne coûte rien au quota — c'est ce qui rend l'anti-rebond à 300 ms
acceptable ici alors que le catalogue est à 400. Les onglets de statut portent leur effectif
(un `groupBy`), **hérité des autres filtres mais jamais du statut courant**, sinon tous les onglets
sauf l'actif afficheraient zéro.

Deux corrections attrapées en chemin :

- Le champ de recherche du catalogue est non contrôlé (l'écriture d'URL est anti-rebondie) : la
  réinitialisation des filtres vidait donc `q` dans l'URL et les résultats, **mais laissait le
  terme affiché**. Réparé par une `ref`, avec un bouton d'effacement dans le champ.
- Les puces de filtres actifs de la recherche n'exposent pas le terme de recherche, et « Tout
  effacer » n'y touche pas : il est déjà visible dans le champ voisin, et son retrait supposerait
  de vider un `<input>` non contrôlé qui vit dans un autre composant.

**Reste ouvert** : les genres affichés viennent d'AniList, donc en anglais dans une interface
française (déjà vrai dans les popovers de filtres) ; la rangée « à reprendre » de l'accueil et son
palier `md` ; aucun de ces écrans n'a de test de rendu — les composants React ne sont toujours pas
couverts.

---

## 8 août 2026 — `/calendar` : le planning, et pourquoi il ne sera jamais global

La dernière route de la nav qui répondait 404. `/calendar` affiche la semaine des séries qu'on
suit, jour par jour, avec **le retard épisode par épisode** — et c'est ça la fonctionnalité, pas la
grille horaire.

### Le chiffre qui a décidé de la page

Une semaine de diffusion complète chez AniList, c'est **cinq mille entrées**. Mesuré avant d'écrire
la moindre ligne, et le compteur de l'API y est plafonné, donc c'est un plancher. À cinquante par
page, une semaine « tout AniList » coûte cent requêtes sur les trente de la minute que le serveur
partage entre tous les visiteurs.

Le planning est donc filtré **à la source** par `mediaId_in`, sur les œuvres du compte : une
requête pour la semaine, souvent zéro grâce au cache. Ce n'est pas une version réduite en attendant
mieux — un planning global n'est pas finançable, c'est écrit en PRODUCT.md §9 pour que personne ne
le repromette. Et c'est de toute façon ce que la nav annonçait depuis le début.

- **Le document GraphQL ne demande aucun champ `media`**, et c'est le point qui rend l'appel
  minuscule : jaquettes, titres et plafonds sont déjà dans le miroir local (§4.1). Redemander ces
  colonnes les paierait deux fois **et** afficherait un titre qui ignore la préférence de langue du
  compte, puisqu'AniList ne la connaît pas. Ne reviennent que `mediaId`, `episode`, `airingAt`.
- **Les ids sont triés avant d'entrer dans le cache.** La clé est la sérialisation des arguments :
  sans le tri, l'ordre où Postgres rend les lignes ferait deux entrées pour une même réponse. Avec,
  deux membres qui suivent les mêmes séries partagent la leur. C'est la seule lecture du fichier
  dont la clé dépend du compte, et le commentaire dit pourquoi c'est acceptable ici.
- Une bibliothèque sans série en cours de diffusion **ne part pas du tout** chez AniList. L'écran
  qui sert alors n'est pas un planning vide, c'est une porte vers le catalogue.
- `cacheLife("minutes")` — la seule lecture du projet à descendre là. Un report d'épisode s'annonce
  le jour même.

### Le fuseau, encore, et cette fois il fallait des tests

`airing-week.ts`, pur, **16 tests**. Un épisode diffusé le mardi à 1 h 30 à Paris tombe le lundi en
UTC : un planning calculé dans le fuseau du serveur rangerait la moitié des animes de la nuit dans
la mauvaise colonne. Les bornes envoyées à AniList sont donc des **minuits parisiens**.

- **`parisMidnight` fait deux passes, et la seconde n'est pas superflue.** Le décalage est lu à un
  instant supposé ; le dernier dimanche de mars, cet instant tombe de l'autre côté du changement
  d'heure et le décalage vaut une heure de trop. Deux tests prennent les deux transitions de face —
  la semaine du 23 mars dure 167 heures, celle du 19 octobre 169. Un `from + 7 jours` se trompe sur
  les deux.
- L'arithmétique de calendrier passe par `Date.UTC` sur la **date civile** parisienne, jamais sur
  l'instant : en UTC un jour fait toujours vingt-quatre heures. Chaque date obtenue est ensuite
  reconvertie en instant, qui, lui, rattrape le décalage.
- La semaine commence **lundi**, pas le dimanche que renvoie `getDay()` — un test prend le cas du
  dimanche, où un calcul naïf fait disparaître le planning du jour de sa propre page.
- `formatRange` d'`Intl` compose « 3–9 août 2026 » et « 30 novembre – 6 décembre 2026 » sans qu'on
  ait à traiter le chevauchement de mois. Ses espaces fines insécables changent d'une version d'ICU
  à l'autre : les tests comparent le texte, pas la typographie.

### Le retard, qui est la vraie valeur

AniList et MyAnimeList disent ce qui sort ; ils ne disent pas ce qu'il vous manque pour le
regarder. `describeAiringCatchUp` rapporte l'épisode diffusé à la progression : « Vu », « à jour »,
« 2 épisodes de retard ».

- **Le décompte porte sur ce qui sépare du début de cet épisode-là**, pas de sa fin : à l'épisode 9
  avec une progression de 6, il manque le 7 et le 8 — deux, pas trois. C'est l'endroit exact où se
  tromper d'une unité, donc l'endroit qui a un test.
- La fonction renvoie **un état à côté du libellé**, et pas seulement une chaîne. La première
  version faisait choisir la couleur de l'étiquette en comparant le texte à `"Vu"` : ça marche, et
  ça casse à la première reformulation.
- **Le « +1 » n'apparaît que sur un épisode déjà diffusé *et* exactement suivant.** Les deux
  conditions comptent : avancer sur un épisode non sorti serait une écriture fausse, et deux
  épisodes de retard, le geste n'en rattraperait qu'un. C'est le seul cas où « +1 » veut dire « je
  viens de voir celui-là ». `EntryQuickProgress` est réutilisé tel quel — la ligne porte le `group`
  qu'il attendait.
- Les sept jours sont rendus, **y compris les vides**. C'est ce qui distingue un planning d'une
  liste : savoir qu'il n'y a rien le jeudi est une information, et le masquer ferait glisser le
  vendredi à sa place. Quand la semaine entière est vide, une seule phrase remplace les sept.

### Deux choix de rangement

- **Pas de septième feature.** La lecture AniList est du catalogue (`media`), la lecture des
  entrées est du suivi (`tracking`), et c'est la **page** qui les compose — comme l'accueil compose
  `getDashboard` et `getBrowseCatalogue`. Créer `features/calendar/` pour y loger le calcul de
  semaine et deux composants aurait été un dossier par anticipation ; `airing-week.ts` vit donc à
  côté de `media-season.ts`, qui est le même genre d'objet : du découpage de temps pour le
  catalogue.
- **Le type de la ligne est déclaré dans le composant qui la dessine**, pas dans la page qui la
  fournit. C'est lui qui sait de quoi il a besoin ; l'inverse obligerait à le modifier à deux
  endroits dès qu'une colonne s'ajoute.

**Vérifié dans l'application**, session rejouée, sur les quatre états à la fois : quatre séries de
la saison ajoutées pour l'occasion avec des progressions choisies, puis retirées (le `onDelete:
Cascade` d'`EntryEvent` a emporté leur journal — restent quatre lignes de `Media`, qui sont du
catalogue partagé). « 2 épisodes de retard » mercredi, « à jour » + « +1 » jeudi sur un épisode
diffusé, « Vu » samedi, et dimanche deux épisodes triés par heure dont un **à venir** qui affiche
« à jour » **sans** bouton — la règle des deux conditions, à l'écran. Le « +1 » cliqué depuis le
planning a fait passer la ligne à « Vu », confirmé **après rechargement serveur** et pas en
relisant le contrôle. `?week=1` et `?week=-1` décalent bien d'une semaine pleine, `?week=99` est
ramené à 12 avec la flèche suivante désactivée, et la semaine du 19 octobre — celle du changement
d'heure — rend ses sept jours.

**Reste ouvert :** le planning ne connaît que l'animation, puisque `airingSchedules` n'existe que
pour elle — un manga hebdomadaire n'a aucune source de dates. Les notifications de V2 (§6) ne sont
pas faites, et c'est maintenant le seul morceau qui manque à ce palier côté temps. Enfin, l'heure
affichée est celle qu'AniList publie : elle vaut ce que valent ses contributeurs, et un report
annoncé tard se voit avec une minute de retard au mieux — le cache descend à la minute, pas en
dessous.

---

## 8 août 2026 — `/browse` disparaît, l'accueil devient le melting-pot, et la base est semée

Trois chantiers du même mouvement : il y avait **deux portes de découverte** pour un cercle de
quatre comptes, et **une base trop vide** pour voir la moitié des écrans fonctionner.

### `/browse` est supprimée, pas redirigée

La route, ses composants, son entrée de nav et sa ligne de palette. `routes.browse` n'existe plus —
c'est ce qui garantit qu'aucun lien mort ne subsiste : une référence oubliée casse le typecheck au
lieu de partir en 404. Le raisonnement est écrit dans PRODUCT.md §5, à côté de la table des routes.

- **Le catalogue est descendu sur l'accueil sans rien coûter.** Les cinq rangées venaient déjà
  d'**une** requête AniList mémorisée une heure (§4.1) ; les déplacer ne change pas le budget.
- Ce qui a été perdu au passage : rien. Les cinq rangées sont toutes là, y compris « La saison
  prochaine » et « Les mieux notés », qui n'avaient pas d'équivalent dans la recherche.
- L'entrée de nav « Découvrir » pointe maintenant sur `/search`, et n'a plus que deux liens.

### L'accueil : suivi → listes → découverte → journal

- **Trois frontières de suspension, une par source**, et c'est le point d'architecture de la séance.
  Le suivi et le journal se lisent dans le miroir local et répondent en millisecondes ; les rangées
  attendent AniList. Une frontière unique aurait fait attendre le « +1 » — le geste le plus fréquent
  du produit — derrière un appel réseau dont il n'a aucun besoin. Le coût est nul :
  `getSession` porte le `cache` de React.
- **L'ordre du DOM ne dépend pas de l'ordre d'arrivée**, et ça a été vérifié plutôt que supposé :
  les rangées AniList sortent du cache avant les lectures Postgres, donc elles arrivent **les
  premières dans le flux HTML** — l'ordre final est pourtant celui du JSX, confirmé en lisant
  `container.children` dans le navigateur.
- `getDashboard` a perdu son journal au profit de `getRecentActivity` : le journal ferme la page,
  donc il vit dans une autre frontière. Les deux lectures partent en parallèle, les frontières étant
  sœurs.
- **`DashboardSection` porte désormais une description**, et les rangées de découverte l'utilisent
  au lieu de leur propre en-tête. Deux jeux de titres presque identiques sur le même écran se
  seraient lus comme deux pages cousues.
- `Dashboard` et `Discovery` rendent des **sections sœurs**, pas des conteneurs : l'espacement
  appartient à la page. Sans ça, trois `space-y` imbriqués auraient donné trois rythmes différents.
- La carte de liste est montée dans `features/lists/components/` — deuxième appelant, donc
  promotion, même règle que `EntryActivityList` en son temps.
- L'état vide ne prend plus la page entière : la découverte s'affiche dessous, et c'est justement
  elle qui donne de quoi remplir une bibliothèque neuve.

### `/search` ouvre sur les tendances

`SEARCH_MATCH` classe par proximité avec la requête : **sans requête, il n'a rien à comparer** et
AniList retombe sur son ordre interne. La page d'arrivée ouvrait donc sur des œuvres au hasard.

- `resolveSort` est pure, testée, et **partagée client/serveur** : la barre de filtres affiche ce
  que la grille sert. Sans ce partage, le sélecteur aurait annoncé « Pertinence » au-dessus de
  résultats classés par tendance — le seul contrôle censé expliquer l'ordre de la page aurait menti.
- **La substitution ne touche que le tri par défaut.** Demander « Titre » sans terme de recherche
  donne bien un ordre alphabétique : ce n'est pas à nous de décider qu'on s'est trompé. Deux tests
  tiennent cette limite.
- L'option « Pertinence » **disparaît** de la liste tant qu'il n'y a pas de terme, au lieu d'être
  grisée : ce n'est pas une option indisponible, c'est une question sans objet.
- Le décompte est remplacé par un titre dans ce cas. « 24 918 résultats » sous les tendances est un
  nombre exact et sans usage ; ce qui manque, c'est ce qu'on regarde et comment en sortir.

### Le jeu d'essai

`prisma/seed.ts` sous `tsx` (nouvelle dépendance de développement), `pnpm db:seed`. 26 suivis sur
les six statuts, 128 événements de journal, 5 listes, 29 œuvres rangées — pour **une** requête
AniList, deux alias `Page` dans le même document.

- **Le sujet du fichier, c'est `updatedAt`.** « À reprendre » n'existe qu'avec des séries laissées
  de côté depuis plus de trente jours, et la section n'avait jamais pu être vue autrement qu'en
  abaissant le seuil à la main (voir l'entrée du tableau de bord). Le seed écrit donc `updatedAt`
  explicitement à la création — Prisma l'accepte malgré `@updatedAt`, vérifié en base — et cinq
  entrées peuplent enfin la section.
- **Il refuse d'écrire par-dessus.** `EntryEvent` est append-only par conception : un seed qui
  écrase sans le dire trahirait exactement la promesse de §4.3. `--reset` supprime, et dit quoi.
- **Graine fixe** (mulberry32) : deux exécutions donnent le même jeu, donc deux captures d'écran se
  comparent.
- Un bug écrit puis corrigé, et il valait le détour : `sort(() => random() - 0.5)` **ne mélange
  pas** — le comparateur n'est pas transitif et V8 en tire un ordre très corrélé à l'entrée. Trois
  listes sur cinq s'ouvraient sur la même jaquette, ce qui vidait de son sens l'aperçu à quatre
  cases. Fisher-Yates.
- `rank` est rempli par `generateKeyBetween` comme le fait l'application, et non en `"a0"`, `"a1"`
  écrits à la main : ça marcherait le premier jour et casserait au premier glisser-déposer.
- **Le seed lit `process.env`**, et l'exception est désormais écrite : c'est un fichier de CLI, il
  tourne hors de Next, donc sans le `NODE_ENV` que t3-env exige. Le hook `conventions-guard.mjs` le
  nomme, à côté de `prisma.config.ts` — la liste est close, pas ouverte.

**Vérifié dans l'application**, session rejouée : ordre du DOM lu dans le navigateur (suivi, listes,
cinq rangées, journal), `/browse` en 404, `/search` avec le sélecteur sur « Tendances » et le titre
« Tendances du moment », `/search?q=frieren` qui repasse sur « Pertinence » avec « 9 résultats » et
*Sousou no Frieren* en tête. « À reprendre » affiche cinq séries, dont une en pause depuis octobre.

**Reste ouvert :** l'accueil fait 5 600 px de haut, ce qui est le prix assumé du melting-pot — un
jour il faudra soit plier les rangées de découverte, soit les alterner. Et la nav n'a plus qu'un
seul lien réel sous « Découvrir » (`/calendar` est du V2) : le menu déroulant est devenu un peu
grand pour ce qu'il contient.

---

## Où on en est — 10 août 2026

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
| Accueil `/` | fait — suivi, listes, catalogue du moment, journal ; trois frontières de suspension |
| Grille et liste | fait — les deux dispositions sur `/search` et `/library`, bascule dans l'URL, taille de page qui remplit ses rangées |
| « +1 » depuis la grille | fait — tableau de bord, bibliothèque, et la ligne du planning |
| Éditer un suivi sans quitter la grille | fait — `EntryDialog` rend les contrôles de la fiche, enregistrement au bouton |
| **Suivre** depuis une grille | fait — recherche et rangées de découverte, croisées avec les suivis du compte en une requête |
| Profil `/u/[username]` | fait — identité, chiffres, journal complet paginé |
| Réglages `/settings` | fait — et les préférences sont **branchées**, plus seulement stockées |
| Préférences `UserPreferences` (§4.6) | fait — langue des titres et filtre 18+, lus par les écrans ; l'échelle de notes a été **retirée** (cinq étoiles pour tout le monde) |
| Note sur cinq étoiles (§4.2) | fait — demi-crans, stockage inchangé sur 0–100 |
| Listes `/lists` · `/lists/[id]` | fait — créer, renommer, décrire, remplir depuis une fiche, retirer, supprimer ; adressage par `id`, plus de `slug` |
| Réordonner une liste (V1.5) | fait — glisser-déposer et clavier, une seule ligne réécrite |
| `/browse` | **supprimée** — les cinq rangées vivent sur l'accueil (PRODUCT.md §5) |
| Jeu d'essai `pnpm db:seed` | fait — 26 suivis, 128 événements, 5 listes, une requête AniList |
| Cron de fraîcheur (§4.1) | fait — `/api/cron/refresh-media`, jeton porteur, lots de 50 |
| Palette de commandes `⌘K` | fait — recherche bibliothèque + catalogue, et « +1 » sans quitter la page |
| Limitation de débit | fait — Better Auth en `storage: "database"`, et un plafond par compte sur `/api/command` |
| Planning `/calendar` (V2) | fait — semaine des séries suivies, retard épisode par épisode, « +1 » depuis la ligne ; **jamais global**, voir PRODUCT.md §9 |
| Historique Git | fait — onze commits thématiques, plus rien en attente dans l'arbre de travail |
| `/collection` | n'existe pas — et **plus rien ne pointe dessus** : la nav et la palette ont perdu leur entrée le temps que l'écran arrive (V1.5) |
| Vues d'une liste `/lists/[id]/[viewId]` (§4.4) | pas commencé — c'est le prochain chantier |

**V0 et V1 sont bouclées**, **V1.5 est entamée** par le réordonnancement des listes, et **V2 l'est
par le planning** — qui n'attendait rien d'autre que le cron de fraîcheur, déjà posé. Le récap
annuel (§8.3) est écarté pour l'instant : c'est un choix, pas un oubli — il reste disponible, il ne
bloque rien.

### Le prochain pas

Dans l'ordre où je le prendrais :

1. **Les vues** (`ListView`, §4.4) : `/lists/[id]/[viewId]`, classement, tier list, grille. Tout est
   posé pour — dnd-kit est installé, le calcul de voisinage est écrit et testé, et `ListViewItem` a
   déjà son `tierIndex` et son propre `rank`. C'est la suite directe de ce qui vient d'être fait.
2. **La collection physique** (§4.5) : `/collection`, saisie par plage, écran des tomes manquants,
   prêts. Le plus gros morceau de V1.5, sans aucune dépendance, et celui que §8 désigne comme le plus
   utilisé au quotidien. C'est aussi ce qui rendra ses entrées à la nav et à la palette.
3. **Le partage par lien non listé.** L'adressage n'est plus une question depuis le passage à l'`id` ;
   ce qui reste à trancher est ce qui **autorise** la lecture — `UNLISTED` seul, ou un jeton. À poser
   avant de coder, pas pendant.

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
- **L'accueil fait près de 5 600 px de haut.** Prix assumé du melting-pot, mais il faudra un jour
  plier les rangées de découverte ou les alterner avec le suivi.
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
