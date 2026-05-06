-- CreateEnum
CREATE TYPE "EntryRevisionKind" AS ENUM ('SUBMISSION', 'REVIEW');

-- CreateEnum
CREATE TYPE "EntryRevisionDecision" AS ENUM ('SIGNED', 'NEEDS_REVISION', 'REJECTED');

-- CreateTable
CREATE TABLE "EntryRevision" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" "EntryRevisionKind" NOT NULL,
    "snapshot" JSONB,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submittedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewerRole" TEXT,
    "decision" "EntryRevisionDecision",
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryRevision_entityType_entityId_version_idx" ON "EntryRevision"("entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "EntryRevision_ownerId_idx" ON "EntryRevision"("ownerId");

-- CreateIndex
CREATE INDEX "EntryRevision_reviewerId_idx" ON "EntryRevision"("reviewerId");

-- CreateIndex
CREATE INDEX "EntryRevision_entityType_ownerId_idx" ON "EntryRevision"("entityType", "ownerId");

-- AddForeignKey
ALTER TABLE "EntryRevision" ADD CONSTRAINT "EntryRevision_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryRevision" ADD CONSTRAINT "EntryRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
