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
