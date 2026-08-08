-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('ANIME', 'MANGA');

-- CreateEnum
CREATE TYPE "MediaFormat" AS ENUM ('TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS');

-- CreateEnum
CREATE TYPE "MediaSeason" AS ENUM ('WINTER', 'SPRING', 'SUMMER', 'FALL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScoreFormat" AS ENUM ('POINT_100', 'POINT_10', 'POINT_5');

-- CreateEnum
CREATE TYPE "TitleLanguage" AS ENUM ('ROMAJI', 'ENGLISH', 'NATIVE');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED', 'REPEATING');

-- CreateEnum
CREATE TYPE "EntryEventType" AS ENUM ('PROGRESS', 'STATUS_CHANGED', 'SCORED', 'NOTE', 'REPEAT_STARTED');

-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PRIVATE', 'UNLISTED');

-- CreateEnum
CREATE TYPE "ListViewType" AS ENUM ('RANKED', 'TIERS', 'GRID');

-- CreateEnum
CREATE TYPE "VolumeCondition" AS ENUM ('NEW', 'GOOD', 'WORN', 'DAMAGED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" TEXT NOT NULL,
    "scoreFormat" "ScoreFormat" NOT NULL DEFAULT 'POINT_10',
    "titleLanguage" "TitleLanguage" NOT NULL DEFAULT 'ROMAJI',
    "includeAdult" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "media" (
    "id" INTEGER NOT NULL,
    "type" "MediaType" NOT NULL,
    "format" "MediaFormat",
    "status" "MediaStatus",
    "countryOfOrigin" CHAR(2),
    "titleRomaji" TEXT,
    "titleEnglish" TEXT,
    "titleNative" TEXT,
    "coverImage" TEXT,
    "coverColor" VARCHAR(9),
    "bannerImage" TEXT,
    "episodes" INTEGER,
    "chapters" INTEGER,
    "volumes" INTEGER,
    "season" "MediaSeason",
    "seasonYear" INTEGER,
    "genres" TEXT[],
    "meanScore" INTEGER,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'PLANNING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressVolumes" INTEGER,
    "score" INTEGER,
    "repeatCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_events" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EntryEventType" NOT NULL,
    "progressFrom" INTEGER,
    "progressTo" INTEGER,
    "statusFrom" "EntryStatus",
    "statusTo" "EntryStatus",
    "score" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "ListVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "forkedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "rank" TEXT NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_views" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ListViewType" NOT NULL DEFAULT 'RANKED',
    "tiers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_view_items" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "tierIndex" INTEGER,
    "rank" TEXT NOT NULL,

    CONSTRAINT "list_view_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editions" (
    "id" TEXT NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "publisher" TEXT,
    "volumesTotal" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owned_volumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMP(3),
    "price" DECIMAL(8,2),
    "condition" "VolumeCondition",
    "notes" TEXT,
    "lentToId" TEXT,
    "lentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owned_volumes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "media_type_status_idx" ON "media"("type", "status");

-- CreateIndex
CREATE INDEX "media_seasonYear_season_idx" ON "media"("seasonYear", "season");

-- CreateIndex
CREATE INDEX "media_status_syncedAt_idx" ON "media"("status", "syncedAt");

-- CreateIndex
CREATE INDEX "entries_userId_status_idx" ON "entries"("userId", "status");

-- CreateIndex
CREATE INDEX "entries_userId_updatedAt_idx" ON "entries"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "entries_userId_mediaId_key" ON "entries"("userId", "mediaId");

-- CreateIndex
CREATE INDEX "entry_events_userId_createdAt_idx" ON "entry_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "entry_events_entryId_createdAt_idx" ON "entry_events"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "lists_visibility_idx" ON "lists"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "lists_ownerId_slug_key" ON "lists"("ownerId", "slug");

-- CreateIndex
CREATE INDEX "list_items_listId_rank_idx" ON "list_items"("listId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "list_items_listId_mediaId_key" ON "list_items"("listId", "mediaId");

-- CreateIndex
CREATE INDEX "list_views_listId_idx" ON "list_views"("listId");

-- CreateIndex
CREATE INDEX "list_view_items_viewId_tierIndex_rank_idx" ON "list_view_items"("viewId", "tierIndex", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "list_view_items_viewId_listItemId_key" ON "list_view_items"("viewId", "listItemId");

-- CreateIndex
CREATE INDEX "editions_mediaId_idx" ON "editions"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "editions_mediaId_label_key" ON "editions"("mediaId", "label");

-- CreateIndex
CREATE INDEX "owned_volumes_userId_idx" ON "owned_volumes"("userId");

-- CreateIndex
CREATE INDEX "owned_volumes_editionId_idx" ON "owned_volumes"("editionId");

-- CreateIndex
CREATE INDEX "owned_volumes_lentToId_idx" ON "owned_volumes"("lentToId");

-- CreateIndex
CREATE UNIQUE INDEX "owned_volumes_userId_editionId_number_key" ON "owned_volumes"("userId", "editionId", "number");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_events" ADD CONSTRAINT "entry_events_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_events" ADD CONSTRAINT "entry_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_views" ADD CONSTRAINT "list_views_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_view_items" ADD CONSTRAINT "list_view_items_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "list_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_view_items" ADD CONSTRAINT "list_view_items_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editions" ADD CONSTRAINT "editions_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_volumes" ADD CONSTRAINT "owned_volumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_volumes" ADD CONSTRAINT "owned_volumes_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_volumes" ADD CONSTRAINT "owned_volumes_lentToId_fkey" FOREIGN KEY ("lentToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
