-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LIST_LIKED', 'LIST_FORKED', 'SIGNUP_PENDING');

-- CreateTable
CREATE TABLE "list_likes" (
    "userId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "listId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "list_likes_listId_idx" ON "list_likes"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "list_likes_userId_listId_key" ON "list_likes"("userId", "listId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_readAt_createdAt_idx" ON "notifications"("recipientId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
