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
│   ├── (app)/                    # Groupe : app authentifiée
│   │   ├── layout.tsx            # Header, nav, shell
│   │   ├── page.tsx
│   │   └── <segment>/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       └── _components/      # Utilisé par CETTE route seulement
│   ├── (auth)/                   # Groupe : login / signup (layout dédié)
│   │   ├── login/
│   │   └── signup/
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
│       ├── lib/                  # Helpers purs du domaine
│       └── types.ts              # Types dérivés des schémas + types du domaine
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
└── proxy.ts                      # ex-middleware.ts (renommé dans Next 16)
```

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

`lib/` est le seul dossier transverse qui grossit sans limite naturelle : tout ce qui n'est ni une
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
| un hook générique réutilisable partout | `hooks/` |
| une constante d'URL, un flag, du contenu statique | `config/` |
| un helper transverse sans domaine | `lib/<sujet>/` — voir la table ci-dessus |
| un appel sortant vers une API tierce | `lib/http/` (sur `upfetch`, jamais `fetch` nu) |
| une garde de sécurité sans domaine | `lib/security/` |

**Règle de promotion :** on démarre toujours dans `_components/` de la route. Dès qu'un
deuxième endroit en a besoin, on remonte le fichier dans `features/<domaine>/`. On ne crée pas
un `features/` "au cas où".

---

## Nommage

- **Fichiers et dossiers : `kebab-case`.** Toujours. Y compris les composants
  (`create-list-dialog.tsx`), sauf les conventions Next imposées.
- **Composants React : `PascalCase`** à l'intérieur du fichier.
- **Suffixes de rôle** dans `features/*/server/` : `.queries.ts`, `.actions.ts`, `.schema.ts`.
- **Un composant = un fichier.** Pas de barrel `index.ts` dans `features/` : les barrels
  cassent le tree-shaking et brouillent la frontière server/client.

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
└── types.ts
```

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
- **Les fichiers de CLI en sont dispensés**, et la liste est close : `prisma.config.ts` et
  `prisma/seed.ts`. Ils tournent hors de Next, donc sans le `NODE_ENV` que t3-env exige — importer
  `@/config/env` y ferait échouer le script avant sa première ligne utile. Le hook
  `conventions-guard.mjs` les nomme un par un, ce qui interdit d'étendre l'exception par
  inadvertance.
- `next.config.ts` importe ce fichier : une variable manquante casse le build, pas une requête
  utilisateur en production.
- Une variable client doit être déclarée **deux fois** — dans `client`, et dans
  `experimental__runtimeEnv` — parce que Next.js n'inline que les accès littéraux à `process.env`.

## `.claude/` — outillage de l'agent

Versionné avec le projet, donc valable pour toute personne (ou session) qui ouvre le repo.

```
.claude/
├── settings.json              # permissions, hooks, plugins — commité
├── settings.local.json        # overrides perso — gitignoré
├── hooks/
│   └── biome-format.mjs       # PostToolUse : biome check --write sur chaque fichier écrit
└── skills/
    ├── new-feature/           # scaffold une feature selon ce document
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
