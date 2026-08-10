-- Le partage d'une liste n'a plus qu'une source de vérité : le jeton.
--
-- `visibility` (PRIVATE / UNLISTED) et un jeton de partage auraient dit le même fait deux fois, et
-- deux colonnes pour un fait finissent par se contredire — une liste `UNLISTED` sans jeton n'étant
-- partagée avec personne, et une liste `PRIVATE` avec un jeton étant lisible par qui a le lien.
-- Une liste est désormais partagée si et seulement si `shareToken IS NOT NULL`.
--
-- Écrite à la main : `prisma migrate dev` refuse de tourner sans terminal interactif dès qu'il
-- détecte une colonne à supprimer contenant des valeurs, et `--create-only` bute sur le même
-- garde-fou. Appliquée par `migrate deploy`.

-- Aucune donnée à reprendre : le partage n'a jamais été servi, donc aucune liste n'a pu être
-- ouverte par un lien. Les `UNLISTED` existantes sont des intentions sans effet, pas des liens en
-- circulation — les convertir en jetons publierait des listes que personne n'a encore partagées.
-- L'index `lists_visibility_idx` disparaît avec la colonne qu'il portait.
ALTER TABLE "lists" DROP COLUMN "visibility";

DROP TYPE "ListVisibility";

ALTER TABLE "lists" ADD COLUMN "shareToken" TEXT;

-- Unique, mais nullable : PostgreSQL laisse cohabiter autant de `NULL` qu'on veut dans un index
-- unique, donc toutes les listes non partagées y tiennent sans se gêner. C'est cet index qui rend
-- la lecture par jeton immédiate, et qui garantit qu'un jeton désigne au plus une liste.
CREATE UNIQUE INDEX "lists_shareToken_key" ON "lists"("shareToken");
