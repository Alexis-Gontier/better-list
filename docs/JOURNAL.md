# Journal de bord

[PRODUCT.md](./PRODUCT.md) dit **quoi** et **pourquoi**, [ARCHITECTURE.md](./ARCHITECTURE.md) dit
**comment**, [STATE.md](./STATE.md) dit **où on en est**. Ce fichier dit **ce qu'on a appris en
chemin** : ce qui a été tranché en passant, et qui n'était une décision ni de produit ni de
convention.

**Comment le tenir.** Une entrée par séance, datée, la plus récente en haut. Deux lignes valent
mieux qu'une entrée parfaite qu'on n'écrit jamais.

**Règle de rotation.** Au-delà de **10 entrées ou 30 Ko**, on archive dans [docs/journal/](./journal/)
et on remonte ce qui est encore applicable dans PRODUCT.md ou ARCHITECTURE.md. Le premier journal a
atteint 142 Ko avant qu'on s'en aperçoive, et plus personne ne le lisait — une connaissance qu'on ne
peut pas charger n'existe pas.

Archives : [7 → 15 août 2026](./journal/2026-08-archive.md).

Ce qui n'a **rien à faire ici** : une décision de périmètre (PRODUCT.md), une convention de fichier
(ARCHITECTURE.md), l'avancement d'un écran (STATE.md), le détail d'une implémentation (le
commentaire du fichier concerné, où il sera lu).

**Et ce qui y a sa place, à l'inverse** : l'*historique* d'une implémentation — ce qu'on a essayé
avant, dans quel ordre, et le bug tel qu'il est apparu à l'écran. Ce n'est pas un détail
d'implémentation mais le compte rendu d'un jour de travail, et c'est ce qui étouffe les fichiers
quand on le laisse en commentaire : le pourquoi vieillit bien, le récit non. La ligne de partage
exacte est dans [ARCHITECTURE.md](./ARCHITECTURE.md#les-commentaires--le-pourquoi-reste-lhistorique-sen-va).

---

## 7 septembre 2026 — la tier list, et le clavier qui n'avançait pas

Alexis voulait « noter correctement » : ses notes sont incohérentes entre elles, un 4 de 2019 ne vaut
plus un 4 d'aujourd'hui. Deux pistes ont été posées — comparaisons par paires, ou tier list — et
c'est la tier list qui a été retenue, à une condition qui a tout décidé : **les paliers sont les
crans de la note**, pas des lettres. Du coup rien à stocker (`Entry.score` suffit), rien à nommer, et
l'écran a coûté un module pur, une lecture et un îlot client.

Trois choses trouvées à l'écran, qu'aucun test n'aurait données :

- **Le clavier n'avançait pas.** `sortableKeyboardCoordinates` — celui du mode réorganisation des
  listes — déplace la carte de quelques pixels puis reprend la zone de dépôt la plus proche. Quand
  les zones sont des jaquettes, un appui vaut une voisine ; quand ce sont des **lignes**, et surtout
  la réserve « Non notées », plus haute que le pas, la carte reste dans sa propre ligne. Deux flèches
  sans quitter le palier, et rien dans la console. Remplacé par un `coordinateGetter` qui vise le
  palier **voisin dans le tableau** et renvoie le centre de sa ligne : une touche, un cran.
- **La réserve écrasait le plateau.** 196 œuvres commencées et jamais notées, étalées, repoussaient
  les onze crans hors de l'écran. Bornée d'abord à deux rangées qui défilaient — puis **détachée**,
  sur demande d'Alexis : elle est un bloc à part, séparé par un vrai écart, et elle montre toutes ses
  jaquettes. Piocher dans deux rangées sur seize revenait à choisir parmi ce que le hasard de l'ordre
  avait mis en haut. C'est l'écart qui la distingue du plateau, plus une hauteur maximale — et son
  étiquette est devenue **collante**, sinon on arrivait sur deux mille pixels de vignettes sans rien
  qui dise ce que c'était. Au passage : `overflow-hidden` sur la liste tuait ce `sticky`, il a fallu
  `overflow-clip`, qui découpe les coins sans créer de conteneur de défilement.
- **Deux jaquettes par ligne sur 390 px.** Comparer suppose de voir ensemble ; un palier qu'on
  feuillette ne se compare plus. Cartes en `w-14 sm:w-20`, et l'étiquette du palier passée en tête de
  ligne — centrée, elle se retrouvait au milieu de nulle part sur un palier de six rangées.

**Puis le style de TierMaker, en seconde passe.** Bandes colorées pleine hauteur à gauche, jaquettes
collées les unes aux autres, lignes sans écart : onze cartes séparées se lisaient comme onze listes,
le bloc d'un seul tenant se lit comme une répartition — ce qu'on vient y chercher. Le titre sous
chaque jaquette est parti avec : il coûtait un tiers de la hauteur du plateau pour ce que l'image dit
déjà, et c'est la hauteur qui décide si l'on voit deux paliers ensemble. Il passe en `opacity-0` et
non en `hidden` — masqué à l'œil, toujours là pour nommer la carte à un lecteur d'écran.

**Et les œuvres prévues sont sorties du plateau.** La règle était « prévu sauf si déjà noté » ; elle
est devenue « prévu, jamais ». Le contrôle sur la base d'Alexis a montré que le changement ne
déplaçait **aucune** ligne — il n'avait aucune œuvre `PLANNING` notée. Les 196 œuvres de la réserve
ne sont pas des envies : ce sont des séries commencées, finies ou abandonnées, jamais notées.

**Enfin le clic droit**, troisième passe. `context-menu` est le premier composant shadcn ajouté
depuis la mise à blanc ; il porte le titre de l'œuvre, « Ouvrir la fiche », et les douze crans en
**groupe radio** — donc la note courante est cochée, et « Retirer la note » est simplement la case
« Non notées » du plateau, pas une action de plus. Glisser et menu passent par la **même** fonction
`moveToTier` : deux gestes, une seule règle d'écriture et un seul retour en arrière.

Il n'est armé **qu'à la souris** (`use-fine-pointer.ts`, `any-pointer: fine`). Au doigt, Radix ouvre
son menu sur un appui long — exactement le geste que le `TouchSensor` de dnd-kit réserve au glisser
depuis 200 ms : les deux se seraient disputé le doigt, et le menu serait apparu par-dessus une carte
déjà saisie. Un clic droit, lui, ne se dispute rien.

Deux détails de finition trouvés au passage : le lint refuse un `aria-label` sur le `div` de la
carte (il ne voit pas le `role` que dnd-kit étale dans `attributes`, et le rajouter à la main
déclenche deux autres règles) — le nom accessible vient donc du texte à l'intérieur, ce qui est de
toute façon la bonne façon de nommer un bouton. Et Next avertissait que la jaquette du LCP se
chargeait en différé : seule la première ligne charge désormais ses douze premières vignettes sans
attendre.

**Deux bugs signalés par Alexis en fin de séance, et ils avaient la même racine : l'état client.**

1. **Les onglets Animes / Mangas ne changeaient rien.** Les liens écrivaient pourtant la bonne URL et
   le serveur renvoyait les bonnes lignes — mais le plateau garde ses œuvres dans un `useState`, et
   une navigation rend le **même** composant avec de nouvelles props : `useState` ne relit jamais sa
   valeur initiale. Corrigé par le motif « ajuster l'état pendant le rendu » (comparer les props à
   celles d'avant, se remettre à jour tout de suite), et non par un effet, qui aurait affiché une
   image périmée le temps d'une frame. Bénéfice de bord : une note posée depuis un autre onglet se
   rattrape maintenant à la revalidation.
2. **Un désaccord d'hydratation sur chaque carte.** dnd-kit fabrique le `aria-describedby` avec un
   compteur de **module** (`useUniqueId`) : le serveur repart de zéro, le client continue le sien, et
   React comparait un `DndDescribedBy-0` à un `DndDescribedBy-28`. Le prop `id` de `DndContext`
   court-circuite ce compteur — c'est exactement ce pour quoi il existe. Une leçon qui vaut au-delà
   d'ici : **toute bibliothèque qui génère des identifiants doit se voir passer une graine** dès
   qu'elle est rendue côté serveur.

Le premier ne se voyait qu'en cliquant, le second qu'en ouvrant la console. Ni le typecheck, ni le
lint, ni les 242 tests ne pouvaient les attraper — c'est la troisième fois de la journée.

La vérification a coûté **six écritures réelles** : la même œuvre de la réserve montée au palier 1
puis redescendue — au clavier, puis par le menu, puis une troisième fois après le correctif d'état,
qui périmait la preuve précédente. Chaque aller a été relu après rechargement, et les notes sont
revenues à l'identique. Mais `EntryEvent` est *append-only* : six lignes `SCORED` restent au journal
du 7 septembre. C'est le prix d'une preuve de bout en bout sur une base de production, et il valait
mieux le dire que de livrer sans preuve.

### L'audit du plateau, dans la foulée — et la quatrième fois de la journée

Alexis a demandé une relecture de l'écran fini. Les quatre commandes étaient vertes, la console
muette, les 242 tests au vert : **l'audit a quand même trouvé deux bugs visuels, et il a fallu le
navigateur pour les voir.** C'est le même constat que le reste de la journée, mais il est cette fois
arrivé *après* qu'on ait cru l'écran terminé.

**La carte glissée était rognée par le plateau, et personne ne l'avait remarqué.** Les deux blocs
portent `overflow-clip` — posé le matin même pour que le `sticky` de l'étiquette survive —, mais une
carte que dnd-kit déplace par `transform` reste un descendant de ce bloc : elle disparaît dès
qu'elle en sort. Piocher dans la réserve pour remonter au cran 5, c'est-à-dire **le geste central de
l'écran**, se faisait donc à l'aveugle sur tout le trajet. Prouvé par `elementFromPoint` au centre
de la carte translatée : il rendait la jaquette d'en dessous.

La réponse est un `DragOverlay`, qui rend la carte en `position: fixed` — dont le bloc conteneur est
la fenêtre, donc hors d'atteinte de tout `overflow` d'ancêtre. **Deux règles CSS posées à trois
heures d'intervalle pour deux bonnes raisons peuvent se combiner en un bug qu'aucune des deux
n'annonce.** Et : `dropAnimation={null}`, parce que l'animation par défaut ramène l'aperçu vers la
carte d'origine alors que le dépôt vient de l'envoyer ailleurs — elle montrerait le contraire de ce
qui vient de se passer.

**`m-auto` ne centre rien dans un `flex-wrap` en `content-start`.** Le message d'un cran vide se
collait à 1 px du haut de sa ligne de 97 px, et se lisait donc comme le pied du palier au-dessus.
La cause n'est pas une faute de frappe : `align-content: flex-start` réduit la ligne flex à la
hauteur de son contenu, et les marges auto n'ont alors plus rien à répartir. L'alignement dépend
désormais du contenu — `items-center` quand la ligne est vide, `content-start` sinon.

**Le rendu optimiste et `revalidatePath` se disputaient l'état.** Chaque dépôt revalide, donc les
lignes fraîches du premier arrivaient alors que le second n'y était pas encore : sa carte remontait
à son ancien cran, puis se recorrigeait. Sur un écran fait pour *enchaîner* les dépôts, le défaut
était structurel, pas anecdotique. La réponse n'est pas un verrou mais une **table des écritures en
vol** (`pending-scores.ts`), qui recouvre ce que renvoie le serveur tant qu'une écriture n'a pas
répondu. Elle porte aussi la note d'avant la **première** écriture en vol : l'ancien code la gardait
par œuvre et la supprimait à la première réponse, donc deux déplacements de la même carte se
volaient leur retour en arrière.

Le module est **pur**, et c'est une contrainte du dépôt plus qu'une élégance : Vitest tourne en
environnement `node` et n'inclut que `*.test.ts`, donc aucun composant React n'est testable ici. Ce
qu'on veut couvrir doit sortir du composant. Sept tests.

**Retirer une note laisse enfin une trace.** `applyEntryChanges` n'émettait `SCORED` que pour une
note chiffrée — tolérable tant qu'effacer était un cas de bord de la fiche, plus depuis que la tier
list en fait un dépôt dans la réserve. `EntryEvent.score` était déjà nullable : rien à migrer, un
libellé à changer. C'est une règle qu'on retourne, pas un oubli qu'on répare.

Coût de la preuve, encore : **deux écritures réelles** sur *Akame ga Kill!* — montée au cran 4,5
puis redescendue à 4, à 549 ms d'écart pour que les deux allers-retours se chevauchent vraiment. La
note est revenue à 80, les deux lignes `SCORED` restent.

## 7 septembre 2026 — le cron du miroir, ou ce que le gel avait vraiment gardé

Séance de reconstruction pure, et la plus courte du chantier : trois fichiers, dont un de neuf
lignes de JSON. Ce qu'elle apprend n'est pas dans le code écrit mais dans le code qu'on **n'a pas eu
à écrire**.

**Le gel a tenu sa promesse, et c'est vérifiable.** `knip.jsonc` portait « bornes du miroir —
attendent le cron » depuis le 5 septembre. Deux jours plus tard, la fonction est arrivée et l'entrée
est partie : `mirrorStaleCutoffs`, `MIRROR_BATCH_SIZE`, `MIRROR_MAX_BATCHES_PER_RUN` et les deux
listes de statuts ont toutes trouvé leur appelant du premier coup, sans qu'une ligne de
`media-freshness.ts` ait à bouger. La leçon générale : un commentaire de gel qui **nomme la fonction
attendue** — le docstring de `MEDIA_MIRROR_QUERY` disait `refreshStaleMirror`, au mot près — vaut
infiniment mieux qu'un « à voir plus tard ». Il transforme une dette en rendez-vous.

**Un helper pur rend une décision d'architecture, pas seulement du code testable.**
`mirrorStaleCutoffs` renvoie des *bornes* et non un prédicat `isStale(row)`. La différence paraît
cosmétique et ne l'est pas du tout : un prédicat oblige à charger la table pour la filtrer en
mémoire, des bornes se traduisent en `syncedAt < …` et se font servir par l'index. Le choix avait été
fait avant qu'aucun appelant n'existe, et il a dicté la forme de la requête sans discussion. À
retenir : quand on isole une logique « en attendant son appelant », la forme qu'on lui donne décide
déjà de ce que l'appelant pourra faire.

**Le piège de la séance est du SQL, pas du TypeScript.** `status IN (…)` est faux quand la colonne
vaut `NULL` — et `status NOT IN (…)` l'est aussi. Une ligne sans statut échappe donc aux **deux**
conditions et n'aurait jamais été rafraîchie, alors que `mirrorTtlMs` la classe volatile exprès pour
qu'on découvre son vrai statut. Rien ne l'aurait signalé : pas le typecheck, pas les tests de
`media-freshness.ts` qui portent sur la logique pure, pas une passe en production qui aurait rendu un
compte rendu vert. D'où une branche `OR` dédiée, et un test qui la garde. À retenir dès qu'une
colonne nullable entre dans un `where`.

**Ce qu'on fait d'une œuvre disparue tenait en deux moitiés, et la seconde est la moins évidente.**
Garder la copie va de soi (la supprimer ferait tomber en cascade les `Entry`, `ListItem` et
`OwnedVolume` qui y pointent). Avancer quand même son `syncedAt` va beaucoup moins de soi — mais sans
ça la ligne reste périmée pour toujours, remonte en tête du tri « les plus anciennes d'abord » à
chaque passe, et occupe indéfiniment une place de lot. Une poignée de fiches supprimées suffirait à
monopoliser la passe. **On horodate la tentative, pas la réponse.** C'est un motif général pour toute
file traitée par ancienneté : ce qui échoue doit quand même avancer, sinon il bloque la file.

**Un seuil plus court que la cadence n'est pas une incohérence.** 12 h de péremption pour une passe
quotidienne, ça se lit comme un bug et c'en serait un dans l'autre sens. Un seuil de 24 h ferait
qu'une ligne rafraîchie à 4 h 02 ne serait pas encore périmée à 4 h 00 le lendemain, et attendrait
48 h. Un seuil plus court ne déclenche jamais rien de lui-même : il garantit seulement que la passe
trouve du travail. La règle était déjà écrite dans `media-freshness.ts` et dans PRODUCT.md §4.1 ; la
relire avant de choisir l'expression cron a évité de « corriger » l'un des deux.

**Les tests ont été vus échouer.** Trois mutations volontaires — retirer la branche `status: null`,
retirer l'`orderBy` — font tomber exactement les tests écrits pour elles. Un test qu'on n'a pas vu
rouge ne garde rien, et c'est particulièrement vrai ici où tout est doublé : Prisma et AniList sont
des `vi.fn()`, donc un test mal branché passerait au vert en n'observant rien.

**Et la route a été appelée.** 401 sans en-tête, 401 sur un jeton faux, 200 et
`{"stale":94,"refreshed":94,"vanished":0,"batches":2}` sur le bon — 94 lignes en deux requêtes, puis
`stale: 0` au second appel. Le compte rendu JSON n'est pas décoratif : c'est la seule chose qu'on
verra du cron une fois en production, et il dit d'un coup d'œil si la cadence suffit (`stale` collé
au plafond) ou si le miroir est à jour (`stale: 0` sur plusieurs passes).

Reste ouvert : la passe n'est vérifiée de bout en bout par aucun test contre une vraie base. Elle
l'a été à la main, une fois.

## 7 septembre 2026 — l'audit, et la navigation qui manquait sur mobile

Séance de **relecture** plutôt que de construction : passer tout le site au navigateur, écran par
écran, en 1440 et en 390, et voir ce que le typecheck ne voit pas. Huit trouvailles — une qui rendait
le produit inutilisable sur téléphone, une qui le privait de tout son catalogue, et **deux
diagnostics que j'avais d'abord écrits faux**.

**La navigation mobile n'existait pas.** `MainNav` porte `hidden md:flex` depuis toujours, et rien
ne la remplaçait en dessous : l'en-tête mobile n'offrait que le monogramme, qui mène à un accueil en
placeholder. Ni `/search`, ni `/library`, ni `/lists` n'étaient atteignables depuis un téléphone. Ça
ne se voyait dans aucun test parce qu'aucun test ne regarde une largeur. Un tiroir latéral (choix
d'Alexis contre une barre basse, pour garder les descriptions de `config/navigation.ts`), et
`sheet.tsx` écrit à la main plutôt qu'installé — voir plus bas.

**Le paquet `cn` est revenu, et par le même chemin qu'en août.** `pnpm dlx shadcn add sheet` a
ajouté une dépendance npm parasite nommée `cn` à `package.json` avant même d'écrire un fichier, puis
s'est arrêté sur une invite « écraser `button.tsx` ? » — à laquelle il ne fallait surtout pas
répondre oui, nos variants y vivent. `--yes` ne couvre pas cette invite-là. Bilan : rien d'installé,
`package.json` sali. **Le composant a donc été écrit à la main**, sur `radix-ui` déjà présent. C'est
la deuxième fois que ce CLI laisse ce même déchet ; la leçon est de relire `git diff package.json`
après chaque `shadcn add`, ou de s'en passer.

**Les états vides se lisaient comme une panne.** `/search` et `/library` faisaient `return null` :
une page blanche sous la barre, sans un mot. Trois messages sur le catalogue, deux sur la
bibliothèque, et surtout un **geste** — `mostSelectiveFacet` désigne la facette active la plus
étroite et propose de la retirer, en un lien qui ne défait qu'elle. L'ordre de sélectivité est un
**jugement assumé, pas une mesure** : le mesurer coûterait une requête AniList par facette sur un
quota de trente par minute.

**`/l/[token]` journalisait une erreur à chaque visite.** « Uncached data during prerendering » : la
seule page publique du produit n'avait pas `export const instant = false`, alors que le layout
`(app)` l'a. Une ligne. **Elle ne règle pas** le 200-au-lieu-de-404 sur un jeton inconnu, décrit dans
le fichier depuis le 6 septembre — vérifié, les deux se ressemblent et n'ont rien à voir.

**Le bandeau de panne AniList ne se mettait à jour que depuis la fiche.** `ReportAniListStatus`
n'était rendu que par `/media/[id]`, alors que `/search` est l'autre écran qui interroge l'API.
Arriver sur `/search` depuis une fiche saine — qui vient de rapporter « tout va bien » — laissait le
bandeau masqué en pleine panne. Il est maintenant rendu sur les deux branches de `/search`, y compris
celle du vide : une panne qui ne ramène rien est justement le moment où il doit paraître.

**Et des chaînes anglaises dans une interface française**, toutes pour lecteurs d'écran donc
invisibles à la relecture : `Close` dans `dialog.tsx` (dans *toutes* les fenêtres), `More pages` dans
la pagination, et surtout ses `aria-label="Go to previous page"` — qui sont le **seul** nom
accessible de ces boutons sous `sm`, où le texte est masqué.

### AniList n'avait rien coupé : il manquait un `Referer`

Le symptôme : depuis Node, toute requête — même `{Media(id:1){id}}` — revenait en **403 « The AniList
API has been temporarily disabled »**, pendant que la **même** depuis le navigateur revenait en
**200 avec les données**.

**La première conclusion était fausse, et l'erreur est instructive.** J'avais testé `User-Agent`,
`Origin` et `Accept` **un par un**, constaté qu'aucun ne changeait rien, et conclu à une empreinte
TLS filtrée à la périphérie. C'était une faute de méthode : tester les en-têtes un par un ne pouvait
rien trouver, puisque c'est **l'ensemble complet** qui passe. La bonne manœuvre est le
**laissé-de-côté** — rejouer l'appel navigateur entier, puis retirer les en-têtes un par un. Un seul
fait basculer la réponse : `Referer`. `content-type` + `Referer` suffisent, et **n'importe quelle
valeur passe, `x` compris**.

Ce n'est donc ni une coupure ni une empreinte TLS : c'est un filtre anti-robot grossier, et **le
message d'erreur ment**. Le 403 du 15 août mériterait d'être relu à cette lumière.

Correctif d'une ligne, avec notre vraie URL plutôt qu'un `https://anilist.co` qui aurait marché en
mentant. Un **test le garde**, vu échouer sans l'en-tête — parce que la panne serait *silencieuse* :
le repli sur le miroir rattrape le 403, donc retirer cette ligne ne casserait aucun écran et
laisserait le catalogue servi depuis la copie locale pour toujours.

**La leçon de méthode, qui vaut au-delà d'AniList** : pour trouver quel en-tête débloque une
requête, on part de ce qui marche et on enlève — jamais de ce qui ne marche pas et on ajoute. Les
deux ne coûtent pas le même nombre d'essais et surtout, la seconde échoue en silence quand le
déclencheur est une conjonction.

### `/icon` n'était pas cassé — le serveur de dev l'était

`ERR_EMPTY_RESPONSE` sur toutes les pages, et l'`opengraph-image` du partage identiquement. Le tracé
rendait pourtant **561 octets de PNG valide en Node nu**. La sonde décisive a été de demander une
`ImageResponse` depuis une route neuve : **le serveur `next dev` en est mort** — port fermé,
processus disparu.

Redémarré à froid, tout marche, et `/icon` rend **exactement les 561 octets prédits**. L'image
d'aperçu du partage aussi, vérifiée à l'œil : 1200×630, monogramme, titre, auteur, cinq jaquettes.

Ce serveur tournait depuis avant les modifications de la séance. **C'est le deuxième incident du même
genre en deux jours**, après les deux écritures inexpliquées du 6 septembre — la règle d'hygiène qui
en était sortie est donc confirmée, et elle vaut plus cher qu'il n'y paraissait : une heure passée à
chercher un bug dans du code correct, et un diagnostic écrit noir sur blanc dans STATE.md qu'il a
fallu retirer. **Ne pas laisser un `next dev` traverser une séance entière de modifications.**

---

## 6 septembre 2026 — les listes, et une liste qui a disparu

**Le `take` imbriqué de Prisma n'est pas un `LIMIT`.** La mosaïque de quatre jaquettes de `/lists`
demandait quatre `ListItem` par liste sans faire de N+1 ; le journal des requêtes a montré trois
requêtes constantes — donc pas de N+1 — mais aussi que `items: { take: 4 }` **ne descend pas en
SQL** : Prisma rapatrie tous les items de toutes les listes et tranche en mémoire. Le repli qu'on
avait prévu n'existe pas non plus — `relationLoadStrategy: "join"` est rejeté par Prisma 7.9.1 avec
le générateur `prisma-client` et le driver adapter. On garde et on documente : la sur-lecture porte
trois colonnes étroites, et la table `media` n'est lue que pour ce qui s'affiche.

**Une réserve de place pour aligner des cartes est presque toujours une erreur.** Deux lignes vides
avaient été gardées sous les titres sans description, pour que les cartes fassent la même hauteur.
La grille CSS le faisait déjà. En une colonne — 390 px —, la réserve devenait un trou entre le titre
et le décompte. `mt-auto` sur la dernière ligne fait le travail sans rien réserver.

**`touch-action: none` tue le défilement, et il faut le voir en 390 pour s'en rendre compte.** Le
mode réorganisation employait un `PointerSensor` unique, ce qui oblige à neutraliser le geste
tactile sur chaque jaquette. Résultat : une grille faite presque entièrement de jaquettes, donc plus
un endroit où poser le doigt pour descendre — et donc aucun moyen d'atteindre la dix-huitième œuvre
pour la déplacer. Séparer `MouseSensor` (seuil de 8 px) et `TouchSensor` (appui de 200 ms) rend le
défilement au navigateur et le maintien à dnd-kit.

**`bg-muted` ne dessine rien sur une `popover` en thème sombre.** La puce qui porte le nom à recopier
dans la fenêtre de suppression était invisible ; il a fallu un liseré et le fond de page. Vu à
l'écran, pas au typecheck.

**Une tentative d'ajout shadcn peut laisser une dépendance derrière elle.** `shadcn add field` a
échoué sur un prompt d'écrasement de `label.tsx` — mais avait déjà installé un paquet `cn` au
`package.json`. C'est `knip` qui l'a trouvé. Vérifier `git diff package.json` après toute commande
de registre qui s'interrompt.

**`ImageResponse` fonctionne au build et pas à la requête, sur cette machine.** `app/icon.tsx` est
prérendu au build : `.next/server/app/icon.body` est un PNG valide de 561 octets, et la route rend
200 en production. Le même composant demandé *à la requête* — en dev, ou l'`opengraph-image` d'une
liste partagée, qui dépend du jeton — se termine en « failed to pipe response » puis en socket
fermé. Un serveur de dev redémarré à froid n'y change rien : ce n'est pas du rechargement à chaud.
Conséquence : **l'aperçu OG du partage est livré sans avoir été vu**, et c'est la seule chose de la
séance dans ce cas.

**Un `notFound()` ne pose pas de 404 sous les Cache Components.** Sur `/l/[token]`, un jeton inventé
rend bien la page « introuvable » — corps vérifié, aucun titre de liste dedans — mais avec un statut
**200**. La coquille part avant que la base ait répondu, donc le code est déjà écrit quand on veut
le changer. `connection()` a été essayé pour forcer un rendu dynamique : sans effet, et retiré
plutôt que gardé avec un commentaire qui aurait menti. Mesuré sur le build, pas seulement en dev.

**Une écriture inexpliquée, puis une seconde, puis une expérience de contrôle.** Le récit est dans
[STATE.md](./STATE.md) ; ce qui appartient au journal est la méthode : quand deux anomalies ne se
recoupent pas, le point commun était l'outil, pas le code. Un `next dev` qui traverse une séance
entière de modifications recharge à chaud à travers des compilations incompatibles, et les Server
Actions sont identifiées par un identifiant généré à la compilation. **Redémarrer `next dev` après
un refactor qui touche des Server Actions** — et se méfier d'un journal de dev qui s'est mis à
cracher des erreurs en continu.

**Le piège du miroir s'est vérifié pour de vrai, et il fallait sortir de ses propres données pour
ça.** La fenêtre « Ajouter à une liste » a été éprouvée sur *Sousou no Frieren 3rd Season*, atteinte
depuis `/search` — une saison récente qu'aucun compte n'avait jamais suivie, donc absente du miroir.
Sans `ensureMediaMirror`, l'insertion échouait sur la clé étrangère de `ListItem.mediaId`. Tester
sur une œuvre déjà en base n'aurait rien prouvé : c'est précisément le cas qui ne casse pas.

**Une liste d'Alexis a disparu de la base, et on ne sait pas comment.** « Randil recommendation »,
vide, présente à 17 h 26 et absente à 17 h 48. Les seules suppressions déclenchées visaient une
liste de test et une confirmation annulée sur une autre liste — intacte. Le récit et ce qui reste à
décider sont dans [STATE.md](./STATE.md) ; la leçon est ici : **`List` et `ListItem` n'ont aucun
journal**, là où `EntryEvent` aurait répondu en une requête. C'est la première fois que l'absence de
trace coûte quelque chose.

---

## 6 septembre 2026 — la fiche, et le jour où AniList était vraiment coupée

Première séance de reconstruction. `/media/[id]` retrouve son hero — l'avancement est dans
[STATE.md](./STATE.md), l'inventaire de ce qui reste à y mettre dans
[fiche-media.md](./fiche-media.md). Ici, seulement ce qu'on a appris.

**Une panne d'API tierce n'est pas un cas de test, c'est un jour comme un autre.** AniList était
coupée pendant toute la séance — 403, « temporarily disabled due to severe stability issues », le
même incident qu'en août. Conséquence immédiate : rien n'était vérifiable à l'écran, puisque la fiche
n'était qu'une page d'erreur. Le repli sur le miroir local, qu'on avait rangé dans « plus tard »,
est devenu la condition pour voir quoi que ce soit — il a donc été écrit tout de suite. Ce n'est pas
une entorse au plan, c'est le plan qui ignorait un fait. Bénéfice inattendu : le chemin de panne a
été **vu fonctionner**, ce qui n'arrive jamais en développement puisqu'il demande qu'un tiers tombe.

**Le canari n'a pas pu être rallumé, et c'est le test qui avait raison.** STATE.md annonçait depuis
la mise à blanc que « le premier écran reconstruit qui pose un Server Component `async` » retirerait
le `.skip`. La fiche en pose un — et le canari est resté éteint : la détection ne regarde que les
composants **exportés**, et celui de la fiche est interne à sa page. La règle du test est juste (un
composant qu'on n'exporte pas ne peut être importé par personne, donc il n'y a rien à garder) ;
c'était la promesse de STATE.md qui était trop large. On a corrigé la phrase, pas le test. Le réflexe
inverse — élargir la détection pour que la case se coche — aurait transformé un garde-fou en
formalité.

**Une marge négative fixe ne peut pas aligner deux colonnes de hauteurs différentes.** Le bas de la
jaquette devait tomber sur le bas de la barre de suivi. Première tentative : une marge négative
choisie à l'œil, juste sur la fiche qu'on regardait. Elle tombait faux dès que le titre passait sur
deux lignes ou qu'un fait manquait. La solution tient en une phrase : **la colonne de la jaquette ne
porte aucune hauteur propre** (son contenu est hors flux), la rangée est donc mesurée par la seule
colonne de droite, et la jaquette s'y accroche par le bas. Elle déborde vers le haut d'autant qu'il
faut, sans qu'on ait à savoir combien.

Le piège de la suite, trouvé en testant une **deuxième** œuvre et pas la même : sur un webtoon sans
bannière, au titre court et sans saison, la rangée devient si basse que la jaquette remonte sous
l'en-tête. D'où une hauteur minimale de rangée, et une bande sans image assez haute pour l'encaisser.
La leçon est moins sur le CSS que sur la vérification : le premier essai marchait, et il ne prouvait
rien.

**Une ombre interne se peint sous le contenu.** Le liseré de la jaquette a été posé en `ring-inset`
sur le conteneur de l'image : invisible, parce que l'image le recouvrait exactement. Deux issues —
un calque posé par-dessus, ou un vrai `border`. C'est le `border` qui a gagné, en couleur de fond,
sur choix visuel d'Alexis. Même famille de piège que le `overflow-x-clip` du layout : ces choses-là
ne se voient qu'à l'écran, jamais au typecheck.

**Le CLI shadcn n'écrit pas toujours du code qui compile.** `pnpm dlx shadcn add button-group` a
laissé `import { cn } from "cn"` — l'alias du registre, non réécrit — et **installé un paquet npm
nommé `cn`** en dépendance du projet. Le premier casse le build, le second est passé inaperçu jusqu'à
`pnpm knip`. La skill shadcn prévient de relire les fichiers ajoutés ; la vraie leçon est que la
chaîne de vérification a rattrapé les deux, et qu'il n'y avait rien à deviner.

**Un composant peut être promu avant son deuxième appelant, si quelqu'un décide de le faire.** La
règle d'ARCHITECTURE.md dit d'attendre le deuxième consommateur réel. Les trois contrôles de suivi
sont montés dans `features/tracking/components/` alors que seule la fiche les emploie — décision
d'Alexis, qui sait que `/search` et `/library` les demanderont. La règle reste bonne ; ce qui la
rend acceptable ici, c'est que l'entorse est **explicite et datée** plutôt que subie par distraction.

Au passage, la même arbitrage a bien fonctionné dans l'autre sens : le bouton ± ne connaît aucune
entité métier, il est donc allé dans `shared/` et non dans la feature. La question « qu'est-ce que ce
composant connaît ? » tranche mieux que « où est-ce que je l'utilise ? ».

---

## 5 septembre 2026 — la mise à blanc, et la branche qu'on n'avait pas regardée

Séance de suppression : les dix routes construites deviennent des placeholders, `features/` passe de
49 à 27 fichiers, 7 300 lignes s'en vont. Le détail est dans [STATE.md](./STATE.md) — ici, seulement
ce qu'on a appris.

**Le plan n'est pas l'état du dépôt.** Le plan du 2 septembre avait ses 54 cases vides, et STATE.md
en a conclu — puis affirmé deux fois — qu'aucune tâche n'avait été entamée. C'était faux : la branche
`refonte-design` portait les 15 commits qui l'exécutaient, 2 018 lignes, datés du 2 septembre. La
mise à blanc a donc été menée en croyant qu'aucun remplacement n'existait, alors qu'il en existait un
à moitié réutilisable.

Personne n'avait coché les cases en avançant, ce qui est humain. La leçon n'est pas « mieux cocher »,
c'est **`git branch` avant de conclure quoi que ce soit sur ce qui existe.** Un fichier de plan
décrit une intention ; seul le graphe des commits décrit un dépôt. STATE.md porte désormais cet
avertissement en tête de son « prochain pas ».

L'histoire se termine en fin de séance : deux commits en ont été tirés par cherry-pick — Archivo et
les tokens « Obsidienne » — et la branche a été **supprimée**, décision prise en connaissance de ce
qu'elle emportait. Le dépôt n'a plus qu'une branche. Ce que les treize autres commits avaient résolu
est à refaire, pas à relire ; seule la spec en garde l'intention. C'est cohérent avec le reste de la
séance — on repart de zéro, et une implémentation qu'on garde « au cas où » est une implémentation
qu'on relira une fois de trop.

**Supprimer plutôt que geler, quand on sait qu'on jettera.** `pnpm knip` a signalé 32 puis 41
éléments sans appelant au fil des passes. Deux traitements, et la frontière s'est révélée nette :
ce qui portait une **décision** — contrats d'URL, schémas Zod, les 488 lignes de GraphQL AniList,
`actionClient` — a été gelé dans `knip.jsonc` par chemin, chaque entrée nommant l'écran qu'elle
attend. Ce qui ne portait qu'un **rendu** a été supprimé. Geler du code qu'on sait devoir réécrire,
c'est se promettre de le relire une fois de trop.

Le gel est posé par chemin et jamais en `exclude` global : c'est ce qui permet à knip de continuer à
garder le reste du dépôt pendant des semaines de chantier. Un garde-fou désactivé globalement « le
temps de », on connaît la suite — c'est écrit dans le commentaire de `knip.jsonc` depuis août.

**Un canari qui chante faux est un canari qui marche.** `architecture.test.ts` vérifie qu'aucun
module `"use client"` n'importe un Server Component `async`, puis — c'est tout l'intérêt — qu'il en
trouve au moins un, pour que le premier test ne passe pas au vert en parcourant un ensemble vide. La
mise à blanc a supprimé le dernier : le canari a échoué, exactement comme prévu.

La tentation était d'abaisser l'assertion à `>= 0`. Elle aurait rendu le problème **invisible** au
lieu de le rendre visible — et le problème est réel, puisque le test voisin ne garde plus rien en
attendant. Il est donc passé en `.skip`, avec la consigne écrite : le premier écran qui repose un
Server Component `async` retire le `.skip`. Un test en pause qui explique sa pause vaut mieux qu'un
test vert qui ment.

---

## 5 septembre 2026 — le bandeau d'accueil, et ce qui l'a mis dans cet état

Entrée écrite **après coup**, en dégraissant `_lib/hero-geometry.ts` — 87 % de lignes de commentaire,
le record du dépôt. Tout ce qui suit y était en prose ; ce qui reste dans le fichier est l'invariant,
ce qui vient ici est le chemin. C'est l'étalon de la règle de commentaire posée le même jour dans
ARCHITECTURE.md.

- **Les constantes ont dû quitter `hero-carousel.tsx`.** Elles vivaient à côté du composant qui les
  emploie, mais ce fichier porte `"use client"` et `home-hero.tsx` est un Server Component. Next
  remplace alors tout export non composant d'un module client par une **référence client** : la
  constante importée côté serveur n'était plus une chaîne mais une fonction-piège, dont
  l'interpolation dans une `className` a produit `class="relative function() { throw new Error(…) }"`.
  Rien à la compilation, rien au typecheck — un bandeau de 252 px au lieu de 480, trouvé à l'écran.
  La règle « jamais d'export server et client depuis le même fichier » ne vaut donc pas que pour les
  fonctions.

- **Pleine largeur → dans la colonne.** Le bandeau était d'abord `w-screen` recentré, échappé du
  `max-w-6xl` du layout. Le ramener dans la gouttière change ce qu'il raconte : une carte posée sur
  la page plutôt que l'ouverture de la page. Le reste de l'accueil s'aligne sur la même gouttière, et
  un seul bloc qui la franchissait décalait l'œil à chaque défilement.

- **`vh` abandonné pour des hauteurs fixes.** `55vh` sur un téléphone en paysage donne une bande de
  deux cents pixels où le titre et les boutons ne tiennent pas ; et `vh` se redimensionne quand la
  barre d'adresse mobile apparaît en cours de défilement, donc le bandeau sautait sous le doigt.

- **L'arrondi à tous les paliers, contre la référence.** La disposition vient d'une référence qui
  n'arrondit qu'à partir de `md` — juste chez elle, dont la boîte touche les bords de l'écran sur
  mobile, où un arrondi flotterait dans le vide. La nôtre garde la gouttière du `main` (mesuré :
  343 px de large, 16 px de marge à 390 px de viewport), donc des coins carrés au milieu d'une marge
  se lisent comme un rendu inachevé. **La règle copiée sans son motif produisait l'inverse de ce
  qu'elle visait.**

- **Le `gap` de la piste remplacé par un remplissage dans la diapositive.** Un `gap` sur le conteneur
  flex était la façon évidente d'écarter les diapositives, et symétrique sous un centrage
  contrairement au `-ml`/`pl` de shadcn. Mais en mode `loop`, Embla ne réordonne pas le DOM : il
  **translate** la dernière diapositive pour la faire apparaître à gauche de la première, et cette
  translation se calcule sur la largeur des diapositives, sans le `gap` du conteneur. La voisine
  bouclée arrivait collée — à gauche seulement, et seulement sur la première diapositive, donc
  précisément à l'arrivée sur la page. Un remplissage vit *dans* la diapositive : il voyage avec elle.

- **Le voile en noir fixe plutôt qu'en `background`.** Le bandeau fondait d'abord vers la couleur de
  page — joli, mais le contraste dépendait du thème : il fallait un dégradé par thème, et le texte
  changeait de couleur avec lui. Un voile noir constant porte du texte blanc dans les deux thèmes
  avec le même ratio ; le contraste cesse d'être une chose à vérifier deux fois.

---

## 19 août 2026 — La documentation se remet d'aplomb

Cinq documents au lieu de trois, et une règle : **la cible et le réel ne partagent plus de
fichier**. C'est leur mélange qui avait produit un PRODUCT.md §5 affirmant que `routes.ts` n'avait
« ni recherche ni fiche média » — les deux y étaient depuis des semaines. [STATE.md](./STATE.md)
porte désormais seul l'avancement, CLAUDE.md est redevenu un aiguilleur, et les 34 entrées du
premier journal sont parties en archive sans retouche.

Le chantier en cours a été commité d'abord : 47 fichiers en sept commits thématiques. Écrire
« voici l'état du projet » au-dessus d'un travail que git ignore, c'est fabriquer la prochaine
péremption.

Trois choses tranchées en chemin :

- **`prisma/_legacy-import.ts` reste au dépôt**, écarté de knip. Son propre en-tête le disait
  « jetable, à supprimer une fois l'import validé » ; il peut servir à rejouer la reprise sur une
  autre branche Neon, donc l'en-tête avait tort et c'est lui qui a changé.
- **Knip repasse en `error`.** Le réglage `warn` attendait « que `/search` soit câblée et la
  première Server Action écrite ». Les deux existaient. Le réarmement a demandé de retirer six
  alias de types morts — et a démasqué `mediaSortSchema`, doublon dépassé de la paire
  `sortFieldSchema` / `sortDirectionSchema` qui, elle, sépare le champ de la direction.
- **Deux règles ne vivaient que dans CLAUDE.md** et auraient disparu en le raccourcissant : les
  trois gardes du proxy, et `export const instant = false` — appliqué dans trois fichiers,
  documenté nulle part ailleurs. Elles sont dans ARCHITECTURE.md avant d'être coupées d'ici. La
  leçon vaut au-delà du cas : **on ne raccourcit pas un document sans avoir vérifié où va ce qu'on
  en retire.**

Reste ouvert : le prochain pas est dans STATE.md, et c'est le repli de panne AniList sur `/search`,
`/calendar` et `/media/[id]`.

## 19 août 2026 — l'accueil se resserre

Cinq gestes sur la même page, dont un vrai bug.

- **Le bandeau collait sa voisine de gauche.** La gouttière était un `gap` sur la piste Embla ; en
  mode `loop`, Embla ne réordonne pas le DOM, il **translate** la dernière diapositive pour la
  placer avant la première — et cette translation ignore le `gap` du conteneur flex. D'où un défaut
  visible à gauche seulement, sur la première diapositive seulement, c'est-à-dire exactement à
  l'arrivée sur le site. La gouttière est descendue en remplissage symétrique **dans** chaque
  diapositive, où elle voyage avec elle. La leçon générale : sous `loop`, un espacement porté par le
  conteneur ne survit pas au déplacement des diapositives.
- **Les flèches du bandeau ont disparu**, le défilement automatique reste. Elles occupaient
  précisément la bande de débordement, ce qui rendait la voisine survolable sans être atteignable.
- **La carte « En cours » a été refaite** : les commandes quittent le flottement absolu au flanc
  droit — qui obligeait le texte à leur réserver un quart de sa largeur et coupait les titres — pour
  une ligne en pied. Le titre y reprend la taille du texte courant, la barre de progression court
  d'un bord à l'autre.
- **Deux blocs partent, un arrive.** « À reprendre » (six vignettes) devient une tuile de chiffres,
  qui mène à la bibliothèque filtrée ; la grille paginée du bas et la rangée « Côté papier » sont
  supprimées. `page.tsx` n'a plus aucun paramètre d'adresse, et le document AniList descend de cinq
  rangées à quatre.
- **Le bandeau et la rangée ne se répètent plus** : `getHeroEntries` porte le `cache` de React, ce
  qui permet à `getDashboard` d'exclure les cinq œuvres déjà montrées en grand sans les relire.

Un accident en chemin, qui vaut d'être écrit : une boucle de conversion de fins de ligne écrite
`io.open(p,"wb").write(io.open(p,"rb").read())` **vide les fichiers** — Python évalue l'ouverture en
écriture, donc la troncature, avant la lecture. Treize fichiers perdus, tous récupérés depuis les
`sourcesContent` des source maps de `.next` (les parenthèses des groupes de routes y sont
URL-encodées, `%28app%29`). À retenir : lire puis écrire en deux instructions, et `.next` est un
filet de sécurité réel tant que le serveur de dev n'a pas recompilé.

## 21 août 2026 — plus aucun écran ne tombe avec AniList

Le « prochain pas » traînait depuis le 15 août. Il est fait, et il a coûté moins cher que prévu pour
une raison qu'on n'avait pas vue.

**Le repli de `/media/[id]` ne demande aucun travail par composant.** On redoutait d'avoir à décider,
section par section sur une vingtaine de fichiers, ce qui survit à une coupure. En fait `buildTabs`
masque déjà tout onglet dont la collection est vide — une règle écrite pour une autre raison (un
manga n'a pas de casting vocal). Il a donc suffi de fabriquer un `MediaDetail` dégradé depuis le
miroir, avec ses collections vides : la fiche perd ses onglets d'elle-même, et aucun composant
d'affichage n'a besoin de connaître la panne. La leçon générale : une règle « ne montre pas ce qui
est vide » est aussi, gratuitement, une règle de dégradation.

Le schéma a aidé au même endroit. Tous les champs que `mediaDetailSchema` ajoute à `mediaSchema`
portent un `default`, donc le repli se construit en repassant par `parse()` plutôt qu'en assemblant
l'objet à la main — et il suivra tout seul le jour où un champ s'ajoute.

**Un `null` qui voulait dire deux choses.** `getMediaById` renvoie `null` pour « cette œuvre
n'existe pas », `tryAniList` renvoie `null` pour « AniList ne répond pas ». Emboîtés naïvement, les
deux se confondent et chaque coupure devient un `notFound()`. On emballe donc la lecture dans un
objet (`{ media }`) : le `null` de `tryAniList` ne peut plus désigner que la panne. À retenir dès
qu'on compose deux fonctions qui renvoient toutes les deux `null` pour des raisons différentes.

**Sur `/search`, on garde la barre de filtres, vide.** Le premier réflexe était de la retirer faute
de vocabulaire. Mais elle porte aussi les puces de filtres actifs, c'est-à-dire le seul moyen de
*défaire* un filtre : la retirer aurait laissé l'utilisateur coincé sur une recherche qu'il ne peut
plus modifier. Un état vide ne doit pas emporter les commandes qui permettent d'en sortir.

**Et une cause de fond réglée en passant.** `pnpm lint` échouait sur trois fichiers que personne
n'avait touchés : l'index les stockait en LF, git les recheckoutait en CRLF sous Windows, et biome
lisait la copie de travail. Il manquait un `.gitattributes` depuis le début. C'est la même famille
que l'accident du 19 août — les fins de ligne ne devraient jamais passer par les mains de quelqu'un.

Reste ouvert : ces cinq chemins de repli ne sont vérifiés par aucun test, et ils ont ceci de
particulier qu'on ne les voit jamais tourner. C'est le prochain pas dans STATE.md.
