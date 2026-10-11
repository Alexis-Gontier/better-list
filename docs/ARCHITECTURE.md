# Architecture & conventions de fichiers

Next.js 16.3 · App Router · React 19 · React Compiler activé.

Deux règles gouvernent tout le reste :

1. **`src/app/` ne fait que du routing.** Un fichier dans `app/` est soit une convention Next
   (`page`, `layout`, `route`, `loading`, `error`, …), soit un fichier colocalisé dans un dossier
   privé `_*`. Aucune logique métier réutilisable n'y vit.
2. **Server-first.** Un composant est Server par défaut. `"use client"` est une exception qu'on
   justifie, poussée le plus bas possible dans l'arbre (îlots clients).

---

## Arborescence

```
src/
├── app/                          # Routing UNIQUEMENT
│   ├── layout.tsx                # Root layout (html/body, Providers, fonts)
│   ├── error.tsx  global-error.tsx  not-found.tsx
│   ├── loading.tsx  forbidden.tsx  unauthorized.tsx
│   ├── robots.ts  icon.tsx       # Conventions de métadonnées
│   ├── (app)/                    # Groupe : app authentifiée
│   │   ├── layout.tsx            # Header, nav, shell — porte requireApprovedUser()
│   │   ├── page.tsx
│   │   └── <segment>/
│   │       ├── page.tsx
│   │       ├── _components/      # Utilisé par CETTE route seulement
│   │       └── _lib/             # Helpers utilisés par CETTE route seulement
│   ├── (auth)/                   # Groupe : login / signup (layout dédié)
│   │   ├── login/
│   │   └── signup/
│   ├── (share)/                  # Groupe : pages ouvertes sans compte (+ son error.tsx)
│   └── api/                      # Route handlers (callbacks, crons, lectures client)
│
├── features/                     # Le cœur du code métier, découpé par domaine
│   └── <domaine>/
│       ├── components/           # UI du domaine, réutilisable entre routes
│       ├── server/               # Server-only : queries + actions
│       │   ├── <domaine>.queries.ts
│       │   └── <domaine>.actions.ts
│       ├── hooks/                # Hooks clients du domaine
│       ├── schemas/              # Schémas Zod (entrées d'actions, forms)
│       └── lib/                  # Helpers du domaine partagés par plusieurs routes
│
├── components/
│   ├── ui/                       # shadcn/ui — généré, on n'invente pas ici
│   ├── layout/                   # Chrome de l'app : header, nav, user-menu…
│   └── shared/                   # Composites cross-domaine (page-header, data-table…)
│
├── config/                       # Constantes : site.ts, routes.ts, navigation.ts
├── providers/                    # Context providers React (composés dans index.tsx)
├── hooks/                        # Hooks génériques, sans domaine (use-media-query…)
├── lib/                          # Transverse, rangé par sujet (voir plus bas)
│   ├── auth/                     # server.ts · client.ts · session.ts
│   ├── db/                       # prisma.ts
│   ├── http/                     # fetch.ts (upfetch) · anilist.ts
│   ├── security/                 # safe-redirect.ts · rate-limit.ts
│   ├── safe-action.ts            # Client next-safe-action (racine : sans famille)
│   └── utils.ts                  # cn() — NE PAS DÉPLACER, components.json y pointe
├── generated/                    # Client Prisma — GÉNÉRÉ, gitignoré, on n'y touche jamais
├── styles/                       # globals.css, fonts.ts
├── instrumentation.ts            # onRequestError — la remontée des erreurs serveur
└── proxy.ts                      # ex-middleware.ts (renommé dans Next 16)
```

Et trois dossiers **hors de `src/`**, parce que rien de ce qu'ils contiennent ne tourne dans Next :

```
e2e/                              # tests Playwright (*.spec.ts), setup/teardown des comptes de test
prisma/                           # schema.prisma + seed.ts (chemin imposé par Prisma)
scripts/                          # exécutables manuels, lancés à la main et jamais importés
├── legacy-import.ts              #   reprise des données de l'ancienne app (tsx)
└── dev-session-cookie.mjs        #   gitignoré — rejoue une session pour le navigateur de test
```

**`scripts/` existe pour ce qui s'exécute, pas pour ce qui s'importe.** Ces fichiers n'ont ni
appelant ni test ; ils se lancent depuis un terminal, avec des arguments. `legacy-import.ts` vivait
dans `prisma/` où seul un préfixe `_` le cachait de la CLI Prisma — un dossier dont le nom dit la
nature vaut mieux qu'un underscore qui camoufle. `prisma/seed.ts` **ne suit pas** : son chemin est
attendu par l'outillage Prisma et nommé dans `ENV_ALLOWLIST`.

**`e2e/` tourne sous le runner Playwright**, donc lui aussi hors de Next : `process.env` et `pg` y
sont permis (le hook l'exempte par préfixe), `@/config/env` et `@/lib/db/prisma` n'y fonctionnent
pas. `@/config/routes` y reste obligatoire — une URL en dur dans un test casse aussi silencieusement
qu'ailleurs. Le détail est dans la skill `e2e-test`.

Un script échappe à trois règles de `src/` (`process.env`, `PrismaClient` instancié, `fetch` nu) et
c'est délibéré : il tourne sous `tsx` ou `node`, hors du runtime Next, donc hors de portée de
`@/config/env`. Le hook ne les voit pas — ses règles ne s'appliquent qu'à `src/`.

`src/generated/` est sous `src/` pour rester joignable par l'alias `@/*` — c'est la contrepartie
de la règle « un seul alias ». Il est gitignoré, reconstruit par le `postinstall`, et exclu de
Biome comme de knip : y voir du code mort ou une erreur de lint n'aurait aucun sens.

Le schéma de base vit dans `prisma/schema.prisma`, et l'URL de connexion dans `prisma.config.ts`
(Prisma 7 ne la lit plus depuis le bloc `datasource`).

Il n'y a **pas** de dossier `src/types/`. Les types viennent des schémas Zod via `z.infer` —
un type déclaré à la main à côté d'un schéma est une source de vérité en double qui finit par
diverger. Les rares types sans schéma vivent dans le `types.ts` de leur feature.

### `ui/` vs `layout/` vs `shared/` vs `features/*/components/`

Ces quatre dossiers ne se recouvrent pas — un composant n'a qu'une seule maison :

| Dossier | Contenu | Connaît le métier ? |
| --- | --- | --- |
| `components/ui/` | Primitives design system, générées par shadcn | Non |
| `components/layout/` | Le chrome de l'app : header, nav, menus du shell | Non |
| `components/shared/` | Composites réutilisables assemblés depuis `ui/` | Non |
| `features/<d>/components/` | UI qui manipule les données du domaine | Oui |

`shared/` n'est **pas** un fourre-tout : si un composant connaît une entité métier, il descend
dans `features/`.

### `lib/` est rangé par sujet

`lib/` grossit sans limite naturelle : tout ce qui n'est ni une
route, ni un composant, ni du métier finit par y atterrir. À plat, une douzaine de fichiers y
suffisent à ce qu'on ne voie plus lesquels vont ensemble — `auth.ts`, `auth-client.ts` et
`auth-session.ts` se rangeaient alphabétiquement à côté d'`anilist.ts` sans que rien ne dise que
les trois premiers forment un système et le dernier non.

| Dossier | Ce qu'il contient | La règle qu'il rend visible |
| --- | --- | --- |
| `lib/auth/` | `server.ts`, `client.ts`, `session.ts` | La frontière server/client est **dans le nom du fichier** : `@/lib/auth/client` importé depuis un Server Component saute aux yeux à la relecture |
| `lib/db/` | `prisma.ts` | Une seule porte vers la base ; le reste du projet n'instancie jamais `PrismaClient` |
| `lib/http/` | `fetch.ts`, `anilist.ts` | Tout ce qui **sort** du serveur. `anilist.ts` est bâti sur `fetch.ts`, pas à côté |
| `lib/security/` | `safe-redirect.ts`, `rate-limit.ts` | Les gardes qui ne dépendent d'aucun domaine — celles qu'on veut trouver sans les chercher |

Deux fichiers restent **à la racine de `lib/`**, et c'est délibéré : `safe-action.ts` (le client
next-safe-action) n'a pas de famille, et `utils.ts` **ne doit pas bouger** — `components.json`
déclare `aliases.utils: "@/lib/utils"`, donc tout composant généré par shadcn l'importe depuis là.
Le déplacer casserait la génération et les quelque trente fichiers qui en dépendent.

Un dossier de `lib/` se crée quand un deuxième fichier rejoint le premier, pas avant — la même
règle de promotion que `features/`. `lib/db/` n'a qu'un fichier aujourd'hui parce que c'est la
porte de la base et qu'on sait où iront ses voisins.

### `features/*/lib/` obéit aux mêmes règles — et c'est lui qui dérive

`src/lib/` se tient parce qu'on l'a rangé. Les `lib/` de features, eux, ont grossi quatre fois plus
vite sans que personne les regarde : ce sont **eux**, pas `src/lib/`, qui deviennent le fourre-tout
du projet. Trois populations s'y mélangent, et deux n'y ont pas leur place.

**Un helper dont tous les consommateurs sont dans `server/` porte `import "server-only";`.** Le
dossier `lib/` ne dit rien de la frontière — contrairement à `lib/auth/server.ts`, dont le nom la
porte. Sans le marqueur, rien n'empêche un composant client d'embarquer le fichier : un document
GraphQL de cinq cents lignes, ou pire, le générateur de jeton de partage. C'est une erreur de build
qu'on veut, pas un poids mort dans un bundle.

**Un helper dont tous les consommateurs vivent sous une seule route redescend dans le `_lib/` de
cette route.** C'est exactement la règle de promotion des composants, appliquée aux fonctions : on
ne monte dans `features/` qu'au deuxième appelant *réel*, et un helper promu trop tôt donne un
domaine qui a l'air partagé sans l'être. `app/(app)/(home)/_lib/hero-geometry.ts` est le gabarit.

Ne restent donc dans `features/<d>/lib/` que les helpers **réellement partagés entre plusieurs
routes ou plusieurs features** — le vocabulaire du domaine (`media-format.ts`, `entry-format.ts`),
ses règles métier (`entry-transition.ts`) et ses contrats d'URL multi-routes (`search-params.ts`,
`library-params.ts`).

Aucune de ces deux règles n'est tenue par `conventions-guard.mjs`, et ce n'est pas un oubli : le
hook reçoit un **fragment** sur un `Edit`, donc il ne sait pas vérifier qu'un fichier *contient*
quelque chose ; et « qui importe ce fichier ? » est une question inter-fichiers. Elles sont donc
dans la grille de l'agent `convention-reviewer`, qui lit un diff entier.

---

## Le chargement : une frontière Suspense par zone, pas un `loading.tsx`

**Il n'y a délibérément aucun `loading.tsx` de segment dans ce projet.** La convention Next existe et
fonctionne, mais elle ne sait faire qu'une chose : remplacer *toute* la page tant que *quoi que ce
soit* n'est pas prêt. Or nos écrans n'ont pas une attente, ils en ont plusieurs, et elles ne durent
pas pareil — sur `/search`, le titre est instantané, le vocabulaire des filtres vient d'AniList, et
les résultats d'une autre requête. Un `loading.tsx` les alignerait sur la plus lente et ferait
clignoter le titre pour rien.

La règle est donc : **chaque zone qui attend porte son propre `<Suspense>`, avec un composant
squelette nommé d'après elle.**

```tsx
<Suspense fallback={<CatalogueGridSkeleton />}>
  <SearchResults searchParams={searchParams} />
</Suspense>
```

Trois conséquences qu'on veut, et qui justifient de renoncer à la convention :

- **La page ne devient jamais dynamique en entier.** Avec `cacheComponents`, ce qui est hors des
  frontières se prérend ; le titre et le chrome sont dans le HTML initial. C'est ce qui rend une
  navigation instantanée, et un `loading.tsx` y renoncerait par construction.
- **Le squelette dit ce qu'il remplace.** `CatalogueGridSkeleton` a la forme d'une grille de
  jaquettes, `MediaDetailSkeleton` celle du hero d'une fiche. Un squelette générique de page ne
  ressemble à rien de ce qui va s'afficher, donc il déplace la mise en page au moment où il s'en va.

  **Et il le dit au pixel, pas à peu près** (audit du 17 septembre 2026). Trois pièges reviennent,
  et chacun a coûté un saut visible : une ligne de texte qu'on double avec la mauvaise hauteur —
  `text-sm` fait **20 px** d'interligne, donc `h-5` et non `h-4` ; une zone qui rend **plusieurs**
  blocs sous une seule frontière, dont le repli n'en annonce qu'un ; et une grille responsive dont
  le repli est figé à la hauteur qu'elle a sur un seul palier. Quand la coquille est composable —
  une `Card`, une grille partagée —, le squelette compose la vraie plutôt que d'en recopier les
  marges : elle reste juste toute seule.
- **La page n'attend rien elle-même.** Elle ne lit pas `searchParams`, elle transmet la promesse à
  ses enfants. Une page qui `await` avant de rendre annule toutes les frontières placées dessous.

Un squelette vit avec la zone qu'il double : au bas du `page.tsx` quand la zone y est écrite, dans
le `_components/` de la route quand elle en sort (`media-detail-skeleton.tsx`), ou à côté de la
pièce partagée qu'il imite (`CatalogueGridSkeleton` dans `components/shared/catalogue-grid.tsx`).

`app/loading.tsx` existe, lui, et reste : c'est le filet de la racine, pas le chargement d'un écran.

---

## Où poser un nouveau fichier

| Le fichier est… | Il va dans… |
| --- | --- |
| une page, un layout, un route handler | `app/` |
| un composant utilisé par **une seule** route | `app/**/_components/` |
| un composant utilisé par **plusieurs** routes du même domaine | `features/<domaine>/components/` |
| un composant du chrome de l'app (header, nav, footer) | `components/layout/` |
| un composite réutilisable sans notion de métier | `components/shared/` |
| une primitive design system | `components/ui/` (via `pnpm dlx shadcn add`) |
| une lecture de données | `features/<domaine>/server/*.queries.ts` |
| une mutation (`"use server"`) | `features/<domaine>/server/*.actions.ts` |
| un schéma de validation Zod | `features/<domaine>/schemas/` |
| un hook lié à un domaine | `features/<domaine>/hooks/` |
| un helper de domaine partagé par **plusieurs** routes | `features/<domaine>/lib/` |
| un helper utilisé par **une seule** route | `app/**/_lib/` — on ne le promeut qu'au deuxième appelant |
| un hook générique réutilisable partout | `hooks/` |
| une constante d'URL, un flag, du contenu statique | `config/` |
| un helper transverse sans domaine | `lib/<sujet>/` — voir la table ci-dessus |
| un appel sortant vers une API tierce | `lib/http/` (sur `upfetch`, jamais `fetch` nu) |
| une garde de sécurité sans domaine | `lib/security/` |

**Règle de promotion :** on démarre toujours dans le `_components/` — ou le `_lib/` — de la route.
Dès qu'un deuxième endroit en a besoin, on remonte le fichier dans `features/<domaine>/`. On ne crée
pas un `features/` "au cas où". Elle vaut pour les composants **comme pour les helpers** : un
fichier de `features/<d>/lib/` qu'une seule route consomme est un fichier qu'on a promu trop tôt.

---

## Nommage

- **Fichiers et dossiers : `kebab-case`.** Toujours. Y compris les composants
  (`create-list-dialog.tsx`), sauf les conventions Next imposées.
- **Composants React : `PascalCase`** à l'intérieur du fichier.
- **Suffixes de rôle** dans `features/*/server/` : `.queries.ts`, `.actions.ts`, `.schema.ts`.
- **Un composant = un fichier.** Pas de barrel `index.ts` dans `features/` : les barrels
  cassent le tree-shaking et brouillent la frontière server/client.

## Les commentaires : le pourquoi reste, l'historique s'en va

Ce projet commente beaucoup, et **c'est un choix qu'on garde** : ce qu'on écrit est presque toujours
du *pourquoi* — l'invariant, le piège évité, la raison d'un chiffre — c'est-à-dire exactement ce
qu'un lecteur ne peut pas retrouver seul. Un commentaire qui paraphrase le code mérite d'être
supprimé ; ceux-là, non.

Mais la densité a une limite au-delà de laquelle elle se retourne. Relevé le 5 septembre 2026 :
`_lib/hero-geometry.ts` était à **87 % de lignes de commentaire**, `share-token.ts` à 76 %,
`api/cron/refresh-media/route.ts` à 66 %. À ce niveau, deux choses cassent : le fichier ne se
parcourt plus — il faut lire trois paragraphes pour atteindre la ligne suivante —, et la prose
devient un **second artefact à tenir vrai**, qu'aucun test ne vérifie. Un commentaire de quinze
lignes qui décrit une décision d'affichage périmée est plus nuisible qu'un fichier sans commentaire,
parce qu'on le croit.

La ligne de partage n'est donc pas la longueur, c'est la **nature** :

| Ce qui reste dans le fichier | Ce qui part au journal |
| --- | --- |
| L'invariant : « ceci ne marche que tant que… » | Le récit : « il y a d'abord eu un `gap` sur la piste, puis… » |
| Le piège : « un `h-full` ici s'effondrerait à zéro » | La séance : ce qu'on a essayé, dans quel ordre, un jour donné |
| Le chiffre et son motif : « 24, parce que la grille a 2, 3, 4 et 6 colonnes » | La comparaison avec la référence dont on s'est inspiré |
| La frontière : « lu des deux côtés, d'où sa place ici » | Le bug tel qu'il est apparu à l'écran, et comment on l'a vu |

C'est la même règle que celle de [JOURNAL.md](./JOURNAL.md) vue de l'autre bout, et elle ne la
contredit pas : le **détail d'implémentation** reste bien dans le fichier « où il sera lu ». Ce qui
s'en va est l'**historique de la séance**, qui n'est pas un détail d'implémentation mais le compte
rendu d'un jour de travail — et c'est précisément ce que le journal existe pour porter.

En pratique : le commentaire garde le *pourquoi* en une à trois lignes et renvoie au journal pour le
récit — `voir docs/JOURNAL.md, 2026-09-05`. On y gagne deux fois : le fichier redevient scannable, et
le récit, daté, cesse de prétendre décrire le présent.

`_lib/hero-geometry.ts` est l'étalon de cette règle.

---

## Imports

Alias unique `@/*` → `src/*`. Pas d'import relatif qui remonte (`../../`) au-delà du dossier
courant.

```ts
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { getItems } from "@/features/<domaine>/server/<domaine>.queries";
```

## Frontière server / client

- `features/*/server/` est **server-only**. Ces fichiers commencent par `import "server-only";`
  (ou `"use server"` pour les actions) — une fuite dans un bundle client devient une erreur de
  build, pas une fuite de secret.
- **Ne jamais exporter du code server et du code client depuis le même fichier.**
- Les Server Actions passent **toutes** par `actionClient` (next-safe-action, défini dans
  `src/lib/safe-action.ts`). Une action écrite à la main renvoie une exception brute au client ;
  le client validé renvoie un objet typé et masque le message d'erreur en production.
- **Une lecture demandée par un composant client passe par un route handler, pas par une Server
  Action.** Une action est un `POST` que Next **sérialise** : sur une recherche à la frappe, deux
  requêtes font la queue et la réponse à « fri » arrive après celle à « frieren ». Un `GET` se laisse
  annuler par un `AbortController`, ce qui règle la course et rend le quota. Les actions restent donc
  ce qu'elles doivent être : des mutations. Exemple : `app/api/command/route.ts`.
- **Un route handler porte sa propre garde.** Il ne vit pas sous le layout `(app)`, donc
  `requireApprovedUser()` ne le couvre pas, et le `matcher` du proxy exclut `api/` en entier. Session
  **et** statut `APPROVED` s'y revérifient (`api/command`), ou un jeton porteur pour un appel machine
  (`api/cron/*`). Et on répond `401`, jamais un `redirect()` : renvoyer une page de connexion à un
  `fetch()` est une réponse absurde.
- Les actions restent **minces** : le schéma valide, le corps orchestre, le cache est revalidé.
  Si le corps dépasse ~20 lignes, la logique descend dans `features/<domaine>/lib/`.
- `"use client"` se pose sur la feuille interactive (le formulaire, le dialog), jamais sur la
  page qui la contient. On passe les Server Components en `children` aux composants clients
  plutôt que de convertir tout le sous-arbre.
- Les actions qui exigent un membre connecté passent par **`authActionClient`**, la variante de
  `actionClient` qui vérifie la session en middleware (`src/lib/safe-action.ts`). Écrire la garde
  dans le corps de l'action la rendrait facultative par oubli.

- **`export const instant = false`** se pose sur un segment qui dépend de l'identité du visiteur —
  le layout `(app)`, les pages d'auth. Ailleurs on garde la validation : elle signale ce qui bloque
  une navigation instantanée, et c'est une information qu'on veut voir plutôt que taire.

## La garde d'accès et le proxy

Trois règles, verrouillées par `src/proxy.test.ts` :

- **La garde est `requireApprovedUser()` dans `app/(app)/layout.tsx`, appelée une seule fois.** Ne
  pas la répéter page par page : une route oubliée ouvrirait tout le reste. Le raisonnement complet
  est dans PRODUCT.md §7.1.
- **`src/proxy.ts` ne fait qu'une redirection optimiste sur présence de cookie.** Il n'autorise
  rien, et n'appelle **jamais** `auth.api.getSession()` — ce serait un aller-retour base à chaque
  requête.
- **Le proxy ne renvoie jamais un porteur de cookie hors des routes publiques.** Un cookie périmé
  provoquerait une boucle infinie avec la garde du layout : le proxy renvoie vers l'app, le layout
  renvoie vers la connexion, et ainsi de suite.

Toute destination de redirection venue de l'URL passe par `safeRedirectPath`
(`@/lib/security/safe-redirect`), **à la consommation** et pas seulement à la fabrication : un
`?callbackUrl=` peut arriver dans une URL forgée sans jamais passer par le proxy.

## Une panne d'API se rattrape hors du cache

Deux règles apprises à l'écran le 15 août 2026, quand AniList a coupé son API en cours de journée.
Elles valent pour toute source externe cachée, pas seulement AniList.

**Le repli se fait hors du `"use cache"`, jamais dedans.** Un `null` mémorisé à l'intérieur
laisserait l'écran vide pendant toute la durée du cache après le retour du service. La fonction
cachée continue donc de lever, l'entrée n'est pas écrite, et la visite suivante retente. C'est
l'appelant qui rattrape, via `tryAniList` (`src/lib/http/anilist.ts`).

**Une erreur ne traverse pas `"use cache"` intacte** (Next 16.3). Côté appelant, ce n'est plus
l'instance levée mais un `Error` nu : `instanceof` répond `false`, les propriétés ajoutées valent
`undefined`, et **seuls `name` et `message` survivent**. La catégorie se porte donc dans le `name`
(`AniListOutageError`), et `isAniListOutage` ne regarde que lui. Un test qui lèverait la vraie
classe passerait au vert pendant que la page casserait : le test reconstitue la forme transportée
à la main.

## Anatomie d'une feature

Six existent : `media` (catalogue AniList et miroir local), `tracking` (suivi, journal,
bibliothèque), `lists` (listes et leur contenu), `profile` (la vue publique d'un membre),
`preferences` (les réglages d'affichage, lus par tous les écrans) et `command` (la palette `⌘K`).

`profile` et `command` sont là pour la même raison : elles **composent** plusieurs domaines sans
appartenir à aucun. Mettre la palette dans `tracking` l'obligerait à connaître AniList, et dans
`media` à connaître les entrées de suivi. Le gabarit :

```
src/features/<domaine>/
├── components/
│   ├── <domaine>-card.tsx           # Server Component par défaut
│   └── <domaine>-form.tsx           # "use client" — l'îlot interactif
├── server/
│   ├── <domaine>.queries.ts         # import "server-only"
│   └── <domaine>.actions.ts         # "use server"
├── hooks/
│   └── use-<domaine>-filters.ts     # nuqs pour l'état dans l'URL
├── schemas/
│   └── <domaine>.schema.ts          # Zod — les types sortent de z.infer
└── lib/
    └── <helpers partagés par plusieurs routes — voir la règle de promotion>
```

Pas de `types.ts` dans ce gabarit : aucune des six features n'en a jamais eu besoin. `z.infer` sur
le schéma a suffi à chaque fois, ce qui est exactement l'effet recherché. Le fichier reste possible
pour un type qu'aucun schéma ne produit — il n'est simplement pas à créer d'avance.

## `config/`

Constantes de l'app, sans logique ni accès réseau. Ces fichiers sont isomorphes : ils peuvent
être importés depuis un Server comme depuis un Client Component.

| Fichier | Rôle |
| --- | --- |
| `site.ts` | Nom et description du produit. |
| `routes.ts` | Source unique des URLs. Aucun chemin en dur dans un composant. |
| `navigation.ts` | Structure de la navigation, construite à partir de `routes.ts`. |
| `locale.ts` | Langue et fuseau. **Tout `Intl.*` et tout `toLocale*` doit les recevoir.** |
| `env.ts` | Variables d'environnement validées (t3-env). |

Un futur `feature-flags.ts` ou `limits.ts` vient ici aussi.

### `env.ts`

`env.ts` est l'exception isomorphe du dossier : il ne contient aucun secret, il les **valide**.
t3-env sépare `server` et `client` et refuse au build qu'une variable serveur soit lue depuis un
Client Component.

- **Jamais de `process.env.X` dans le code applicatif.** Toujours `import { env } from "@/config/env"`.
- **La liste des exceptions est close, et c'est le hook qui la tient** (`ENV_ALLOWLIST` dans
  `.claude/hooks/conventions-guard.mjs`) : `src/config/env.ts`, `next.config.ts`,
  `postcss.config.mjs`, `prisma/seed.ts` et `playwright.config.ts`. Les fichiers de configuration
  tournent avant que
  `@/config/env` soit chargeable ; `prisma/seed.ts` tourne sous `tsx`, hors de Next, donc sans le
  `NODE_ENV` que t3-env exige — l'importer y ferait échouer le script avant sa première ligne utile.
  Les nommer un par un interdit d'étendre l'exception par inadvertance. `prisma.config.ts` n'en fait
  pas partie et n'a pas à en faire partie : il lit sa variable par `env("DATABASE_URL")`, la
  fonction de `prisma/config`, et non par `process.env`.

  **Deux dossiers sont exemptés par préfixe** (`ENV_ALLOWED_PREFIXES`), et seulement deux, parce
  que tout ce qu'ils contiennent tourne hors de Next par nature : `.claude/` (les hooks de l'agent,
  lancés par Claude Code) et `e2e/` (les tests, lancés par le runner Playwright). Un fichier ne s'y
  pose pas pour échapper à la règle — il s'y pose parce qu'il est un outil, et alors il y échappe.

- **Les scripts sont hors du périmètre de deux autres règles**, pour la même raison qu'ils tournent
  hors de Next : `prisma/seed.ts` et `scripts/legacy-import.ts` instancient leur propre
  `PrismaClient` et appellent AniList en `fetch` nu. Le hook ne les voit pas — ses règles ne
  s'appliquent qu'à `src/`. Un fichier de `src/` qui ferait l'un ou l'autre est en faute ; ces deux
  scripts ne le sont pas.
- `next.config.ts` importe ce fichier : une variable manquante casse le build, pas une requête
  utilisateur en production.
- Une variable client doit être déclarée **deux fois** — dans `client`, et dans
  `experimental__runtimeEnv` — parce que Next.js n'inline que les accès littéraux à `process.env`.

## `.claude/` — outillage de l'agent

Versionné avec le projet, donc valable pour toute personne (ou session) qui ouvre le repo.

```
.claude/
├── SKILLS.md                  # provenance des skills et des agents — à tenir à jour
├── settings.json              # permissions, hooks, plugins — commité
├── settings.local.json        # overrides perso — gitignoré
├── agents/
│   ├── convention-reviewer.md # relit un diff contre ce document et PRODUCT.md
│   └── next-docs.md           # répond sur Next 16 en lisant node_modules/next/dist/docs/
├── hooks/
│   ├── biome-format.mjs       # PostToolUse : biome check --write sur chaque fichier écrit
│   └── conventions-guard.mjs  # PreToolUse : refuse une écriture qui viole une règle d'ici
└── skills/
    ├── new-feature/           # scaffold une feature selon ce document
    ├── anilist-read/          # toute lecture de l'API AniList passe par là
    ├── better-auth-*/         # Better Auth : setup, sécurité, email/password
    ├── create-auth/           # scaffolding auth
    ├── prisma-*/              # Prisma : CLI, client API, setup base
    └── upfetch/               # up-fetch : client, validation, retries
```

`settings.json` active aussi trois plugins : `prisma` et `context7` (docs à jour — utile vu que
Next 16 diverge des données d'entraînement) et `superpowers` (skills de méthode : debugging
systématique, plans, revue, TDD).

Le hook Biome formate automatiquement chaque `.ts`, `.tsx`, `.css` et `.json` écrit par
l'agent. Il sort toujours en code 0 : une règle de lint non auto-corrigeable ne doit pas
bloquer une édition. Il ne remplace pas `pnpm exec tsc --noEmit`.

`conventions-guard.mjs` travaille dans l'autre sens : il **refuse** l'écriture qui viole une des
huit règles de ce document qu'une machine sait voir — `process.env` hors de `config/env.ts`, un
dossier `src/types/`, un fichier posé à plat dans `lib/`, un barrel `index.ts` dans `features/`, un
`"use client"` sur une `page.tsx` ou un `layout.tsx`, un import relatif remontant, un `fetch` nu, et
le `.schema()` de next-safe-action v7. Il ne s'applique qu'au code : un `.md` a le droit de citer
`process.env`. Quand il bloque, c'est le code qu'il faut corriger, pas le hook.

Les deux agents servent des questions distinctes : `convention-reviewer` relit un diff contre ce
document et PRODUCT.md — il ne cherche pas les bugs, `/code-review` est là pour ça ; `next-docs`
répond sur Next 16 en lisant la documentation embarquée dans `node_modules/next/dist/docs/` plutôt
que de mémoire, ce qui compte vu que Next 16 diverge des données d'entraînement.

La provenance de chaque skill et de chaque agent est dans [.claude/SKILLS.md](../.claude/SKILLS.md),
à compléter à chaque ajout.

## Vérification

- **`src/architecture.test.ts`** tient les règles qu'aucun autre garde-fou ne sait tenir, parce
  qu'elles portent sur **l'arbre** et non sur un fichier : aucun module `"use client"` n'importe un
  Server Component `async` (l'invariant tacite de `MediaCard`, généralisé aux six qui existent),
  `src/app/` ne contient que des conventions Next et des dossiers privés, et `features/` n'a aucun
  barrel. Le hook ne peut rien pour ces trois-là — il juge le fichier écrit, pas ses importateurs, et
  il reçoit un simple fragment sur un `Edit`. Une quatrième assertion vérifie que la détection trouve
  encore des Server Components : une regex qui ne correspond plus à rien passe au vert et rend le
  garde-fou muet.
- **Vitest** (`vitest.config.mts`) : environnement `node`, fichiers `src/**/*.test.ts` colocalisés
  avec leur sujet — y compris sous `app/**/_lib/`, que l'`include` couvre. Les composants React ne
  sont pas encore couverts. La config **aliase `server-only` vers le module vide du paquet** : ce
  marqueur lève dès l'import sauf sous la condition d'export `react-server`, que le compilateur RSC
  de Next pose et que Vitest ne pose pas. Sans l'alias, tout test d'un helper `server-only` échoue à
  l'import avant sa première assertion.
- **Knip** : `src/components/ui/**` est ignoré (généré par shadcn) et `scripts/legacy-import.ts`
  aussi (script de CLI lancé à la main). Les règles sont au défaut, c'est-à-dire `error` — elles ont
  passé un temps en `warn` et un garde-fou qu'on laisse en `warn` finit par ne plus rien garder.
- **Playwright** (`playwright.config.ts`, `e2e/`) : Chromium, en 1440 et en 390. Un projet `setup`
  crée en base deux comptes de test (approuvé, en attente) et leur session — la connexion étant
  GitHub seul —, un projet `teardown` les supprime. Les tests `@anilist` interrogent l'API pour de
  vrai et ne tournent qu'en local.
- **Lefthook**, installé au `pnpm install` : `pre-commit` formate les fichiers indexés avec Biome,
  `pre-push` lance `typecheck` + `test` + `knip`.
- **CI GitHub** (`.github/workflows/ci.yml`) : lint → typecheck → tests → knip → build, sur PR et
  sur `main`, et en parallèle un job `e2e` sur un service Postgres jetable (`migrate deploy`, build,
  `playwright test --grep-invert @anilist`, rapport HTML en artefact). Le build y passe `SKIP_ENV_VALIDATION=1`, faute de secrets.
- **`pnpm db:seed`** (`prisma/seed.ts`, sous `tsx`) remplit la base de développement pour le compte
  approuvé le plus ancien. Il **refuse d'écrire par-dessus des données existantes** et demande
  `--reset`, qui supprime alors suivis, journal et listes de ce compte — `Media` n'est jamais
  touché. Graine fixe : deux exécutions donnent le même jeu.
