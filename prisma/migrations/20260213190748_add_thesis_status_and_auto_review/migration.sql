-- AlterTable
ALTER TABLE "Thesis" ADD COLUMN     "facultyRemark" TEXT,
ADD COLUMN     "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "HodAutoReviewSetting" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodAutoReviewSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HodAutoReviewSetting_category_key" ON "HodAutoReviewSetting"("category");
