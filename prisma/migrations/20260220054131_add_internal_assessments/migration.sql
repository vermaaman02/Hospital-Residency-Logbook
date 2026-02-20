-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('THEORY', 'PRACTICAL', 'VIVA', 'ASSIGNMENT', 'PROJECT', 'OTHER');

-- CreateTable
CREATE TABLE "InternalAssessment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assessmentType" "AssessmentType" NOT NULL DEFAULT 'OTHER',
    "batchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "resourceLinks" TEXT[],
    "maxMarks" INTEGER,
    "totalMarks" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSubmission" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" TEXT,
    "submittedAt" TIMESTAMP(3),
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentEvaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "evaluatedById" TEXT NOT NULL,
    "marks" DOUBLE PRECISION,
    "grade" TEXT,
    "feedback" TEXT,
    "rejectionReason" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalAssessment_batchId_idx" ON "InternalAssessment"("batchId");

-- CreateIndex
CREATE INDEX "InternalAssessment_createdById_idx" ON "InternalAssessment"("createdById");

-- CreateIndex
CREATE INDEX "InternalAssessment_isPublished_idx" ON "InternalAssessment"("isPublished");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_assessmentId_idx" ON "AssessmentSubmission"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_studentId_idx" ON "AssessmentSubmission"("studentId");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_status_idx" ON "AssessmentSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSubmission_assessmentId_studentId_key" ON "AssessmentSubmission"("assessmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentEvaluation_submissionId_key" ON "AssessmentEvaluation"("submissionId");

-- CreateIndex
CREATE INDEX "AssessmentEvaluation_evaluatedById_idx" ON "AssessmentEvaluation"("evaluatedById");

-- AddForeignKey
ALTER TABLE "InternalAssessment" ADD CONSTRAINT "InternalAssessment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAssessment" ADD CONSTRAINT "InternalAssessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InternalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvaluation" ADD CONSTRAINT "AssessmentEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssessmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvaluation" ADD CONSTRAINT "AssessmentEvaluation_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
