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
