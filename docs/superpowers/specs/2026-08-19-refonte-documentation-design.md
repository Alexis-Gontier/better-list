# Refonte du socle documentaire — design

**Date** : 19 août 2026 · **Statut** : validé, prêt pour le plan d'implémentation

## 1. Le problème

La documentation du projet est bonne sur le fond et inexploitable en pratique. Trois symptômes,
constatés et mesurés le 19 août 2026 :

- **Aucun document ne dit ce qui existe.** `PRODUCT.md` décrit une cible et une roadmap,
  `ARCHITECTURE.md` décrit des conventions. Rien ne croise *route ↔ feature ↔ modèle ↔
  avancement*. Un agent qui ouvre le dépôt redécouvre l'application à chaque session.
- **`JOURNAL.md` pèse 142 Ko** (1947 lignes, 34 entrées). Il contient de la mémoire réelle et
  personne — humain ou agent — ne la lit. Une connaissance qu'on ne peut pas charger n'existe pas.
- **Des affirmations périmées font autorité.** `PRODUCT.md` §5 affirme que `routes.ts` « n'a
  aujourd'hui ni recherche ni fiche média » ; les deux y sont. `ARCHITECTURE.md` §`.claude/`
  ignore `conventions-guard.mjs`, `agents/` et `SKILLS.md`, qui existent tous.

Le coût se paie en tokens à chaque session, et en travail refait quand un agent code à côté de
ce qui est déjà là.

## 2. L'état des lieux qui motive la refonte

Contrôles exécutés le 19 août 2026, avant toute modification :

| Contrôle | Résultat |
| --- | --- |
| `pnpm typecheck` | propre |
| `pnpm test` | 177 tests, 13 fichiers, tous verts |
| `pnpm lint` | 234 fichiers, aucune correction |
| `pnpm knip` | 1 fichier orphelin (`prisma/_legacy-import.ts`), 6 types exportés inutilisés |

Périmètre construit : 10 routes, 3 route handlers, 6 features (`media`, `tracking`, `lists`,
`profile`, `preferences`, `command`), 15 modèles Prisma.

**Le code est sain. C'est la documentation qui a dérivé, pas l'application.** Ce constat commande
la suite : on rafraîchit et on réorganise, on ne réécrit pas ce qui est bon.

## 3. Ce qu'on construit

Cinq documents, un rôle chacun, aucun recouvrement.

| Fichier | Question à laquelle il répond | Quand on le lit |
| --- | --- | --- |
| `CLAUDE.md` | Qu'ai-je le droit de faire, et où lire le reste ? | Chaque session, en entier |
| `docs/STATE.md` | Où en est-on, et qu'est-ce qui existe ? | Chaque session, en entier |
| `docs/PRODUCT.md` | Quoi, et pourquoi ? | À la demande |
| `docs/ARCHITECTURE.md` | Comment, et où poser un fichier ? | À la demande |
| `docs/JOURNAL.md` | Qu'a-t-on appris récemment ? | À la demande |

La séparation porte tout le design : **la cible et le réel ne partagent plus de fichier.** Les
affirmations périmées du §1 sont nées de leur mélange — un document qui décrit à la fois
l'intention et l'avancement périme sa moitié basse à chaque commit sans que rien ne le signale.

### 3.1 `CLAUDE.md` — l'aiguilleur

Cible : environ 70 lignes (contre 131). Ne conserve que les règles non négociables, déjà
correctes, et une table d'orientation « pour telle question, lis tel fichier ». Toute explication
ou justification descend dans `ARCHITECTURE.md`.

Le raisonnement : `CLAUDE.md` est le seul fichier payé intégralement à chaque session. Ce qui y
reste doit être ce dont un agent a besoin *avant* de savoir ce qu'il va faire.

### 3.2 `docs/STATE.md` — l'état des lieux (nouveau)

Le seul document qui décrive ce qui **est**. Quatre parties :

1. **La carte.** Un tableau par route : ses `_components`, les features consommées, les modèles
   Prisma touchés, et son état — `livré`, `partiel` ou `déclaré non construit`.
2. **Les six features.** Deux lignes chacune : ce qu'elle possède, ce qu'elle expose, ce dont
   elle dépend.
3. **Le contrôle de santé.** Les quatre commandes, leur résultat daté, et les écarts connus
   (les 6 types inutilisés, `/collection` déclarée dans `routes.ts` sans écran derrière).
4. **Le prochain pas.** Une seule chose. Au 19 août 2026 : appliquer `tryAniList` à `/search`,
   `/calendar` et `/media/[id]`, qui tombent encore en entier pendant une coupure AniList.

Règle d'entretien inscrite dans le fichier : **il se met à jour dans le commit qui le périme**,
jamais dans un passage de rattrapage. Un état des lieux tenu après coup est un journal, et on a
déjà vu ce que devient un journal qu'on ne relit pas.

### 3.3 `docs/PRODUCT.md` — rafraîchi, pas réécrit

Le fond est conservé. Trois opérations :

- corriger les affirmations périmées (§5 sur `routes.ts`) ;
- retirer de §5 et §6 tout ce qui décrit l'avancement — cette matière part dans `STATE.md` ;
- remonter les décisions produit tranchées dans le journal et jamais consignées ici : le repli du
  catalogue éditorialisé sur l'accueil, la mise de côté des vues et des tier lists.

### 3.4 `docs/ARCHITECTURE.md` — rafraîchi

Le fond est conservé. Deux opérations :

- remettre §`.claude/` à jour : les deux hooks, les deux agents, `SKILLS.md` ;
- accueillir les conventions durables extraites du journal — le repli de panne AniList rattrapé
  **hors** du `"use cache"`, la règle « une erreur ne traverse pas `"use cache"` intacte » (seuls
  `name` et `message` survivent, d'où `isAniListOutage`), les gardes du proxy.

Ces trois-là sont des règles, pas des anecdotes : elles doivent vivre là où on les cherche avant
d'écrire, pas dans une entrée datée qu'il faudrait avoir lue.

### 3.5 `docs/JOURNAL.md` et son archive

L'intégralité du texte actuel est déplacée sans perte dans `docs/journal/2026-08-archive.md`.
Le nouveau `JOURNAL.md` redémarre avec une entrée datée du 19 août 2026 — cette refonte — et une
règle de rotation en tête : **au-delà de 10 entrées ou 30 Ko, on archive**, et ce qui est durable
remonte dans `PRODUCT.md` ou `ARCHITECTURE.md` à ce moment-là.

L'archive ne coûte rien tant qu'on ne l'ouvre pas. C'est ce qui rend l'option supérieure à une
condensation : on ne paie pas une perte définitive pour des tokens que le déplacement économise
déjà.

## 4. Ordre d'exécution

0. **Commiter le chantier en cours** — 47 fichiers, +1788/−345, dont tout le travail accueil,
   carrousel et listes. Découpé en commits cohérents. Le sort de `prisma/_legacy-import.ts`
   (orphelin selon knip) est tranché avec Alexis avant le commit.
1. `docs/journal/2026-08-archive.md` + nouveau `JOURNAL.md`.
2. `docs/STATE.md`.
3. `PRODUCT.md` et `ARCHITECTURE.md` rafraîchis.
4. `CLAUDE.md` réduit à l'aiguilleur.

L'étape 0 vient en premier pour une raison : écrire « voici l'état du projet » au-dessus d'un
chantier que git ignore fabrique la prochaine péremption avant même que l'encre soit sèche.

## 5. Critères de réussite

- Un agent qui ouvre le dépôt sait ce qui existe, où on en est et ce qu'il a le droit de faire en
  lisant deux fichiers, pour un coût de l'ordre de 3 000 tokens.
- Aucune affirmation d'un des cinq documents n'est contredite par le code au moment de la
  livraison — vérifié fichier par fichier, pas supposé.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` et `pnpm knip` restent au vert : la refonte ne
  touche aucun code applicatif.
- Aucun texte du journal actuel n'est perdu.

## 6. Hors périmètre

- Le code applicatif : la refonte est documentaire.
- `.claude/skills/` et `.claude/hooks/` : ils fonctionnent, on les décrit sans les modifier.
- Une réécriture de fond de `PRODUCT.md` ou `ARCHITECTURE.md` : ils sont bons, et refaire du bon
  détruit de la valeur.
