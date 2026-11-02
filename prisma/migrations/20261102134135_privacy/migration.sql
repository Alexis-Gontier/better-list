-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PRIVATE', 'MEMBERS');

-- AlterTable
ALTER TABLE "lists" ADD COLUMN     "visibility" "ListVisibility" NOT NULL DEFAULT 'MEMBERS';

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "profileVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showActivityCalendar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showAdult" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showFavorites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showJournal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showStats" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "lists_visibility_idx" ON "lists"("visibility");
