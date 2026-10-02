# Où on en est

> **Ce document se met à jour dans le commit qui le périme, jamais après.**
> Un état des lieux tenu après coup est un journal — et on sait ce que devient un journal qu'on ne
> relit pas ([docs/journal/](./journal/)).

[PRODUCT.md](./PRODUCT.md) dit ce qu'on veut construire. Ce fichier dit ce qui **est** construit.
Quand les deux se contredisent, c'est ce fichier qui a raison sur le présent, et PRODUCT.md sur
l'intention.

Relevé le **30 septembre 2026**.

> ### En un mot : onze écrans sur onze — la collection physique est entrée, et la carte est pleine.
>
> **Le 30 septembre, les favoris.** Un cœur sur la fiche d'une œuvre, sur `/character/[id]` et sur
> `/staff/[id]` ; le profil gagne une section « Favoris » en quatre rangées — Anime, Manga,
> Personnages, Staff —, les plus récents d'abord. Table `Favorite`, indépendante du suivi (on peut
> aimer une œuvre qu'on ne suit pas) ; une œuvre pointe vers le miroir, une personne garde un
> instantané nom + portrait pris au like, donc le profil ne lit rien chez AniList. `Entry.favorite`,
> que rien n'écrivait, est supprimé ; la migration `20260930120000_favoris` recopie ses valeurs.
> Feature `features/favorites/`, spec et plan dans `docs/superpowers/`. La migration n'avait pas été
> appliquée en production et toutes les fiches tombaient : depuis le 1er octobre, le build de
> production la passe lui-même (`vercel-build`, voir JOURNAL.md).
>
> **Le 26 septembre au soir, la cloche sort de l'en-tête** : chaque compte peut brancher un webhook
> Discord dans `/settings`, et `api/cron/discord` y poste les épisodes sortis, une fois par heure
> au plus, appelé par `.github/workflows/discord-notifications.yml` (Vercel Hobby n'autorise qu'un
> cron quotidien). Table `DiscordWebhook`, feature `features/notifications/`. **À faire pour que ça
> tourne** : appliquer la migration, et déclarer les secrets `APP_URL` et `CRON_SECRET` du dépôt.
> Chaque épisode porte une **carte générée** (`api/og/episode/…`, signée, lue dans le miroir). La
> nav a aussi ses icônes.
>
> **Le 26 septembre, deux routes de plus : `/character/[id]` et `/staff/[id]`.** Les cartes
> Personnages et Équipe de la fiche ne menaient nulle part ; elles mènent maintenant à une page par
> personne, calquée sur AniList — en-tête, faits, biographie (spoilers masqués, liens AniList
> réécrits vers nos routes), puis une grille de `MediaCard` avec pastille et « +1 ». Le staff a ses
> rôles en onglets (`?onglet=doublage|anime|manga`) groupés par année. Une requête AniList par
> affichage, cachée un jour ; aucun repli de panne, rien n'étant stocké en base. Nouvelle feature
> `features/people/`. Spec et plan dans `docs/superpowers/`.
>
> La mise à blanc du 5 septembre avait supprimé **toute** la présentation. Depuis le 6 septembre,
> dix routes ont de nouveau un écran réel : `/media/[id]` (hero, suivi, et depuis le 11 septembre
> **cinq onglets** — Aperçu, Personnages, Équipe, Œuvres liées, Tags —, et un **pied de page à
> colonnes** dérivé de `mainNav` qui porte enfin l'attribution AniList attendue par leurs CGU — §9.
> Il est monté sur `(app)` comme sur `(share)`, mais **sans ses liens sur la liste partagée** : ils
> mènent tous derrière la garde),
> **`/search` et `/library` en entier** — barre, facettes, grille, pagination, et le repli sur le
> miroir local quand AniList tombe —, puis **`/lists`, `/lists/[id]` et `/l/[token]`**, le
> 7 septembre **`/settings`**, le 8 septembre **`/calendar`**, et le 12 septembre
> **`/u/[username]`**, et le 14 septembre **l'accueil `/`**, dernier de l'ordre. **Le 19 septembre,
> `/collection` et `/collection/[mediaId]` sont entrées** — les deux dernières adresses déclarées
> sans écran derrière. Plus aucune route de PRODUCT.md §5 n'est un placeholder, à l'exception de
> `/lists/[id]/[viewId]`, que la roadmap reporte explicitement.
>
> **L'étagère physique est le premier écran du produit qui ne parle à personne d'autre que la
> base.** AniList n'a aucune donnée au niveau du tome (§9) : pas d'ISBN, pas de date de parution,
> pas de notion d'édition. Tout y est saisi à la main, donc aucun quota, aucun repli de panne, et
> aucune requête nouvelle. Une rangée par série, la réglette des tomes, et les manquants écrits en
> toutes lettres — « il me manque 11, 12, 29, 63 → 110 » est la liste de courses, et c'est la
> raison d'être de l'écran (§8 item 8).
>
> **Une série en cours n'a pas de fin, et l'écran le prend au sérieux.** AniList ne donne un
> nombre de volumes que pour les séries **terminées** : Berserk, One Piece, Hunter×Hunter et
> Vagabond arrivent tous à `volumes = null`. L'édition n'a donc pas de total, la grille s'arrête
> au dernier tome possédé, et une case « + » au bout pose le suivant — d'un clic, en poussant la
> fin de l'édition d'un cran si elle était connue. Sans elle, une série en cours était un
> cul-de-sac : aucune case à cliquer au-delà du tome 1.
>
> **L'accueil ne montre que ce qui vient de quelque part.** Trois zones, chacune avec sa frontière :
> un carrousel de tendances centré (la diapositive active à la largeur du contenu, ses voisines
> jusqu'aux bords de la fenêtre, depuis le 2 octobre) — qui dit « Reprendre à l'épisode 12 » sur une œuvre déjà suivie plutôt que son
> synopsis —, « En cours » où **les séries dont un épisode est sorti passent en tête avec leur
> retard**, puis les tendances, la saison et, depuis le 28 septembre, « Recommandé pour vous ». **Un trait sépare les deux
> moitiés** — mon suivi au-dessus, la découverte en dessous : c'est la seule frontière de l'écran
> que l'ordre seul ne rendait pas lisible, les rangées se ressemblant toutes.
>
> **Deux rangées sont parties le 17 septembre 2026** (décisions d'Alexis) : « À reprendre », que
> `/library?status=PAUSED` montre en entier — on y va quand on décide d'y revenir, ce n'est pas une
> chose à proposer à chaque arrivée —, et « Mes listes », qui résumait un écran que la navigation
> atteint en un clic. L'accueil ne garde de mon suivi que ce qui est **en cours**. Toutes les jaquettes sont la `MediaCard`
> du catalogue, aux paliers de `CatalogueGrid` : une œuvre a la même apparence et le même geste ici,
> sur `/search` et sur `/library`.
>
> **Le « +1 » est le premier geste d'écriture posé sur une vignette**, et il est sur les trois
> écrans : un cran d'avance sans ouvrir la fenêtre d'édition, révélé au survol du crayon, sur les
> œuvres déjà suivies seulement. Il écrit par `saveEntry`, donc dans `EntryEvent`.
>
> **Et l'accueil a fait remonter deux pièces dans `features/`** : `airing-lag.ts`, parti du `_lib/`
> de `/calendar` — le retard épisode par épisode est la même question ici et là-bas —, et
> `entry-quick-actions.tsx`, parti de son propre `_components/` quand `/search` et `/library` ont
> demandé le « +1 ». La règle de promotion à la lettre, deux fois.
>
> **Et la cloche de l'en-tête a cessé d'être un décor** (14 septembre 2026). Elle portait un tableau
> vide écrit en dur depuis le 8 août ; elle dit maintenant **les épisodes sortis qu'on n'a pas vus**,
> le même rapprochement que la rangée « En cours » mais depuis les dix routes. **Aucune table, aucune
> migration** : le retard *est* l'état non-lu, le badge s'éteint au « +1 » et non à l'ouverture du
> menu — une notification ne peut donc ni se perdre, ni survivre à ce qu'elle annonçait. Troisième
> promotion du même mouvement : `airingLags` est monté du `_lib/` de l'accueil vers
> `features/tracking/server/`, et le menu de `components/layout/` vers `features/tracking/components/`
> — il connaît désormais `Entry` et `Media`, donc il change de maison.
>
> **Ce que l'accueil ne fait pas, et c'est une limite d'AniList** : le « il y a du neuf » ne vaut que
> pour les animes. La grille horaire est télévisée ; aucun calendrier de parution n'existe pour les
> webtoons, qui sont pourtant le gros de la bibliothèque d'Alexis. Une rangée « En cours » y répond
> alors par la progression — « ch. 79 / 85 ».
>
> **`/u/[username]` lit enfin le journal**, qui était le prochain pas de ce document depuis le
> 6 septembre. `EntryEvent` se remplissait sans que rien ne l'affiche, et la table étant
> *append-only* et non rétroactive, chaque jour sans lecture était un jour où l'on ignorait si ce
> qu'elle enregistrait était juste. Elle l'était : 834 événements sur un an, un calendrier
> d'activité à la GitHub, et un journal paginé par vingt.
>
> **Deux visibilités, et elles ne viennent pas du même endroit** — c'est ce que cet écran a appris.
> `Entry.private` dépend du **profil regardé** : son propriétaire voit ses entrées privées, personne
> d'autre, et elles disparaissent alors de *tout*, compteurs compris — un total qui ne colle pas à
> la somme des parts trahirait leur existence. `includeAdult` dépend du **compte qui regarde** :
> c'est une préférence d'affichage, pas une propriété de la bibliothèque visitée. La base ne
> contenant qu'un compte et aucune entrée privée, les deux règles ont été **mesurées** plutôt que
> constatées à l'œil (JOURNAL.md).
>
> **`/calendar` a fait tomber une limite produit qui n'existait pas.** PRODUCT.md §9 interdisait le
> planning global sur un calcul faux — cinq mille diffusions par semaine, cent requêtes — tiré du
> `pageInfo.total` plafonné d'AniList, ce même plafond que le dépôt documentait déjà sous
> `ANILIST_TOTAL_CAP`. **La semaine en compte 124**, soit trois requêtes. L'écran propose donc les
> deux portées, et §9 est corrigé.
>
> **C'est aussi le premier écran dont la forme a été choisie sur pièces.** Douze plannings de
> diffusion en service ont été relevés avant d'écrire une ligne, les cinq références francophones
> comprises : **douze rendent une liste verticale groupée par jour, aucun une grille de sept
> colonnes** (docs/JOURNAL.md). Et le relevé a désigné ce que l'écran a de plus qu'eux — Icotaku,
> Nautiljon, Myutaku et Crunchyroll disent ce qui sort, pas où l'on en est. **Le retard épisode par
> épisode est donc la seule chose de cet écran qu'on ne pouvait pas aller copier ailleurs**, et il
> s'écrit en toutes lettres plutôt qu'en « +11 ».
>
> **C'était le premier gain de la refonte, et il est encaissé** : `/search` et `/library` étaient le
> même écran écrit deux fois, et ce doublon est ce qui a motivé toute l'opération. Ils partagent
> désormais quatre pièces — la carte, la grille, la coquille de filtres et la pagination — et ne
> diffèrent plus que par leur source : AniList et son quota d'un côté, mes lignes `Entry` de
> l'autre.
>
> **Et le suivi s'enregistre.** `saveEntry` et `removeEntry` sont les **premières Server Actions du
> dépôt** — il n'en existait aucune depuis la mise à blanc. Les trois écrans écrivent : la fiche au
> geste, la fenêtre d'édition rapide d'une vignette au bouton. `EntryEvent` se remplit donc à partir
> d'aujourd'hui, et comme il n'est pas rétroactif, c'est une date qui compte.
>
> **Les listes aussi, et elles se réordonnent.** `/lists` porte la grille de cartes et sa mosaïque de
> quatre jaquettes ; `/lists/[id]` réemploie la coquille du catalogue et ajoute un **mode
> réorganisation** au glisser comme au clavier. Quatre actions de plus — `createList`, `updateList`,
> `deleteList`, `reorderListItem` —, et `@dnd-kit` comme `rankAfterMove` sont enfin sortis du gel.
> La suppression d'une liste demande de **recopier son nom** : c'est le seul geste du produit qu'on
> ne peut pas défaire.
>
> **Et les listes se remplissent depuis la fiche.** « Ajouter à une liste » ouvre une liste de
> **bascules** : cochée veut dire que l'œuvre est dedans, décocher l'en retire. C'était la condition
> pour livrer ce chemin — sans elle, aucun écran n'aurait permis de défaire un ajout.
>
> **Et une liste se partage.** `/l/[token]` répond **sans session** : le jeton de 144 bits est la
> garde, et c'est la seule page du produit dans ce cas. Révoquer met la colonne à `null`, donc le
> lien meurt sans purge de cache. Le partage a aussi son image d'aperçu.
>
> Ce qui **n'écrit toujours pas** : les tomes possédés — leur écran n'existe pas. (Le favori écrit
> depuis le 30 septembre, dans sa propre table.)
>
> **Et les réglages se règlent.** `/settings` porte deux sections : un bloc « Compte » en lecture
> seule — tout y vient de GitHub, et le `username` est verrouillé après l'inscription — et les deux
> seules préférences qui existent, la langue des titres et le contenu adulte. `updatePreferences`
> est la **septième Server Action du dépôt**, et la première hors de `tracking` et `lists` ; c'est
> aussi la première ligne écrite dans `UserPreferences`, une table que le schéma portait depuis la
> migration initiale sans qu'aucun écran l'alimente. Chaque contrôle enregistre seul, sans bouton :
> deux réglages indépendants ne forment pas un formulaire. La revalidation est un
> `revalidatePath(routes.home, "layout")` — `titleLanguage` décide du nom d'une œuvre *partout*, et
> une liste de routes à tenir à jour est une liste qu'on oublie de compléter au prochain écran.
>
> **Ce qui n'y est pas, et pour cause** : l'échelle de notation (cinq étoiles pour tout le monde,
> §4.2) et la langue de l'interface (français uniquement, §7) — deux sélecteurs à un seul choix ne
> seraient pas des choix. Le thème et la déconnexion non plus : l'en-tête et le menu du compte les
> portent déjà.
>
> **Et depuis le 7 septembre, le site se navigue au téléphone — et AniList répond de nouveau.** Une
> séance d'audit au navigateur a trouvé que `MainNav` était en `hidden md:flex` sans remplaçant :
> sous 768 px, aucun des six écrans livrés n'était atteignable. Elle a dessiné les **états vides** de
> `/search` et `/library`, qui rendaient une page blanche. Et surtout elle a trouvé que le 403 « API
> temporarily disabled » qui forçait tout le produit sur le miroir depuis des jours venait d'un
> **en-tête `Referer` manquant** dans nos propres requêtes : l'API n'avait jamais été coupée. Le
> détail est plus bas.
>
> **Et le miroir se rafraîchit de nouveau.** Le cron supprimé le 5 septembre est revenu le 7 : une
> passe par jour à 4 h UTC, par lots de cinquante, plafonnée à vingt requêtes. C'est le premier des
> deux route handlers supprimés à revenir, et il a coûté trois fichiers — tout le raisonnement avait
> survécu au gel. Sans lui, une série en cours de diffusion gardait pour toujours le nombre
> d'épisodes qu'elle avait à sa dernière écriture.
>
> **Ne pas lire ce fichier comme un constat de panne.** Rien n'est cassé : c'est un chantier, et
> l'ordre de reconstruction est au bas de la page.

---

## La carte

Chaque route et où elle en est. La clé entre parenthèses est celle de
[`src/config/routes.ts`](../src/config/routes.ts) — aucun chemin ne s'écrit en dur.

| Route | Rôle | Modèles | État |
| --- | --- | --- | --- |
| `/` (`home`) | Carrousel de tendances, suivi, découverte | `Entry`, `Media` | **livré** (14 septembre) — carrousel centré, diapositive à la largeur du contenu et voisines jusqu'aux bords (2 octobre), « En cours » mené par les épisodes sortis, tendances, saison, puis « Recommandé pour vous » (28 septembre). « À reprendre » et « Mes listes » retirées le 17 septembre |
| `/search` (`search`) | Recherche du catalogue, filtres en URL | `Media`, `Entry` | **livré** — barre, panneau, grille AniList, pagination, repli sur le miroir |
| `/media/[id]` (`media`) | Fiche d'une œuvre, suivi, journal, ajout aux listes | `Media`, `Entry`, `EntryEvent`, `ListItem` | **hero, suivi et cinq onglets livrés**, chacun avec sa propre lecture AniList — restent le journal et les chiffres de la communauté |
| `/character/[id]` (`character`) | Un personnage : faits, biographie, apparitions | AniList seul | **livré** (26 septembre, profil repris le 29) — bande floutée, portrait, autres noms en pastilles, faits en tuiles (dont la fiche technique sortie de la biographie), biographie à largeur de lecture, grille paginée avec rôle et doubleur |
| `/staff/[id]` (`staff`) | Un membre du staff : doublage, rôles d'équipe | AniList seul | **livré** (26 septembre, profil repris le 29) — même profil que `/character`, onglets Doublage / Anime / Manga, rôles groupés par année avec leur compte |
| `/library` (`library`) | Ma bibliothèque, filtrée par statut et type | `Entry`, `Media` | **livré** — rangée de statuts, barre, grille Prisma, pagination |
| `/lists` (`lists.root`) | Mes listes | `List`, `ListItem` | **livré** — grille de cartes, mosaïque, création, état vide |
| `/lists/[id]` (`lists.detail`) | Une liste, réordonnable | `List`, `ListItem`, `Media` | **livré** — grille du catalogue, mode réorganisation, renommage, suppression |
| `/lists/[id]/[viewId]` (`lists.view`) | Une vue posée sur une liste | `ListView`, `ListViewItem` | **déclaré, non construit** — reporté (PRODUCT.md §6) |
| `/l/[token]` (`share.detail`) | Une liste partagée, **hors app authentifiée** | `List`, `ListItem` | **livré** — lecture seule, sans session, image d'aperçu |
| `/u/[username]` (`profile`) | Profil d'un membre : favoris, statistiques, journal | `User`, `Entry`, `EntryEvent`, `Favorite` | **livré** (12 septembre, refait le 30) — en-tête à bande floutée (jaquette du dernier favori), deux colonnes dès `lg` : à gauche favoris (dix par rangée, le reste replié), répartition, notes, genres ; à droite calendrier d'activité et journal sur deux colonnes, allongé par « Voir plus ». Calendrier et notes en gris |
| `/calendar` (`calendar`) | Planning de diffusion, tout ou filtré sur ce qu'on suit | `Media`, `Entry` | **livré** — grille 7 colonnes, navigation de semaine, portée réglable, retard par épisode |
| `/settings` (`settings`) | Préférences d'affichage | `UserPreferences` | **livré** — bloc compte en lecture seule, langue des titres et contenu adulte, chaque contrôle enregistrant seul |
| `/collection` (`collection.root`) | Mon étagère : séries possédées, tomes manquants | `Edition`, `OwnedVolume` | **livré** (19 septembre) — rangées avec réglette, trois états, chiffres d'étagère |
| `/collection/[mediaId]` (`collection.detail`) | Une série : tomes possédés, saisie par plage | `Edition`, `OwnedVolume` | **livré** (19 septembre) — grille qu'on peint, case « + » pour le tome qui vient de paraître, nombre de tomes réglable |
| `/login` · `/signup` · `/waitlist` (`auth.*`) | Connexion GitHub, liste d'attente | `User`, `Session`, `Account` | **livré** — seul écran réel |

La colonne « Features consommées » avait disparu de ce tableau quand plus aucune route ne consommait
de feature. Elle n'était pas revenue tant que les routes livrées lisaient toutes le même trio —
`media`, `preferences` et `tracking` —, une colonne qui répète trois fois la même liste
n'apprenant rien. **`/settings` est la première à ne pas lire ça** : elle ne connaît que
`preferences`, et rien du catalogue. La condition posée ici est donc remplie, et la colonne
reviendra à la prochaine passe qui touche ce tableau — la remettre aujourd'hui demanderait de
relire les onze lignes pour une seule qui change.

`Edition` et `OwnedVolume` **ont trouvé leurs écrans le 19 septembre 2026**, quatre mois après
avoir été posées au schéma : le pari de PRODUCT.md §6 — « ajouter deux tables plus tard ne coûte
rien, mais découvrir tardivement que la collection ne rentre pas dans le modèle du suivi en
coûterait beaucoup » — s'est vérifié sans qu'une seule colonne ait à bouger.

Quatre colonnes d'`OwnedVolume` restent pourtant sans écran, et **par décision** : `price`,
`acquiredAt`, `condition` et `notes` ont été retirés du produit le 19 septembre (voir « Ce que la
collection ne fait pas »). `lentTo` / `lentAt` aussi. Elles restent au schéma parce que les
retirer coûterait une migration pour rien.

`ListView` et `ListViewItem`, elles, ne sont toujours employées par aucun écran. C'est voulu —
PRODUCT.md §6 dit pourquoi.

### La mise à blanc du 5 septembre 2026

Trois passes le même jour, de plus en plus larges.

**La première** a vidé cinq arbres de routes — l'accueil, `/search`, `/library`, `/calendar`,
`/lists` et `/lists/[id]` : 38 fichiers d'UI, plus 7 modules orphelins par ricochet
(`media-carousel`, `view-toggle`, `list-card`, `media-row`, `use-search-filters`,
`use-library-filters`, `entry-card-actions`). Le diagnostic est celui de la spec du 2 septembre :
les écrans avaient été construits par ajout, et `/search` et `/library` étaient le même écran écrit
deux fois.

**La deuxième** a emporté trois composants de `features/tracking/` que la première laissait sans
importateur : `entry-dialog`, `entry-form`, `entry-quick-progress` — 647 lignes de rendu.

**La troisième** a étendu la mise à blanc aux quatre routes qui tenaient encore (`/media/[id]`,
`/u/[username]`, `/settings`, `/l/[token]`) et à tout ce qu'elles faisaient vivre : les composants,
les queries et les actions de `features/`, `components/shared/media-grid` et `pagination`, la palette
`⌘K` avec son route handler `api/command`, et le rafraîchissement du miroir avec `api/cron`.

#### Ce qui a été gardé, et pourquoi

Le choix n'est pas « ce qui restait » mais « ce qui coûte cher à réécrire et ne dépend d'aucun
écran ». Quatre familles :

1. **Les `page.tsx` des dix routes**, réduits à un placeholder
   ([`components/shared/route-under-construction.tsx`](../src/components/shared/route-under-construction.tsx)),
   jamais effacés. `routes.home` est la cible de redirection après connexion, le `callbackURL`
   GitHub, la sortie de la liste d'attente et le repli de `proxy.ts` ; `config/navigation.ts` pointe
   vers les autres. Effacer les fichiers aurait fait atterrir toute connexion sur un 404.
2. **Les helpers purs et leurs tests** — 10 fichiers, **133 des 192 tests**. Transitions de statut,
   brouillon d'entrée, formatage, saison, fraîcheur du miroir, `fractional-indexing`, jeton de
   partage. Aucun ne dépend d'un écran.
3. **Les schémas Zod**, qui tiennent lieu de `src/types/` (ARCHITECTURE.md) : c'est la forme du
   domaine, et elle ne change pas parce que l'apparence change.
4. **Trois acquis coûteux** : [`media.documents.ts`](../src/features/media/server/media.documents.ts)
   et ses 488 lignes de GraphQL AniList (sélection de champs, budget de requêtes),
   [`lib/safe-action.ts`](../src/lib/safe-action.ts) qui porte `actionClient` et `authActionClient`,
   et les contrats d'URL (`calendar-params`, `profile-params`, `search-params`) — la forme des liens
   qu'on peut envoyer est une décision produit, pas un rendu.

Tout le reste — le rendu — a été **supprimé plutôt que gelé**. Geler du code qu'on sait devoir jeter,
c'est se promettre de le relire une fois de trop.

#### Ce que ça a coûté, sans arrondi

- ~~**`api/cron/refresh-media` et `vercel.json` sont supprimés.**~~ **Remis le 7 septembre 2026**,
  deux jours plus tard : le miroir `Media` est de nouveau rafraîchi une fois par jour, et
  `CRON_SECRET` a retrouvé son unique lecteur. C'est le premier des deux handlers supprimés à
  revenir ; `api/command` ne reviendra pas de sitôt.
- **`api/command` est supprimé** avec la palette `⌘K` qu'il servait. ~~Son schéma survit : il porte
  la règle du « +1 ».~~ **Le 12 septembre 2026, `features/command/` a été supprimée en entier,
  schéma compris** : la palette avait été reconstruite dans la journée, puis retirée sur décision
  d'Alexis avant d'être commitée. La règle du « +1 » n'est pas perdue pour autant — elle n'était
  plus orpheline depuis `/library` : `entry-progress-stepper.tsx` porte la même borne sous la forme
  `ceiling !== null && current >= ceiling`.
- **Le canari de `architecture.test.ts` est en `.skip`.** Voir les écarts connus — c'est le point le
  plus important de cette page.

### La fiche du 6 septembre 2026 — ce qu'elle a, et ce qu'elle n'a pas

**Séance de reconstruction, hors de l'ordre annoncé plus bas** : `/media/[id]` a été prise avant
`/search`, à la demande d'Alexis. La mise en page du hero est dictée par lui, écran par écran ; la
logique est écrite sans consigne préalable.

Ce qui est **à l'écran** : bannière pleine largeur avec son cas nul, jaquette calée par le bas sur la
même ligne que la barre de suivi, titre et titres secondaires, cinq faits (format, statut, compteur,
saison, studio **ou** auteur selon le type), la barre de suivi, un séparateur, le synopsis.

Ce qui est **écrit côté serveur** : [`preferences.queries.ts`](../src/features/preferences/server/preferences.queries.ts)
(`getPreferences`, dédupliqué par `cache` de React, jamais `"use cache"` — il dépend du visiteur),
[`media.queries.ts`](../src/features/media/server/media.queries.ts) (`getMediaById`, dont **seule la
lecture brute est cachée**, clé sur l'id seul : mettre `includeAdult` dans la clé aurait doublé les
requêtes AniList pour un document identique) et [`media.mirror.ts`](../src/features/media/server/media.mirror.ts)
(le repli sur la copie locale).

**La barre de suivi n'enregistre rien.** Ses trois contrôles —
[`entry-status-select`](../src/features/tracking/components/entry-status-select.tsx),
[`entry-progress-stepper`](../src/features/tracking/components/entry-progress-stepper.tsx),
[`entry-score-rating`](../src/features/tracking/components/entry-score-rating.tsx) — vivent dans
`features/tracking/components/` parce qu'ils connaissent des entités métier et serviront à d'autres
écrans. Ils sont **promus avant leur deuxième appelant**, ce que la règle de promotion
d'ARCHITECTURE.md interdit d'ordinaire : décision d'Alexis, prise en sachant que `/search` et
`/library` les demanderont. Le bouton ± lui-même ne connaît rien du métier et vit donc dans
[`components/shared/step-button.tsx`](../src/components/shared/step-button.tsx).

**Le repli de panne a été posé plus tôt que prévu, et pour une bonne raison** : AniList était coupée
le jour de la séance (403, « temporarily disabled »). Sans lui, la fiche était une page d'erreur et
rien n'était vérifiable à l'écran. Il n'est donc pas théorique — il a été vu fonctionner.

Ce qui **manque** est inventorié case par case dans [fiche-media.md](./fiche-media.md) : 72 lignes,
15 cochées. Le gros restant, dans l'ordre où ça se posera : les Server Actions du suivi, le journal,
les onglets lourds (personnages, équipe, œuvres liées, recommandations), les chiffres de la
communauté, et l'ajout à une liste.

`button-group` a été installé au passage (le registre shadcn), ce qui portait alors l'inventaire à 31
composants — **35 depuis le 7 septembre**, avec `sheet`. Son installation a laissé deux dégâts, tous
deux corrigés : un import `from "cn"` que le CLI n'a pas réécrit, et un **paquet npm parasite nommé
`cn`** que `knip` a attrapé.

⚠️ **Le paquet `cn` est revenu le 7 septembre, par le même CLI**, à l'ajout de `sheet` — et cette
fois avant même qu'un fichier soit écrit, la commande s'étant arrêtée sur une invite « écraser
`button.tsx` ? » que `--yes` ne couvre pas. `sheet.tsx` a donc été **écrit à la main** sur
`radix-ui`, déjà présent. Relire `git diff package.json` après chaque `shadcn add`.

### Le catalogue du 6 septembre 2026 — `/search` et `/library`, ensemble

**La séance reprend l'ordre annoncé au bas de cette page**, après le détour par la fiche. Les deux
écrans ont été dessinés dans la même passe et sur une coquille commune, parce que c'est exactement
le doublon qu'on refusait de refaire.

Ce qui est **à l'écran**, sur `/search` : la barre — terme borné, type, tri —, le panneau dépliant
en trois colonnes (format en cases à cocher, statut, pays d'origine, genres, saison, plage d'années,
note minimale), la rangée de puces actives avec sa croix par facette et son « Tout effacer », puis
la grille de vingt et une cartes et sa pagination.

Sur `/library` : la **rangée de statuts** en tête — six statuts plus « Tout », chacun avec son
compte —, puis une barre plus courte (terme, type, tri), la grille et sa pagination. L'ordre
n'est pas cosmétique : un catalogue se parcourt par ce qu'on cherche, une bibliothèque par où on en
est, donc le statut est l'axe de l'écran et non une facette rangée dans un panneau.

Ce qui est **écrit côté serveur** :

- [`media.queries.ts`](../src/features/media/server/media.queries.ts) gagne `searchMedia`, et
  [`media.documents.ts`](../src/features/media/server/media.documents.ts) les trois arguments qui
  lui manquaient — `startDate_greater` / `_lesser` pour la plage d'années (et **pas** `seasonYear`,
  que la doc d'AniList donne pour dépendant de `season`), et `averageScore_greater` pour la note.
- [`media.mirror.ts`](../src/features/media/server/media.mirror.ts) : `searchMediaInMirror` remplace
  l'échantillon qui tenait lieu de grille. C'est un vrai repli, paginé en base, **et il rapporte ce
  qu'il a perdu** — les tags, qu'on ne stocke pas, et les tris par tendance, popularité ou favoris,
  que le miroir ne copie pas.
- [`library.queries.ts`](../src/features/tracking/server/library.queries.ts) : `getLibrary`,
  `getLibraryStatusCounts`. Aucun cache, ni `"use cache"` ni `cache` de React, et le fichier dit
  pourquoi pour chacun des deux. (`getLibraryGenres` a été retirée le 6 septembre 2026 avec le
  filtre de genre de la bibliothèque — décision d'Alexis : on ne cherche pas par genre dans
  quelques centaines de lignes qu'on a soi-même choisies.)

**La trouvaille de la séance : `pageInfo.total` d'AniList est plafonné à 5000.** Vérifié en
interrogeant l'endpoint — `type: ANIME` seul, puis avec la saison, puis avec la plage d'années, puis
avec la note : les quatre répondent exactement `5000`. Ce n'est pas un compte, c'est une butée, et
`lastPage` en hérite. La pagination annonçait **238 pages dont 226 vides**. Elle ne croit plus ce
compteur : sous le plafond `lastPage` est exact et s'affiche, au plafond on ne suit que
`hasNextPage`. Les filtres, eux, s'appliquaient bien — c'est le compteur seul qui mentait.

**Quatre pièces sont promues au deuxième appelant**, comme la règle le veut : `MediaCard` →
`features/media/components/`, la grille et la coquille de filtres → `components/shared/`, et la
pagination → `components/shared/` à son tour. Le **panneau de facettes n'est pas promu** :
`/library` n'en a pas, donc `FacetColumn`, `ChipGroup`, `RangeSlider` et `CheckboxList` n'auraient
toujours qu'un consommateur.

**Six couleurs de statut, et c'est un écart assumé à la spec** (décision d'Alexis). La spec du
2 septembre autorise l'accent sur « le marqueur de suivi sur une jaquette » ; on passe d'une couleur
qui dit « suivi » à six qui disent lequel. Trois garde-fous, écrits à côté des tokens dans
`styles/globals.css` : chroma bas (0,10–0,14 contre 0,20+ pour l'accent), aucune teinte proche de
l'iris, et **jamais autrement qu'en pastille** — pas de fond, pas de bordure. Un troisième jeu de
valeurs, `.on-inverted-surface`, existe parce qu'une teinte choisie pour Obsidienne se délave sur
l'onglet actif de la rangée de statuts, qui s'inverse : mesuré à l'écran sur « En pause ».

Ce qui **manquait** : les **états vides**, dessinés depuis le 7 septembre 2026 (voir l'audit plus
bas). Ce qui **manque encore** : le tri par titre, qui suit le romaji sur les deux écrans et non
`titleLanguage`. L'inventaire complet est dans [recherche-filtres.md](./recherche-filtres.md) :
66 lignes, **21 cochées**.

### L'écriture du 6 septembre 2026 — la première Server Action du dépôt

**C'est l'écart le plus visible du chantier qui se referme.** Depuis la mise à blanc, rien
n'enregistrait : les contrôles répondaient au clic et leur état disparaissait au rechargement.

Deux actions dans
[`tracking.actions.ts`](../src/features/tracking/server/tracking.actions.ts), et **elles sont
courtes parce que tout ce qu'elles font avait été écrit et testé avant elles** : `saveEntrySchema`
valide, `applyEntryChanges` décide de l'état suivant et du journal, `authActionClient` garantit la
session. L'action ne tranche rien elle-même.

| Ce qui écrit | Où | Comment |
| --- | --- | --- |
| `saveEntry` | la barre de la fiche | **au geste** — un contrôle bouge, ce champ-là part |
| `saveEntry` | la fenêtre d'une vignette (`/library`, `/search`) | **au bouton** — on corrige trois choses, on valide |
| `removeEntry` | la fenêtre d'édition du suivi (fiche **et** vignettes) | **sous confirmation** — de retour le 13 septembre 2026, après une semaine sans appelant |

**La barre de la fiche a deux états**, décision d'Alexis du même jour : tant que l'œuvre n'est pas
suivie, elle ne montre qu'un bouton **« Ajouter à ma bibliothèque »**. Un statut « Prévu », un
compteur à zéro et cinq étoiles vides ne décrivent rien — ils décrivent une entrée qui n'existe pas,
et donnent à croire qu'on peut noter une œuvre qu'on ne suit pas. C'est aussi ce qui coche « l'œuvre
pas encore suivie, distinguée de l'œuvre suivie à zéro » de fiche-media.md §2.7.

**Le menu à trois points a été supprimé le même jour, et la fenêtre d'édition a pris sa place.** Il
portait deux raccourcis vers ce que les contrôles font déjà, et le retrait ; « Modifier les dates »
y était désactivé. La fenêtre tient cette promesse-là pour de bon — dates, relectures, notes
personnelles —, et c'est **exactement la même que celle des vignettes**, son bouton compris.

Ce bouton a hésité : posé à 28 px pour une vignette, il a été ramené à la taille normale d'un bouton
d'icône, la même partout. Une propriété `trigger` avait été ajoutée entre-temps pour que la fiche
puisse en fournir un plus grand ; elle a été **retirée aussitôt** — un point d'extension qui
n'existait que pour rattraper un écart n'a plus lieu d'être quand l'écart disparaît.

Elle n'apparaît **que sur une œuvre suivie**. À côté du bouton d'ajout, elle offrirait un second
chemin pour le même geste, ce qui défait ce que l'état « non suivie » cherche : une seule chose à
faire.

`removeEntry` perd donc son dernier appelant et retourne au gel de `knip.jsonc`, nommément, plutôt
que d'être supprimée. **Plus rien dans l'interface ne retire une œuvre** — c'est un manque assumé,
le temps de redessiner l'endroit où ce geste doit vivre.

L'écart entre les deux façons d'enregistrer n'est pas une inconséquence : il était **décrit dans
`entry-draft.ts` avant d'exister**. Sur une fiche on vient poser *un* geste, et un bouton
« Enregistrer » ajouterait une confirmation à une décision déjà prise ; dans une fenêtre on vient
corriger plusieurs champs, et une écriture par frappe y serait une écriture par hésitation. Les deux
partagent l'invariant qui compte : **on n'envoie jamais l'état complet, seulement ce qui a bougé**
(PRODUCT.md §4.2).

Trois points qui ne se voient pas à l'écran :

- **L'entrée et son journal partent dans la même transaction.** `EntryEvent` est *append-only* et
  non rétroactif : une entrée mise à jour dont l'événement manquerait serait un trou qu'aucune
  reprise ne comble.
- **`ensureMediaMirror` est reposé**, et il était obligatoire, pas optimiste : `Entry.mediaId` porte
  une clé étrangère vers `Media`, donc suivre depuis `/search` une œuvre que personne n'a jamais
  croisée échouait au niveau de la base. C'est le garde-fou de PRODUCT.md §4.1, supprimé par la mise
  à blanc — il ne réécrit rien quand la ligne existe et n'est pas périmée.
- **Le plafond de progression est relu du miroir, jamais reçu du client.** Le total passé au pas de
  progression n'est qu'un confort d'affichage.

**Vérifié à l'écran, pas déduit** : ajout depuis `/search` d'une œuvre absente du miroir, statut et
progression enregistrés, pastille apparue sur le catalogue, valeurs retrouvées sur la fiche après
rechargement complet, déduction « dernier chapitre → Terminé » appliquée par le serveur, puis retrait
sous confirmation et retour exact à l'état de départ. Les données d'essai ont été retirées.

### Le cron du 7 septembre 2026 — le miroir se rafraîchit de nouveau

**Séance courte, et presque entièrement de la relecture** : tout le raisonnement avait été fait
avant la mise à blanc, et il avait survécu. `media-freshness.ts` et ses 12 tests, `MEDIA_MIRROR_QUERY`
et son `id_in`, l'index `@@index([status, syncedAt])`, `CRON_SECRET` — les quatre pièces attendaient
au gel. Il manquait le corps de la passe et sa porte.

Ce qui a été écrit : `refreshStaleMirror` dans `media.mirror.ts`, le handler
`api/cron/refresh-media`, et `vercel.json`. Trois fichiers, dont un de neuf lignes de JSON.

Quatre décisions portent la correction de la passe, et elles sont écrites là où elles s'appliquent :

- **La péremption est demandée à PostgreSQL.** `mirrorStaleCutoffs` rendait déjà des *bornes* et non
  un prédicat, précisément pour ça : deux `syncedAt < …` servis par l'index, au lieu d'une table
  chargée puis filtrée en mémoire.
- **Le statut nul a sa propre branche `OR`.** En SQL, `status IN (…)` **et** `status NOT IN (…)` sont
  tous deux faux quand la colonne vaut `NULL` : sans branche dédiée, une fiche sans statut
  n'aurait *jamais* été rafraîchie — alors que `mirrorTtlMs` la range du côté volatile pour qu'on
  découvre son vrai statut. C'est le piège de la séance, et il est silencieux.
- **Les plus anciennes d'abord.** Le plafond de 20 lots laisse forcément du reste sur un gros
  miroir ; l'ordre garantit que ce reste passe en tête à la passe suivante.
- **Une œuvre qu'AniList ne renvoie plus garde sa copie, et son `syncedAt` avance quand même.** La
  garder est la durabilité de §4.1 — la supprimer ferait tomber en cascade les `Entry`, `ListItem`
  et `OwnedVolume` qui y pointent. Avancer l'horodatage est l'autre moitié, moins évidente : sans
  ça, la ligne remonte en tête du tri à *chaque* passe et occupe indéfiniment une place de lot.

**Deux plafonds, et ils ne protègent qu'une chose** : le quota AniList de 30 requêtes/minute,
partagé avec les visiteurs. 50 fiches par requête, 20 requêtes par passe — au pire vingt crédits.

**La cadence est `0 4 * * *`**, une passe par jour, parce que le plan Vercel est **Hobby**. Le seuil
volatile de 12 h reste délibérément **plus court** que cette cadence : il garantit qu'une ligne en
cours de diffusion est *toujours* périmée quand la passe arrive. L'aligner sur 24 h ferait qu'une
ligne rafraîchie à 4 h 02 attendrait le surlendemain.

**Vérifié en appelant la route, pas en la lisant** : sans en-tête → 401 ; jeton faux → 401 ; jeton
valide → 200 et `{"stale":94,"refreshed":94,"vanished":0,"batches":2}`. Les 94 lignes du miroir de
développement ont donc été reprises en **deux** requêtes AniList (50 + 44). Un second appel
immédiat rend `{"stale":0,…}` et ne dépense **rien** : la passe est idempotente, et `syncedAt` a bien
avancé.

**Ce qui est couvert par des tests** : la garde du handler (6 tests — en-tête absent, jeton faux,
jeton *de la bonne longueur* mais faux, absence de préfixe `Bearer`, jeton valide, et le refus qui
ne révèle rien) et la sélection des lots (14 tests, sur doubles de Prisma et d'AniList). Les trois
plus importants ont été **vus échouer** sur une mutation volontaire du code.

**Ce qui ne l'est pas** : la passe de bout en bout contre une vraie base. Elle a été appelée une
fois, à la main, et ce fichier est le seul endroit où ça reste écrit.

### Les quatre route handlers

Aucun ne vit sous le layout `(app)`, et le `matcher` du proxy exclut `api/` **en entier** : chacun
porte donc sa propre garde, et c'est la seule qu'il ait.

| Handler | Rôle | Sa garde |
| --- | --- | --- |
| `api/auth/[...all]` | Better Auth | celle de Better Auth |
| `api/cron/refresh-media` | Rafraîchit le miroir `Media` (§4.1) | `Authorization: Bearer $CRON_SECRET`, comparé **en temps constant** (`lib/security/cron-auth.ts`) |
| `api/og/episode/[mediaId]/[episode]` | La carte 1200×630 d'un épisode sorti, affichée en grand dans le message Discord | **aucune session** (Discord la demande) — une signature HMAC dans l'URL, sinon 404 ; ne lit que le miroir, jamais AniList |
| `api/cron/discord` | Poste dans Discord les épisodes sortis, pour chaque compte branché — appelé toutes les heures par GitHub Actions | idem `refresh-media` |
| `api/search` | La recherche de la palette de l'en-tête, à la frappe | session **approuvée**, sinon 401 — jamais de redirection, un `fetch` attend du JSON |
| `api/notifications` | Les épisodes sortis que je n'ai pas vus, pour la cloche de l'en-tête | idem `api/search` — approuvée, sinon 401 |

`api/search` est arrivé le 13 septembre 2026 avec la palette, **à la place d'`api/command`**,
réécrit puis retiré le 12. Sa raison d'être est restée la même : une recherche à la frappe **ne
passe pas par une Server Action**, parce qu'une action est un POST que Next sérialise — la réponse à
« fri » arriverait après celle à « frieren ». Un `GET` s'annule (`AbortController`) et rend son
quota. Il n'ajoute **aucune lecture AniList** : c'est `searchMedia`, cachée une heure, avec le repli
sur le miroir de `/search`.

`api/notifications` est arrivé le 14 septembre 2026 avec la cloche. **Il n'a pas d'entrée** : sa
question est portée en entier par la session et par l'heure, donc rien à valider. Le menu l'appelle
**une fois, au montage** — l'en-tête est monté par le layout `(app)` et ne se remonte pas aux
navigations client, si bien que c'est un appel par chargement complet et non par page. Il n'ajoute
**aucune lecture AniList** : `airingLags` interroge une fenêtre arrondie à l'heure, donc la cloche
tombe dans l'entrée de `"use cache"` que l'accueil vient de poser.

### Et trois conventions de fichier

| Fichier | Rôle |
| --- | --- |
| `app/robots.ts` | `disallow: "/"` **total**. `/l/<jeton>` s'ouvre sans session : un lien secret indexé n'est plus un secret, il est cherchable. Le placeholder de `/l/[token]` porte en plus son propre `noindex`. |
| `app/icon.tsx` | L'icône d'onglet, dessinée par `ImageResponse` — aucun binaire à relire dans `public/`. Depuis le 6 septembre 2026 elle rend le monogramme et non plus une lettre : le tracé vient de `components/layout/logo.tsx`, seule géométrie du dépôt, partagée avec les trois en-têtes. |
| `instrumentation.ts` | `onRequestError` : relie le `digest` qu'`error.tsx` affiche au visiteur à une ligne de journal cherchable. |

---

## Ce qui reste dans `features/`

**38 fichiers, dont 10 de tests.** La couche `server/` a ses deux moitiés pour la première fois
depuis la mise à blanc : six fichiers, **dix lectures, deux actions**, plus `ensureMediaMirror` —
qui n'est ni l'une ni l'autre, mais le garde-fou que toute écriture pointant vers `Media` traverse.

**`media` en a un aussi depuis le 6 septembre**, et il y est arrivé par la règle plutôt que par
anticipation : `MediaCard` a démarré dans le `_components/` de `/search` et a été promue le jour où
`/library` l'a demandée. C'est la première promotion du dépôt faite *au deuxième appelant*, comme
ARCHITECTURE.md le veut — les trois contrôles de suivi, eux, avaient été promus d'avance et en
connaissance de cause.

`tracking` a gagné son premier `server/` le même jour (`library.queries.ts`), et une quatrième
composante : `entry-status-dot`, la pastille de statut, posée dans le slot `marker` de la carte.

| Feature | Ce qu'elle contient |
| --- | --- |
| **`media`** | `lib/` : `media-format`, `media-freshness`, `media-season`, `search-params` (tous testés). `schemas/` : `media.schema`, `search-media.schema`. `server/` : `media.documents` (les documents GraphQL), `media.queries` (`getMediaById` et `searchMedia`, cachées un jour), `media.mirror` (le repli de panne fiche **et** recherche, `ensureMediaMirror`, et
**`refreshStaleMirror` — le corps du cron** depuis le 7 septembre). `components/` : `media-card`, promue de `/search` quand `/library` l'a demandée. |
| **`tracking`** | `lib/` : `entry-draft`, `entry-format`, `entry-transition` (testés), `library-params`. `schemas/tracking.schema`. `server/` : `library.queries` — cinq lectures sans aucun cache, parce que tout y dépend du visiteur — et **`tracking.actions`, les deux premières Server Actions du dépôt**. `components/` : `entry-status-select`, `entry-progress-stepper`, `entry-score-rating`, `entry-status-dot`, et `entry-quick-edit` — la fenêtre d'édition rapide, promue de `/library` quand `/search` l'a demandée. |
| **`people`** | *créée le 26 septembre 2026* avec `/character/[id]` et `/staff/[id]`. `schemas/people.schema`. `lib/` : `people-bio` (le markdown AniList en segments, liens réécrits), `people-format` (faits, groupement par année, fusion des rôles), `people-params` (le contrat d'URL) — testés tous les trois. `server/` : `people.documents` et `people.queries` (`getCharacter`, `getStaff`, cachées un jour). `components/` : en-tête, faits, biographie, la feuille cliente des spoilers, la grille d'œuvres, le squelette, et `person-hover-card` — le survol des cartes Personnages et Équipe de la fiche (29 septembre), nourri par les champs ajoutés aux fragments `CharacterEdgeFields` / `StaffEdgeFields`, sans requête de plus. |
| **`preferences`** | `schemas/preferences.schema` et `server/preferences.queries` — les préférences du compte courant, sans cache, parce qu'elles dépendent du visiteur. |
| **`lists`** | `lib/` : `list-reorder` (fractional-indexing), `share-token` — testés tous les deux. `schemas/lists.schema`. |
| **`command`** | *supprimée en entier le 12 septembre 2026* — son schéma était le dernier reste, et la règle du « +1 » qu'il gardait vit désormais dans `entry-progress-stepper`. Reconstruite puis retirée le même jour (§ la palette, plus bas). |
| **`profile`** | *recréée le 12 septembre 2026*, avec l'écran qui la consomme. `lib/` : `profile-activity` (le découpage d'une année en 365 cases, les cinq crans, la série de jours) et `profile-stats` (les notes 0–100 vers dix paliers d'étoiles, le top genres, les heures estimées) — testés tous les deux. `server/profile.queries` : quatre lectures, toutes en base, **aucune ne touche AniList**, aucune mise en cache — ce qu'on lit dépend du profil regardé, ce qu'on a le droit d'en lire dépend du compte qui regarde. |

`lib/http/anilist.ts` n'a pas bougé : c'est du transport, il vit dans `lib/` et non dans une feature.
Avec `media.documents.ts` et `media.queries.ts`, l'intégration AniList est de nouveau complète — le
transport, les documents, et le cache qui les relie.

### Et `components/shared/` reprend forme, par la même règle

Cinq fichiers. `route-under-construction` et `step-button` restaient de la mise à blanc ; les trois
autres sont arrivés le 6 septembre, tous promus au deuxième appelant :

| Fichier | Ce qu'il porte |
| --- | --- |
| `catalogue-grid` | Les paliers 3 et 7 autour de ses enfants, et le squelette aux mêmes proportions. Il ne regarde pas ce qu'il range. |
| `filter-bar` | La rangée, le champ borné, les sélecteurs à étiquette visible, le bouton dépliant et la ligne de puces actives. |
| `catalogue-pagination` | Les crans, en **liens** — chacun est une adresse qu'on peut envoyer. Elle reçoit `hrefFor` et ne sait rien du contrat d'URL qu'il applique. |

Ils sont dans `shared/` et non dans une feature parce qu'ils ne connaissent **aucune** entité : ce
sont leurs appelants qui posent le vocabulaire. `search-filter-bar` parle de formats et de saisons,
`library-filter-bar` de statuts de suivi, et les deux se ressemblent parce qu'ils composent les
mêmes pièces — pas parce que l'un a été recopié sur l'autre. C'est le doublon de la mise à blanc
qu'on refuse de refaire. La pagination pousse le principe le plus loin : chaque écran lui passe
`serializeSearchFilters` ou `serializeLibraryFilters`, donc l'aller-retour est garanti par les
modules mêmes qui reliront l'adresse.

**Le panneau de facettes, lui, n'a pas été promu** : `/library` filtre par un contrat plus court et
n'a pas de panneau du tout, donc `FacetColumn`, `ChipGroup`, `RangeSlider` et `CheckboxList`
n'auraient toujours qu'un seul consommateur. Ils restent dans `search/_components/`. Les promouvoir
« puisqu'on y était » aurait été exactement la faute que la règle interdit.

---

## Contrôle de santé

Relevé le **7 septembre 2026**, après la séance d'audit. **À rejouer et à redater dès qu'on
prétend s'y fier.**

| Commande | Résultat |
| --- | --- |
| `pnpm typecheck` | propre — `noUncheckedIndexedAccess` et `verbatimModuleSyntax` actifs |
| `pnpm test` | **232 passés, 1 en pause**, 19 fichiers. Les 20 nouveaux sont ceux du cron : 6 pour la garde du handler, 14 pour la sélection des lots. Les huit Server Actions ne sont toujours couvertes par aucun test |
| `pnpm lint` | 197 fichiers, aucune correction (193 avant le cron, 176 avant l'audit) |
| `pnpm build` | **deux** route handlers depuis le cron ; `/search`, `/library` et `/media/[id]` en rendu partiel |
| `pnpm knip` | aucun signalement — **toujours sous gel, mais le gel a maigri**, voir ci-dessous |

**Écarts connus :**

- **Le canari de la frontière server/client est toujours en pause, et son voisin ne garde toujours
  rien.** C'est l'écart le plus important de cette page. `architecture.test.ts` vérifie qu'aucun
  module `"use client"` n'importe un Server Component `async` — et, juste après, qu'il en trouve au
  moins un, pour que le premier test ne passe pas au vert en parcourant un ensemble vide.

  **La fiche du 6 septembre n'a pas suffi à le rallumer, contrairement à ce qui était annoncé ici.**
  Elle pose bien un composant serveur `async`, mais **interne à sa page**, et la détection ne regarde
  que les composants *exportés* — à juste titre, puisqu'un composant qu'on n'exporte pas ne peut être
  importé par personne. Le retirer maintenant ferait échouer le test.

  La formulation a donc été corrigée dans le fichier : **le premier module qui _exporte_ un Server
  Component `async` retire ce `.skip`.**

  **Le pronostic qui figurait ici s'est révélé faux, et il faut le dire.** On annonçait « très
  probablement le panneau de suivi » : il est arrivé le 6 septembre, et c'est un composant
  **client** — il porte de l'état de formulaire et appelle une action. `entry-quick-edit`,
  `entry-status-dot` et `media-card` non plus ne rallument rien : le premier est client, les deux
  autres sont serveurs mais **synchrones**. Le canari attend donc un composant de
  `features/*/components/` qui soit à la fois exporté, serveur et `async` — c'est-à-dire qui lise
  lui-même ses données. Le journal d'une œuvre et la rangée « en cours » de l'accueil en sont les
  candidats, et aucun n'existe. En attendant, le test voisin ne garde toujours rien.
- **`pnpm knip` est vert sous gel.** `knip.jsonc` porte un bloc `ignoreIssues` couvrant **5 chemins
  de fichiers et 8 chemins** d'exports ou de types, plus `ignoreDependencies` pour trois familles
  (`embla`, `cmdk`, `react-hotkeys-hook` — `@dnd-kit` en est sorti le 6 septembre). Ce ne sont pas des faux positifs : ce code est réellement
  sans appelant, parce que l'écran qui l'appellera n'existe pas encore. Le gel est posé **par
  chemin** et non en `exclude` global, pour que knip continue de signaler le code mort partout
  ailleurs. Chaque entrée nomme ce qu'elle attend : c'est la liste de reconstruction, et le bloc doit
  avoir disparu quand les routes sont refaites.

  **Le bloc maigrit à chaque passe, comme prévu.** `media.documents.ts` est passé du gel « fichier »
  au gel « exports » ; `search-params.ts` et `library-params.ts` en sont sortis pour de bon avec le
  catalogue ; les Server Actions ont emporté `safe-action.ts`, `tracking.schema.ts` et la dépendance
  `next-safe-action` ; et **le cron du 7 septembre a emporté `media-freshness.ts`**, dont l'entrée
  disait mot pour mot ce qu'elle attendait — « les bornes du miroir attendent le cron ». Toutes ces
  entrées annonçaient leur propre péremption, et c'est ce qui rend le bloc lisible.

  **`calendar-params.ts` en est sorti pour de bon le 8 septembre**, avec le planning — quatrième
  entrée à disparaître entièrement plutôt qu'à se rétrograder. Le contrat d'URL qu'il fixait a été
  respecté tel quel : la semaine reste un décalage entier, jamais une date, ce qui est bien la
  raison pour laquelle il avait été épargné.

  **`command.schema.ts` en est sorti le 12 septembre 2026 par la porte de sortie** : le fichier est
  supprimé, pas consommé. Cinquième entrée à disparaître, et la première dont la raison d'être avait
  expiré sans que personne ne repasse la lire — elle était gelée parce qu'elle portait seule la
  règle du « +1 », que `entry-progress-stepper.tsx` porte depuis `/library`. **Un gel devrait nommer
  la condition qui le lève, pas seulement celle qui l'a posé.**

  `profile-params.ts` et les exports d'`entry-format.ts` sont **sortis du gel le 12 septembre
  2026**, avec `/u/[username]` : le premier fixait le contrat d'URL du journal — la page en entier,
  jamais un curseur —, et il a été respecté tel quel ; le second gardait `formatEventTime`, qui
  attendait le journal nommément. Sixième et septième entrées à disparaître.

  Restent au gel : `use-debounced-value`, `use-reduced-motion`,
  et des chemins d'exports — les formateurs de `media`, les **deux** documents GraphQL encore sans
  écran (catalogue de l'accueil, vocabulaire de filtres), les schémas de `media`, les défauts de
  `preferences` et `formatEventTime` qui attend le journal. `removeEntry` en est **sorti le
  13 septembre 2026**, avec son geste.

  **Une entrée y est revenue le jour même, et c'est la seule fois** : `removeEntry` et
  `removeEntrySchema`, quand le menu qui les appelait a été retiré. Le gel dit toujours « en
  attente » et jamais « inutile » — ici il dit en plus « ça marchait, on l'a vu marcher ».
- Les composants React ne sont couverts par **aucun test de rendu**, et il y en a beaucoup plus
  qu'hier : le hero de la fiche, ses contrôles de suivi, et maintenant les deux écrans du catalogue
  avec leur barre, leur panneau, leur grille et leur pagination. **Deux écrans livrés, zéro test
  ajouté** — ils ont été vérifiés à l'écran en 1440 et en 390, pas par un test. C'est ce qui a
  attrapé la pagination à 238 pages, mais ça ne se rejoue pas tout seul. Playwright est prévu
  (PRODUCT.md §7) et toujours pas posé.
- ~~**Les états vides des deux écrans ne sont pas dessinés.**~~ **Fait le 7 septembre 2026.**
  `/search` porte ses trois messages et `/library` ses deux, et le catalogue propose un **geste** :
  `mostSelectiveFacet` (testée) désigne la facette active la plus étroite, et un lien ne retire
  qu'elle en remettant la page à 1. L'ordre de sélectivité est un jugement assumé — le mesurer
  coûterait une requête AniList par facette.
- **Les Server Actions ne sont couvertes par aucun test.** `applyEntryChanges` l'est — c'est là que
  vit la logique qui se trompe —, mais ce qui l'entoure (la transaction, le garde-fou du miroir, la
  conversion des dates à midi UTC, `revalidatePath`) n'a été **vérifié qu'à la main**, une fois, le
  6 septembre. Le chemin est décrit plus haut ; il n'est pas rejoué automatiquement.
- **La progression de la fiche n'écrit pas à la frappe**, et c'est délibéré : enregistrer chaque
  caractère écrirait « 1 », « 12 », « 120 » en tapant « 120 », soit trois lignes dans un journal
  qu'on ne peut pas défaire. Elle part au cran, ou **à la sortie du champ** — sans ce second
  déclencheur, un nombre tapé à la main n'aurait jamais été enregistré, ce qui aurait rendu à cette
  barre le mensonge qu'on venait de lui retirer.
- Le repli de panne AniList n'est vérifié par **aucun test**, mais il a été **vu fonctionner** le
  6 septembre, puis de nouveau le 7 — ce jour-là non pas à cause d'une coupure, mais du `Referer`
  manquant qui faisait répondre 403 (voir l'audit) : le repli a donc tenu plusieurs jours sans que
  personne s'aperçoive que la panne venait de chez nous. C'est sa qualité et son danger. Il
  est désormais posé sur **deux** des trois écrans réels — la fiche et `/search`, où
  `searchMediaInMirror` sert une vraie recherche paginée en base et **dit ce qu'elle a perdu**
  (les tags, les tris par tendance ou popularité). `/library` n'en a pas besoin : elle ne lit que
  Prisma, jamais AniList. Son **bandeau d'avis**, lui, est désormais
  global — rendu par le layout, il apparaît sur toutes les routes, y compris celles qui
  n'interrogent jamais AniList. **Et les deux écrans qui interrogent l'API le rapportent
  maintenant** : `ReportAniListStatus` n'était rendu que par la fiche jusqu'au 7 septembre 2026, si
  bien qu'arriver sur `/search` depuis une fiche saine masquait le bandeau en pleine panne. Il repose sur une variable de module (`isAniListDown`), donc sur la
  mémoire d'une instance de serveur : au pire il manque à quelqu'un pendant une requête, jamais
  l'inverse. Le raisonnement est dans `lib/http/anilist.ts`.
- ~~**Rien dans l'interface ne retire une œuvre de la bibliothèque.**~~ **Fait le 13 septembre
  2026.** « Retirer de ma bibliothèque » vit dans le pied de la fenêtre d'édition du suivi — le seul
  endroit ouvert depuis la fiche comme depuis chaque vignette —, sous `alert-dialog`, qui dit que le
  journal part avec. `entry-remove-button.tsx` ; `removeEntry` a quitté le gel de `knip.jsonc`.
- ~~Le miroir `Media` n'est plus rafraîchi : le cron est supprimé.~~ **Fait le 7 septembre 2026**
  — voir plus bas. Ce qui reste dû à sa place est plus étroit : la passe n'est **vérifiée par aucun
  test de bout en bout**, seulement par des doubles. Elle a en revanche été **appelée pour de vrai**
  (94 lignes reprises en 2 requêtes), et la sélection des lots est couverte, elle, par 14 tests.
- ~~`/collection` est déclarée dans `routes.ts` sans écran derrière.~~ **Fait le 19 septembre
  2026** : les deux routes existent, « Ma collection » est revenue dans `navigation.ts` et dans le
  groupe « Aller à » de la palette, et la fiche d'un manga porte le lien qui y mène.

### L'audit du 17 septembre 2026 — les squelettes, à la hauteur près

Relecture de **tous** les replis de chargement, à la demande d'Alexis. Lue dans le code, pas au
navigateur : les hauteurs se calculent depuis les classes Tailwind, et le profil du navigateur de
test était pris. Chaque écran a ensuite été servi par `curl` avec un cookie de session pour vérifier
que les nouveaux squelettes partent bien dans le flux — neuf routes, toutes en 200.

**La couverture était déjà bonne** : une frontière par zone sur les neuf écrans, aucun `loading.tsx`
de segment, et les quatre pages bloquantes (`/login`, `/waitlist`, `/l/[token]`, le layout `(app)`)
justifiées une à une. Ce qui manquait, c'était la **fidélité**.

| Trouvé | État |
| --- | --- |
| `h-4` servait de ligne de `text-sm`, qui fait **20 px** — dans `CatalogueGridSkeleton` (donc sur quatre écrans), les réglages, le profil, les listes | **corrigé** — `h-5`, et les autres interlignes revus avec (`text-lg` → `h-7`, `text-xs` → `h-4`) |
| L'accueil : `Tracking` rend **deux** rangées sous une seule frontière, le repli n'en annonçait qu'une | **corrigé** — `TrackingSkeleton`, deux rangées en fragment, avec la ligne d'appoint que portent leurs cartes |
| L'accueil : le repli de la une oubliait la rangée de points et son `gap-4` du carrousel | **corrigé** — 22 px qui manquaient sous la diapositive |
| L'accueil : « Mes listes » n'avait **aucun** repli (`fallback={null}`) | **corrigé** le matin — puis sans objet : la rangée a été retirée dans la journée, squelette et gabarit `wide` avec elle |
| Les en-têtes de rangée oubliaient leurs deux flèches — 28 px annoncés, 36 rendus | **corrigé** |
| Profil : les quatre tuiles figées à `h-26` (104 px) alors qu'elles passent en deux colonnes sous `sm` (171 px) | **corrigé** — le squelette reprend la grille, pas la hauteur |
| Profil : la rangée notes/genres calibrée pour les deux colonnes de `lg`, moitié trop courte en dessous | **corrigé** — même grille `lg:grid-cols-2`, et les cartes composent le vrai `Card` |
| `/library` : les deux sélecteurs du repli sans `flex-wrap` — une ligne de 376 px dans une boîte de 358 | **corrigé**, et les sept onglets de statut ont retrouvé des largeurs inégales, qui se replient comme les vrais |
| `/calendar` : le repli de la barre oubliait la bascule de portée ; la grille annonçait une case par jour | **corrigé** — la bascule est là, deux cases par jour, et l'en-tête de colonne a retrouvé sa bordure |
| `/lists/[id]` : l'en-tête oubliait le décompte et ses deux boutons de droite | **corrigé** |
| `/search` et `/library` : le repli s'arrêtait à la grille, sans la pagination | **corrigé** — `CataloguePaginationSkeleton` |
| `MediaTabSkeleton` semblait générique | **fausse alerte** — il a exactement la grille et les cartes `h-20` de `media-characters.tsx`, et son commentaire le disait déjà |

**Deux replis sous-estiment volontairement, et c'est le bon choix.** Le journal du profil : une page
fait vingt événements, près de neuf cents pixels, et un pavé gris de cette taille pèse plus que le
saut qu'il éviterait. La grille du planning : c'est le jour le plus chargé qui décide de sa hauteur,
et on ne le connaît qu'après la réponse — deux cases par jour est une espérance, pas une mesure.

**Le filet automatique n'existe pas sous `(app)`.** `instant = false` sur son layout désactive la
validation de coquille statique pour toute l'application (règle du `false` le plus haut dans
l'arbre). C'est justifié — la garde d'accès doit savoir qui demande —, mais Next ne signalera jamais
une frontière manquante ici. Relire à la main est le seul filet.

**Ce qui reste dû, et qui n'a pas été fait** : `(app)` n'a ni `error.tsx` ni `not-found.tsx`, donc un
`notFound()` sur `/media/99999` sort la page racine en plein écran, sans en-tête ni pied de page.

### L'audit du 7 septembre 2026 — ce que le typecheck ne voyait pas

Séance de **relecture au navigateur**, écran par écran, en 1440 et en 390. Le contrôle de santé
était vert avant comme après : aucune des six trouvailles n'était visible autrement qu'à l'écran.

| Trouvé | État |
| --- | --- |
| **Aucune navigation sous `md`** — `MainNav` est en `hidden md:flex` et rien ne la remplaçait : depuis un téléphone, ni `/search`, ni `/library`, ni `/lists` n'étaient atteignables | **corrigé** — `MobileNav`, un tiroir latéral |
| Les **états vides** de `/search` et `/library` rendaient `null` : page blanche, lue comme une panne | **corrigé** — trois messages ici, deux là, et un lien qui retire la facette la plus étroite |
| `/l/[token]` journalisait « uncached data during prerendering » **à chaque visite** | **corrigé** — `export const instant = false` |
| Le bandeau de panne ne se mettait à jour que depuis la fiche | **corrigé** — `/search` rapporte aussi |
| `/signup` sortait avec un `<title>` **vide**, et `/lists/[id]` affichait « Liste » pour toutes les listes | **corrigé** — `generateMetadata` sur la liste, et un gabarit à la racine |
| Les onglets ne disaient pas de quel site ils venaient | **corrigé** (demande d'Alexis) — « Rechercher · Better-List », la page d'abord, le site après (17 septembre 2026) |
| `/login`, `/signup` et `/waitlist` — les seules pages qui répondent sans session — n'avaient **aucune** balise `robots` | **corrigé** — `noindex, nofollow` sur le layout `(auth)`, pour les trois d'un coup |
| Chaînes anglaises pour lecteurs d'écran : `Close`, `More pages`, et les `aria-label` de la pagination — seul nom accessible de ces boutons sous `sm` | **corrigé** |
| **AniList répondait 403 à toute requête du serveur** — il manquait un en-tête `Referer` | **corrigé**, et couvert par un test |
| `/icon` et l'`opengraph-image` du partage répondaient `ERR_EMPTY_RESPONSE` | **ce n'était pas le code** — le serveur de dev était mort |
| L'en-tête de `/l/[token]` portait encore le nom du site en toutes lettres, que l'en-tête de l'app avait perdu le 6 septembre | **corrigé** — monogramme seul, nom gardé en `sr-only` |

**`sheet.tsx` est écrit à la main**, et c'est une décision : `pnpm dlx shadcn add sheet` a réintroduit
le **paquet npm parasite `cn`** dans `package.json` — le même qu'en août — avant de s'arrêter sur une
invite « écraser `button.tsx` ? », que `--yes` ne couvre pas. Relire `git diff package.json` après
chaque `shadcn add`.

`mostSelectiveFacet` est la seule logique **pure et neuve** de la séance, écrite en TDD : sept tests.
Son ordre de sélectivité est un **jugement assumé et non une mesure** — mesurer coûterait une requête
AniList par facette sur un quota de trente par minute.

#### 🔑 « AniList a coupé son API » était faux : il manquait un `Referer`

**La trouvaille de la séance, et elle rend son catalogue au produit.**

Le symptôme : depuis Node, **toute** requête revenait en 403 « The AniList API has been temporarily
disabled due to severe stability issues » — même `{Media(id:1){id}}` — pendant que la **même**
requête depuis le navigateur revenait en 200 avec les données. Une première passe a testé
`User-Agent`, `Origin` et `Accept` un par un, sans effet, et a conclu à tort à une empreinte TLS
filtrée à la périphérie.

**C'était une erreur de méthode** : tester les en-têtes un par un ne pouvait rien trouver, puisque
l'ensemble complet fonctionne. En rejouant l'appel navigateur **entier**, puis en retirant les
en-têtes **un par un** (méthode du laissé-de-côté), un seul fait basculer la réponse :

| | |
| --- | --- |
| jeu complet d'en-têtes navigateur | **200, données** |
| sans `accept`, `accept-language`, `origin`, `user-agent`, `sec-ch-ua*`, `sec-fetch-*` | **200, données** |
| **sans `Referer`** | **403** |
| `content-type` + `Referer` seuls | **200, données** |

N'importe quelle valeur passe, `x` compris : ce n'est pas une autorisation, c'est un filtre anti-robot
grossier posé devant l'API. **Le message d'erreur ment donc** — l'API n'a jamais été coupée, et le
403 du 15 août mériterait d'être relu à cette lumière.

Le correctif tient en une ligne dans `lib/http/anilist.ts` : `Referer: env.NEXT_PUBLIC_APP_URL`, la
valeur vraie plutôt qu'un `https://anilist.co` qui aurait marché en mentant. **Vérifié à l'écran** :
`/search?q=frieren` sert neuf résultats AniList au lieu des cinq du miroir, la fiche retrouve son
synopsis et son cinquième fait (studio), et les deux avis de repli ont disparu.

Un **test le garde** (`anilist.test.ts`), et il a été vu échouer sans l'en-tête : sans lui la panne
serait silencieuse, puisque le repli sur le miroir rattrape le 403 — retirer cette ligne ne
casserait aucun écran et laisserait simplement le catalogue servi depuis la copie locale pour
toujours.

Conséquence secondaire : importer `env` dans la couche transport a entraîné la validation
d'environnement dans le graphe des tests. `vitest.config.mts` fournit désormais de vraies valeurs de
test plutôt que de poser `SKIP_ENV_VALIDATION` — couper la validation ferait passer les tests le jour
où une variable manque réellement.

#### `/icon` n'était pas cassé : le serveur de dev l'était

**Diagnostic corrigé en fin de séance.** `/icon` répondait `ERR_EMPTY_RESPONSE` sur toutes les pages,
et l'`opengraph-image` du partage identiquement. La sonde a été de demander une `ImageResponse`
depuis une route neuve : **le serveur `next dev` en est mort**, port 3000 fermé, processus disparu.

Redémarré à froid, tout fonctionne : `/icon` rend ses 561 octets — **exactement la taille prédite
par le rendu en Node nu**, ce qui confirme que le code n'a jamais été en cause — et l'image d'aperçu
du partage rend ses 1200×630, monogramme, titre, auteur et cinq jaquettes, vérifiée à l'œil.

Ce serveur tournait depuis avant les modifications de la séance. **C'est le deuxième incident du même
genre en deux jours** — après les deux écritures inexpliquées du 6 septembre, plus bas — et la règle
d'hygiène qui en était sortie est donc confirmée plutôt qu'infirmée : **ne pas laisser un `next dev`
traverser une séance entière de modifications.** Elle mérite d'être lue comme un vrai risque de
diagnostic : une heure a été passée à chercher un bug dans du code correct.

Il ne reste donc **aucune erreur de console** sur le site.

---

## Le prochain pas

**L'accueil est fait (14 septembre), et c'était la dernière route de l'ordre.** La refonte des
écrans est donc finie ; ce qui suit n'est plus une reconstruction mais des choix ouverts.

**Le premier est dans `knip.jsonc`, et il a une date.** Le gel de la mise à blanc devait partir avec
la dernière route ; il reste cinq entrées, et chacune sait maintenant ce qui la lèvera :

- `BROWSE_CATALOGUE_QUERY` et `browseCatalogueDataSchema` **ont perdu l'écran pour lequel ils
  avaient été gelés** : l'accueil est fait sans eux, sur deux `searchMedia`. Or ce document
  rassemble cinq rangées en **une seule requête** par alias GraphQL, là où l'accueil en dépense
  deux. Donc : ou bien on s'en sert et l'accueil retombe à une requête, ou bien on le supprime. Ne
  rien décider serait la seule mauvaise réponse.
- `FILTER_VOCABULARY_QUERY` et `MediaTagOption` attendent les facettes de genres et de tags de
  `/search` — l'inventaire de [recherche-filtres.md](./recherche-filtres.md), 21 lignes cochées
  sur 66.
- `formatListStatus`, `formatRanking` et `ScoreDistribution` attendent les **chiffres de la
  communauté** sur la fiche, qui sont au reste de la liste ci-dessous.
- `PageInfo`, `MediaBrowse` et `SearchMediaInput` sont les types de ce qui précède, et partiront
  avec.

`react-hotkeys-hook` en est parti pour de bon : la palette est revenue le 13 septembre sur un
`keydown` nu, et la dépendance a été désinstallée plutôt que regelée.

**Le journal, qui occupait cette place depuis le 6 septembre, est fait** (12 septembre, avec
`/u/[username]`). Ce qu'il a appris et qui vaut pour la suite : `describeEntryEvent`,
`groupEventsByDay` et `formatDayLabel` étaient déjà écrits **et testés** depuis la V1, et le
commentaire de `groupEventsByDay` disait lui-même avoir été écrit pour « le tableau de bord [qui]
lit le journal de toutes les œuvres ». Il n'y avait donc aucune logique de journal à écrire, une
présentation à poser dessus. Le gel `knip` avait raison de les garder.

Il reste une chose que ce journal **ne fait pas** : cliquer une case du calendrier d'activité
n'amène pas au jour correspondant. Il y faudrait un `?jour=` dans `profile-params.ts` et un filtre
de plus dans `getProfileJournal` — le geste est le seul intérêt d'avoir mis les deux sur le même
défilement, et il n'est pas branché.

**Écartés le 13 septembre 2026, décision d'Alexis** : le **compteur de résultats** de `/search` —
aucun n'est affiché, et aucun ne le sera ; `pageInfo.total`, plafonné à 5000, n'aurait de toute façon
rien dit de juste — et l'**affichage sur la fiche** des dates, notes et relectures : ils restent dans
la fenêtre d'édition, que le crayon de la barre ouvre déjà.

Le **retour du cron de rafraîchissement**, qui figurait ici, est fait depuis le 7 septembre 2026.

Les **états vides** ne sont plus dans cette liste : ils ont été dessinés le 7 septembre.

### ⚠️ Deux écritures inexpliquées le 6 septembre — et un serveur de dev qui les explique probablement

**Ce qui s'est passé.** « Randil recommendation » — une liste vide d'Alexis — était en base à 17 h 26
et n'y était plus à 17 h 48. Plus tard, un jeton de partage est apparu sur « A voir (anime) » alors
qu'aucun geste ne l'avait visée. Dans les deux cas, les seules actions déclenchées visaient une autre
liste, et cette autre liste était intacte.

**Ce qui les relie, et qui est mesuré.** Le serveur de `next dev` tournait depuis avant les
modifications de la séance et avait rechargé à chaud à travers des dizaines de compilations
incompatibles ; son journal montre des erreurs continues à partir de la 17ᵉ minute. Une Server Action
est identifiée par un identifiant **généré à la compilation** : un bundle client périmé peut donc en
appeler une autre que celle qu'on croit.

**L'expérience de contrôle.** Serveur redémarré à froid, `.next/dev` supprimé, puis le scénario
rejoué : révoquer un jeton l'a mis à `null` sur la bonne liste et sur elle seule ; créer un lien l'a
posé sur la liste visée et sur aucune autre ; les quatre décomptes d'items sont restés intacts.
**Rien ne s'est reproduit.**

**Ce que ça ne prouve pas.** L'absence de reproduction n'est pas une démonstration, et le geste
d'origine reste introuvable. Ce qui a été perdu se limite à un titre et une date de création — la
liste était vide.

**La leçon, elle, tient quel que soit le coupable : `List` et `ListItem` n'ont aucun journal**, là où
`EntryEvent` aurait répondu en une requête. Et une règle d'hygiène en sort : **ne pas laisser un
`next dev` traverser une séance entière de modifications** — le redémarrer après un refactor qui
touche des Server Actions.

### Le socle visuel est en place — et c'est tout ce qui a été repris

`styles/globals.css` porte les tokens « Obsidienne » et `styles/fonts.ts` charge Archivo, désaliasé
de `--font-sans`. `@layer base` applique déjà `font-heading` aux `h1`, `h2` et `h3` : le titrage est
en place avant qu'un seul écran soit écrit.

Ces deux commits viennent de la branche `refonte-design`, par cherry-pick. **Rien d'autre n'en a été
repris.** Cette branche était un essai : ses 13 autres commits — les six composants shadcn, les deux
variants, la `MediaCard`, la grille, la coquille catalogue, `/search` et `/library` — ne sont pas des
patchs à appliquer. La reconstruction repart de zéro sur les tokens.

**La branche a été supprimée le 5 septembre 2026**, une fois les deux commits de style sur `main`.
Le dépôt n'a donc plus qu'une seule branche. Ne pas la chercher : ses 13 commits non repris ne sont
plus atteignables, et le prochain `git gc` les effacera pour de bon.

Ce qu'ils avaient résolu — la coquille catalogue, les filtres avancés, la `MediaCard` signée, la
grille dense — est donc à retrouver par le raisonnement, pas par la lecture. La spec citée plus bas
en garde l'intention ; l'implémentation, elle, est perdue et c'était le choix assumé.

### ⚠️ Le plan du 2 septembre est un document d'intention, pas une liste de tâches

Ses 54 cases sont vides et le resteront : le
[plan](./superpowers/plans/2026-09-02-refonte-design-fondations.md) a été exécuté une fois, sur une
branche depuis supprimée. Ses tâches 1 et 2 sont faites — elles sont sur `main`. Ses tâches 3 à 10
décrivent des fichiers qui n'existent plus, et l'implémentation qui les avait honorées n'existe plus
non plus : elles sont à refaire, pas à retrouver.

En revanche, la **spec** qui l'a produit reste valable et vaut la lecture avant de dessiner :
[2026-09-02-refonte-design-ui-design.md](./superpowers/specs/2026-09-02-refonte-design-ui-design.md).
Elle fixe le principe directeur — *la jaquette est la seule chose colorée de l'écran* — et les quatre
seuls emplois autorisés de l'accent. C'est de l'intention visuelle, elle ne périme pas avec le code.

Et la leçon de la séance, qui vaut pour n'importe quelle conclusion sur ce dépôt : **un fichier de
plan décrit une intention, seul `git branch` décrit un dépôt.**

### Une route par branche

L'ordre est choisi, et l'accueil est volontairement dernier — c'est l'écran qui compose le
vocabulaire de tous les autres.

1. `/search` et `/library` — **faits** (6 septembre), ensemble et sur une coquille commune, comme
   annoncé. C'était le premier gain réel de la refonte : ces deux écrans étaient le même, écrit deux
   fois. Ils partagent maintenant quatre pièces de `shared/` et `features/media/`, et leurs deux
   contrats d'URL sont sortis du gel de `knip.jsonc`. **Ce qui reste sur ces deux écrans** : le
   tri par titre qui devrait suivre `titleLanguage`, et
   l'annotation des cartes du catalogue par ce qu'on suit déjà — l'issue 1 de
   [recherche-filtres.md](./recherche-filtres.md) §2, qui demande une lecture de plus. L'inventaire
   des filtres : 66 lignes, **21 cochées**.
2. `/media/[id]` — **le hero, le suivi et le bas de la fiche sont faits** : la barre lit l'`Entry`
   réelle et écrit par `saveEntry` (6 septembre), et le 11 septembre le bas de la fiche est devenu
   **cinq onglets** : Aperçu, Personnages, Équipe, Œuvres liées, Tags — plus le prochain épisode en
   sixième colonne de la ligne de faits. **Chaque onglet a sa propre lecture AniList** : le serveur
   ne rend que le panneau désigné par `?onglet=`, donc Personnages peut en demander 25 là où la
   requête de fiche n'en ramène que 6. Le coût est explicite — une visite qui reste sur l'aperçu
   coûte une requête comme avant, chaque onglet ouvert en coûte une de plus, cachée pour la journée
   et partagée par les quatre comptes. Tags et relations n'en coûtent aucune. **L'aperçu donne
   l'inventaire, pas un chapitre** : un échantillon de chaque bloc et un « Tout voir ». Un onglet
   vide n'est pas ouvert, et la décision se prend sur l'échantillon de la fiche — jamais en
   dépensant le crédit qui le remplirait —, ce qui fait dégrader la fiche toute seule un jour de
   coupure. Restent le journal, les chiffres de la communauté, les tomes possédés, ce que le cercle
   en pense. Les dates, notes et relectures
   restent dans la fenêtre d'édition, sans affichage sur la page (décision du 13 septembre 2026).
   L'inventaire à cocher est dans
   [fiche-media.md](./fiche-media.md) : 73 lignes, **31 cochées**.
3. `/calendar` — **fait** (8 septembre), et il s'est bien rebranché sur `airing-week.ts` et
   `calendar-params.ts` sans les toucher. La forme — liste verticale par jour — a été tranchée sur
   un relevé de douze plannings en service plutôt qu'au goût (docs/JOURNAL.md). `AIRING_SCHEDULE_QUERY`
   a enfin son écran, cinq mois après avoir été écrite. **Ce qui reste sur cet écran**, et que le
   relevé a désigné dans cet ordre : (a) un réglage de **portée** — Aujourd'hui / Semaine / Mois —,
   l'axe que trois produits sur douze offrent contre un seul pour la disposition ; (b) une densité
   **compacte** sans jaquette, qui ferait tenir la semaine entière dans un écran. « Ce que je suis »
   montre **toute la bibliothèque** depuis le 28 septembre (demande d'Alexis) : prévu, en pause,
   abandonné, terminé. Seuls `CURRENT` et `REPEATING` portent un retard ; les autres cases disent
   leur statut. Les séries que le miroir sait finies ou annulées ne partent pas chez AniList. Les
   notifications restent sur `CURRENT` et `REPEATING`.
4. `/lists`, `/lists/[id]` et `/l/[token]` — **faits** (6 septembre). `@dnd-kit` est sorti du gel avec le mode
   réorganisation, et `rankAfterMove` fait enfin le calcul pour lequel il avait été isolé et testé.
   La fenêtre « Ajouter à une liste » de la fiche et le partage par jeton sont livrés avec : **le
   domaine des listes est entier**, et `lists.schema.ts` a quitté `knip.jsonc` pour de bon — ses
   sept entrées ont toutes un appelant.
5. `/settings` — **fait** (7 septembre), et il a tenu la promesse d'être petit : cinq fichiers, dont
   un promu depuis l'en-tête (`user-avatar.tsx`). La relecture des préférences annoncée ici s'est
   réduite à constater que le schéma Zod disait déjà tout — deux réglages, et les deux écartés le
   sont pour de bonnes raisons.
6. `/u/[username]` — **fait** (12 septembre), et il n'était pas si petit : cinq graphes, une feature
   recréée, deux modules purs testés, et une famille de tokens ajoutée au thème (`--activity-*`).
   Ce qui a coûté le plus n'était pas la logique mais la **couleur** — voir JOURNAL.md.
7. `/` — **fait** (14 septembre), en dernier et avec le vocabulaire complet sous les yeux, comme
   annoncé. Il n'a presque rien inventé : la carte du catalogue, la grille, les pastilles de statut,
   la fenêtre d'édition rapide et le retard épisode par épisode existaient tous. Ce qu'il a ajouté,
   c'est un ordre — le suivi avant la découverte — et **le « +1 »**, qui est reparti de là vers
   `/search` et `/library`. Deux passes de plus que prévu, et elles ont toutes deux retiré quelque
   chose : la rangée « Du moment » et ses quatre onglets (un second catalogue au milieu de l'accueil,
   que `/search` fait mieux), puis la rangée « Nouveaux épisodes », fusionnée dans « En cours » —
   elle montrait les mêmes jaquettes que celle du dessous, à trois près. **La recommandation
   personnelle est arrivée le 28 septembre**, mais **en plus** de « Cette saison », en bas de page
   (décision d'Alexis) : « Recommandé pour vous » part des six premières séries d'« En cours »,
   additionne leurs recommandations AniList (`getMediaRecommendations`, mémorisée des jours et
   partagée avec la fiche), retire tout ce qui est déjà en bibliothèque, et chaque carte nomme la
   série qui l'a amenée. **La rangée est tirée, pas classée** : chaque série y a au moins une
   place, le reste vient d'un hasard pondéré par le score, donc elle change à chaque visite.
   Tirage pur et testé dans `(home)/_lib/home-recommendations.ts`.
   **Limite connue** : AniList recommande aussi des suites — « Code Geass R2 » à côté de
   « Code Geass » —, que `MediaCompact` ne permet pas de reconnaître. **Ce qui reste sur cet
   écran** : le choix ouvert sur `BROWSE_CATALOGUE_QUERY` ci-dessus.

Hors de cet ordre : **la palette de recherche est revenue le 13 septembre 2026**, repartie d'une
page blanche. Un bouton discret dans l'en-tête (`Ctrl K`, loupe seule sous `md`), cinq résultats
avec jaquette, format, année et pastille de suivi, la rangée « N résultats · Tout voir » vers
`/search`, et le groupe « Aller à ». Elle ne fait que chercher et naviguer : le « +1 » n'y remonte
pas — `Entrée` est un réflexe, et un réflexe ne doit pas écrire dans le journal.

Deux choses apprises au navigateur : **`pageInfo.total` vaut 5000 pour toute recherche par titre**,
d'où « Meilleurs résultats » au plafond plutôt qu'un chiffre ; et cmdk laissait sa sélection sur
« Aller à » quand les résultats arrivaient au-dessus, si bien qu'`Entrée` ouvrait la bibliothèque —
la sélection est désormais pilotée. `use-debounced-value` et `cmdk` ont quitté le gel de `knip.jsonc`.

Le cron de rafraîchissement du miroir figurait ici aussi ; il a été repris le 7 septembre 2026, hors
de l'ordre des écrans puisqu'il n'en est pas un.

Chaque branche retire du bloc `ignoreIssues` de `knip.jsonc` les entrées que sa route rebranche.
Quand la dernière part, le bloc entier part avec elle.

### Ensuite, peut-être

Sans engagement, et sans ordre : Playwright et le repli de panne AniList (à re-poser de toute façon
pendant la reconstruction), l'ordre de visionnage d'une franchise (PRODUCT.md §8, meilleur rapport
valeur/effort du projet), et les trois chantiers que la collection laisse ouverts ci-dessous.

### Ce que la collection ne fait pas

Trois manques, tous décidés plutôt que subis — et le premier est le seul qui gêne.

1. **Le cas multi-éditions n'a pas d'écran.** Le modèle le porte depuis toujours (`Edition` est
   partagée, `@@unique([mediaId, label])`), la lecture prend déjà la bonne — `isDefault` d'abord —,
   et l'action `upsert` sur le libellé par défaut. Ce qui manque est la présentation : un sélecteur
   en tête de série, et une rangée par édition sur `/collection`. Tant qu'elle n'existe pas, le
   menu « … » n'offre **qu'une** entrée — « Nombre de tomes » —, parce qu'une entrée de menu qui
   n'ouvre rien est pire qu'une entrée absente. C'est la même règle qui avait sorti « Ma
   collection » de la nav.
2. **La saisie du nombre de tomes reste manuelle pour une série en cours.** AniList ne remplit
   `volumes` qu'à la **fin** de la parution — vérifié en direct : One Piece et Berserk répondent
   `null`, Chainsaw Man répond 24. Le total n'est donc **jamais recopié en base** : il se résout à
   la lecture (`resolveVolumesTotal`), saisie manuelle d'abord, AniList sinon. Le jour où une
   série se termine, l'étagère prend son vrai total au rechargement suivant, sans cron ni
   migration. D'ici là, la grille se termine par une case « tome suivant », et la phrase de la
   série dit **« j'ai jusqu'au 28 »** plutôt que d'avouer qu'elle ignore le total : devant un
   présentoir, le rayon dit déjà ce qui existe, et la seule chose qu'on attend de l'app est où
   l'on s'est arrêté. C'est ce qui fait de l'onglet « Incomplètes » une liste de courses.
   Corollaire : sur une série qui paraît encore, l'écran dit **« à jour »** et jamais
   « complète » — un total saisi vieillit en silence, et « complète » deviendrait faux sans que
   rien ne bouge.
3. **Prix, date d'acquisition, état et notes n'ont plus d'écran** (décision d'Alexis,
   19 septembre). Ils ne vivaient que dans la fenêtre de saisie par plage, écartée au profit du
   clic ; les emporter était le prix de ce choix. Le **budget cumulé** de §8 item 12 tombe avec :
   une somme toujours nulle serait un chiffre faux, donc les chiffres d'étagère s'arrêtent à
   quatre.
4. **Le prêt entre membres est abandonné**, pas reporté (décision d'Alexis, 19 septembre). §8
   item 10 est rayé dans PRODUCT.md.

Et une porte qui reste provisoire : `/media/[id]` ne porte qu'un **lien** « Ma collection », pas le
bloc de tomes possédés qu'attend [fiche-media.md](./fiche-media.md). Le lien existe parce que sans
lui `/collection` serait un écran qu'aucun chemin n'atteint ; il ne préempte pas la forme du bloc.
Il est dans la rangée d'actions de la fiche, en icône seule avec le bouton de liste, et **il ne
dépend pas du suivi** : posséder les douze tomes d'une série qu'on n'a jamais ajoutée à sa
bibliothèque est un état normal (§4.5), vérifié en base.
