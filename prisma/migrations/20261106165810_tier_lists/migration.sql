/*
  Warnings:

  - You are about to drop the `list_view_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `list_views` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "ListKind" ADD VALUE 'TIER';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LIST_VERSIONED';

-- DropForeignKey
ALTER TABLE "list_view_items" DROP CONSTRAINT "list_view_items_listItemId_fkey";

-- DropForeignKey
ALTER TABLE "list_view_items" DROP CONSTRAINT "list_view_items_viewId_fkey";

-- DropForeignKey
ALTER TABLE "list_views" DROP CONSTRAINT "list_views_listId_fkey";

-- AlterTable
ALTER TABLE "list_items" ADD COLUMN     "tierIndex" INTEGER;

-- AlterTable
ALTER TABLE "lists" ADD COLUMN     "tiers" JSONB,
ADD COLUMN     "versionOfId" TEXT;

-- DropTable
DROP TABLE "list_view_items";

-- DropTable
DROP TABLE "list_views";

-- DropEnum
DROP TYPE "ListViewType";

-- CreateIndex
CREATE INDEX "list_items_listId_tierIndex_rank_idx" ON "list_items"("listId", "tierIndex", "rank");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_versionOfId_fkey" FOREIGN KEY ("versionOfId") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
