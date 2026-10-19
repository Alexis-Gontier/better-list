# Skills du projet — provenance

Il n'existe **aucun fichier de lock pour les skills**. Rien ne s'écrit automatiquement quand on
ajoute une skill : une skill est un dossier avec un `SKILL.md`, sans version, sans somme de
contrôle, sans trace de son origine. (Les *plugins*, eux, sont suivis dans
`~/.claude/plugins/installed_plugins.json` avec version et commit — mais c'est un fichier
personnel, propre à la machine, qui ne voyage pas avec le dépôt.)

**Copier une skill dans `.claude/skills/` **est** donc le mécanisme de lock** : le contenu est
figé et versionné avec le projet. C'est le choix retenu ici, pour que le dépôt suffise sur une
machine neuve. La contrepartie est que ces copies ne recevront jamais les corrections amont.

Ce fichier remplace le lock manquant : il dit d'où vient chaque skill et quand elle a été copiée.
**À mettre à jour à chaque ajout ou rafraîchissement d'une skill.**

## Propres au projet — aucune source externe

| Skill | Rôle |
| --- | --- |
| `new-feature` | Créer une feature selon `CLAUDE.md` et `.claude/rules/` |
| `anilist-read` | Ajouter une lecture AniList : document, schéma, cache, quota. Ses `references/` portent l'inventaire des champs et des filtres AniList |
| `e2e-test` | Écrire un test Playwright ici : comptes de test, tag `@anilist`, lancement |

## Copies figées de skills externes

Copiées depuis les skills personnelles (`~/.claude/skills/`) le **7 août 2026**.

| Skill | Origine |
| --- | --- |
| `better-auth-best-practices` | Better Auth |
| `better-auth-security-best-practices` | Better Auth |
| `prisma-cli` | Prisma |
| `prisma-client-api` | Prisma |
| `upfetch` | up-fetch |

Ces cinq-là existent aussi en version personnelle sur la machine actuelle, donc **en double dans
la liste des skills**. Le doublon est le prix de la portabilité : il est assumé, pas accidentel.

Copiées le **11 octobre 2026**, pour les tests de bout en bout.

| Skill | Origine |
| --- | --- |
| `playwright-cli` | Microsoft — `pnpm dlx @playwright/cli@0.1.22 install --skills` |
| `playwright-best-practices` | currents.dev — github.com/currents-dev/playwright-best-practices-skill @ `283d5cb` (21 juillet 2026) |

`playwright-best-practices` existe aussi en version personnelle, **mais incomplète** : le seul
`SKILL.md`, sans les 58 fiches de référence vers lesquelles il renvoie. La copie du dépôt fait foi.
`playwright-cli` se rafraîchit en relançant sa commande à chaque montée de version de
`@playwright/test` ; elle a ajouté `.playwright-cli/` au `.gitignore`.

### Rafraîchir une copie

```bash
cp -r ~/.claude/skills/<nom> .claude/skills/<nom>
```

Puis mettre à jour la date ci-dessus. À faire quand la bibliothèque sous-jacente change de version
majeure — Better Auth, Prisma, up-fetch — pas au fil de l'eau.

## Retirées le 19 octobre 2026

`create-auth` et `prisma-database-setup` servaient à installer l'auth et la base, ce qui est fait.
`email-and-password-best-practices` décrivait un mode de connexion désactivé (GitHub seul). Si
l'un de ces besoins revient, recopier la skill depuis `~/.claude/skills/`.

## Agents

| Agent | Rôle |
| --- | --- |
| `convention-reviewer` | Relit un diff contre `CLAUDE.md`, `.claude/rules/` et `docs/decisions.md` |
| `next-docs` | Répond sur Next 16 depuis `node_modules/next/dist/docs/` |
