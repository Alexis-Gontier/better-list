-- AlterTable
ALTER TABLE "media" ADD COLUMN "synonyms" TEXT NOT NULL DEFAULT '';

-- Rattrapage : les lignes existantes n'ont pas encore de synonymes. On les déclare périmées plutôt
-- que d'écrire un script à part — le cron `refresh-media` les reprend, les plus anciennes d'abord
-- et dans ses plafonds de quota, et les remplit au passage.
UPDATE "media" SET "syncedAt" = TIMESTAMP '1970-01-01 00:00:00';
