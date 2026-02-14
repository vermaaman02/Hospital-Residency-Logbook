-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HOD', 'FACULTY', 'STUDENT');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('VC', 'FC', 'SC', 'NC');

-- CreateEnum
CREATE TYPE "CaseCategory" AS ENUM ('RESUSCITATION', 'RESUSCITATION_SPECIAL', 'CARDIOVASCULAR', 'VASCULAR', 'RESPIRATORY', 'NEUROLOGICAL', 'INFECTIOUS', 'METABOLIC_ENDOCRINE', 'TOXICOLOGICAL_ENVIRONMENTAL', 'HEMATOLOGICAL', 'ONCOLOGY_PALLIATIVE', 'PSYCHIATRIC_PSYCHOSOCIAL', 'GERIATRIC', 'DERMATOLOGICAL', 'RHEUMATOLOGICAL_ORTHOPEDIC', 'NEPHROLOGY_UROLOGY', 'GASTROENTEROLOGY_HEPATIC', 'SURGICAL', 'OBSTETRICS_GYNECOLOGICAL', 'ENT', 'OCULAR', 'TRAUMA', 'FORENSIC_DISASTER', 'PEDIATRIC');

-- CreateEnum
CREATE TYPE "CompetencyLevel" AS ENUM ('CBD', 'S', 'O', 'MS', 'MI');

-- CreateEnum
CREATE TYPE "ProcedureCategory" AS ENUM ('AIRWAY_ADULT', 'AIRWAY_ADULT_ALTERNATIVE', 'AIRWAY_PEDIATRIC_NEONATAL', 'BREATHING_VENTILATOR', 'NEEDLE_THORACOCENTESIS_ICD', 'PERIPHERAL_IV_ADULT', 'PERIPHERAL_IV_PEDIATRIC', 'CENTRAL_IV', 'CENTRAL_IV_PICC', 'ARTERIAL_PUNCTURE_ABG', 'INTRAOSSEOUS_VENOUS_CUTDOWN', 'HEMODYNAMIC_MONITORING_CVP', 'CARDIOVERSION_DEFIBRILLATION_ADULT', 'CARDIOVERSION_DEFIBRILLATION_PEDIATRIC', 'CPR_ADULT', 'PERICARDIOCENTESIS_CARDIAC_PACING', 'CPR_SPECIAL_PEDIATRIC_NEONATAL', 'NASOGASTRIC_TUBE', 'FOLEYS_CATHETERISATION', 'GUIDED_SUPRAPUBIC_CATHETERISATION', 'PARACENTESIS', 'LUMBAR_PUNCTURE', 'INCISION_DRAINAGE', 'PER_RECTAL_PROCTOSCOPY', 'PENILE_EMERGENCIES', 'NASAL_PACKING', 'ENT_DIAGNOSTIC_EXAMINATION', 'ENT_FOREIGN_BODY_REMOVAL', 'TRACHEOSTOMY_MANAGEMENT', 'WOUND_MANAGEMENT_SIMPLE_COMPLEX', 'WOUND_MANAGEMENT_ANIMAL_BITE', 'WOUND_MANAGEMENT_BURNS_AMPUTATION', 'CERVICAL_COLLAR', 'SPINAL_IMMOBILIZATION', 'PELVIC_STABILIZATION', 'SPLINTING_FRACTURES', 'PLASTER_TECHNIQUE', 'REDUCTION_DISLOCATION', 'OTHER_PROCEDURES', 'REGIONAL_ANAESTHESIA_NERVE_BLOCK', 'PROCEDURAL_SEDATION', 'MAXILLOFACIAL_DENTAL', 'EMERGENCY_BURR_HOLE_EVD', 'PER_VAGINAL_SPECULUM', 'VAGINAL_DELIVERY', 'SEXUAL_ABUSE_EXAMINATION', 'OPHTHALMIC_SLIT_LAMP', 'OPHTHALMIC_FB_REMOVAL', 'ANY_OTHER');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('S', 'O', 'A', 'PS', 'PI', 'TM', 'TL');

-- CreateEnum
CREATE TYPE "DiagnosticCategory" AS ENUM ('ABG_ANALYSIS', 'ECG_ANALYSIS', 'OTHER_DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "ImagingCategory" AS ENUM ('ULTRASOUND_ECHO_NON_TRAUMA', 'POCUS_TRAUMA', 'XRAY_CT_NON_TRAUMA', 'XRAY_CT_MRI_BRAIN', 'XRAY_CT_TRAUMA');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SIGNED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "PatientCategory" AS ENUM ('ADULT_NON_TRAUMA', 'ADULT_TRAUMA', 'PEDIATRIC_NON_TRAUMA', 'PEDIATRIC_TRAUMA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "batch" TEXT,
    "currentSemester" INTEGER DEFAULT 1,
    "department" TEXT DEFAULT 'Emergency Medicine',
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyStudentAssignment" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultyStudentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalSignature" (
    "id" TEXT NOT NULL,
    "signedById" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "remark" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationPosting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "rotationName" TEXT NOT NULL,
    "isElective" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalDuration" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "facultyRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thesis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT,
    "chiefGuide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThesisSemesterRecord" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "srJrMember" TEXT,
    "srMember" TEXT,
    "facultyMember" TEXT,

    CONSTRAINT "ThesisSemesterRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "batch" TEXT,
    "postedDepartment" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEntry" (
    "id" TEXT NOT NULL,
    "attendanceSheetId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "day" "DayOfWeek" NOT NULL,
    "presentAbsent" TEXT,
    "hodName" TEXT,

    CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasePresentation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "category" "PatientCategory",
    "facultyRemark" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasePresentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seminar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "category" "PatientCategory",
    "facultyRemark" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seminar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalClub" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "journalArticle" TEXT,
    "typeOfStudy" TEXT,
    "facultyRemark" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalSkillAdult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "skillName" TEXT NOT NULL,
    "representativeDiagnosis" TEXT,
    "confidenceLevel" "ConfidenceLevel",
    "totalTimesPerformed" INTEGER NOT NULL DEFAULT 0,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalSkillAdult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalSkillPediatric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "skillName" TEXT NOT NULL,
    "representativeDiagnosis" TEXT,
    "confidenceLevel" "ConfidenceLevel",
    "totalTimesPerformed" INTEGER NOT NULL DEFAULT 0,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalSkillPediatric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseManagementLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "CaseCategory" NOT NULL,
    "slNo" INTEGER NOT NULL,
    "caseSubCategory" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "competencyLevel" "CompetencyLevel",
    "totalCaseTally" INTEGER NOT NULL DEFAULT 0,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "facultyRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseManagementLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "procedureCategory" "ProcedureCategory" NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "procedureDescription" TEXT,
    "performedAtLocation" TEXT,
    "skillLevel" "SkillLevel",
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diagnosticCategory" "DiagnosticCategory" NOT NULL,
    "slNo" INTEGER NOT NULL,
    "skillName" TEXT NOT NULL,
    "representativeDiagnosis" TEXT,
    "confidenceLevel" "ConfidenceLevel",
    "totalTimesPerformed" INTEGER NOT NULL DEFAULT 0,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imagingCategory" "ImagingCategory" NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "procedureDescription" TEXT,
    "performedAtLocation" TEXT,
    "skillLevel" "SkillLevel",
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "procedureDescription" TEXT,
    "performedAtLocation" TEXT,
    "skillLevel" "SkillLevel",
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "procedureDescription" TEXT,
    "performedAtLocation" TEXT,
    "skillLevel" "SkillLevel",
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadNewsLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "patientInfo" TEXT,
    "completeDiagnosis" TEXT,
    "procedureDescription" TEXT,
    "performedAtLocation" TEXT,
    "skillLevel" "SkillLevel",
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadNewsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAttended" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "courseName" TEXT,
    "conductedAt" TEXT,
    "confidenceLevel" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAttended_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceParticipation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "conferenceName" TEXT,
    "conductedAt" TEXT,
    "participationRole" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConferenceParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "activity" TEXT,
    "conductedAt" TEXT,
    "participationRole" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisasterDrill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "description" TEXT,
    "roleInActivity" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisasterDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityImprovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "description" TEXT,
    "roleInActivity" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityImprovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentEvaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "reviewNo" INTEGER NOT NULL,
    "knowledgeScore" INTEGER,
    "clinicalSkillScore" INTEGER,
    "proceduralSkillScore" INTEGER,
    "softSkillScore" INTEGER,
    "researchScore" INTEGER,
    "theoryMarks" TEXT,
    "practicalMarks" TEXT,
    "description" TEXT,
    "roleInActivity" TEXT,
    "facultyRemark" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingMentoringRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "remarks" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingMentoringRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "FacultyStudentAssignment_facultyId_idx" ON "FacultyStudentAssignment"("facultyId");

-- CreateIndex
CREATE INDEX "FacultyStudentAssignment_studentId_idx" ON "FacultyStudentAssignment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyStudentAssignment_facultyId_studentId_semester_key" ON "FacultyStudentAssignment"("facultyId", "studentId", "semester");

-- CreateIndex
CREATE INDEX "DigitalSignature_entityType_entityId_idx" ON "DigitalSignature"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DigitalSignature_signedById_idx" ON "DigitalSignature"("signedById");

-- CreateIndex
CREATE INDEX "RotationPosting_userId_idx" ON "RotationPosting"("userId");

-- CreateIndex
CREATE INDEX "RotationPosting_status_idx" ON "RotationPosting"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Thesis_userId_key" ON "Thesis"("userId");

-- CreateIndex
CREATE INDEX "ThesisSemesterRecord_thesisId_idx" ON "ThesisSemesterRecord"("thesisId");

-- CreateIndex
CREATE INDEX "AttendanceSheet_userId_idx" ON "AttendanceSheet"("userId");

-- CreateIndex
CREATE INDEX "AttendanceSheet_status_idx" ON "AttendanceSheet"("status");

-- CreateIndex
CREATE INDEX "AttendanceEntry_attendanceSheetId_idx" ON "AttendanceEntry"("attendanceSheetId");

-- CreateIndex
CREATE INDEX "CasePresentation_userId_idx" ON "CasePresentation"("userId");

-- CreateIndex
CREATE INDEX "CasePresentation_status_idx" ON "CasePresentation"("status");

-- CreateIndex
CREATE INDEX "Seminar_userId_idx" ON "Seminar"("userId");

-- CreateIndex
CREATE INDEX "Seminar_status_idx" ON "Seminar"("status");

-- CreateIndex
CREATE INDEX "JournalClub_userId_idx" ON "JournalClub"("userId");

-- CreateIndex
CREATE INDEX "JournalClub_status_idx" ON "JournalClub"("status");

-- CreateIndex
CREATE INDEX "ClinicalSkillAdult_userId_idx" ON "ClinicalSkillAdult"("userId");

-- CreateIndex
CREATE INDEX "ClinicalSkillAdult_status_idx" ON "ClinicalSkillAdult"("status");

-- CreateIndex
CREATE INDEX "ClinicalSkillPediatric_userId_idx" ON "ClinicalSkillPediatric"("userId");

-- CreateIndex
CREATE INDEX "ClinicalSkillPediatric_status_idx" ON "ClinicalSkillPediatric"("status");

-- CreateIndex
CREATE INDEX "CaseManagementLog_userId_idx" ON "CaseManagementLog"("userId");

-- CreateIndex
CREATE INDEX "CaseManagementLog_category_idx" ON "CaseManagementLog"("category");

-- CreateIndex
CREATE INDEX "CaseManagementLog_status_idx" ON "CaseManagementLog"("status");

-- CreateIndex
CREATE INDEX "ProcedureLog_userId_idx" ON "ProcedureLog"("userId");

-- CreateIndex
CREATE INDEX "ProcedureLog_procedureCategory_idx" ON "ProcedureLog"("procedureCategory");

-- CreateIndex
CREATE INDEX "ProcedureLog_status_idx" ON "ProcedureLog"("status");

-- CreateIndex
CREATE INDEX "DiagnosticSkill_userId_idx" ON "DiagnosticSkill"("userId");

-- CreateIndex
CREATE INDEX "DiagnosticSkill_diagnosticCategory_idx" ON "DiagnosticSkill"("diagnosticCategory");

-- CreateIndex
CREATE INDEX "DiagnosticSkill_status_idx" ON "DiagnosticSkill"("status");

-- CreateIndex
CREATE INDEX "ImagingLog_userId_idx" ON "ImagingLog"("userId");

-- CreateIndex
CREATE INDEX "ImagingLog_imagingCategory_idx" ON "ImagingLog"("imagingCategory");

-- CreateIndex
CREATE INDEX "ImagingLog_status_idx" ON "ImagingLog"("status");

-- CreateIndex
CREATE INDEX "TransportLog_userId_idx" ON "TransportLog"("userId");

-- CreateIndex
CREATE INDEX "TransportLog_status_idx" ON "TransportLog"("status");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");

-- CreateIndex
CREATE INDEX "ConsentLog_status_idx" ON "ConsentLog"("status");

-- CreateIndex
CREATE INDEX "BadNewsLog_userId_idx" ON "BadNewsLog"("userId");

-- CreateIndex
CREATE INDEX "BadNewsLog_status_idx" ON "BadNewsLog"("status");

-- CreateIndex
CREATE INDEX "CourseAttended_userId_idx" ON "CourseAttended"("userId");

-- CreateIndex
CREATE INDEX "CourseAttended_status_idx" ON "CourseAttended"("status");

-- CreateIndex
CREATE INDEX "ConferenceParticipation_userId_idx" ON "ConferenceParticipation"("userId");

-- CreateIndex
CREATE INDEX "ConferenceParticipation_status_idx" ON "ConferenceParticipation"("status");

-- CreateIndex
CREATE INDEX "ResearchActivity_userId_idx" ON "ResearchActivity"("userId");

-- CreateIndex
CREATE INDEX "ResearchActivity_status_idx" ON "ResearchActivity"("status");

-- CreateIndex
CREATE INDEX "DisasterDrill_userId_idx" ON "DisasterDrill"("userId");

-- CreateIndex
CREATE INDEX "DisasterDrill_status_idx" ON "DisasterDrill"("status");

-- CreateIndex
CREATE INDEX "QualityImprovement_userId_idx" ON "QualityImprovement"("userId");

-- CreateIndex
CREATE INDEX "QualityImprovement_status_idx" ON "QualityImprovement"("status");

-- CreateIndex
CREATE INDEX "ResidentEvaluation_userId_idx" ON "ResidentEvaluation"("userId");

-- CreateIndex
CREATE INDEX "ResidentEvaluation_semester_idx" ON "ResidentEvaluation"("semester");

-- CreateIndex
CREATE INDEX "ResidentEvaluation_status_idx" ON "ResidentEvaluation"("status");

-- CreateIndex
CREATE INDEX "TrainingMentoringRecord_userId_idx" ON "TrainingMentoringRecord"("userId");

-- CreateIndex
CREATE INDEX "TrainingMentoringRecord_status_idx" ON "TrainingMentoringRecord"("status");

-- AddForeignKey
ALTER TABLE "FacultyStudentAssignment" ADD CONSTRAINT "FacultyStudentAssignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyStudentAssignment" ADD CONSTRAINT "FacultyStudentAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalSignature" ADD CONSTRAINT "DigitalSignature_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationPosting" ADD CONSTRAINT "RotationPosting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thesis" ADD CONSTRAINT "Thesis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThesisSemesterRecord" ADD CONSTRAINT "ThesisSemesterRecord_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "Thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSheet" ADD CONSTRAINT "AttendanceSheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_attendanceSheetId_fkey" FOREIGN KEY ("attendanceSheetId") REFERENCES "AttendanceSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePresentation" ADD CONSTRAINT "CasePresentation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seminar" ADD CONSTRAINT "Seminar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalClub" ADD CONSTRAINT "JournalClub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalSkillAdult" ADD CONSTRAINT "ClinicalSkillAdult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalSkillPediatric" ADD CONSTRAINT "ClinicalSkillPediatric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseManagementLog" ADD CONSTRAINT "CaseManagementLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureLog" ADD CONSTRAINT "ProcedureLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticSkill" ADD CONSTRAINT "DiagnosticSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingLog" ADD CONSTRAINT "ImagingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportLog" ADD CONSTRAINT "TransportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadNewsLog" ADD CONSTRAINT "BadNewsLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttended" ADD CONSTRAINT "CourseAttended_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceParticipation" ADD CONSTRAINT "ConferenceParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchActivity" ADD CONSTRAINT "ResearchActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisasterDrill" ADD CONSTRAINT "DisasterDrill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityImprovement" ADD CONSTRAINT "QualityImprovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentEvaluation" ADD CONSTRAINT "ResidentEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingMentoringRecord" ADD CONSTRAINT "TrainingMentoringRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
