-- CreateEnum
CREATE TYPE "FavoriteKind" AS ENUM ('MEDIA', 'CHARACTER', 'STAFF');

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "FavoriteKind" NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "mediaId" INTEGER,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_userId_kind_createdAt_idx" ON "favorites"("userId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_kind_anilistId_key" ON "favorites"("userId", "kind", "anilistId");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Les favoris posés par le jeu d'essai (seule source d'`Entry.favorite`) passent dans la table.
INSERT INTO "favorites" ("id", "userId", "kind", "anilistId", "mediaId", "createdAt")
SELECT 'fav_' || "id", "userId", 'MEDIA', "mediaId", "mediaId", "updatedAt"
FROM "entries"
WHERE "favorite" = true;

-- AlterTable
ALTER TABLE "entries" DROP COLUMN "favorite";
