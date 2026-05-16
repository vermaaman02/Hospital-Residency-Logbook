-- CreateEnum
CREATE TYPE "MobilePlatform" AS ENUM ('IOS', 'ANDROID');

-- DropIndex
DROP INDEX "EntryRevision_entityType_entityId_version_idx";

-- CreateTable
CREATE TABLE "MobilePushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "MobilePlatform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilePushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushToken_token_key" ON "MobilePushToken"("token");

-- CreateIndex
CREATE INDEX "MobilePushToken_userId_idx" ON "MobilePushToken"("userId");

-- CreateIndex
CREATE INDEX "MobilePushToken_platform_idx" ON "MobilePushToken"("platform");

-- CreateIndex
CREATE INDEX "AttendanceEntry_attendanceSheetId_date_idx" ON "AttendanceEntry"("attendanceSheetId", "date");

-- CreateIndex
CREATE INDEX "EntryRevision_entityType_entityId_version_idx" ON "EntryRevision"("entityType", "entityId", "version" DESC);

-- AddForeignKey
ALTER TABLE "MobilePushToken" ADD CONSTRAINT "MobilePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
