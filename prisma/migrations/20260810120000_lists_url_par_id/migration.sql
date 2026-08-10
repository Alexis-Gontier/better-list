-- Une liste s'adresse par son `id` (`/lists/[id]`) : le slug n'a plus d'usage.
--
-- Il portait l'URL et devait donc être unique par propriétaire. L'index composite qui l'imposait
-- servait aussi de chemin d'accès à `where: { ownerId }` ; il est remplacé par un index sur
-- (ownerId, updatedAt), qui est exactement l'ordre dans lequel la page d'index lit les listes.

-- DropIndex
DROP INDEX "lists_ownerId_slug_key";

-- AlterTable
ALTER TABLE "lists" DROP COLUMN "slug";

-- CreateIndex
CREATE INDEX "lists_ownerId_updatedAt_idx" ON "lists"("ownerId", "updatedAt");
