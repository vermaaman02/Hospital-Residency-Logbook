# AIIMS Patna - PG Residency Digital Logbook

## Project Roadmap

> **Institution:** All India Institute of Medical Sciences (AIIMS), Patna, Bihar
> **Department:** Emergency Medicine (MD Emergency Medicine)
> **Purpose:** Digitize the entire PG Residency Logbook into a modern, role-based web application — replacing the physical paper logbook with a comprehensive digital platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Authentication & Role-Based Access (Clerk)](#3-authentication--role-based-access-clerk)
4. [UI/UX Theme — Hospital Theme](#4-uiux-theme--hospital-theme)
5. [Database Schema (PostgreSQL + Prisma)](#5-database-schema-postgresql--prisma)
6. [Complete Module Breakdown (Every Form/Log from the Logbook)](#6-complete-module-breakdown-every-formlog-from-the-logbook)
7. [Detailed Feature List Per Module](#7-detailed-feature-list-per-module)
8. [API Route Design](#8-api-route-design)
9. [Deployment on Railway](#9-deployment-on-railway)
10. [Development Phases & Timeline](#10-development-phases--timeline)
11. [Folder Structure](#11-folder-structure)
12. [Environment Variables](#12-environment-variables)
13. [Testing Strategy](#13-testing-strategy)
14. [Future Scope](#14-future-scope)

---

## 1. Project Overview

### What is this project?

This is a **digital PG Residency Logbook** for MD Emergency Medicine residents at **AIIMS Patna**. Currently, residents maintain a physical paper logbook containing:

- Rotation posting records
- Weekly attendance sheets
- Case management logs across 25+ medical specialties
- Procedure logs across 40+ procedure types
- Diagnostic skill logs (ABG, ECG, Lab investigations)
- Imaging analysis logs (Ultrasound, X-Ray, CT, MRI)
- Academic records (seminars, journal clubs, case presentations)
- Thesis tracking
- Resident evaluation records
- Conference/course participation
- Quality improvement & disaster management activities

**This project digitizes ALL of the above** — zero forms missed — into a web application with role-based access for **HOD**, **Faculty**, and **Students (Residents)**.

### Key Goals

- **100% coverage** of every form, table, and log in the physical PG Logbook
- Role-based workflows for submissions, reviews, and approvals
- Digital signatures replacing physical signatures
- Real-time dashboards and progress tracking
- Export to PDF for university submissions
- Mobile-responsive for bedside/on-call logging

---

## 2. Tech Stack & Architecture

### Frontend

| Technology                          | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| **Next.js 14+**                     | Full-stack React framework (App Router)   |
| **TypeScript**                      | Type safety across the entire codebase    |
| **Tailwind CSS**                    | Utility-first styling (hospital theme)    |
| **shadcn/ui**                       | Accessible, pre-built UI components       |
| **React Hook Form**                 | Form handling (critical — many forms)     |
| **Zod**                             | Schema validation for all form inputs     |
| **Lucide React**                    | Icon system                               |
| **Recharts**                        | Charts for evaluation graphs & dashboards |
| **react-pdf / @react-pdf/renderer** | PDF export of logbook pages               |

### Backend

| Technology             | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| **Next.js API Routes** | Server-side API (App Router route handlers) |
| **PostgreSQL**         | Primary relational database                 |
| **Prisma ORM**         | Type-safe database access & migrations      |
| **Clerk**              | Authentication & user management            |

### Infrastructure & Deployment

| Technology                   | Purpose                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| **Railway.app**              | Hosting (Next.js app + PostgreSQL)                               |
| **Railway PostgreSQL**       | Managed PostgreSQL instance                                      |
| **Clerk Cloud**              | Auth service (hosted)                                            |
| **Uploadthing / Cloudinary** | File uploads (if needed for signatures/images)                   |
| **GitHub**                   | Version control (repo: `vermaaman02/Hospital-Residency-Logbook`) |

### Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│                    CLERK AUTH                         │
│          (HOD / Faculty / Student roles)              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              NEXT.JS 14 (App Router)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Pages &   │  │  Server      │  │  API Route  │  │
│  │   Layouts   │  │  Components  │  │  Handlers   │  │
│  └─────────────┘  └──────────────┘  └──────┬─────┘  │
│                                            │         │
│  ┌─────────────────────────────────────────▼──────┐  │
│  │              PRISMA ORM                         │  │
│  └─────────────────────────────────────────┬──────┘  │
└────────────────────────────────────────────┼─────────┘
                                             │
┌────────────────────────────────────────────▼─────────┐
│              POSTGRESQL (Railway)                     │
└──────────────────────────────────────────────────────┘
```

---

## 3. Authentication & Role-Based Access (Clerk)

### Why Clerk?

- Pre-built UI components (Sign In, Sign Up, User Profile)
- Role & permission management via Clerk Organizations
- Middleware-level route protection in Next.js
- Webhook support for syncing users to our PostgreSQL database

### Three Roles

| Role        | Code      | Description                                                                                                                                     |
| ----------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **HOD**     | `hod`     | Head of Department — can view all residents, approve/review logs, manage faculty, view department-wide analytics, final sign-off on evaluations |
| **Faculty** | `faculty` | Supervising faculty — can review & sign off on assigned residents' logs, add remarks, conduct evaluations, view their assigned residents        |
| **Student** | `student` | PG Resident (MD EM student) — can create/edit their own log entries, view their progress, request faculty sign-off                              |

### Clerk Setup Details

1. **Clerk Organization:** Create an org for "AIIMS Patna - Dept of Emergency Medicine"
2. **Clerk Roles:** Define custom roles `hod`, `faculty`, `student` in Clerk Dashboard
3. **Clerk Metadata:** Store `role`, `batch`, `semester`, `department` in user public metadata
4. **Clerk Webhooks:** On user creation → create corresponding record in our `User` table in PostgreSQL
5. **Middleware Protection:**
   - `/dashboard/hod/*` → only `hod` role
   - `/dashboard/faculty/*` → only `faculty` role
   - `/dashboard/student/*` → only `student` role
   - `/api/*` → authenticated + role-checked per route

### Permission Matrix

| Action                                 | Student   | Faculty        | HOD       |
| -------------------------------------- | --------- | -------------- | --------- |
| Create own log entries                 | Yes       | —              | —         |
| Edit own log entries (before sign-off) | Yes       | —              | —         |
| View own logs                          | Yes       | —              | —         |
| View assigned students' logs           | —         | Yes            | Yes       |
| View ALL students' logs                | —         | —              | Yes       |
| Add remarks to student logs            | —         | Yes            | Yes       |
| Digitally sign off on log entries      | —         | Yes            | Yes       |
| Manage faculty assignments             | —         | —              | Yes       |
| View department analytics              | —         | Partial        | Yes       |
| Manage rotation postings               | —         | —              | Yes       |
| Export reports                         | Yes (own) | Yes (assigned) | Yes (all) |
| Manage batches & semesters             | —         | —              | Yes       |
| Approve attendance                     | —         | Yes            | Yes       |
| Conduct semester evaluations           | —         | Yes            | Yes       |
| Final evaluation sign-off              | —         | —              | Yes       |

---

## 4. UI/UX Theme — Hospital Theme

### Design Philosophy

The design should evoke **trust, professionalism, and clinical precision** — reminiscent of the AIIMS Patna hospital environment.

### Color Palette

| Token          | Color         | Hex       | Usage                                   |
| -------------- | ------------- | --------- | --------------------------------------- |
| Primary        | Hospital Blue | `#0066CC` | Headers, buttons, links                 |
| Primary Dark   | Deep Navy     | `#003D7A` | Hover states, sidebar                   |
| Secondary      | Medical Teal  | `#00897B` | Success states, badges                  |
| Accent         | Emergency Red | `#D32F2F` | Alerts, critical items, required fields |
| Background     | Clean White   | `#FAFBFC` | Page backgrounds                        |
| Surface        | Soft Gray     | `#F0F2F5` | Card backgrounds                        |
| Text Primary   | Dark Charcoal | `#1A1A2E` | Body text                               |
| Text Secondary | Medium Gray   | `#6B7280` | Labels, placeholders                    |
| Border         | Light Gray    | `#E5E7EB` | Table borders, dividers                 |
| Warning        | Amber         | `#F59E0B` | Pending status                          |
| Success        | Green         | `#10B981` | Approved/Completed status               |

### Typography

- **Headings:** Inter (Bold/Semi-Bold)
- **Body:** Inter (Regular)
- **Monospace/Data:** JetBrains Mono (for UHID numbers, dates)

### Layout Components

1. **Sidebar Navigation** — Persistent left sidebar with:
   - AIIMS Patna logo at top
   - Role indicator badge
   - Collapsible menu groups matching logbook sections
   - Quick stats (pending reviews count for faculty, completion % for students)

2. **Top Bar** — Contains:
   - Breadcrumb navigation
   - Notification bell (pending sign-offs, remarks)
   - User avatar with Clerk UserButton
   - Current semester/batch indicator

3. **Dashboard Cards** — Hospital-style stat cards:
   - Rounded corners, subtle shadow
   - Icon + count + label
   - Color-coded by status (pending = amber, approved = green, total = blue)

4. **Data Tables** — Clinical log tables:
   - Zebra striping (alternate row colors)
   - Sticky headers
   - Sort, filter, search
   - Pagination
   - Status badges (Pending / Signed / Remarks Added)

5. **Forms** — Clinical data entry forms:
   - Grouped fieldsets matching physical logbook layout
   - Auto-save drafts
   - Confidence level selectors (VC/FC/SC/NC) as radio groups
   - Competency level selectors (CBD/S/O/MS/MI) as dropdown
   - Date pickers
   - Patient info fields (Name, Age, Sex, UHID)
   - Digital signature button (faculty click to sign)

6. **AIIMS Patna Branding:**
   - AIIMS Patna official logo in sidebar header
   - "Department of Emergency Medicine" subtitle
   - "PG Residency Digital Logbook" title
   - Footer: "All India Institute of Medical Sciences, Patna, Bihar"

### Mobile Responsive

- Sidebar collapses to bottom tab navigation on mobile
- Forms stack vertically
- Tables become scrollable cards on small screens
- Quick-add floating action button for logging procedures bedside

---

## 5. Database Schema (PostgreSQL + Prisma)

### Core Models

```prisma
// ============== USER & AUTH ==============

model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  firstName     String
  lastName      String
  role          Role     @default(STUDENT)
  batch         String?  // e.g., "July 2022"
  currentSemester Int?   @default(1)
  department    String?  @default("Emergency Medicine")
  profileImage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  rotationPostings     RotationPosting[]
  attendanceSheets     AttendanceSheet[]
  casePresentations    CasePresentation[]
  seminars             Seminar[]
  journalClubs         JournalClub[]
  clinicalSkillsAdult  ClinicalSkillAdult[]
  clinicalSkillsPediatric ClinicalSkillPediatric[]
  caseManagementLogs   CaseManagementLog[]
  procedureLogs        ProcedureLog[]
  diagnosticSkills     DiagnosticSkill[]
  imagingLogs          ImagingLog[]
  coursesAttended      CourseAttended[]
  conferenceParticipation ConferenceParticipation[]
  researchActivities   ResearchActivity[]
  disasterDrills       DisasterDrill[]
  qualityImprovement   QualityImprovement[]
  evaluations          ResidentEvaluation[]
  thesis               Thesis?
  transportLogs        TransportLog[]
  consentLogs          ConsentLog[]
  badNewsLogs          BadNewsLog[]

  // Faculty relations
  assignedStudents     FacultyStudentAssignment[] @relation("FacultyAssignments")
  assignedFaculty      FacultyStudentAssignment[] @relation("StudentAssignments")
  signedEntries        DigitalSignature[]
}

enum Role {
  HOD
  FACULTY
  STUDENT
}

model FacultyStudentAssignment {
  id          String   @id @default(cuid())
  facultyId   String
  studentId   String
  semester    Int
  createdAt   DateTime @default(now())

  faculty     User     @relation("FacultyAssignments", fields: [facultyId], references: [id])
  student     User     @relation("StudentAssignments", fields: [studentId], references: [id])

  @@unique([facultyId, studentId, semester])
}

// ============== DIGITAL SIGNATURE ==============

model DigitalSignature {
  id           String   @id @default(cuid())
  signedById   String
  signedBy     User     @relation(fields: [signedById], references: [id])
  entityType   String   // e.g., "RotationPosting", "CaseManagementLog", etc.
  entityId     String   // ID of the signed record
  remark       String?
  signedAt     DateTime @default(now())

  @@index([entityType, entityId])
}

// ============== MODULE 1: ROTATION POSTINGS ==============

model RotationPosting {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  slNo            Int
  rotationName    String   // e.g., "Emergency Medicine", "Critical Care"
  isElective      Boolean  @default(false)
  startDate       DateTime?
  endDate         DateTime?
  totalDuration   String?
  status          EntryStatus @default(DRAFT)
  facultyRemark   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============== MODULE 2: THESIS TRACKING ==============

model Thesis {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  topic           String?
  chiefGuide      String?
  semesterRecords ThesisSemesterRecord[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ThesisSemesterRecord {
  id            String   @id @default(cuid())
  thesisId      String
  thesis        Thesis   @relation(fields: [thesisId], references: [id])
  semester      Int      // 1-6
  srJrMember    String?
  srMember      String?
  facultyMember String?
}

// ============== MODULE 3: ATTENDANCE ==============

model AttendanceSheet {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  weekStartDate   DateTime
  weekEndDate     DateTime
  batch           String?
  postedDepartment String?
  entries         AttendanceEntry[]
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model AttendanceEntry {
  id                String   @id @default(cuid())
  attendanceSheetId String
  attendanceSheet   AttendanceSheet @relation(fields: [attendanceSheetId], references: [id], onDelete: Cascade)
  date              DateTime?
  day               DayOfWeek
  presentAbsent     String?  // "Present", "Absent", or remarks
  hodName           String?
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

// ============== MODULE 4: ACADEMIC RECORDS ==============

model CasePresentation {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  slNo            Int
  date            DateTime?
  patientInfo     String?  // Name/Age/Sex/UHID
  completeDiagnosis String?
  category        PatientCategory?
  facultyRemark   String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Seminar {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  slNo            Int
  date            DateTime?
  patientInfo     String?
  completeDiagnosis String?
  category        PatientCategory?
  facultyRemark   String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model JournalClub {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  slNo            Int
  date            DateTime?
  journalArticle  String?
  typeOfStudy     String?
  facultyRemark   String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============== MODULE 5: CLINICAL SKILL TRAINING ==============

model ClinicalSkillAdult {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  slNo                  Int
  skillName             String   // e.g., "Initial Assessment Non-Trauma"
  representativeDiagnosis String?
  confidenceLevel       ConfidenceLevel?
  totalTimesPerformed   Int      @default(0)
  status                EntryStatus @default(DRAFT)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model ClinicalSkillPediatric {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  slNo                  Int
  skillName             String
  representativeDiagnosis String?
  confidenceLevel       ConfidenceLevel?
  totalTimesPerformed   Int      @default(0)
  status                EntryStatus @default(DRAFT)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum ConfidenceLevel {
  VC  // Very Confident
  FC  // Fairly Confident
  SC  // Slightly Confident
  NC  // Not Confident
}

// ============== MODULE 6: CASE MANAGEMENT LOGS ==============

model CaseManagementLog {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  category            CaseCategory
  slNo                Int
  caseSubCategory     String   // e.g., "Acute Airway Obstruction"
  date                DateTime?
  patientInfo         String?  // Name/Age/Sex/UHID
  completeDiagnosis   String?
  competencyLevel     CompetencyLevel?
  totalCaseTally      Int      @default(0)
  status              EntryStatus @default(DRAFT)
  facultyRemark       String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum CaseCategory {
  RESUSCITATION
  RESUSCITATION_SPECIAL
  CARDIOVASCULAR
  VASCULAR
  RESPIRATORY
  NEUROLOGICAL
  INFECTIOUS
  METABOLIC_ENDOCRINE
  TOXICOLOGICAL_ENVIRONMENTAL
  HEMATOLOGICAL
  ONCOLOGY_PALLIATIVE
  PSYCHIATRIC_PSYCHOSOCIAL
  GERIATRIC
  DERMATOLOGICAL
  RHEUMATOLOGICAL_ORTHOPEDIC
  NEPHROLOGY_UROLOGY
  GASTROENTEROLOGY_HEPATIC
  SURGICAL
  OBSTETRICS_GYNECOLOGICAL
  ENT
  OCULAR
  TRAUMA
  FORENSIC_DISASTER
  PEDIATRIC
}

enum CompetencyLevel {
  CBD  // Case Based Discussion
  S    // Simulation
  O    // Observed
  MS   // Managed under Supervision
  MI   // Managed Independently
}

// ============== MODULE 7: PROCEDURE LOGS ==============

model ProcedureLog {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  procedureCategory   ProcedureCategory
  slNo                Int
  date                DateTime?
  patientInfo         String?
  completeDiagnosis   String?
  procedureDescription String?
  performedAtLocation String?
  skillLevel          SkillLevel?
  status              EntryStatus @default(DRAFT)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum ProcedureCategory {
  AIRWAY_ADULT
  AIRWAY_ADULT_ALTERNATIVE
  AIRWAY_PEDIATRIC_NEONATAL
  BREATHING_VENTILATOR
  NEEDLE_THORACOCENTESIS_ICD
  PERIPHERAL_IV_ADULT
  PERIPHERAL_IV_PEDIATRIC
  CENTRAL_IV
  CENTRAL_IV_PICC
  ARTERIAL_PUNCTURE_ABG
  INTRAOSSEOUS_VENOUS_CUTDOWN
  HEMODYNAMIC_MONITORING_CVP
  CARDIOVERSION_DEFIBRILLATION_ADULT
  CARDIOVERSION_DEFIBRILLATION_PEDIATRIC
  CPR_ADULT
  PERICARDIOCENTESIS_CARDIAC_PACING
  CPR_SPECIAL_PEDIATRIC_NEONATAL
  NASOGASTRIC_TUBE
  FOLEYS_CATHETERISATION
  GUIDED_SUPRAPUBIC_CATHETERISATION
  PARACENTESIS
  LUMBAR_PUNCTURE
  INCISION_DRAINAGE
  PER_RECTAL_PROCTOSCOPY
  PENILE_EMERGENCIES
  NASAL_PACKING
  ENT_DIAGNOSTIC_EXAMINATION
  ENT_FOREIGN_BODY_REMOVAL
  TRACHEOSTOMY_MANAGEMENT
  WOUND_MANAGEMENT_SIMPLE_COMPLEX
  WOUND_MANAGEMENT_ANIMAL_BITE
  WOUND_MANAGEMENT_BURNS_AMPUTATION
  CERVICAL_COLLAR
  SPINAL_IMMOBILIZATION
  PELVIC_STABILIZATION
  SPLINTING_FRACTURES
  PLASTER_TECHNIQUE
  REDUCTION_DISLOCATION
  OTHER_PROCEDURES
  REGIONAL_ANAESTHESIA_NERVE_BLOCK
  PROCEDURAL_SEDATION
  MAXILLOFACIAL_DENTAL
  EMERGENCY_BURR_HOLE_EVD
  PER_VAGINAL_SPECULUM
  VAGINAL_DELIVERY
  SEXUAL_ABUSE_EXAMINATION
  OPHTHALMIC_SLIT_LAMP
  OPHTHALMIC_FB_REMOVAL
  ANY_OTHER
}

enum SkillLevel {
  S    // Simulation
  O    // Observed
  A    // Assisted
  PS   // Performed under Supervision
  PI   // Performed Independently
  TM   // Team Member (for CPR)
  TL   // Team Leader (for CPR)
}

// ============== MODULE 8: DIAGNOSTIC SKILLS ==============

model DiagnosticSkill {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  diagnosticCategory    DiagnosticCategory
  slNo                  Int
  skillName             String   // e.g., "Respiratory Acidosis acute/chronic"
  representativeDiagnosis String?
  confidenceLevel       ConfidenceLevel?
  totalTimesPerformed   Int      @default(0)
  status                EntryStatus @default(DRAFT)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum DiagnosticCategory {
  ABG_ANALYSIS
  ECG_ANALYSIS
  OTHER_DIAGNOSTIC
}

// ============== MODULE 9: IMAGING LOGS ==============

model ImagingLog {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  imagingCategory     ImagingCategory
  slNo                Int
  date                DateTime?
  patientInfo         String?
  completeDiagnosis   String?
  procedureDescription String?
  performedAtLocation String?
  skillLevel          SkillLevel?
  status              EntryStatus @default(DRAFT)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum ImagingCategory {
  ULTRASOUND_ECHO_NON_TRAUMA
  POCUS_TRAUMA
  XRAY_CT_NON_TRAUMA
  XRAY_CT_MRI_BRAIN
  XRAY_CT_TRAUMA
}

// ============== MODULE 10: OTHER LOGS ==============

model TransportLog {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  slNo                Int
  date                DateTime?
  patientInfo         String?
  completeDiagnosis   String?
  procedureDescription String?
  performedAtLocation String?
  skillLevel          SkillLevel?
  status              EntryStatus @default(DRAFT)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model ConsentLog {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  slNo                Int
  date                DateTime?
  patientInfo         String?
  completeDiagnosis   String?
  procedureDescription String?
  performedAtLocation String?
  skillLevel          SkillLevel?
  status              EntryStatus @default(DRAFT)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model BadNewsLog {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  slNo                Int
  date                DateTime?
  patientInfo         String?
  completeDiagnosis   String?
  procedureDescription String?
  performedAtLocation String?
  skillLevel          SkillLevel?
  status              EntryStatus @default(DRAFT)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

// ============== MODULE 11: COURSES & CONFERENCES ==============

model CourseAttended {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  slNo            Int
  date            DateTime?
  courseName      String?
  conductedAt     String?
  confidenceLevel String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ConferenceParticipation {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  slNo              Int
  date              DateTime?
  conferenceName    String?
  conductedAt       String?
  participationRole String?
  status            EntryStatus @default(DRAFT)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model ResearchActivity {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  slNo              Int
  date              DateTime?
  activity          String?
  conductedAt       String?
  participationRole String?
  status            EntryStatus @default(DRAFT)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ============== MODULE 12: DISASTER & QUALITY ==============

model DisasterDrill {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  slNo            Int
  date            DateTime?
  description     String?
  roleInActivity  String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model QualityImprovement {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  slNo            Int
  date            DateTime?
  description     String?
  roleInActivity  String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============== MODULE 13: RESIDENT EVALUATION ==============

model ResidentEvaluation {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  semester        Int      // 1-6
  reviewNo        Int      // 1 or 2 per semester

  // 5 domains, each scored 1-5
  knowledgeScore      Int?  // 1-5
  clinicalSkillScore  Int?  // 1-5
  proceduralSkillScore Int? // 1-5
  softSkillScore      Int?  // 1-5
  researchScore       Int?  // 1-5

  // End semester assessment
  theoryMarks     String?
  practicalMarks  String?

  description     String?
  roleInActivity  String?
  facultyRemark   String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============== MODULE 14: RESIDENT TRAINING & MENTORING ==============

model TrainingMentoringRecord {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  semester        Int
  // Points 1-5 scale as described in logbook
  score           Int      // 1=Requires remedial, 2=Inconsistent, 3=Meets, 4=Exceeds, 5=Exceptional
  remarks         String?
  status          EntryStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============== SHARED ENUMS ==============

enum EntryStatus {
  DRAFT
  SUBMITTED
  SIGNED
  REJECTED
  NEEDS_REVISION
}

enum PatientCategory {
  ADULT_NON_TRAUMA
  ADULT_TRAUMA
  PEDIATRIC_NON_TRAUMA
  PEDIATRIC_TRAUMA
}
```

---

## 6. Complete Module Breakdown (Every Form/Log from the Logbook)

**CRITICAL: Every single form from the physical logbook is listed below. None are missed.**

### A. ADMINISTRATIVE MODULES

| #   | Module                                   | Logbook Section                          | Fields                                                                                                                          |
| --- | ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Rotation Postings**                    | Log of Rotation Postings During PG in EM | Sl No, Rotation Name (20 departments), Date, Total Duration, Faculty Signature                                                  |
| A2  | **Thesis Tracking**                      | Thesis Topic/Guide/Semester Records      | Topic, Chief Guide, Per-semester: SR/JR Member, SR Member, Faculty Member (Semesters 1-6)                                       |
| A3  | **Weekly Attendance**                    | Attendance Sheet for Clinical Posting    | Student Name, Week Range, Batch, Posted Department, Daily entries (Mon-Sun): Date, Day, Present/Absent, HoD Name, HoD Signature |
| A4  | **Resident Training & Mentoring Record** | 5-point scale evaluation                 | Points 1-5 rating with descriptions                                                                                             |

### B. ACADEMIC MODULES

| #   | Module                                | Logbook Section                                          | Fields                                                                                                                      |
| --- | ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| B1  | **Academic Case Presentation**        | Academic Case Presentation and Discussion (20 entries)   | Sl No, Date, Patient Name/Age/Sex/UHID, Complete Diagnosis, Adult/Pediatric/Non-Trauma/Trauma, Faculty Remark, Faculty Sign |
| B2  | **Seminar/Evidence Based Discussion** | Seminar/Evidence Based Discussion Presented (10 entries) | Sl No, Date, Patient Name/Age/Sex/UHID, Complete Diagnosis, Category, Faculty Remark, Faculty Sign                          |
| B3  | **Journal Club**                      | Journal Club Discussion/Critical Appraisal (10 entries)  | Sl No, Date, Journal Article, Type of Study, Faculty Remark, Faculty Sign                                                   |

### C. CLINICAL SKILL TRAINING

| #   | Module                          | Logbook Section                            | Skills Tracked                                                                                                                                                                                                                                         |
| --- | ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | **Clinical Skills - Adult**     | Log of Clinical Skill Training (Adult)     | 10 skills: Initial Assessment Non-Trauma, Initial Assessment Trauma, Secondary Survey, General Physical Exam, Respiratory Exam, Cardiovascular Exam, CNS/PNS Exam, Per Abdominal/Uro/Gynec Exam, ENT/Ophthalmological Exam, Musculoskeletal/Joint Exam |
| C2  | **Clinical Skills - Pediatric** | Log of Clinical Skill Training (Pediatric) | Same 10 skills as adult, adapted for pediatric patients                                                                                                                                                                                                |

### D. CASE MANAGEMENT LOGS (25 Categories, 300+ case types)

| #   | Module                      | Category                                  | Number of Case Types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Resuscitation               | Resuscitation                             | 10 (Acute Airway Obstruction, Anaphylaxis, Unresponsive Patient, Resp Distress, Cardio-Resp Arrest, Hemorrhagic Shock, Hypovolemic Shock, Obstructive Shock, Distributive/Septic Shock, Choking)                                                                                                                                                                                                                                                                                                                                                    |
| D2  | Resuscitation - Special     | Resuscitation in Special Circumstances    | 10 (Cardiac arrest in pregnancy, Neuroprotective Resuscitation, Damage Control, Massive Transfusion, Abdominal Compartment Syndrome, Morbidly Obese, Immunocompromised, Pain Management, Brain Death, Organ Donation)                                                                                                                                                                                                                                                                                                                               |
| D3  | Cardiovascular              | Cardiovascular Emergencies                | 20 (Chest Pain, Breathlessness, Palpitations, Syncope, ACS, ACS mechanical complications, Acute HF, Tachy-arrhythmia, Brady-arrhythmia, Pericarditis, Cardiac Tamponade, Valvular HD, Prosthetic Valve, Myocarditis, Rheumatic Fever, Endocarditis, Hypertensive Emergency, Pacemaker Emergency, PE, RV dysfunction)                                                                                                                                                                                                                                |
| D4  | Vascular                    | Vascular Emergencies                      | 5 (Aortic Dissection, AAA, Acute Limb Ischemia, PVD, DVT)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D5  | Respiratory                 | Respiratory Emergencies                   | 10 (Dyspnoea, Hemoptysis, COPD exacerbation, Severe Asthma, ARDS, Pneumonia, Pneumothorax, Effusion/Empyema, Mediastinitis, FB Respiratory)                                                                                                                                                                                                                                                                                                                                                                                                         |
| D6  | Neurological                | Neurological Emergencies                  | 20 (Anterior Stroke, Posterior Stroke, TIA, CNS Hemorrhage, Seizure/Status Epilepticus, Headache, Altered Mental Status, Vertigo, Cranial Nerve Palsy, Meningitis/Encephalitis, Cavernous Sinus Thrombosis, Ascending/Descending Paralysis, Compressive Myelopathy, Non-Compressive Myelopathy, Myasthenia Crisis, Peripheral Neuropathy, Parkinson's, Multiple Sclerosis, CNS Tumors, VP Shunt)                                                                                                                                                    |
| D7  | Infectious                  | Infectious Emergencies                    | 20 (Fever, Tropical Infections, Sepsis/MODS, HIV, TB, Respiratory Infections, GI Infections, Varicella/Zoster, Hemorrhagic Fever, Viral Hepatitis, Tetanus, Rabies, Toxic Shock, Gas Gangrene, Skin/Soft Tissue, Parasites, STIs, Needle Stick, Immunocompromised Infections, HAIs)                                                                                                                                                                                                                                                                 |
| D8  | Metabolic/Endocrine         | Metabolic and Endocrine Emergencies       | 15 (Hypoglycemia, DKA, Hyperosmolar Coma, Thyrotoxicosis, Myxoedema Coma, Adrenal Disorders, Pituitary Disorders, Diabetic Foot, Hyponatremia, Hypernatremia, Hypocalcemia, Hypercalcemia, Hyper/Hypokalemia, Acid-Base, RTA)                                                                                                                                                                                                                                                                                                                       |
| D9  | Toxicological/Environmental | Toxicological & Environmental Emergencies | 26 (Unknown Toxin/Toxidrome, Insecticides, Ethanol/Toxic Alcohols, Opioids, Plant Toxins, Hydrocarbons, Corrosives, CO/Cyanide, Methemoglobinemia, Heavy Metals, Industrial Chemicals, Drug Overdose, Beta/CCB Overdose, Paracetamol, Serotonin Syndrome, NMS, Battery Ingestion, Snake Bite, Scorpion, Bee Sting, Animal Bite, Heat Stroke, Hypothermia, High Altitude, Diving, Drowning)                                                                                                                                                          |
| D10 | Hematological               | Hematological Emergencies                 | 10 (Severe Anemia, Thrombocytopenia/Pancytopenia, Bleeding Disorders, DIC, Anticoagulation Bleeding, Sickle Cell, Transfusion Reaction, Acute Hematological Malignancy, Febrile Neutropenia, Stem Cell Transplant)                                                                                                                                                                                                                                                                                                                                  |
| D11 | Oncology/Palliative         | Oncology & Palliative Care Emergencies    | 10 (Hyperleukocytosis, Tumor Lysis, SVC Syndrome, Airway Obstruction Oncology, Tumor Bleeding, Cord Compression, Metastatic/SIADH/Hypercalcemia, Goals of Care, Palliative Care, End of Life)                                                                                                                                                                                                                                                                                                                                                       |
| D12 | Psychiatric                 | Psychiatric & Psycho-Social Emergencies   | 10 (Agitated/Violent Patient, Anxiety/Somatoform, Delirium/Psychosis, Self-Harm/Suicide, Substance Abuse, Bipolar/Schizophrenia, Depression, Eating Disorders, IPV/Sexual Abuse, Transgender)                                                                                                                                                                                                                                                                                                                                                       |
| D13 | Geriatric                   | Geriatric Emergencies                     | 8 (Comprehensive Geriatric Assessment, Dementia/Delirium, Falls, Mobility, Acute Confusion, Polypharmacy, Fragility Fractures, Elder Abuse)                                                                                                                                                                                                                                                                                                                                                                                                         |
| D14 | Dermatological              | Dermatological Emergencies                | 10 (Urticaria/Eczema, Drug Reaction/DRESS, SJS, TEN, Bullous Disorders, Skin Manifestation of Systemic Illness, Exanthemas/Purpura, Skin Infections, Genital Lesions, Pressure Sores)                                                                                                                                                                                                                                                                                                                                                               |
| D15 | Rheumatological/Orthopedic  | Rheumatological & Non-Traumatic Ortho     | 20 (Vasculitis, APLA, Kawasaki, Rheum Organ Disease, Immunotherapy, Neck Pain, Back Pain, Spinal Infections, Epidural Abscess, Cauda Equina, Joint Pain, Osteomyelitis, Septic Arthritis, Crystal Arthropathy, Limb Tumor, Nerve Palsy Upper, Nerve Palsy Lower, Hand/Foot Infection, Bursitis, Prosthesis)                                                                                                                                                                                                                                         |
| D16 | Nephrology/Urology          | Nephrology & Urology Emergencies          | 16 (AKI, CKD, UTI, Prostatitis, Pyelonephritis, Post-Transplant, Hematuria, Urinary Retention, Nephrolithiasis, Obstructive Uropathy, Scrotal/Testicular Pain, Torsion, Phimosis/Paraphimosis, Priapism, Bladder/Urethral Injury, STIs)                                                                                                                                                                                                                                                                                                             |
| D17 | GI/Hepatic                  | Gastroenterology & Hepatic Emergencies    | 10 (Hepatitis/ALF, CLD Emergencies, Alcoholic Liver, Upper GI Bleed, Lower GI Bleed, IBD, Liver Abscess, Pancreatitis, Cholangitis, Non-Surgical Abdomen)                                                                                                                                                                                                                                                                                                                                                                                           |
| D18 | Surgical                    | Surgical Emergencies                      | 10 (Bowel Obstruction, Perforation Peritonitis, Cholecystitis/Appendicitis, Mesenteric Ischemia, Abdominal Mass, GI Malignancy, Hernia, Anorectal Abscess, Rectal Prolapse, Necrotizing Fasciitis)                                                                                                                                                                                                                                                                                                                                                  |
| D19 | Obstetrics/Gynecology       | OB/GYN Emergencies                        | 18 (Lower Abdominal Pain, Vaginal Bleeding Non-Pregnant, Vaginal Bleeding Pregnant, Ectopic, Abortion, APH, Pre-eclampsia/Eclampsia, HELLP, Labour, Hyperemesis, Infections in Pregnancy, PPH, Puerperal Sepsis, PID/STI, Emergency Contraception, Genital Injury/FB, OHSS, Gynec Malignancy)                                                                                                                                                                                                                                                       |
| D20 | ENT                         | ENT Emergencies                           | 10 (Upper Airway Obstruction, Epistaxis, Throat Pain, FB ENT, Ear Pain/ASOM/CSOM, Hearing Loss/Vertigo, Sinusitis, Tracheostomy, Facial Palsy, Salivary Gland)                                                                                                                                                                                                                                                                                                                                                                                      |
| D21 | Ocular                      | Ocular Emergencies                        | 10 (Red Eye, Painful Vision Loss, Painless Vision Loss, Orbital Cellulitis, FB Eye, Blunt Ocular Trauma, Penetrating Ocular, Chemical Injury, Glaucoma, Diplopia)                                                                                                                                                                                                                                                                                                                                                                                   |
| D22 | Trauma                      | Trauma                                    | 30 (Trauma Resuscitation, Minor Head Injury, Moderate/Severe Head Injury, Neck Injury, Blunt Thoracic, Penetrating Thoracic, Blunt Abdominal, Penetrating Abdominal, Pelvic Male, Pelvic Female, Spine, Maxillofacial, Vascular, Joint, Upper Extremity, Lower Extremity, Compartment Syndrome, Burns/Inhalation, Electrical Burns, Blast, Hand Injuries, Amputation, Soft Tissue/Musculotendinous, Trauma Elderly, Trauma Pregnancy, Pediatric Trauma, Fat Embolism, Dental, Traumatic Cardiac Arrest-Blunt, Traumatic Cardiac Arrest-Penetrating) |
| D23 | Forensic/Disaster           | Forensic Aspects & Disaster               | 10 (Medico-legal, Wound Exam/Grievous Injury, Brought Dead/Signs of Death, Hanging, Homicidal, Bullet Injury, Rape Examination, Terrorist Response, CBRN, Mass Gathering)                                                                                                                                                                                                                                                                                                                                                                           |
| D24 | Pediatric                   | Pediatric Emergencies                     | 30 (Newborn Care, Neonatal Resuscitation, Preterm, Neonatal Sepsis, Neonatal Jaundice, Sick Child/Shock, Pediatric CPR Arrest, Fever, Croup/Epiglottitis, LRTI/Pneumonia, Asthma/Bronchiolitis, FB Ingestion, Childhood Exanthems, Sepsis, Gastroenteritis/Dehydration, Meningitis/CNS, Seizure, Cyanotic CHD, Acyanotic CHD, Pain Abdomen, Surgical Abdomen, Pediatric DKA, Unconscious Child, Poisoning, Incessant Crying, Failure to Thrive, Limping Child, Procedural Sedation, BRUE/SUDIC, Child Abuse)                                        |

### E. PROCEDURE LOGS (48 Categories, 1000+ entry slots)

| #   | Procedure Category                                              | Max Entries in Logbook |
| --- | --------------------------------------------------------------- | ---------------------- |
| E1  | Airway Management - Adult Trauma & Non-Trauma                   | 90                     |
| E2  | Airway Management - Adult Alternative (Surgical & Non-Surgical) | 20                     |
| E3  | Airway Management - Pediatric & Neonatal                        | 20                     |
| E4  | Breathing & Ventilator Management - Adult/Pediatric             | 100                    |
| E5  | Needle Thoracocentesis / ICD Insertion                          | 20                     |
| E6  | Peripheral IV Access - Adult                                    | 50                     |
| E7  | Peripheral IV Access - Pediatric/Neonatal                       | 30                     |
| E8  | Central IV Access - Adult/Pediatric                             | 10                     |
| E9  | Central IV Access - PICC Line etc.                              | 10                     |
| E10 | Arterial Puncture / ABG / Arterial Line                         | 60                     |
| E11 | Intraosseous Access / Venous Cut Down / Sheath Catheter         | 10                     |
| E12 | Hemodynamic Monitoring: CVP / Invasive Arterial BP              | 20                     |
| E13 | Cardioversion / Defibrillation - Adult                          | 40                     |
| E14 | Cardioversion / Defibrillation - Pediatric/Neonatal             | 10                     |
| E15 | CPR - Adult Non-Trauma/Trauma                                   | 80                     |
| E16 | Pericardiocentesis / Cardiac Pacing                             | 10                     |
| E17 | CPR - Special Scenario / Pediatric / Neonatal / Pregnant        | 20                     |
| E18 | Nasogastric Tube Insertion - Adult/Pediatric                    | 50                     |
| E19 | Foley's Catheterisation - Adult/Pediatric                       | 30                     |
| E20 | Guided / Supra-pubic Catheterisation                            | 10                     |
| E21 | Paracentesis: Thoracic/Abdominal                                | 20                     |
| E22 | Lumbar Puncture - Adult/Pediatric                               | 10                     |
| E23 | Incision & Drainage of Abscess                                  | 10                     |
| E24 | Per Rectal / Proctoscopy Examination                            | 10                     |
| E25 | Penile Emergencies Management                                   | 10                     |
| E26 | Nasal Packing                                                   | 10                     |
| E27 | ENT Diagnostic Examination                                      | 10                     |
| E28 | ENT Foreign Body Removal                                        | 10                     |
| E29 | Tracheostomy Tube Management                                    | 10                     |
| E30 | Wound Management - Simple/Complex Wounds                        | 40                     |
| E31 | Wound Management - Animal Bite                                  | 10                     |
| E32 | Wound Management - Burns/Amputation/Nail Injury                 | 10                     |
| E33 | Cervical Collar Application                                     | 20                     |
| E34 | Spinal Immobilization                                           | 10                     |
| E35 | Pelvic Stabilization                                            | 10                     |
| E36 | Splinting of Fractures                                          | 30                     |
| E37 | Plaster Technique                                               | 10                     |
| E38 | Reduction of Dislocation                                        | 10                     |
| E39 | Other Procedures (Joint Aspiration, Fasciotomy, Traction)       | 10                     |
| E40 | Regional Anaesthesia / Nerve Block                              | 10                     |
| E41 | Procedural Sedation & Analgesia                                 | 20                     |
| E42 | Maxillofacial / Dental Injury Management                        | 10                     |
| E43 | Emergency Burr Hole / External Ventricular Drain                | 10                     |
| E44 | Per Vaginal / Speculum Examination                              | 10                     |
| E45 | Conducting Vaginal Delivery                                     | 10                     |
| E46 | Examination of Sexual Abuse Victim                              | 10                     |
| E47 | Ophthalmic Slit Lamp Examination / Tonometry                    | 10                     |
| E48 | Ophthalmic Foreign Body Removal                                 | 10                     |
| E49 | Any Other Procedure                                             | 30                     |

### F. DIAGNOSTIC SKILL LOGS

| #   | Module               | Items                                                                                                                                                                                                                                             |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **ABG Analysis**     | 10 types: Resp Acidosis, Resp Alkalosis, HAGMA, NAGMA, Met Alkalosis, Mixed Acid-Base, Mixed with Albumin Correction, Oxygenation Interpretation, Co-oximetry/MetHb, Osmolar Gap                                                                  |
| F2  | **ECG Analysis**     | 10 types: Normal ECG, Brady Arrhythmias, Conduction Disorders, Narrow Complex Tachy, Wide Complex Tachy, Cardiac Arrest Rhythm, ACS, Electrolyte, Syncope/Channelopathies, Toxicology ECG                                                         |
| F3  | **Other Diagnostic** | 10 types: Hemogram, Peripheral Smear, Biochemical (Renal/Liver), Point of Care Biomarkers, Urine Dipstick/Microscopy, Fluid Analysis (Pleural/Peritoneal/CSF), Tropical Fever Investigations, Toxicological Investigations, PFT/PEFR, NCS/EEG/EMG |

### G. IMAGING LOGS

| #   | Module                                     | Max Entries |
| --- | ------------------------------------------ | ----------- |
| G1  | Ultrasound & Echocardiography - Non-Trauma | 60          |
| G2  | Point of Care Ultrasound (POCUS) - Trauma  | 50          |
| G3  | X-Ray / CT Scan - Non-Trauma               | 40          |
| G4  | X-Ray / CT / MRI Brain - Non-Trauma        | 10          |
| G5  | X-Ray / CT Scan - Trauma                   | 50          |

### H. PROFESSIONAL DEVELOPMENT

| #   | Module                           | Logbook Section                                   | Max Entries |
| --- | -------------------------------- | ------------------------------------------------- | ----------- |
| H1  | **Life Support & Skill Courses** | Courses Attended                                  | 10          |
| H2  | **Conference Participation**     | Conference & Academic Activity                    | 10          |
| H3  | **Research/Teaching/Community**  | Other Activities                                  | 10          |
| H4  | **Disaster Management Drills**   | Major Incident/Disaster/Mass Casualty/Prehospital | 10          |
| H5  | **Quality Improvement**          | QI/Patient Safety/Clinical Audit                  | 10          |
| H6  | **Transport of Critically Ill**  | Inter/Intra-Hospital Transport                    | 10          |
| H7  | **Informed Consent**             | Taking Informed Consent                           | 10          |
| H8  | **Breaking Bad News**            | Breaking Bad News                                 | 10          |

### I. EVALUATION & ASSESSMENT

| #   | Module                        | Logbook Section                                                                                                 |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| I1  | **Periodic Logbook Review**   | Faculty review per semester (2 per sem, 12 total)                                                               |
| I2  | **Resident Evaluation Graph** | 5 domains x 6 semesters: Knowledge, Clinical Skills, Procedural Skills, Soft Skills, Research — each scored 1-5 |
| I3  | **End Semester Assessment**   | Theory + Practical marks per semester                                                                           |

---

## 7. Detailed Feature List Per Module

### 7.1 Student Dashboard

- **Overview Cards:** Total logs entered, pending sign-offs, completion percentage per category
- **Quick Add:** Floating button to quickly add a procedure/case log (bedside use)
- **Progress Tracker:** Visual progress bars for each logbook section
- **Semester Timeline:** Current semester, weeks completed, rotation posting status
- **Notifications:** Pending faculty remarks, rejected entries, reminders

### 7.2 Faculty Dashboard

- **Assigned Students List:** Cards showing each assigned student with completion metrics
- **Pending Reviews Queue:** List of entries awaiting faculty sign-off (sorted by date)
- **Bulk Actions:** Sign off multiple entries at once
- **Add Remarks:** Inline remark editing on student entries
- **Evaluation Form:** Semester-wise evaluation form with 5-domain scoring

### 7.3 HOD Dashboard

- **Department Overview:** All residents at a glance — bar charts, pie charts
- **Faculty Workload:** How many students per faculty, review throughput
- **Attendance Summary:** Department-wide attendance analytics
- **Rotation Management:** Assign/edit rotation postings for all students
- **Batch Management:** Create and manage batches (e.g., "July 2022", "January 2023")
- **Export Reports:** Export any student's full logbook as PDF
- **Final Evaluations:** Review and finalize semester evaluations

### 7.4 Common Features (All Roles)

- **Search & Filter:** Full-text search across all logs, filter by date range, category, status
- **Digital Signature Flow:**
  1. Student creates entry → Status: `DRAFT`
  2. Student submits → Status: `SUBMITTED`
  3. Faculty reviews + signs → Status: `SIGNED`
  4. Faculty rejects → Status: `NEEDS_REVISION` (with remark)
- **PDF Export:** Generate PDF matching the physical logbook layout
- **Audit Trail:** Track who modified what and when
- **Auto-numbering:** Automatic Sl. No. generation per category
- **Responsive:** Works on mobile for on-call logging

### 7.5 Form-Specific Features

#### Case Management Log Forms

- **Fields:** Date, Patient Info (Name/Age/Sex/UHID), Complete Diagnosis, Competency Level (CBD/S/O/MS/MI), Faculty/SR Sign, Case Tally
- **Auto-tally:** Running count of cases per sub-category
- **Category dropdown** pre-populated with exact case types from logbook
- **Competency progression tracking:** Show improvement from S → O → MS → MI over time

#### Procedure Log Forms

- **Fields:** Date, Patient Info, Complete Diagnosis, Procedure Description (free text), Performed @ Location, Skill Level (S/O/A/PS/PI or S/TM/TL for CPR)
- **Skill progression charts:** Visual graph showing S → O → A → PS → PI journey
- **Location suggestions:** Auto-suggest from previously entered locations (ER, ICU, Ward, OT)

#### Clinical Skill Training Forms

- **Fields:** Skill Name (pre-filled from logbook list), Representative Diagnosis, Confidence Level (VC/FC/SC/NC), Total Times Performed (tally counter)
- **Tally counter:** +1 increment button for quick tallying
- **Confidence level visual:** Color-coded VC(green) FC(blue) SC(amber) NC(red)

#### Diagnostic Skill Forms (ABG/ECG/Other)

- **Fields:** Disorder/Investigation type (pre-filled), Representative Diagnosis, Confidence Level, Total Times
- **Educational links:** Optional links to reference material per diagnostic type

#### Attendance Forms

- **Weekly calendar view** matching the Mon-Sun physical layout
- **Bulk fill:** Mark entire week as present
- **HoD auto-populate:** HoD name from department settings
- **Holiday detection:** Mark government holidays automatically

---

## 8. API Route Design

### Next.js App Router API Routes

```
/api/
├── auth/
│   └── webhook/          POST    Clerk webhook → sync user to DB
│
├── users/
│   ├── route.ts          GET     List users (HOD: all, Faculty: assigned)
│   ├── [id]/route.ts     GET     Get user profile
│   └── [id]/route.ts     PATCH   Update user metadata
│
├── rotation-postings/
│   ├── route.ts          GET/POST
│   └── [id]/route.ts     GET/PATCH/DELETE
│
├── thesis/
│   ├── route.ts          GET/POST
│   └── [id]/route.ts     GET/PATCH
│
├── attendance/
│   ├── route.ts          GET/POST
│   ├── [id]/route.ts     GET/PATCH/DELETE
│   └── [id]/entries/     GET/POST
│
├── academic/
│   ├── case-presentations/   GET/POST/[id]
│   ├── seminars/             GET/POST/[id]
│   └── journal-clubs/        GET/POST/[id]
│
├── clinical-skills/
│   ├── adult/            GET/POST/[id]
│   └── pediatric/        GET/POST/[id]
│
├── case-management/
│   ├── route.ts          GET/POST     (filter by category)
│   └── [id]/route.ts     GET/PATCH/DELETE
│
├── procedures/
│   ├── route.ts          GET/POST     (filter by procedureCategory)
│   └── [id]/route.ts     GET/PATCH/DELETE
│
├── diagnostics/
│   ├── route.ts          GET/POST     (filter by diagnosticCategory)
│   └── [id]/route.ts     GET/PATCH/DELETE
│
├── imaging/
│   ├── route.ts          GET/POST     (filter by imagingCategory)
│   └── [id]/route.ts     GET/PATCH/DELETE
│
├── professional/
│   ├── courses/          GET/POST/[id]
│   ├── conferences/      GET/POST/[id]
│   ├── research/         GET/POST/[id]
│   ├── disaster-drills/  GET/POST/[id]
│   ├── quality/          GET/POST/[id]
│   ├── transport/        GET/POST/[id]
│   ├── consent/          GET/POST/[id]
│   └── bad-news/         GET/POST/[id]
│
├── evaluations/
│   ├── route.ts          GET/POST
│   ├── [id]/route.ts     GET/PATCH
│   └── graph/route.ts    GET     (evaluation graph data)
│
├── signatures/
│   ├── route.ts          POST    (sign an entry)
│   └── [id]/route.ts     DELETE  (revoke signature)
│
├── export/
│   └── pdf/route.ts      POST    (generate PDF for a student)
│
└── analytics/
    ├── student/[id]/     GET     (student progress)
    ├── department/       GET     (HOD department overview)
    └── faculty/[id]/     GET     (faculty workload)
```

---

## 9. Deployment on Railway

### Railway Setup

1. **Create Railway Project:** `aiims-patna-logbook`
2. **Add PostgreSQL Service:**
   - Railway provides managed PostgreSQL
   - Connection string auto-injected as `DATABASE_URL`
3. **Add Next.js Service:**
   - Connect GitHub repo (`vermaaman02/Hospital-Residency-Logbook`)
   - Build command: `npx prisma generate && npx prisma db push && npm run build`
   - Start command: `npm start`
4. **Environment Variables** (set in Railway dashboard):
   - See [Section 12](#12-environment-variables)
5. **Custom Domain:** Configure custom domain (e.g., `logbook.aiims-patna.edu.in`)

### Railway Configuration

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npx prisma generate && npx prisma db push && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5
```

### Database Migration Strategy

```bash
# Development
npx prisma migrate dev --name init

# Production (Railway)
npx prisma migrate deploy
```

### Railway Pricing Estimate

| Service             | Estimated Cost |
| ------------------- | -------------- |
| Next.js App (Hobby) | ~$5/month      |
| PostgreSQL (500MB)  | ~$5/month      |
| **Total**           | **~$10/month** |

---

## 10. Development Phases & Timeline

### Phase 1: Foundation (Week 1-2) ✅ COMPLETED

- [x] Initialize Next.js 14 project with TypeScript
- [x] Set up Tailwind CSS + shadcn/ui
- [x] Configure Prisma with PostgreSQL (Railway)
- [x] Integrate Clerk authentication
- [x] Set up role-based middleware
- [x] Create Clerk webhook handler for user sync
- [x] Design and implement the hospital theme
- [x] Build sidebar layout with navigation
- [x] Create shared UI components (DataTable, FormWrapper, StatusBadge)
- [x] Seed database with rotation posting master data (20 departments)
- [x] Seed database with case categories & procedure categories
- [ ] Deploy initial version to Railway

### Phase 2: Administrative Modules (Week 3-4) ✅ COMPLETED

- [x] **A1: Rotation Postings** — CRUD + faculty sign-off
- [x] **A2: Thesis Tracking** — Topic, guide, semester records
- [x] **A3: Weekly Attendance** — Calendar-based weekly entry
- [x] **A4: Resident Training & Mentoring Record** — 5-point scoring
- [x] Student profile page with metadata
- [x] HOD: Batch & semester management (Manage Users page)
- [x] HOD: Faculty-student assignment (with semester selector)

### Phase 3: Academic Modules (Week 5-6) ✅ COMPLETED

- [x] **B1: Academic Case Presentations** (20 entries)
- [x] **B2: Seminars / Evidence Based Discussions** (10 entries)
- [x] **B3: Journal Club Discussions** (10 entries)
- [x] Digital signature flow for academic entries
- [x] Faculty remark system

### Phase 4: Clinical Skills & Case Management (Week 7-10) ✅ COMPLETED

- [x] **C1: Clinical Skills — Adult** (10 skills with confidence tracking)
- [x] **C2: Clinical Skills — Pediatric** (10 skills)
- [x] **D1-D24: ALL Case Management Logs** (25 categories, 300+ case types)
  - Reusable CaseManagementEntryForm component
  - Category selector with pre-populated case types (24 categories, 308 sub-types)
  - Competency level tracking (CBD/S/O/MS/MI)
  - Running tally per case type
  - Faculty sign-off per entry
- [x] ClinicalSkillsTable reusable component (auto-initialize, confidence badges)
- [x] CaseManagementTable reusable component (table with all actions)
- [x] Faculty reviews updated with Clinical Skills + Case Management tabs

### Phase 5: Procedure Logs (Week 11-14) ✅ COMPLETED

- [x] **E1-E49: ALL Procedure Logs** (49 categories, 1000+ slots)
  - [x] Reusable ProcedureLogEntryForm component
  - [x] Procedure category selector (49 categories with slug routing)
  - [x] Skill level tracking (S/O/A/PS/PI and S/TM/TL for CPR)
  - [x] Location tracking (performedAtLocation field)
  - [x] Faculty sign-off (sign/reject in faculty reviews)
  - [x] Procedure log server actions (create, update, submit, delete, get, summary, sign, reject)
  - [x] ProcedureLogTable component with progress bars
  - [x] Student pages: landing (49 category cards), [category] list, new, edit
  - [x] Faculty reviews updated with Procedure Logs tab (8 total tabs)

### Phase 6: Diagnostic & Imaging (Week 15-16) ✅ COMPLETED

- [x] **F1: ABG Analysis** (10 disorders) — DiagnosticSkillEntryForm + predefined skills
- [x] **F2: ECG Analysis** (10 types) — Shared diagnostic constants & form
- [x] **F3: Other Diagnostic Analysis** (10 investigations) — Shared diagnostic constants & form
- [x] **G1-G5: ALL Imaging Logs** (5 categories, 210 entry slots) — ImagingLogEntryForm + ImagingLogTable
- [x] Confidence level tracking with visual indicators (VC green, FC blue, SC amber, NC red)
- [x] Slug-based routing with helpers (diagnosticEnumToSlug, imagingEnumToSlug, etc.)
- [x] Server actions: 9 diagnostic + 9 imaging (CRUD, submit, sign, reject)
- [x] Student pages: diagnostics landing (3 cards), imaging landing (5 cards), category list, new, edit
- [x] Faculty reviews updated with Diagnostics + Imaging tabs (10 total tabs)
- [x] Build clean — 42 routes, 0 errors

### Phase 7: Professional Development (Week 17-18) ✅ COMPLETED

- [x] **H1: Life Support Courses** (10 entries) — CourseAttended CRUD, submit, sign, reject
- [x] **H2: Conference Participation** (10 entries) — ConferenceParticipation CRUD, submit, sign, reject
- [x] **H3: Research/Teaching/Community Activities** (10 entries) — ResearchActivity CRUD, submit, sign, reject
- [x] **H4: Disaster Management Drills** (10 entries) — DisasterDrill CRUD, submit, sign, reject
- [x] **H5: Quality Improvement/Clinical Audit** (10 entries) — QualityImprovement CRUD, submit, sign, reject
- [x] **H6: Transport of Critically Ill Patient** (10 entries) — TransportLog with S/O/A/PS/PI skill levels
- [x] **H7: Taking Informed Consent** (10 entries) — ConsentLog with S/O/A/PS/PI skill levels
- [x] **H8: Breaking Bad News** (10 entries) — BadNewsLog with S/O/A/PS/PI skill levels
- [x] Constants & field configs: professional-fields.ts (H1-H5), other-logs-fields.ts (H6-H8)
- [x] Reusable components: ProfessionalEntryTable, OtherLogTable, ProfessionalEntryForm, OtherLogEntryForm
- [x] Server actions: courses-conferences.ts (24 actions), disaster-qi.ts (16 actions), other-logs.ts (24 actions)
- [x] Student pages: 5 route groups, 22 page files (courses-conferences, research, disaster-qi, transport, consent-bad-news)
- [x] Faculty reviews updated with 8 new tabs (18 total tabs)
- [x] Build clean — 46 routes, 0 errors

### Phase 8: Evaluation & Reporting (Week 19-20)

- [ ] **I1: Periodic Logbook Review** (12 reviews, 2 per semester)
- [ ] **I2: Resident Evaluation Graph** — Interactive chart (5 domains x 6 semesters)
- [ ] **I3: End Semester Assessment** — Theory + Practical marks
- [ ] Faculty evaluation form
- [ ] HOD final sign-off on evaluations
- [ ] PDF export matching physical logbook layout
- [ ] Department analytics dashboard

### Phase 9: Polish & Launch (Week 21-22)

- [ ] Mobile responsiveness testing
- [ ] Performance optimization (lazy loading, pagination)
- [ ] Error handling & loading states
- [ ] Notification system (pending reviews, reminders)
- [ ] Data validation review (every form field validated with Zod)
- [ ] Security audit (role-based access, data isolation)
- [ ] User acceptance testing with AIIMS Patna faculty
- [ ] Production deployment on Railway
- [ ] Documentation & user guide

---

## 11. Folder Structure

```
Hospital-Residency-Logbook/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # Seed rotation postings, case categories, etc.
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with Clerk provider
│   │   ├── page.tsx               # Landing page
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx         # Dashboard layout (sidebar + topbar)
│   │   │   │
│   │   │   ├── student/
│   │   │   │   ├── page.tsx                    # Student overview
│   │   │   │   ├── rotation-postings/page.tsx
│   │   │   │   ├── thesis/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── academic/
│   │   │   │   │   ├── case-presentations/page.tsx
│   │   │   │   │   ├── seminars/page.tsx
│   │   │   │   │   └── journal-clubs/page.tsx
│   │   │   │   ├── clinical-skills/
│   │   │   │   │   ├── adult/page.tsx
│   │   │   │   │   └── pediatric/page.tsx
│   │   │   │   ├── case-management/
│   │   │   │   │   ├── page.tsx               # Category selector
│   │   │   │   │   └── [category]/page.tsx    # Logs per category
│   │   │   │   ├── procedures/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [category]/page.tsx
│   │   │   │   ├── diagnostics/
│   │   │   │   │   ├── abg/page.tsx
│   │   │   │   │   ├── ecg/page.tsx
│   │   │   │   │   └── other/page.tsx
│   │   │   │   ├── imaging/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [category]/page.tsx
│   │   │   │   ├── professional/
│   │   │   │   │   ├── courses/page.tsx
│   │   │   │   │   ├── conferences/page.tsx
│   │   │   │   │   ├── research/page.tsx
│   │   │   │   │   ├── disaster/page.tsx
│   │   │   │   │   ├── quality/page.tsx
│   │   │   │   │   ├── transport/page.tsx
│   │   │   │   │   ├── consent/page.tsx
│   │   │   │   │   └── bad-news/page.tsx
│   │   │   │   └── evaluations/page.tsx
│   │   │   │
│   │   │   ├── faculty/
│   │   │   │   ├── page.tsx                    # Faculty overview
│   │   │   │   ├── students/page.tsx           # Assigned students
│   │   │   │   ├── students/[id]/page.tsx      # Student detail view
│   │   │   │   ├── reviews/page.tsx            # Pending reviews queue
│   │   │   │   └── evaluations/page.tsx        # Conduct evaluations
│   │   │   │
│   │   │   └── hod/
│   │   │       ├── page.tsx                    # HOD overview
│   │   │       ├── residents/page.tsx          # All residents
│   │   │       ├── residents/[id]/page.tsx     # Resident detail
│   │   │       ├── faculty/page.tsx            # Faculty management
│   │   │       ├── batches/page.tsx            # Batch management
│   │   │       ├── rotations/page.tsx          # Rotation assignment
│   │   │       ├── attendance/page.tsx         # Department attendance
│   │   │       ├── analytics/page.tsx          # Department analytics
│   │   │       ├── evaluations/page.tsx        # Final evaluations
│   │   │       └── export/page.tsx             # PDF export
│   │   │
│   │   └── api/
│   │       ├── auth/webhook/route.ts
│   │       ├── users/route.ts
│   │       ├── rotation-postings/route.ts
│   │       ├── thesis/route.ts
│   │       ├── attendance/route.ts
│   │       ├── academic/[type]/route.ts
│   │       ├── clinical-skills/[type]/route.ts
│   │       ├── case-management/route.ts
│   │       ├── procedures/route.ts
│   │       ├── diagnostics/route.ts
│   │       ├── imaging/route.ts
│   │       ├── professional/[type]/route.ts
│   │       ├── evaluations/route.ts
│   │       ├── signatures/route.ts
│   │       ├── export/pdf/route.ts
│   │       ├── analytics/route.ts
│   │       └── health/route.ts
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── Footer.tsx
│   │   ├── forms/
│   │   │   ├── CaseManagementForm.tsx
│   │   │   ├── ProcedureLogForm.tsx
│   │   │   ├── AttendanceForm.tsx
│   │   │   ├── ClinicalSkillForm.tsx
│   │   │   ├── DiagnosticSkillForm.tsx
│   │   │   ├── ImagingLogForm.tsx
│   │   │   ├── AcademicForm.tsx
│   │   │   ├── EvaluationForm.tsx
│   │   │   └── GenericLogForm.tsx
│   │   ├── tables/
│   │   │   ├── DataTable.tsx
│   │   │   ├── columns/             # Column definitions per module
│   │   │   └── StatusBadge.tsx
│   │   ├── charts/
│   │   │   ├── EvaluationGraph.tsx
│   │   │   ├── ProgressChart.tsx
│   │   │   └── CompletionPieChart.tsx
│   │   ├── cards/
│   │   │   ├── StatCard.tsx
│   │   │   ├── StudentCard.tsx
│   │   │   └── CategoryCard.tsx
│   │   └── shared/
│   │       ├── DigitalSignatureButton.tsx
│   │       ├── ConfidenceLevelSelector.tsx
│   │       ├── CompetencyLevelSelector.tsx
│   │       ├── SkillLevelSelector.tsx
│   │       ├── PatientInfoFields.tsx
│   │       ├── DatePickerField.tsx
│   │       └── RemarkDialog.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── clerk.ts                # Clerk helpers
│   │   ├── utils.ts                # Utility functions
│   │   ├── validators/             # Zod schemas per module
│   │   │   ├── rotation-posting.ts
│   │   │   ├── attendance.ts
│   │   │   ├── case-management.ts
│   │   │   ├── procedure-log.ts
│   │   │   └── ...
│   │   └── constants/
│   │       ├── rotation-postings.ts  # 20 department names
│   │       ├── case-categories.ts    # All 300+ case types organized by category
│   │       ├── procedure-categories.ts # All 48 procedure types
│   │       ├── clinical-skills.ts    # 10 adult + 10 pediatric skill names
│   │       ├── diagnostic-types.ts   # ABG, ECG, Other diagnostic items
│   │       └── imaging-categories.ts
│   │
│   ├── hooks/
│   │   ├── useRole.ts
│   │   ├── useCurrentUser.ts
│   │   └── useDebounce.ts
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   │
│   └── middleware.ts               # Clerk middleware for route protection
│
├── public/
│   ├── aiims-patna-logo.png
│   └── favicon.ico
│
├── .env.local                      # Local environment variables
├── .env.example                    # Template
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── railway.toml
├── PG Logbook .md                  # Original logbook reference
└── roadmap.md                      # This file
```

---

## 12. Environment Variables

```env
# ============== DATABASE ==============
DATABASE_URL="postgresql://user:password@host:port/dbname"

# ============== CLERK AUTH ==============
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# ============== APP CONFIG ==============
NEXT_PUBLIC_APP_URL="https://logbook.aiims-patna.edu.in"
NEXT_PUBLIC_APP_NAME="AIIMS Patna PG Logbook"

# ============== RAILWAY ==============
RAILWAY_ENVIRONMENT="production"
PORT=3000
```

---

## 13. Testing Strategy

| Type              | Tool                  | Coverage                                     |
| ----------------- | --------------------- | -------------------------------------------- |
| Unit Tests        | Vitest                | Utility functions, Zod validators            |
| Component Tests   | React Testing Library | Form components, table rendering             |
| Integration Tests | Vitest + Prisma       | API route handlers with test DB              |
| E2E Tests         | Playwright            | Critical flows (login, create log, sign off) |

### Critical E2E Test Scenarios

1. Student logs in → creates a case management entry → submits for review
2. Faculty logs in → sees pending review → adds remark → signs off
3. HOD logs in → views department analytics → exports PDF
4. Student creates attendance for a week → HoD approves
5. Faculty conducts semester evaluation → HOD gives final sign-off

---

## 14. Future Scope

| Feature                           | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| **Multi-department support**      | Extend beyond EM to other PG departments at AIIMS Patna        |
| **AI-assisted diagnosis logging** | Suggest ICD codes based on free-text diagnosis                 |
| **Image uploads**                 | Upload scan images, ECG strips, wound photos                   |
| **Offline mode**                  | PWA with local storage for areas with poor connectivity        |
| **Email/SMS notifications**       | Email reminders for pending sign-offs                          |
| **Analytics dashboard**           | Advanced analytics with trend analysis, cohort comparison      |
| **Multi-institution**             | Support other AIIMS campuses (Delhi, Jodhpur, Rishikesh, etc.) |
| **NMC compliance**                | Align with National Medical Commission reporting requirements  |
| **QR code attendance**            | QR-based check-in for clinical postings                        |
| **Faculty ranking**               | Anonymous faculty feedback from residents                      |

---

## Summary

This roadmap covers **every single form, table, and log** from the AIIMS Patna PG Residency Logbook for MD Emergency Medicine. The application will:

- Digitize **20 rotation postings**, **6 semesters of thesis tracking**, **weekly attendance sheets**
- Track **300+ case types** across **25 case management categories**
- Log **1000+ procedure entries** across **48 procedure categories**
- Record **30 diagnostic skill types** (ABG, ECG, Lab)
- Track **210 imaging log entries** across **5 imaging categories**
- Manage **8 professional development modules**
- Conduct **semester evaluations** with a **5-domain scoring system**
- Support **3 user roles** (HOD, Faculty, Student) with proper permissions
- Deploy on **Railway** with **PostgreSQL** and **Clerk** authentication
- Present everything in a clean **hospital-themed** UI inspired by AIIMS Patna

**No form is missed. No field is skipped. This is a complete digital replacement.**
