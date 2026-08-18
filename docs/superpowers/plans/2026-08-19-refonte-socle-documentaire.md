# Refonte du socle documentaire — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au projet cinq documents à jour, sans recouvrement, tels qu'un agent sache en deux lectures courtes ce qui existe, où on en est et ce qu'il a le droit de faire.

**Architecture:** La cible et le réel cessent de partager un fichier. `CLAUDE.md` devient un aiguilleur, `docs/STATE.md` (nouveau) porte seul l'avancement, `PRODUCT.md` et `ARCHITECTURE.md` sont rafraîchis sans être réécrits, et les 142 Ko de `JOURNAL.md` partent dans une archive datée pendant qu'un journal neuf redémarre avec une règle de rotation.

**Tech Stack:** Markdown. Aucun code applicatif modifié. Vérification par `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm knip`, et par relecture de chaque affirmation contre le code.

**Spec:** `docs/superpowers/specs/2026-08-19-refonte-documentation-design.md`

## Global Constraints

- Langue : **français**, y compris les messages de commit.
- Branche de travail : `docs/refonte-socle`. Ne pas pousser sans demande explicite d'Alexis.
- **Aucun texte du journal actuel n'est perdu** — déplacement, jamais réécriture ni condensation.
- **Aucun code applicatif n'est modifié**, à la seule exception nommée en Task 2 (suppression de six alias de types morts), qui est une condition du repassage de knip en `error`.
- Le bloc « This is NOT the Next.js you know » en tête de `CLAUDE.md` est **écrit par `next dev`** : il est conservé mot pour mot. Le supprimer ne fait que le recréer en modification non commitée.
- Toute affirmation écrite dans un document doit être **vérifiée contre le code au moment de l'écrire**. Une affirmation invérifiable ne s'écrit pas.
- Chemins de routes : jamais en dur, toujours via `src/config/routes.ts` — la règle vaut aussi pour ce qu'on écrit *à propos* du code.
- Format de date dans les documents : `19 août 2026` (jour mois année, en toutes lettres), comme le reste du journal.

---

### Task 1 : Mettre le chantier en cours à l'abri

47 fichiers non commités (+1788 / −345) portent tout le travail accueil, carrousel, listes et repli AniList. Rien de la refonte ne s'écrit au-dessus d'un chantier que git ignore.

**Files:**
- Commit uniquement — aucun fichier créé ni modifié.

**Interfaces:**
- Consumes: rien.
- Produces: un arbre de travail propre (`git status --porcelain` vide) sur `docs/refonte-socle`.

**Note sur les commits intermédiaires :** les groupes ci-dessous sont **thématiques**. L'arbre est vert dans son ensemble (177 tests, typecheck et lint propres, vérifié le 19 août 2026), mais chaque commit pris isolément n'est pas garanti compilable — ces fichiers ont été écrits ensemble. C'est un rangement d'historique local, pas une garantie de bissection. Ne pas tenter de rendre chaque commit vert individuellement : le coût est sans rapport avec le bénéfice.

- [ ] **Step 1 : Lire le diff groupe par groupe**

```bash
git diff --stat
git diff src/lib/http/anilist.ts
git diff "src/app/(app)/(home)"
```

Objectif : confirmer que le découpage proposé ci-dessous correspond au contenu réel. Si un fichier appartient manifestement à un autre groupe, le déplacer — le découpage est une hypothèse à vérifier, pas une consigne à appliquer les yeux fermés.

- [ ] **Step 2 : Commit 1 — les primitives et les dépendances**

```bash
git add package.json pnpm-lock.yaml src/components/ui/carousel.tsx src/components/ui/hover-card.tsx
git commit -m "chore(ui): ajouter carousel et hover-card, et embla avec eux"
```

`embla-carousel-react` et `embla-carousel-autoplay` (^8.6.0) sont les dépendances du `carousel` shadcn : elles voyagent avec lui, pas dans un commit de leur côté.

- [ ] **Step 3 : Commit 2 — le repli de panne AniList**

```bash
git add src/lib/http/anilist.ts src/lib/http/anilist.test.ts "src/app/(app)/(home)/_components/catalogue-unavailable.tsx"
git commit -m "feat(anilist): une coupure ne prend plus l'accueil avec elle"
```

- [ ] **Step 4 : Commit 3 — l'accueil, le bandeau et le carrousel**

```bash
git add "src/app/(app)/(home)" src/components/shared/media-carousel.tsx src/hooks/use-reduced-motion.ts
git commit -m "feat(accueil): le bandeau s'ouvre sur ce qu'on regarde"
```

Ce groupe contient la suppression de `recent-activity.tsx` et les nouveaux `home-hero.tsx`, `hero-carousel.tsx`, `home-catalogue.tsx`, `resume-card.tsx` et `_lib/`. `git add` sur le dossier les prend tous, suppression comprise.

- [ ] **Step 5 : Commit 4 — la recherche**

```bash
git add "src/app/(app)/search" src/features/media/lib/search-params.ts src/features/media/lib/search-params.test.ts src/features/media/schemas/search-media.schema.ts src/features/media/schemas/media.schema.ts src/features/media/lib/media-season.ts src/features/media/lib/media-season.test.ts src/features/media/lib/media-documents.ts src/features/media/components/media-card.tsx
git commit -m "refactor(recherche): les filtres disent ce qu'ils filtrent"
```

- [ ] **Step 6 : Commit 5 — le suivi**

```bash
git add src/features/tracking
git commit -m "feat(suivi): retirer une entrée demande confirmation"
```

- [ ] **Step 7 : Commit 6 — la déconnexion**

```bash
git add src/components/layout/sign-out-button.tsx src/components/layout/user-menu.tsx src/hooks/use-sign-out.ts
git commit -m "refactor(auth): la déconnexion tient dans un hook"
```

- [ ] **Step 8 : Commit 7 — le script d'import et le journal**

```bash
git add prisma/_legacy-import.ts docs/JOURNAL.md
git commit -m "chore(prisma): garder le script d'import des données de l'ancienne app"
```

- [ ] **Step 9 : Vérifier que l'arbre est propre et vert**

```bash
git status --porcelain
pnpm typecheck && pnpm test && pnpm lint
```

Attendu : `git status --porcelain` ne renvoie **rien**, et les trois commandes passent. Si `git status` renvoie encore quelque chose, un fichier a été oublié — le rattacher au groupe qui lui correspond avant de continuer.

---

### Task 2 : Rendre knip exigeant à nouveau

`knip.jsonc` met `files`, `dependencies`, `exports` et `types` en `warn` avec ce commentaire : « réglage temporaire, à supprimer une fois `/search` câblée », en attente de « la première Server Action ». Les deux existent depuis longtemps. Le garde-fou est donc désarmé sans que plus rien ne le justifie.

**Files:**
- Modify: `knip.jsonc`
- Modify: `src/features/media/schemas/media.schema.ts` (retrait de 4 alias de types morts)
- Modify: `src/features/media/schemas/search-media.schema.ts` (retrait de 2 alias de types morts)
- Modify: `prisma/_legacy-import.ts:1-9` (en-tête)

**Interfaces:**
- Consumes: l'arbre propre de la Task 1.
- Produces: `pnpm knip` sans aucun signalement, règles en `error`.

- [ ] **Step 1 : Constater l'état de départ**

```bash
pnpm knip
```

Attendu, exactement : `prisma/_legacy-import.ts` en fichier inutilisé, et six types exportés inutilisés — `MediaType`, `MediaCountry`, `MediaSort`, `MediaCoverImage` (dans `media.schema.ts`), `SearchFormInput`, `SearchFormParams` (dans `search-media.schema.ts`).

- [ ] **Step 2 : Vérifier que ces six types sont bien morts**

```bash
grep -rn "MediaCountry\|MediaSort\|MediaCoverImage\|SearchFormInput\|SearchFormParams" src/ --include=*.ts --include=*.tsx
grep -rn "\bMediaType\b" src/ --include=*.ts --include=*.tsx
```

`MediaType` demande une attention particulière : **un enum Prisma porte le même nom** (`prisma/schema.prisma:29`). Les occurrences importées depuis `@/generated/prisma/client` ne sont **pas** celles du schéma Zod et ne doivent pas être touchées. Seul l'alias exporté par `media.schema.ts` est mort. En cas de doute sur un des six, on ne le supprime pas — on l'écarte nommément dans `knip.jsonc` avec la raison.

- [ ] **Step 3 : Supprimer les alias morts**

Retirer uniquement les lignes `export type X = z.infer<...>` correspondantes. Ne toucher à aucun schéma : les schémas Zod restent, seuls les alias de types que personne n'importe disparaissent. Le type se redérive d'un `z.infer` le jour où quelqu'un en a besoin — c'est précisément la règle d'ARCHITECTURE.md (« pas de source de vérité en double »).

- [ ] **Step 4 : Vérifier que rien n'est cassé**

```bash
pnpm typecheck && pnpm test
```

Attendu : typecheck propre, 177 tests verts. Si le typecheck échoue, le type n'était pas mort : le restaurer et l'écarter dans `knip.jsonc` plutôt que de le supprimer.

- [ ] **Step 5 : Écarter `_legacy-import.ts` et réarmer les règles**

Dans `knip.jsonc` : ajouter `prisma/_legacy-import.ts` à `ignore`, et remplacer tout le bloc `rules` — commentaire périmé compris — par le défaut, c'est-à-dire **le supprimer** (`error` est le défaut de knip). Le commentaire d'`ignore` doit dire pourquoi le fichier reste :

```jsonc
  // `src/components/ui/` est généré par shadcn : ses composants exportent volontairement plus que
  // ce qu'on consomme, et les supprimer casserait la prochaine régénération. (`src/generated/`,
  // produit par Prisma, est déjà écarté par le .gitignore.)
  //
  // `prisma/_legacy-import.ts` est un script de CLI lancé à la main (`tsx prisma/_legacy-import.ts
  // <newUrl> <oldUrl>`) : rien ne l'importe, et c'est normal. Il est gardé — la reprise des données
  // de l'ancienne app peut être rejouée sur une autre branche Neon.
  "ignore": ["src/components/ui/**", "prisma/_legacy-import.ts"],
```

- [ ] **Step 6 : Corriger l'en-tête du script**

Dans `prisma/_legacy-import.ts`, la ligne « Script jetable, à supprimer une fois l'import validé et rejoué sur la branche cible. » est contredite par la décision d'Alexis du 19 août 2026. La remplacer par :

```
 * Gardé au dépôt : l'import peut être rejoué sur une autre branche Neon. Lancé à la main, jamais
 * importé — d'où son exclusion dans `knip.jsonc`.
```

- [ ] **Step 7 : Vérifier et commiter**

```bash
pnpm knip
```

Attendu : **aucun signalement**. Puis :

```bash
git add knip.jsonc prisma/_legacy-import.ts src/features/media/schemas/media.schema.ts src/features/media/schemas/search-media.schema.ts
git commit -m "chore(knip): le garde-fou reprend du service"
```

---

### Task 3 : Archiver le journal et le faire redémarrer

**Files:**
- Create: `docs/journal/2026-08-archive.md` (le contenu actuel, intégral)
- Rewrite: `docs/JOURNAL.md`

**Interfaces:**
- Consumes: rien.
- Produces: un `JOURNAL.md` sous 5 Ko, et une archive à laquelle `JOURNAL.md`, `PRODUCT.md` et `ARCHITECTURE.md` pourront renvoyer par lien relatif.

- [ ] **Step 1 : Mesurer l'avant**

```bash
wc -l -c docs/JOURNAL.md
```

Attendu : environ 1947 lignes, 142666 octets. Noter le chiffre exact — la Step 5 le rejoue.

- [ ] **Step 2 : Déplacer le fichier tel quel**

```bash
mkdir -p docs/journal
git mv docs/JOURNAL.md docs/journal/2026-08-archive.md
```

`git mv` plutôt qu'une copie : l'historique du fichier suit, et le diff se lit comme un déplacement et non comme 1947 lignes supprimées puis recréées.

- [ ] **Step 3 : Coiffer l'archive d'un en-tête**

Insérer en tête de `docs/journal/2026-08-archive.md`, **avant** le `# Journal de bord` existant qui devient un titre de niveau 2 :

```markdown
# Journal — archive du 7 au 15 août 2026

Les 34 entrées de la première phase du projet, du socle initial au repli de panne AniList.
Déplacées ici le 19 août 2026, **sans retouche** : ce fichier ne se modifie plus.

Ce qui, dans ces pages, est encore une règle applicable a été remonté dans
[PRODUCT.md](../PRODUCT.md) ou [ARCHITECTURE.md](../ARCHITECTURE.md), là où on le cherche avant
d'écrire du code. Le reste est de la mémoire : on vient l'y chercher quand on se demande
*pourquoi* quelque chose est comme ça.

---
```

- [ ] **Step 4 : Écrire le nouveau `docs/JOURNAL.md`**

Il contient exactement trois choses : le rappel de son rôle, la règle de rotation, et une entrée datée du 19 août 2026.

```markdown
# Journal de bord

[PRODUCT.md](./PRODUCT.md) dit **quoi** et **pourquoi**, [ARCHITECTURE.md](./ARCHITECTURE.md) dit
**comment**, [STATE.md](./STATE.md) dit **où on en est**. Ce fichier dit **ce qu'on a appris en
chemin** : ce qui a été tranché en passant, et qui n'était une décision ni de produit ni de
convention.

**Comment le tenir.** Une entrée par séance, datée, la plus récente en haut. Deux lignes valent
mieux qu'une entrée parfaite qu'on n'écrit jamais.

**Règle de rotation.** Au-delà de **10 entrées ou 30 Ko**, on archive dans `docs/journal/` et on
remonte ce qui est encore applicable dans PRODUCT.md ou ARCHITECTURE.md. Le premier journal a
atteint 142 Ko avant qu'on s'en aperçoive, et plus personne ne le lisait — une connaissance qu'on
ne peut pas charger n'existe pas.

Archives : [7 → 15 août 2026](./journal/2026-08-archive.md).

Ce qui n'a **rien à faire ici** : une décision de périmètre (PRODUCT.md), une convention de
fichier (ARCHITECTURE.md), l'avancement d'un écran (STATE.md), le détail d'une implémentation (le
commentaire du fichier concerné, où il sera lu).

---

## 19 août 2026 — La documentation se remet d'aplomb
```

Le corps de l'entrée du 19 août s'écrit à la **fin** de la Task 7, quand on sait ce qui a réellement été fait. Poser le titre maintenant et le remplir plus tard évite d'écrire au futur une entrée censée constater le passé.

- [ ] **Step 5 : Vérifier le déplacement**

```bash
wc -c docs/journal/2026-08-archive.md docs/JOURNAL.md
grep -c "^## " docs/journal/2026-08-archive.md
```

Attendu : l'archive fait au moins les 142666 octets du départ (l'en-tête ajouté la fait grossir un peu), elle contient les 34 entrées, et `JOURNAL.md` fait moins de 5 Ko.

- [ ] **Step 6 : Commiter**

```bash
git add docs/JOURNAL.md docs/journal/
git commit -m "docs(journal): 142 Ko de mémoire passent en archive"
```

---

### Task 4 : Écrire `docs/STATE.md`

Le cœur de la refonte. Le seul document qui décrive ce qui **est**.

**Files:**
- Create: `docs/STATE.md`

**Interfaces:**
- Consumes: rien.
- Produces: le document que `CLAUDE.md` (Task 7) désignera comme deuxième lecture obligatoire.

- [ ] **Step 1 : Relever la matière, sans rien supposer**

```bash
find "src/app" -name "page.tsx" -o -name "route.ts" -o -name "layout.tsx" | sort
find src/features -type f | sort
grep -n "^model \|^enum " prisma/schema.prisma
cat src/config/routes.ts
```

Pour **chaque** route, ouvrir sa `page.tsx` et relever ce qu'elle importe : c'est ce qui donne la colonne « features consommées » et la colonne « modèles touchés ». Ne pas déduire d'un nom de dossier ce qu'un import dit exactement.

- [ ] **Step 2 : Écrire la partie « La carte »**

Un tableau, une ligne par route. Colonnes : `Route` (avec la clé de `routes.ts`) · `Rôle` · `Features consommées` · `Modèles touchés` · `État`.

`État` prend exactement une de trois valeurs, et pas d'autre :
- **livré** — l'écran existe et fait ce que PRODUCT.md décrit ;
- **partiel** — l'écran existe, une partie décrite manque ; ce qui manque est dit dans la ligne ;
- **déclaré, non construit** — le chemin est dans `routes.ts`, l'écran n'existe pas.

Les dix routes à couvrir : `/`, `/search`, `/media/[id]`, `/library`, `/lists`, `/lists/[id]`, `/u/[username]`, `/calendar`, `/settings`, `/l/[token]`. Plus `/collection` et `/collection/[mediaId]`, en **déclaré, non construit** — `routes.ts` les déclare et le dit déjà lui-même. Plus les trois route handlers : `api/auth/[...all]`, `api/command`, `api/cron/refresh-media`, avec la garde que chacun porte (ARCHITECTURE.md, « un route handler porte sa propre garde »).

- [ ] **Step 3 : Écrire la partie « Les six features »**

Une entrée par feature — `media`, `tracking`, `lists`, `profile`, `preferences`, `command` — sur trois points : **possède** (les fichiers, en une formule), **expose** (les queries et actions, par leur nom réel), **dépend de**. Les noms de fonctions se relèvent dans le code, ils ne s'inventent pas.

Rappeler en une phrase pourquoi `profile` et `command` existent : elles composent plusieurs domaines sans appartenir à aucun (ARCHITECTURE.md le dit déjà — y renvoyer plutôt que le recopier).

- [ ] **Step 4 : Écrire la partie « Contrôle de santé »**

```markdown
## Contrôle de santé

Relevé le 19 août 2026. **À rejouer et à redater dès qu'on prétend s'y fier.**

| Commande | Résultat |
| --- | --- |
| `pnpm typecheck` | propre |
| `pnpm test` | 177 tests, 13 fichiers |
| `pnpm lint` | 234 fichiers, aucune correction |
| `pnpm knip` | aucun signalement |

Écarts connus : *(les lister ici, ou écrire « aucun » — jamais laisser la section vide)*
```

Les chiffres se rejouent au moment d'écrire (`pnpm test` a pu bouger depuis la Task 2), ils ne se recopient pas depuis ce plan.

- [ ] **Step 5 : Écrire la partie « Le prochain pas »**

**Une seule chose.** Au 19 août 2026, c'est celle que l'archive du journal laisse explicitement ouverte : `/search`, `/calendar` et `/media/[id]` tombent encore en entier pendant une coupure AniList ; le `tryAniList` déjà écrit pour l'accueil leur est applicable, avec un état vide à dessiner par écran.

Une liste de « prochains pas » n'en est pas un. S'il y a d'autres candidats, ils vont dans une section « Ensuite, peut-être », clairement non engageante.

- [ ] **Step 6 : Poser la règle d'entretien en tête du fichier**

```markdown
> **Ce document se met à jour dans le commit qui le périme, jamais après.**
> Un état des lieux tenu à posteriori est un journal — et on sait ce que devient un journal
> qu'on ne relit pas ([docs/journal/](./journal/)).
```

- [ ] **Step 7 : Vérifier chaque affirmation**

Relire `STATE.md` ligne à ligne, et pour chacune se demander : *quel fichier prouve ça ?* Une ligne dont on ne peut pas nommer la preuve est retirée ou vérifiée. C'est le seul rempart contre la dérive qui a produit le §5 de PRODUCT.md.

- [ ] **Step 8 : Commiter**

```bash
git add docs/STATE.md
git commit -m "docs(state): l'app dit enfin ce qu'elle contient"
```

---

### Task 5 : Rafraîchir `docs/PRODUCT.md`

**Files:**
- Modify: `docs/PRODUCT.md` (§5, §6, et ajouts ciblés)

**Interfaces:**
- Consumes: `docs/STATE.md` (Task 4) — c'est vers lui que part la matière retirée.
- Produces: un PRODUCT.md dont aucune phrase ne prétend décrire l'avancement.

- [ ] **Step 1 : Corriger le mensonge du §5**

L'en-tête du §5 dit : « À refléter dans `src/config/routes.ts`, qui n'a aujourd'hui ni recherche ni fiche média — c'est-à-dire ni l'entrée ni le cœur de l'app. » Les deux y sont (`routes.search`, `routes.media`). Vérifier :

```bash
grep -n "search\|media:" src/config/routes.ts
```

Remplacer par un renvoi qui ne périme pas : « `src/config/routes.ts` en est la mise en œuvre ; l'état d'avancement de chaque route est dans [STATE.md](./STATE.md). »

- [ ] **Step 2 : Purger §5 et §6 de tout avancement**

La colonne `Palier` du tableau des routes reste : c'est de l'intention, elle a sa place ici. En revanche, toute phrase qui dit ce qui est construit ou pas descend dans STATE.md. Le §6 (Roadmap) garde ses paliers V0 → V2 et ses justifications ; il ne dit plus « où on en est ».

- [ ] **Step 3 : Remonter les décisions produit restées dans le journal**

Deux décisions ont été tranchées dans le journal sans jamais être consignées comme décisions produit. Les relire dans l'archive, puis les porter au §5 et au §6 :

```bash
grep -n "browse\|catalogue éditorialisé" docs/journal/2026-08-archive.md | head -20
grep -n "vues\|tier list" docs/journal/2026-08-archive.md | head -20
```

*(Le repli du catalogue sur l'accueil et la mise de côté des vues figurent déjà partiellement au §5 et §6 — vérifier avant d'écrire, et compléter plutôt que dupliquer.)*

- [ ] **Step 4 : Vérifier**

Relire §5 et §6 en se demandant pour chaque phrase : *est-ce que ça devient faux quand quelqu'un livre un écran ?* Si oui, la phrase appartient à STATE.md.

- [ ] **Step 5 : Commiter**

```bash
git add docs/PRODUCT.md
git commit -m "docs(produit): la cible ne raconte plus l'avancement"
```

---

### Task 6 : Rafraîchir `docs/ARCHITECTURE.md`

**Files:**
- Modify: `docs/ARCHITECTURE.md` (§`.claude/`, plus deux ajouts de conventions)

**Interfaces:**
- Consumes: `docs/journal/2026-08-archive.md` (Task 3).
- Produces: les règles durables du projet, réunies là où on les cherche avant d'écrire du code.

- [ ] **Step 1 : Remettre §`.claude/` en conformité**

L'arborescence documentée ne montre qu'un hook et aucun agent. La réalité :

```bash
find .claude -maxdepth 2 -type f -not -path "*/skills/*" | sort
```

Attendu : `SKILLS.md`, `agents/convention-reviewer.md`, `agents/next-docs.md`, `hooks/biome-format.mjs`, `hooks/conventions-guard.mjs`, `settings.json`, `settings.local.json`. Mettre à jour le bloc d'arborescence et décrire en une ligne chacun des deux hooks et des deux agents. Mentionner `SKILLS.md` comme registre de provenance.

- [ ] **Step 2 : Écrire la convention « une panne d'API se rattrape hors du cache »**

Extraite de l'entrée du 15 août 2026 (archive). Deux règles, à poser dans la section frontière server / client :

1. Un repli de panne se fait **hors** du `"use cache"`, jamais dedans : un `null` mémorisé à l'intérieur laisserait l'écran vide une heure après le retour du service. La fonction cachée continue de lever, l'entrée n'est pas écrite, la visite suivante retente.
2. **Une erreur ne traverse pas `"use cache"` intacte** (Next 16.3) : côté appelant ce n'est plus l'instance d'origine mais un `Error` nu — `instanceof` répond `false`, les propriétés ajoutées valent `undefined`, seuls `name` et `message` survivent. D'où la catégorie portée par le `name` (`AniListOutageError`) et le prédicat `isAniListOutage`, qui ne regarde que lui.

Vérifier que la description colle au code avant de l'écrire :

```bash
grep -n "isAniListOutage\|AniListOutageError\|tryAniList" src/lib/http/anilist.ts
```

- [ ] **Step 3 : Vérifier que les gardes du proxy y sont déjà**

```bash
grep -n "proxy" docs/ARCHITECTURE.md
```

`CLAUDE.md` porte aujourd'hui trois règles sur `src/proxy.ts` (redirection optimiste seule, jamais de `getSession()`, jamais de porteur de cookie renvoyé hors des routes publiques). Elles doivent **exister dans ARCHITECTURE.md** avant que la Task 7 ne les allège dans `CLAUDE.md` : sinon la Task 7 les perd. Les y écrire si elles manquent, en renvoyant à `src/proxy.test.ts` qui les verrouille.

- [ ] **Step 4 : Commiter**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs(archi): les règles apprises en chemin rejoignent les conventions"
```

---

### Task 7 : Réduire `CLAUDE.md` à un aiguilleur

À faire **en dernier** : `CLAUDE.md` ne peut renvoyer vers les autres documents qu'une fois ceux-ci écrits.

**Files:**
- Modify: `CLAUDE.md` (131 lignes → environ 70)
- Modify: `docs/JOURNAL.md` (corps de l'entrée du 19 août)

**Interfaces:**
- Consumes: STATE.md (Task 4), PRODUCT.md (Task 5), ARCHITECTURE.md (Task 6).
- Produces: le fichier lu intégralement à chaque session.

- [ ] **Step 1 : Conserver le bloc Next.js à l'identique**

Le bloc « This is NOT the Next.js you know » est réécrit par `next dev` (`node_modules/next/dist/server/lib/generate-agent-files.js`). Il reste mot pour mot, en tête.

- [ ] **Step 2 : Écrire la table d'orientation**

Elle remplace les paragraphes d'introduction du produit et de la structure :

```markdown
| La question que tu te poses | Le fichier à ouvrir |
| --- | --- |
| Où on en est, ce qui existe, quoi faire ensuite | [docs/STATE.md](docs/STATE.md) |
| Quoi et pourquoi : périmètre, modèle de domaine, roadmap | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Comment : où poser un fichier, frontière server/client | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Ce qu'on a appris en chemin | [docs/JOURNAL.md](docs/JOURNAL.md) |
```

- [ ] **Step 3 : Ne garder que les règles non négociables**

Les règles actuelles sont bonnes : on les garde, on retire leurs justifications. Une règle qui explique son pourquoi sur trois lignes appartient à ARCHITECTURE.md ; `CLAUDE.md` en garde l'énoncé et le renvoi.

**Ne jamais retirer** une règle sans avoir vérifié qu'elle existe ailleurs. Avant de couper, pour chacune :

```bash
grep -n "<la règle>" docs/ARCHITECTURE.md docs/PRODUCT.md
```

Le hook `.claude/hooks/conventions-guard.mjs` applique une partie de ces règles par la machine. Vérifier ce qu'il couvre — ce qu'il refuse déjà n'a pas besoin d'être plaidé longuement dans le texte :

```bash
grep -n "message\|reason\|=>" .claude/hooks/conventions-guard.mjs | head -40
```

- [ ] **Step 4 : Garder la section Outillage**

Le bloc des commandes `pnpm` reste : c'est de l'information de tous les jours, chère à retrouver et courte à porter. Retirer en revanche les explications longues (le paragraphe sur `db:seed`, celui sur knip) au profit d'une ligne chacune — le détail va dans ARCHITECTURE.md.

- [ ] **Step 5 : Mesurer**

```bash
wc -l CLAUDE.md
```

Attendu : autour de 70 lignes, bloc Next.js compris. Si on dépasse 90, quelque chose qui n'est pas une règle non négociable est resté.

- [ ] **Step 6 : Écrire l'entrée du 19 août dans le journal**

Sous le titre posé à la Task 3, remplir le corps : ce qui a été fait, ce qui a été tranché en chemin (`_legacy-import.ts` gardé et écarté de knip ; knip repassé en `error` ; la cible et le réel séparés en deux fichiers), ce qui reste ouvert. Quelques lignes suffisent — et cette entrée est le premier test de la règle de rotation qu'elle inaugure.

- [ ] **Step 7 : Commiter**

```bash
git add CLAUDE.md docs/JOURNAL.md
git commit -m "docs(claude): le fichier lu à chaque session redevient court"
```

---

### Task 8 : Vérification finale

**Files:**
- Aucun. Cette tâche ne produit que des constats — et, s'il le faut, des corrections dans les fichiers des tâches précédentes.

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: la preuve que les critères de réussite de la spec §5 sont tenus.

- [ ] **Step 1 : Les quatre commandes**

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm knip
```

Attendu : les quatre au vert, knip **sans aucun signalement**. Si l'une échoue, la refonte a touché à autre chose que de la documentation : réparer avant de continuer.

- [ ] **Step 2 : Aucun lien mort**

```bash
grep -rno "](\.\{0,2\}/[^)]*)" CLAUDE.md docs/*.md
```

Vérifier que chaque cible existe. `docs/PRODUCT.md` et `docs/ARCHITECTURE.md` renvoyaient à `docs/JOURNAL.md` : le fichier existe toujours, mais les renvois qui visaient une **entrée précise** visent désormais l'archive. Les corriger.

- [ ] **Step 3 : Le coût d'entrée**

```bash
wc -c CLAUDE.md docs/STATE.md
```

Attendu : la somme reste sous **12 Ko**, soit environ 3 000 tokens — le critère de la spec §5.

- [ ] **Step 4 : Passer le diff au convention-reviewer**

Le dépôt a un agent dédié à cela (`.claude/agents/convention-reviewer.md`), qui relit un diff contre ARCHITECTURE.md et PRODUCT.md. Le lancer sur la branche. Il est le mieux placé pour voir une convention qu'on aurait décrite autrement qu'elle n'est appliquée.

- [ ] **Step 5 : Rendre la main**

Ne **pas** pousser ni fusionner. Présenter à Alexis : les fichiers touchés, le coût d'entrée mesuré, et ce qui reste ouvert. La décision d'intégration lui appartient.
