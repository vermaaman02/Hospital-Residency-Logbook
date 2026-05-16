Acknowledged. I'll perform a thorough analysis of your Hospital Residency Logbook codebase before producing the mobile roadmap. From our prior sessions I already know the high-level shape (Next.js + Prisma + Clerk, polymorphic revision history, ~16+ entry types, 3 roles: student/faculty/HOD), but I need to verify exact details — DB schema, every API route, auth implementation, third-party services, file storage — before writing a roadmap that references real files and routes.

Let me start systematic exploration in parallel:












Now let me sample key API routes and a representative action/page to understand patterns:







I have a comprehensive picture now. Let me check a few final critical pieces — the README/roadmap for context, and a sample student page structure:

I now have a thorough understanding of the codebase. I have all the critical information needed: schema (29 models, 12+ enums), auth flow (Clerk + middleware + sessionClaims), the heavy reliance on **Next.js server actions** (38 action files), only ~18 REST API routes, the existing **service worker + web push** notification system, **Socket.IO** real-time, **Cloudinary** signed uploads, and **face-api.js** for in-browser attendance.

Before producing the full roadmap, I want to confirm 2 critical product/scope questions that materially change the recommendation:


Locked. I have everything needed. Producing the full output now.

---

# AIIMS Patna Logbook — Mobile Roadmap (Student-First MVP)

---

## 1. Codebase Summary

**AIIMS Patna PG Residency Digital Logbook** is a Next.js 16 web application that digitises the NMC-mandated physical logbook for MD Emergency Medicine residents. It replaces 25 case-management categories, 48 procedure categories, 30+ diagnostic skills, 5 imaging categories, plus academic/professional/administrative tracking with a role-based system (HOD, Faculty, Student) featuring digital signature workflows (Draft → Submitted → Signed/Needs-Revision), polymorphic revision history, real-time updates over Socket.IO, web-push notifications, Cloudinary image uploads, and face-recognition + GPS attendance. The backend is overwhelmingly **Next.js Server Actions** (38 files) with only ~18 REST routes; persistence is PostgreSQL via Prisma 7 (29 models, 12 enums); auth is Clerk with role stored in `sessionClaims.metadata.role`.

---

## 2. Tech Stack Table

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | `16.1.6` | Custom server `server.mjs` wraps Next + Socket.IO on one port (Railway constraint) |
| Language | TypeScript | `^5` | Not strict mode (`tsconfig.json` not verified strict); some `as never` casts |
| Runtime | Node.js | 18+ (per README) | |
| Database | PostgreSQL | — | Via Prisma `adapter-pg` (Prisma 7 requires driver adapter) |
| ORM | Prisma | `^7.4.0` | Output: `src/generated/prisma`; 29 models, 12 enums |
| Auth | Clerk | `@clerk/nextjs ^6.37.3` | Roles in `publicMetadata.role` ∈ `{hod, faculty, student}`; webhook syncs to DB |
| Middleware | `clerkMiddleware` | — | File: `src/proxy.ts` (renamed from `middleware.ts` for Next 16); enforces RBAC routing |
| State (client) | React Context only | — | `RealtimeProvider`, [NotificationProvider](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/components/shared/NotificationProvider.tsx:43:0-213:2); no Zustand/Redux/React Query |
| Data fetching | RSC + server actions + native `fetch` | — | No SWR/React Query |
| Realtime | Socket.IO | `^4.8.3` | Server in `server.mjs`; client singleton in [src/lib/socket.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/socket.ts:0:0-0:0); internal HTTP emit `/_internal/emit` |
| Push notifications | Web Push (VAPID) | `web-push ^3.5.0` | `NotificationSubscription` table; `/api/notifications/{publicKey,subscribe,unsubscribe,demo}`; SW at [public/sw.js](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/public/sw.js:0:0-0:0) |
| File storage | Cloudinary (signed uploads) | — | Signature minted server-side in [src/actions/cloudinary.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/cloudinary.ts:0:0-0:0); URL stored as `String[]` columns (e.g. `imageUrls`, `attachments`) |
| Forms | React Hook Form | `^7.71.1` | + `@hookform/resolvers ^5` |
| Validation | Zod | `^4.3.6` | 11 schema files in [src/lib/validators/](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/validators:0:0-0:0) |
| UI library | shadcn/ui + Radix | — | + `tailwindcss ^4`, `tw-animate-css`, `lucide-react`, `sonner` toasts |
| Tables | TanStack Table | `^8.21.3` | Universal `DataTable` |
| Charts | Recharts | `^3.7.0` | Evaluation graph, semester progress |
| Editor | `@uiw/react-md-editor` | `^4.0.11` | Markdown for diagnoses, remarks |
| PDF/Excel export | `@react-pdf/renderer`, `jspdf`, `jspdf-autotable`, `xlsx` | — | Multiple downloaders |
| Face recognition | `face-api.js` | `^0.22.2` | In-browser; models in [public/models](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/public/models:0:0-0:0); CORS solved via `/api/face-proxy` |
| Webhook sigs | `svix` | `^1.84.1` | Clerk webhook verification |
| Deployment | Railway | — | `railway.json`, `Procfile`, custom `server.mjs`; single-port constraint enforced |

---

## 3. API Routes Table (REST endpoints only)

All routes live under `src/app/api/*`. Auth is Clerk session cookies; **none currently support Bearer tokens** out of the box (mobile blocker — see Section 6).

| Route | Method | Auth | Role | Mobile-ready? | Reads/Writes |
|---|---|---|---|---|---|
| `/api/health` | GET | ❌ public | — | ✅ | none |
| `/api/webhooks/clerk` | POST | svix sig | — | ✅ (server-to-server) | upserts `User` |
| [/api/notifications/publicKey](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/api/notifications/publicKey:0:0-0:0) | GET | ✅ | any | ⚠ web-push only; replace for mobile | reads VAPID env |
| [/api/notifications/subscribe](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/api/notifications/subscribe:0:0-0:0) | POST | ✅ | any | ⚠ stores PushSubscription (browser shape) | inserts `NotificationSubscription` |
| [/api/notifications/unsubscribe](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/api/notifications/unsubscribe:0:0-0:0) | POST | ✅ | any | ⚠ | deletes `NotificationSubscription` |
| [/api/notifications/demo](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/api/notifications/demo:0:0-0:0) | POST | ✅ | any | ⚠ | sends test push |
| `/api/sign-off` | POST | ✅ | faculty/hod | ✅ shape OK | Dynamic update on 21 entity types + creates `DigitalSignature`. **⚠ No revision recording — see Issues** |
| `/api/case-management` | GET, POST | ✅ | all (scoped) | ✅ has pagination | `CaseManagementLog` |
| `/api/case-management/[id]` | GET, PATCH, DELETE | ✅ | scoped | ✅ | one row |
| `/api/evaluations` | GET, POST | ✅ | scoped | ✅ | `ResidentEvaluation` |
| `/api/evaluations/[id]` | GET, PATCH, DELETE | ✅ | scoped | ✅ | one row |
| `/api/evaluations/graph` | GET | ✅ | scoped | ✅ | `ResidentEvaluation` aggregated |
| `/api/analytics/department` | GET | ✅ | hod | ✅ ⚠ no pagination; many counts | wide aggregate |
| `/api/analytics/student/[id]` | GET | ✅ | scoped | ✅ | per-student aggregate |
| `/api/face-proxy?url=` | GET | ✅ | any | ⚠ web-only utility | external image fetch |
| `/api/faculty/names` | GET | ✅ | any | ✅ | lookup |
| `/api/rotation-posting-config` | GET | ✅ | hod | ✅ | config |
| `/api/cron/auto-absent` | POST/GET | Bearer (`CRON_SECRET`) | system | ✅ (already Bearer!) | bulk insert `AttendanceEntry` |

**Everything else (creating a case log, marking attendance, submitting an entry, signing, rejecting, bulk-sign, generating an export) is a Server Action** — these are *not* callable from React Native. This is the single largest mobile blocker.

---

## 4. Schema Summary

### Core User & Org

| Model | Purpose | Key Fields | Indexes |
|---|---|---|---|
| `User` | Identity record (mirrors Clerk) | `clerkId @unique`, `email @unique`, `role Role`, `batchId`, `departmentId`, `currentSemester`, `status UserStatus` | clerkId, role, status, batchId, departmentId |
| `Batch` | Academic batch | `name @unique`, `currentSemester`, `isActive`, `startDate` | isActive |
| `Department` | EM / other departments | `name @unique`, `code @unique` | isActive |
| `FacultyBatchAssignment` | Faculty → Batch many-to-many | `@@unique([facultyId, batchId])` | both FKs |
| `FacultyStudentAssignment` | Faculty → Student per semester | `@@unique([facultyId, studentId, semester])` | both FKs |
| `DepartmentBatch`, `DepartmentForm`, `FormDefinition` | Department-scoped form catalog | | |

### Audit & Polymorphic

| Model | Purpose | Notes |
|---|---|---|
| `DigitalSignature` | Append-only sign log | Polymorphic `entityType + entityId` |
| `EntryRevision` | Submission + review history with JSON snapshot | Polymorphic; tracks `version`, `kind` (SUBMISSION/REVIEW), `decision`, `remark`, `reviewerRole`, `attachments[]`. **Wired into 15 of ~25 entry types** |
| `HodAutoReviewSetting` | Per-category auto-sign toggle | `category @unique` |
| `NotificationSubscription` | Web-push subscriptions | `endpoint @unique`, `p256dh`, `auth` — **browser-shaped; needs separate mobile token table** |

### Logbook Entry Models (all follow same pattern: `userId, slNo, status EntryStatus, facultyId?, facultyRemark?, createdAt, updatedAt`)

`CasePresentation`, `Seminar`, `JournalClub`, `ClinicalSkillAdult`, `ClinicalSkillPediatric`, `CaseManagementLog`, `ProcedureLog`, `DiagnosticSkill` (with `imageUrls[]`), `ImagingLog` (with `imageUrls[]`), `TransportLog`, `ConsentLog`, `BadNewsLog`, `CourseAttended`, `ConferenceParticipation`, `ResearchActivity`, `DisasterDrill`, `QualityImprovement`, `LogbookFacultyReview`, `RotationPosting` (with `attachments[]`).

### Attendance

`AttendanceConfig` (per batch: location lat/lng, radius, class times, face-rec toggle, min %), `AttendanceHoliday`, `AttendanceSheet`, `AttendanceEntry` (per-day: `latitude/longitude`, `withinLocation`, `markedAt`).

### Evaluation & Training

`ResidentEvaluation` (5-domain scores per semester per reviewNo), `TrainingMentoringRecord` (5-domain HOD final), `Thesis` + `ThesisSemesterRecord`.

### Assessments

`InternalAssessment` (with `attachments[]`, `resourceLinks[]`, batch-scoped or student-specific), `AssessmentSubmission` (with `attachments[]`), `AssessmentEvaluation` (marks/grade/feedback).

### Enums (12)

[Role](cci:2://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types/index.ts:95:0-95:49), `UserStatus`, [EntryStatus](cci:2://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types/index.ts:88:0-93:20) (DRAFT/SUBMITTED/SIGNED/REJECTED/NEEDS_REVISION), `DayOfWeek`, `ConfidenceLevel` (VC/FC/SC/NC), `CompetencyLevel` (CBD/S/O/MS/MI), `SkillLevel`, `CaseCategory` (24 values), `ProcedureCategory` (~50 values), `DiagnosticCategory`, `ImagingCategory`, `AssessmentType`, `PatientCategory`, `EntryRevisionKind`, `EntryRevisionDecision`.

### Read/Write Hotspots

- **Write-heavy:** `AttendanceEntry`, `CaseManagementLog`, `ProcedureLog`, `DigitalSignature`, `EntryRevision`
- **Read-heavy:** `User` (every request via `findUnique({clerkId})`), `FacultyStudentAssignment` (every faculty-scoped query), `EntryRevision` (timeline view)

### N+1 / Performance Risks

- [getUnifiedInbox()](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/inbox.ts:22:0-329:1) in [src/actions/inbox.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/inbox.ts:0:0-0:0) issues **20 parallel `findMany` calls** for every inbox load — already mitigated by `Promise.all` but ~20 indices hit; consider a single materialised view on mobile if used often.
- `/api/analytics/department/route.ts:66-83` does `students.map(async … 3× count)` → **O(students × 3)** queries. With 60 students = 180 queries per HOD analytics page. **High-priority fix before mobile launch** even if HOD stays on web.
- `getStudentTrainingRecords` and similar `getStudent*` actions are called from per-student pages with no pagination.
- `EntryRevision` lacks a composite index on `(entityType, entityId, version DESC)` — current index is `(entityType, entityId, version)` ASC which is fine, but [nextVersion()](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:99:0-114:1) does a `findFirst orderBy version desc` — verify index is being used.

### Missing/Weak Indexes

- `User.email` is `@unique` (✅ indexed), but `User.batch` (the legacy String column shadowed by `batchId`) is not — `where: { batch: ... }` will table-scan. The codebase already mixes both fields; **migrate fully to `batchId` before mobile launch**.
- `AttendanceEntry` has `@@index([date])` but **no `(attendanceSheetId, date)` composite** — calendar views fetch by both.
- `DigitalSignature.signedById` is indexed; consider `(entityType, signedById)` composite for "what I've signed" queries.

---

## 5. Reuse Inventory

| Asset | Path | Mobile Verdict |
|---|---|---|
| Zod validators | `src/lib/validators/*.ts` (11 files) | ✅ **REUSE AS-IS** — extract into a shared package (see folder structure) |
| Domain constants | `src/lib/constants/*.ts` (17 files — case categories, procedures, diagnostic types, imaging, confidence/skill enums, professional fields) | ✅ **REUSE AS-IS** |
| Types | [src/types/index.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types/index.ts:0:0-0:0) ([EntryStatus](cci:2://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types/index.ts:88:0-93:20), [Role](cci:2://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types/index.ts:95:0-95:49), [PatientInfo](cci:2://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types/index.ts:99:0-104:1), [CompetencyLevelType](cci:2://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types/index.ts:108:0-108:66), etc.) | ✅ **REUSE AS-IS** |
| Prisma-generated types | `src/generated/prisma` | ⚠ **REUSE WITH MINOR CHANGES** — strip Decimal/Date instances to ISO strings on the wire; mobile gets plain objects |
| Auth helpers | `src/lib/auth.ts` (`requireAuth`, `requireRole`) | ⚠ **REUSE WITH MINOR CHANGES** — currently uses cookie-based `auth()` from Clerk; needs to also accept Bearer tokens (Clerk supports `authenticateRequest`) |
| Revision helpers | [src/lib/entry-revisions.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:0:0-0:0) ([recordSubmission](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:125:0-142:1), [recordReview](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:154:0-172:1), [buildSnapshot](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:85:0-97:1)) | ✅ **REUSE AS-IS** — already invoked from REST layer |
| Server-action business logic | `src/actions/*.ts` (38 files) | ⚠ **REUSE BY EXTRACTING** — split each file: keep the core function pure (no `"use server"`, no `revalidatePath`), have both the server action and the new REST route call it |
| [useRole](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/hooks/useRole.ts:13:0-25:1) hook | [src/hooks/useRole.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/hooks/useRole.ts:0:0-0:0) | ❌ **REWRITE** — uses `@clerk/nextjs`; mobile uses `@clerk/clerk-expo` |
| [useFaceRecognition](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/hooks/useFaceRecognition.ts:40:0-285:1) hook | [src/hooks/useFaceRecognition.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/hooks/useFaceRecognition.ts:0:0-0:0) | ❌ **REWRITE** — `face-api.js` doesn't run on RN; use `react-native-vision-camera` + `react-native-vision-camera-face-detector` or server-side matching |
| Socket.IO client | [src/lib/socket.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/socket.ts:0:0-0:0) | ⚠ **REUSE WITH MINOR CHANGES** — `socket.io-client` works on RN, but `window.location.origin` must become an env var |
| [NotificationProvider](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/components/shared/NotificationProvider.tsx:43:0-213:2) | [src/components/shared/NotificationProvider.tsx](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/components/shared/NotificationProvider.tsx:0:0-0:0) | ❌ **REWRITE** — uses browser `PushManager` + service worker; mobile uses Expo Notifications |
| [CloudinaryUpload](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/components/shared/CloudinaryUpload.tsx:32:0-202:1) | [src/components/shared/CloudinaryUpload.tsx](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/components/shared/CloudinaryUpload.tsx:0:0-0:0) | ⚠ **REWRITE for RN** — same signed-upload flow but use `expo-image-picker` + `expo-file-system` |
| `MarkdownEditor` (`@uiw/react-md-editor`) | — | ❌ **REWRITE** — replace with `react-native-markdown-editor` or plain `TextInput` + preview |
| `DataTable` (TanStack Table) | `src/components/tables/*` | ❌ **REWRITE** — mobile uses `FlashList` or `FlatList` cards, not tables |
| All `*Page.tsx` and `*Client.tsx` UI | `src/app/dashboard/**` | ❌ **REWRITE** — different paradigm (cards/sheets vs tables/dialogs) |
| `PageHeader`, `Sidebar`, `TopBar`, `MobileNav`, `DashboardShell` | `src/components/layout/*` | ❌ **REWRITE** — use Expo Router tab/stack navigation |
| Status/Skill/Confidence selectors | `src/components/shared/*Selector.tsx` | ❌ **REWRITE** — keep the option arrays, redo presentation |
| Realtime emit | [src/lib/realtime-emit.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/realtime-emit.ts:0:0-0:0) | ✅ **REUSE AS-IS** — server side; mobile just listens |
| Cloudinary signature action | [src/actions/cloudinary.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/cloudinary.ts:0:0-0:0) | ⚠ **WRAP** — expose as `POST /api/v1/cloudinary/signature` |
| [sw.js](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/public/sw.js:0:0-0:0) service worker | [public/sw.js](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/public/sw.js:0:0-0:0) | ❌ **N/A** — Expo handles push natively |

**Sharing strategy:** publish [src/lib/validators](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/validators:0:0-0:0), [src/lib/constants](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/constants:0:0-0:0), and [src/types](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types:0:0-0:0) as a workspace package (`@logbook/shared`) consumed by both Next and Expo via npm workspaces.

---

## 6. Issues Found

| # | Severity | Where | Issue |
|---|---|---|---|
| 1 | 🔴 High | Auth | `requireAuth/requireRole` rely on Clerk cookies via `auth()`; mobile cannot send cookies easily. **Mobile must use Clerk's Expo SDK with Bearer tokens**, and `requireAuth` must accept `Authorization: Bearer <jwt>` via `authenticateRequest()` |
| 2 | 🔴 High | [src/app/api/sign-off/route.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/api/sign-off/route.ts:0:0-0:0) | Bypasses the `EntryRevision` recording you wired into the server actions — if mobile uses this endpoint to sign, revisions won't be recorded. Either delete the route or wire it through [recordReview()](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:154:0-172:1) |
| 3 | 🟠 Med | [src/actions/inbox.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/inbox.ts:0:0-0:0) | 20 parallel `findMany` per inbox load. Acceptable for web, will be slow on mobile cold start. Add server-side cursor pagination + per-module slicing |
| 4 | 🟠 Med | `/api/analytics/department/route.ts:66-83` | N+1: `students.map(async ... 3 counts)`. Replace with `groupBy` |
| 5 | 🟠 Med | `User` model | Legacy `batch String?` field shadows `batchId`; multiple action files still query by the string. Migrate fully to `batchId` |
| 6 | 🟠 Med | `NotificationSubscription` | Schema is browser-shaped (`endpoint`, `p256dh`, `auth`). Mobile pushes (Expo/FCM/APNs) need a different shape — **add `MobilePushToken` table** (see Section 10) |
| 7 | 🟡 Low | `src/lib/socket.ts:55-68` | [useSocketEvent](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/socket.ts:56:0-67:1) is exported from [lib/socket.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/socket.ts:0:0-0:0) **and** [src/hooks/useSocketEvent.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/hooks/useSocketEvent.ts:0:0-0:0) (duplicated). Pick one |
| 8 | 🟡 Low | `next.config.ts:7-13` | `images.remotePatterns` allows `img.clerk.com` and `images.clerk.dev` only — Cloudinary URLs (`res.cloudinary.com`) are not listed, so `next/image` falls back to native `<img>` for uploaded images |
| 9 | 🟡 Low | [src/actions/attendance.ts.bak](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts.bak:0:0-0:0) | `.bak` file committed to repo — delete |
| 10 | 🟡 Low | `src/proxy.ts:73-77` | Static file regex skips `csv,docx?,xlsx?,zip` — fine, but `/api/v1/*` mobile routes will be matched by Clerk middleware too (good — we want auth) |
| 11 | 🟡 Low | `prisma/schema.prisma:124-135` | `DigitalSignature` has no `version` linking it to `EntryRevision`; reconciliation between the two audit trails is by `entityType+entityId+signedAt` only |
| 12 | 🟡 Low | `src/app/api/case-management/route.ts:108` | Auto-generates `slNo` with `findFirst orderBy desc` then `+1` — race condition under concurrent creates; use `prisma.$transaction` or a DB sequence |
| 13 | 🟡 Low | [src/actions/cloudinary.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/cloudinary.ts:0:0-0:0) | `crypto.createHash("sha1")` — Cloudinary accepts SHA-256 too; not a security issue but SHA-1 is deprecated |
| 14 | 🟡 Low | All `face-recognition` flow | Runs entirely client-side and trusts the client to report a match. A motivated student could mock the recognition result. Consider server-side descriptor comparison (send embedding to server, match there) |
| 15 | 🟡 Low | `package.json:2` | Name is `aiims-patna-logbook` but folder is `hospital-residency-logbook` — inconsistent |
| 16 | 🟡 Low | `roadmap.md` (88 KB) and [attendance.ts.bak](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts.bak:0:0-0:0) | Large/orphan files committed |

---

## 7. Architecture Recommendation

### ✅ **React Native + Expo (SDK 52+) with Expo Router**

**Why, specifically for your stack:**

1. **Language continuity** — Your codebase is TypeScript + React 19. Engineers fluent in `useState`, `useEffect`, React Hook Form, and Zod can be productive on Day 1. Flutter (Dart) and native (Swift/Kotlin) impose a full retraining cost. For a student-MVP timeline, that's decisive.
2. **Shared validators and types** — Zod schemas in `src/lib/validators/*` and constants in `src/lib/constants/*` move to a workspace package and import unchanged into the mobile app. This is a unique win that Flutter/native cannot match.
3. **Clerk has a first-class Expo SDK** (`@clerk/clerk-expo`) — JWT-based, supports biometrics, deep linking, OAuth. Your existing `sessionClaims.metadata.role` works identically.
4. **Expo Notifications** maps cleanly to your existing notification semantics; switching from `web-push` to Expo push is a one-table schema add (`MobilePushToken`) and a 50-line server change, not a rewrite.
5. **Camera + GPS + biometrics** are first-class via `expo-camera`, `expo-location`, `expo-local-authentication`. Face matching can be done with `react-native-vision-camera` + a face-detector frame processor, **or** punt to server-side descriptor matching (recommended — also fixes Issue #14).
6. **Expo Router 4** mirrors Next App Router conventions (`app/(student)/_layout.tsx`, file-based routing, typed routes) — your team already groks it.
7. **OTA updates via EAS Update** let you ship JS-only bug fixes without store review — vital during the first ~3 months post-launch.
8. **Single binary, two stores** — Expo handles iOS and Android with one codebase; given a 1-2 dev mobile team, native dual-track is impractical.

**Trade-offs I'm accepting:**
- Face-api.js cannot be reused → use server-side descriptor matching instead (better security anyway).
- Some animation-heavy or list-virtualisation work needs `react-native-reanimated` and `@shopify/flash-list` — adds learning curve but well-supported.
- Bundle size will be ~30-40 MB Android, ~50-60 MB iOS due to Hermes + face-detector. Acceptable.

---

## 8. Full Phased Roadmap

> **Scope locked:** Student-first MVP. Total ~30 screens, ~50 working days (10 weeks at 1 dev, 5-6 weeks at 2 devs). Faculty/HOD mobile = Phase 9+ (future).

---

### **Phase 0 — Backend Prep (REST v1 Layer)** — 7 days

**Goal:** Every server action the Student MVP needs is exposed as an authenticated REST endpoint at `/api/v1/*` without disturbing the web app.

#### Tasks

1. **Day 1 — Auth refactor**
   - Modify `src/lib/auth.ts`:
     - Add `requireAuthHybrid()` that accepts both Clerk cookie session **and** `Authorization: Bearer <jwt>` (use `authenticateRequest()` from `@clerk/nextjs/server`).
     - Keep existing `requireAuth`/`requireRole` calling the new hybrid internally so web is unaffected.
   - Update `src/proxy.ts` matcher: ensure `/api/v1(.*)` is protected and CORS-permissive for `https://<your-mobile-domain-or-app-scheme>` (Expo dev = `exp://`, prod = your custom scheme).

2. **Day 1-2 — Extract pure business logic from server actions**
   - For each action file needed by the MVP (list below), refactor:
     ```
     src/actions/case-management.ts
       → keep:  export async function createCaseEntry(input, userId) { ... }  // pure
       → keep:  "use server" wrapper that calls the pure fn + revalidatePath
     ```
   - This is the *one-time* cleanup; no behaviour change.
   - **Files to refactor:** [attendance.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:0:0-0:0), [case-management.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/case-management.ts:0:0-0:0), [case-presentations.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/case-presentations.ts:0:0-0:0), [clinical-skills.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/clinical-skills.ts:0:0-0:0), [diagnostic-skills.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/diagnostic-skills.ts:0:0-0:0), [imaging-logs.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/imaging-logs.ts:0:0-0:0), [procedure-logs.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/procedure-logs.ts:0:0-0:0), [journal-clubs.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/journal-clubs.ts:0:0-0:0), [seminar-discussions.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/seminar-discussions.ts:0:0-0:0), [conferences.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/conferences.ts:0:0-0:0), [courses-conferences.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/courses-conferences.ts:0:0-0:0), [life-support-courses.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/life-support-courses.ts:0:0-0:0), [research-activities.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/research-activities.ts:0:0-0:0), [disaster-drills.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/disaster-drills.ts:0:0-0:0), [quality-improvement.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/quality-improvement.ts:0:0-0:0), [other-logs.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/other-logs.ts:0:0-0:0), [logbook-reviews.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/logbook-reviews.ts:0:0-0:0), [evaluations.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/evaluations.ts:0:0-0:0), [rotation-postings.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/rotation-postings.ts:0:0-0:0), [assessments.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/assessments.ts:0:0-0:0), [inbox.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/inbox.ts:0:0-0:0), [profile.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/profile.ts:0:0-0:0), [entry-revisions.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:0:0-0:0).

3. **Day 3-5 — Build `/api/v1/*` route handlers** (folder: `src/app/api/v1/`)

   | New REST Route | Method | Wraps Server Action | Mobile use |
   |---|---|---|---|
   | `/api/v1/auth/me` | GET | reads `User` + Clerk profile | User boot |
   | `/api/v1/auth/push-token` | POST/DELETE | new (see Phase 6) | Register Expo push token |
   | `/api/v1/profile` | GET, PATCH | `getProfile`, `updateProfile` | Profile screen |
   | `/api/v1/cloudinary/signature` | POST | [getCloudinarySignature](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/cloudinary.ts:4:0-18:1) | Image uploads |
   | `/api/v1/inbox` | GET | [getUnifiedInbox](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/inbox.ts:22:0-329:1) (paginated cursor) | Inbox |
   | `/api/v1/dashboard/summary` | GET | new (current page-server logic in `student/page.tsx:42-100`) | Home screen |
   | `/api/v1/entries/:entityType` | GET | `getMy<Module>` (paginated) | List screens |
   | `/api/v1/entries/:entityType` | POST | `create<Module>` | New entry |
   | `/api/v1/entries/:entityType/:id` | GET, PATCH, DELETE | `update<Module>`, `delete<Module>` | Edit/delete |
   | `/api/v1/entries/:entityType/:id/submit` | POST | `submit<Module>` | Submit for review |
   | `/api/v1/entries/:entityType/:id/revisions` | GET | [getRevisionsFor](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/entry-revisions.ts:238:0-255:1) | History |
   | `/api/v1/attendance/config` | GET | [getMyAttendanceConfig](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:207:0-214:1) | Attendance bootstrap |
   | `/api/v1/attendance/holidays` | GET | [getMyHolidays](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:216:0-226:1) | Calendar |
   | `/api/v1/attendance/mark` | POST | [markDailyAttendance](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:260:0-474:1) | Camera/GPS mark |
   | `/api/v1/attendance/face-match` | POST | new (server-side descriptor match) | Face-rec |
   | `/api/v1/attendance/sheets` | GET | [getMyAttendanceSheets](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:950:0-959:1) | List |
   | `/api/v1/attendance/sheets/:id/entries` | GET | (derived) | Day-level view |
   | `/api/v1/attendance/sheets/:id/submit` | POST | [submitAttendanceSheet](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:863:0-909:1) | Submit |
   | `/api/v1/attendance/entries/:id/submit` | POST | [submitDailyEntry](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:1508:0-1551:1) | Per-day submit |
   | `/api/v1/assessments` | GET | `getMyAssessments` | List |
   | `/api/v1/assessments/:id` | GET | [getAssessmentDetail](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/assessments.ts:359:0-419:1) | Detail |
   | `/api/v1/assessments/:id/submissions` | POST | [submitAssessment](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/assessments.ts:423:0-489:1) | Submit work |
   | `/api/v1/evaluations` | GET | already exists ✅ | List |
   | `/api/v1/evaluations/graph` | GET | already exists ✅ | Radar chart |
   | `/api/v1/notifications/unseen-count` | GET | `getNotificationsUnseenCount` | Badge |
   | `/api/v1/notifications/mark-seen` | POST | `markNotificationsSeen` | Mark read |

   Each handler is ~20 lines: auth → parse body via existing Zod schema → call pure fn → return JSON. **Reuse the validators** — do not re-validate.

4. **Day 5-6 — Mobile push token table + Bearer auth tests**
   - Add Prisma model `MobilePushToken` (Section 10).
   - `prisma migrate dev --name add_mobile_push_tokens`.
   - Postman/Bruno collection covering all `/api/v1/*` with a Bearer token from `@clerk/express` test mode.

5. **Day 7 — Performance pre-fixes (mobile-blocking)**
   - Add pagination to `/api/v1/inbox` (cursor on `updatedAt`).
   - Fix N+1 in [/api/analytics/department/route.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/api/analytics/department/route.ts:0:0-0:0) (use `prisma.user.findMany` with `_count` aggregation).
   - Add composite index `(entityType, entityId, version DESC)` on `EntryRevision` if EXPLAIN shows it's missing.
   - Add `(attendanceSheetId, date)` composite on `AttendanceEntry`.

**Deliverable:** Postman collection green, web app still works identically. Backend ready for mobile.

**Risk/Blocker:** Clerk Bearer-token `authenticateRequest()` requires the JWT template configured in Clerk dashboard. Set it up Day 1.

---

### **Phase 1 — Project Scaffold + Auth** — 4 days

#### Tasks

1. **Day 1 — Monorepo conversion (npm workspaces)**
   ```
   hospital-residency-logbook/        ← becomes monorepo root
   ├── apps/
   │   ├── web/                       ← move current Next.js code here
   │   └── mobile/                    ← new Expo app
   ├── packages/
   │   └── shared/                    ← validators + constants + types
   └── package.json                   ← workspaces: ["apps/*", "packages/*"]
   ```
   - Move [src/lib/validators](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/validators:0:0-0:0), [src/lib/constants](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/constants:0:0-0:0), [src/types](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/types:0:0-0:0) into `packages/shared/src/`.
   - Update web tsconfig path alias `@/lib/validators` → `@logbook/shared/validators`.

2. **Day 2 — Create Expo app**
   ```bash
   npx create-expo-app@latest mobile --template tabs
   cd mobile
   npm install @clerk/clerk-expo expo-secure-store expo-local-authentication \
               expo-camera expo-location expo-image-picker expo-notifications \
               @tanstack/react-query axios zod react-hook-form @hookform/resolvers \
               socket.io-client expo-constants
   npx expo install react-native-reanimated react-native-gesture-handler \
                    react-native-safe-area-context react-native-screens \
                    @shopify/flash-list date-fns
   ```
   - Configure Expo Router 4 with file-based routing.
   - Set up TS path `@logbook/shared` to consume the workspace package.

3. **Day 3 — Clerk integration**
   - Wrap root `_layout.tsx` with `<ClerkProvider tokenCache={SecureStoreCache}>`.
   - Sign-in/Sign-up screens via Clerk hosted (or custom email/password).
   - Implement `useApiClient()` hook: axios instance whose `Authorization` header is set from `await getToken()`.
   - Persist token via `expo-secure-store`.

4. **Day 4 — Role-aware routing**
   - On boot: hit `GET /api/v1/auth/me` → store role in context.
   - If role !== `student`, show "Please use the web app — mobile is currently student-only" screen (MVP scope).
   - Root layout switches between `(auth)` and `(app)` route groups.

**Files created:**
```
mobile/app/_layout.tsx
mobile/app/(auth)/sign-in.tsx
mobile/app/(auth)/sign-up.tsx
mobile/app/(app)/_layout.tsx
mobile/lib/api/client.ts
mobile/lib/auth/clerk-cache.ts
mobile/lib/hooks/useMe.ts
```

**Risk:** Clerk's Expo SDK requires specific config in `app.json`/`app.config.ts` for redirect URLs. Reserve time.

---

### **Phase 2 — API Client Layer + Real-time** — 3 days

#### Tasks

1. **Day 1 — TanStack Query setup**
   - Wrap app in `QueryClientProvider`.
   - Default `staleTime: 30s`, `retry: 2`, `refetchOnWindowFocus: false` (mobile semantics).
   - Persistence via `@tanstack/react-query-persist-client` + `expo-secure-store` for offline cache.

2. **Day 2 — Generated API hooks**
   - Create `mobile/lib/api/hooks.ts` with typed hooks per route, e.g.:
     ```ts
     export const useMyEntries = (entityType: EntityType) =>
       useInfiniteQuery({
         queryKey: ['entries', entityType],
         queryFn: ({ pageParam }) =>
           apiClient.get(`/api/v1/entries/${entityType}`, { params: { cursor: pageParam } }),
         getNextPageParam: (last) => last.nextCursor,
       });
     ```
   - One hook per logical screen.

3. **Day 3 — Socket.IO + push notification plumbing**
   - Adapt [src/lib/socket.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/socket.ts:0:0-0:0) for RN (no `window.location.origin` — read from `Constants.expoConfig.extra.socketUrl`).
   - Hook `useRealtimeEvent('entry:updated', () => queryClient.invalidateQueries(...))`.
   - Register Expo push token, POST to `/api/v1/auth/push-token`.
   - Set up `expo-notifications` foreground/background handlers.

---

### **Phase 3 — Student Core Screens (Logbook)** — 18 days

**18 entry-type screens follow the same pattern**, so I'll spec the pattern once and list the 18.

#### Universal pattern per entry type (1 day each)

For each entity, three screens:
- **List screen** — `FlashList` of cards, status badge, pull-to-refresh, infinite scroll, FAB "+ Add entry".
- **Form screen** — `react-hook-form` + shared Zod schema, draft auto-save (debounced 30s), camera/image picker for entities with `imageUrls[]` or `attachments[]`, submit button.
- **Detail/History screen** — Read-only view of one entry + [RevisionThread](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/components/shared/RevisionThread.tsx:101:0-403:1) (port of [src/components/shared/RevisionThread.tsx](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/components/shared/RevisionThread.tsx:0:0-0:0) to RN — replace `Badge` and icons with RN equivalents).

#### Day-by-day

| Day | Module | Web equivalent | Special |
|---|---|---|---|
| 1 | Case Presentations | `dashboard/student/case-presentations` | Patient info subform |
| 2 | Seminar / EBM Discussions | `dashboard/student/case-presentations` (Seminar tab) | Shares schema with #1 |
| 3 | Journal Clubs | `dashboard/student/journal-clubs` | |
| 4 | Clinical Skills Adult | `dashboard/student/clinical-skills` | Confidence selector |
| 5 | Clinical Skills Pediatric | same | Same pattern |
| 6 | Case Management Logs | `dashboard/student/case-management` | 24-category picker; biggest enum |
| 7 | Procedure Logs | `dashboard/student/procedures` | 50-procedure picker; skill level |
| 8 | Diagnostic Skills | `dashboard/student/diagnostics` | **Image upload required** (Cloudinary) |
| 9 | Imaging Logs | `dashboard/student/imaging` | **Image upload** |
| 10 | Other Logs (Transport/Consent/Bad News) | `dashboard/student/transport`, [consent-bad-news](cci:9://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/dashboard/hod/consent-bad-news:0:0-0:0) | 3 screens, share template |
| 11 | Life-Support Courses | `dashboard/student/life-support-courses` | |
| 12 | Conferences | `dashboard/student/conferences` | |
| 13 | Research Activities | `dashboard/student/research-activities` | |
| 14 | Disaster Drills | `dashboard/student/disaster-drills` | |
| 15 | Quality Improvement | `dashboard/student/quality-improvement` | |
| 16 | Logbook Faculty Reviews | `dashboard/student/logbook-reviews` | |
| 17 | Rotation Postings | `dashboard/student/rotation-postings` | **Attachments upload**, date ranges |
| 18 | Thesis | `dashboard/student/thesis` | Per-semester records, special UI |

**Shared components built in this phase:**
```
mobile/components/EntryCard.tsx
mobile/components/StatusBadge.tsx
mobile/components/RevisionThread.tsx          ← port from web
mobile/components/forms/PatientInfoFields.tsx
mobile/components/forms/ConfidenceSelector.tsx
mobile/components/forms/CompetencySelector.tsx
mobile/components/forms/SkillLevelSelector.tsx
mobile/components/forms/CloudinaryUploadRN.tsx ← image picker + signed upload
mobile/components/forms/CategoryPicker.tsx     ← for 24/50-element enums
```

---

### **Phase 4 — Attendance (Camera + GPS + Face)** — 6 days

This is the **highest-value mobile-only flow** — face recognition and GPS verification work much better on a phone than on a desktop browser.

#### Tasks

1. **Day 1 — Attendance dashboard**
   - Calendar view (`react-native-calendars`).
   - Status per day (Present/Absent/Holiday/Leave).
   - Current week summary card.

2. **Day 2 — Mark attendance flow (no face)**
   - Wire `POST /api/v1/attendance/mark` with current GPS (`expo-location`).
   - Validate within radius client-side too (instant feedback) but trust server.

3. **Day 3-4 — Face recognition** (server-side variant for security)
   - Capture frame via `expo-camera`.
   - Detect face client-side with `react-native-vision-camera-face-detector` (just to ensure a face is present — no descriptor extraction needed client-side).
   - Send the cropped JPEG to `POST /api/v1/attendance/face-match` with multipart upload.
   - Server runs `face-api.js` (Node) or `@vladmandic/face-api` to extract descriptor and match against pre-computed descriptors for the batch.
   - **Side benefit:** server-side matching closes Issue #14 for the web flow too.

4. **Day 5 — Edit/retract daily entries, attendance sheets, submit weekly sheet**
   - [submitDailyEntry](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:1508:0-1551:1), [retractDailyEntry](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:1596:0-1622:1), [submitAttendanceSheet](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts:863:0-909:1).

5. **Day 6 — Attendance analytics**
   - "My attendance %" card.
   - 6-month trend chart (use `victory-native` or `react-native-svg-charts`).

**Native APIs used:** `expo-camera`, `expo-location` (foreground + background-restricted), `expo-image-manipulator` (resize before upload).

**Risk:** iOS requires `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription` in `Info.plist` via `app.json` config. Add them Day 1.

---

### **Phase 5 — Inbox, Notifications, Profile, Assessments** — 5 days

| Day | Screen |
|---|---|
| 1 | Unified Inbox (`/api/v1/inbox` paginated) — tap → deep-link to entry detail |
| 2 | Notifications inbox + permission flow + badge unread count |
| 3 | Profile screen (view + edit name, email, image via `expo-image-picker` + Cloudinary) |
| 4 | Internal Assessments — list + detail + submit work (text + attachments) |
| 5 | Evaluation Graph screen — radar chart of 5 domains × 6 semesters (`victory-native` `VictoryPolarAxis`) |

---

### **Phase 6 — Mobile-Only Power Features** — 6 days

| Day | Feature | Implementation |
|---|---|---|
| 1 | **Biometric login** | After first sign-in, store Clerk refresh token in `expo-secure-store`; on app open prompt `LocalAuthentication.authenticateAsync()`. Skip Clerk re-auth UI if biometric passes. |
| 2 | **Push notifications wiring** | Already registered in Phase 2. Now: server-side [sendNotificationToUser()](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/lib/notifications.ts:63:0-78:1) extended to also push to `MobilePushToken` records via Expo's push API (`https://exp.host/--/api/v2/push/send`). Triggers: entry signed, entry needs revision, new assessment, attendance reminder at 09:00 local. |
| 3 | **Deep linking** | Configure scheme `aiimslogbook://` and universal links. `aiimslogbook://entry/CasePresentation/<id>` opens detail. Push payload includes link. |
| 4 | **Offline draft queue** | Use TanStack Query `mutationCache` + `expo-network`. New entries / draft saves while offline → queue in AsyncStorage → drain on reconnect. Mark unsynced entries with a "Pending" badge. |
| 5 | **Camera-first quick entry** | "+" FAB on dashboard → choose entry type → snap patient consent / scan → uploads in background while user fills form. |
| 6 | **Daily attendance reminder** (local notification) | `expo-notifications` schedule daily 09:00 local. Tapping opens `/(app)/attendance`. |

---

### **Phase 7 — Polish, Testing, Performance** — 5 days

- **Day 1** — Skeleton loaders on every list (`react-native-skeleton-placeholder`).
- **Day 2** — Error boundaries, retry UI, offline banner.
- **Day 3** — Unit tests (Jest) for shared validators, API hooks, attendance GPS math.
- **Day 4** — E2E tests (Maestro flows): sign-in → create case → submit; mark attendance with GPS mock.
- **Day 5** — Performance pass: FlashList `estimatedItemSize`, image caching (`expo-image`), profile with React DevTools, fix any > 16ms renders.

**Device matrix:** iOS 15+, Android 8+ (API 26). Test on physical Pixel 6 + iPhone 12 minimum.

---

### **Phase 8 — CI/CD + Store Deployment** — 5 days

| Day | Task |
|---|---|
| 1 | EAS Build config (`eas.json`) — development/preview/production profiles, env-secret management via EAS Secrets |
| 2 | GitHub Actions: lint + type-check + Jest on PR; EAS preview build on `main` |
| 3 | Android internal testing track upload + closed testing group (10 residents) |
| 4 | iOS TestFlight upload + internal testers |
| 5 | EAS Update channel setup (`production`, `staging`); document OTA workflow for JS-only fixes |

**Store assets:** screenshots (5 per device class), privacy policy URL, data-safety form (collect: name, email, photos, location — purpose: medical training records).

**Versioning:** semver. `app.json` `version: "1.0.0"`, `ios.buildNumber`, `android.versionCode` auto-incremented by EAS.

---

## 9. Screen-by-Screen Specification

| # | Screen | Expo Router path | API calls | Native features | Maps to web | Complexity |
|---|---|---|---|---|---|---|
| 1 | Sign In | `/(auth)/sign-in` | Clerk | SecureStore | `/sign-in` | LOW |
| 2 | Sign Up | `/(auth)/sign-up` | Clerk | — | `/sign-up` | LOW |
| 3 | Home / Dashboard | `/(app)/index` | `GET /api/v1/dashboard/summary` | Pull-to-refresh | `/dashboard/student` | MEDIUM |
| 4 | Inbox | `/(app)/inbox` | `GET /api/v1/inbox?cursor=` | Infinite scroll, deep link | `/dashboard/student/inbox` | MEDIUM |
| 5 | Notifications | `/(app)/notifications` | `GET /api/v1/notifications/unseen-count`, push | Push perms | embedded in TopBar (web) | LOW |
| 6 | Profile | `/(app)/profile` | `GET/PATCH /api/v1/profile`, Cloudinary | Image picker | `/dashboard/profile` | MEDIUM |
| 7-24 | 18× Entry list/form/detail | `/(app)/entries/[entityType]/...` | `/api/v1/entries/...` | Camera (8,9,17), image picker | `/dashboard/student/*` | MEDIUM (×18) |
| 25 | Attendance Calendar | `/(app)/attendance/index` | `/api/v1/attendance/sheets`, `/holidays`, `/config` | — | `/dashboard/student/attendance` | MEDIUM |
| 26 | Mark Attendance | `/(app)/attendance/mark` | `POST /api/v1/attendance/mark`, `/face-match` | **Camera + GPS + face detect** | (in web component) | **HIGH** |
| 27 | Attendance Sheet detail | `/(app)/attendance/sheets/[id]` | `GET /api/v1/attendance/sheets/:id/entries` | — | same | MEDIUM |
| 28 | Attendance Analytics | `/(app)/attendance/analytics` | `GET /api/v1/dashboard/summary` (subset) | — | embedded | LOW |
| 29 | Assessments List | `/(app)/assessments/index` | `GET /api/v1/assessments` | — | `/dashboard/student/internal-assessments` | LOW |
| 30 | Assessment Detail + Submit | `/(app)/assessments/[id]` | `GET /api/v1/assessments/:id`, `POST /submissions` | Image picker, file picker | same | MEDIUM |
| 31 | Evaluations List | `/(app)/evaluations/index` | `GET /api/v1/evaluations` | — | `/dashboard/student/evaluation-graph` | LOW |
| 32 | Evaluation Graph | `/(app)/evaluations/graph` | `GET /api/v1/evaluations/graph` | — | same | MEDIUM |
| 33 | Revision History | `/(app)/entries/[entityType]/[id]/history` | `GET /api/v1/entries/:entityType/:id/revisions` | — | `<RevisionThread>` | MEDIUM |
| 34 | Offline drafts | `/(app)/drafts` | AsyncStorage only | — | (new) | MEDIUM |
| 35 | Settings | `/(app)/settings` | local | Biometric toggle, notification perms | — | LOW |

**Total: ~35 screens.** (Pattern factoring brings the build effort closer to 30.)

---

## 10. Database Changes Required

```prisma
// Add to schema.prisma

/// Mobile push notification tokens (separate from web-push NotificationSubscription)
model MobilePushToken {
  id          String   @id @default(cuid())
  userId      String
  token       String   @unique               // Expo push token, e.g. ExponentPushToken[xxx]
  platform    Platform                       // IOS | ANDROID
  deviceName  String?                        // user-friendly device label
  appVersion  String?                        // mobile app semver
  lastSeenAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([lastSeenAt])
}

enum Platform {
  IOS
  ANDROID
}

// Add to User model:
model User {
  // ... existing fields ...
  mobilePushTokens   MobilePushToken[]
}

// Performance fixes flagged in Issues:
model EntryRevision {
  // ... existing ...
  @@index([entityType, entityId, version(sort: Desc)])  // explicit DESC for nextVersion()
}

model AttendanceEntry {
  // ... existing ...
  @@index([attendanceSheetId, date])  // calendar lookups
}

// Optional: server-side face descriptors (if we go with server-side matching — Phase 4)
model FaceDescriptor {
  id          String   @id @default(cuid())
  userId      String   @unique
  descriptor  Float[]  // 128-float face descriptor from face-api.js
  imageUrl    String?  // source image (Clerk CDN or Cloudinary)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Migration command:
```bash
cd apps/web
npx prisma migrate dev --name mobile_support
```

---

## 11. Folder Structure

```
hospital-residency-logbook/                # monorepo root
├── package.json                           # workspaces: ["apps/*","packages/*"]
├── apps/
│   ├── web/                               # existing Next.js code (moved)
│   │   ├── src/
│   │   │   ├── actions/                   # 38 server actions (refactored: thin wrapper + pure fn)
│   │   │   ├── app/
│   │   │   │   ├── api/
│   │   │   │   │   ├── v1/                # NEW — mobile REST layer
│   │   │   │   │   │   ├── auth/
│   │   │   │   │   │   │   ├── me/route.ts
│   │   │   │   │   │   │   └── push-token/route.ts
│   │   │   │   │   │   ├── profile/route.ts
│   │   │   │   │   │   ├── cloudinary/signature/route.ts
│   │   │   │   │   │   ├── inbox/route.ts
│   │   │   │   │   │   ├── dashboard/summary/route.ts
│   │   │   │   │   │   ├── entries/[entityType]/
│   │   │   │   │   │   │   ├── route.ts                   # GET, POST
│   │   │   │   │   │   │   ├── [id]/route.ts              # GET, PATCH, DELETE
│   │   │   │   │   │   │   ├── [id]/submit/route.ts
│   │   │   │   │   │   │   └── [id]/revisions/route.ts
│   │   │   │   │   │   ├── attendance/
│   │   │   │   │   │   │   ├── config/route.ts
│   │   │   │   │   │   │   ├── holidays/route.ts
│   │   │   │   │   │   │   ├── mark/route.ts
│   │   │   │   │   │   │   ├── face-match/route.ts
│   │   │   │   │   │   │   ├── sheets/route.ts
│   │   │   │   │   │   │   ├── sheets/[id]/entries/route.ts
│   │   │   │   │   │   │   └── sheets/[id]/submit/route.ts
│   │   │   │   │   │   ├── assessments/
│   │   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   │   ├── [id]/route.ts
│   │   │   │   │   │   │   └── [id]/submissions/route.ts
│   │   │   │   │   │   ├── evaluations/...
│   │   │   │   │   │   └── notifications/...
│   │   │   │   │   └── (existing routes)
│   │   │   │   └── dashboard/             # unchanged
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts                # add requireAuthHybrid()
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── entry-revisions.ts
│   │   │   │   ├── socket.ts
│   │   │   │   ├── realtime-emit.ts
│   │   │   │   └── notifications.ts       # add sendExpoPush()
│   │   │   ├── components/                # unchanged
│   │   │   ├── hooks/                     # unchanged
│   │   │   └── proxy.ts
│   │   ├── prisma/schema.prisma           # + MobilePushToken, FaceDescriptor
│   │   ├── server.mjs
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── mobile/                            # NEW Expo app
│       ├── app/
│       │   ├── _layout.tsx                # ClerkProvider, QueryClient, NotificationProvider
│       │   ├── (auth)/
│       │   │   ├── _layout.tsx
│       │   │   ├── sign-in.tsx
│       │   │   └── sign-up.tsx
│       │   └── (app)/
│       │       ├── _layout.tsx            # tabs: Home, Logbook, Attendance, Inbox, Profile
│       │       ├── index.tsx              # Home/Dashboard
│       │       ├── inbox.tsx
│       │       ├── notifications.tsx
│       │       ├── profile.tsx
│       │       ├── settings.tsx
│       │       ├── drafts.tsx
│       │       ├── entries/
│       │       │   ├── index.tsx          # logbook hub: list of 18 entry types
│       │       │   └── [entityType]/
│       │       │       ├── index.tsx      # list
│       │       │       ├── new.tsx        # form
│       │       │       └── [id]/
│       │       │           ├── index.tsx  # detail
│       │       │           ├── edit.tsx   # edit form
│       │       │           └── history.tsx
│       │       ├── attendance/
│       │       │   ├── index.tsx          # calendar
│       │       │   ├── mark.tsx           # camera + GPS + face
│       │       │   ├── sheets/[id].tsx
│       │       │   └── analytics.tsx
│       │       ├── assessments/
│       │       │   ├── index.tsx
│       │       │   └── [id].tsx
│       │       └── evaluations/
│       │           ├── index.tsx
│       │           └── graph.tsx
│       ├── components/
│       │   ├── EntryCard.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── RevisionThread.tsx
│       │   ├── OfflineBanner.tsx
│       │   └── forms/
│       │       ├── EntryFormShell.tsx     # shared header + draft-save + submit
│       │       ├── PatientInfoFields.tsx
│       │       ├── ConfidenceSelector.tsx
│       │       ├── CompetencySelector.tsx
│       │       ├── SkillLevelSelector.tsx
│       │       ├── CategoryPicker.tsx
│       │       ├── DatePickerField.tsx
│       │       ├── MarkdownTextField.tsx
│       │       └── CloudinaryUploadRN.tsx
│       ├── lib/
│       │   ├── api/
│       │   │   ├── client.ts              # axios + Clerk token
│       │   │   ├── hooks.ts               # TanStack Query hooks per route
│       │   │   └── mutations.ts
│       │   ├── auth/
│       │   │   ├── clerk-cache.ts         # SecureStore tokenCache
│       │   │   └── biometric.ts
│       │   ├── hooks/
│       │   │   ├── useMe.ts
│       │   │   ├── useRealtime.ts
│       │   │   ├── useOfflineQueue.ts
│       │   │   └── useAttendanceGPS.ts
│       │   ├── notifications/
│       │   │   ├── register.ts
│       │   │   └── handlers.ts
│       │   ├── offline/
│       │   │   ├── queue.ts
│       │   │   └── sync.ts
│       │   ├── socket.ts                  # adapted from web
│       │   └── env.ts                     # reads Constants.expoConfig.extra
│       ├── assets/
│       │   ├── icon.png
│       │   ├── splash.png
│       │   └── adaptive-icon.png
│       ├── app.config.ts                  # env-driven config
│       ├── eas.json                       # build profiles
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── tsconfig.json                  # paths: "@logbook/shared/*"
│       └── package.json
│
└── packages/
    └── shared/
        ├── src/
        │   ├── validators/                # moved from src/lib/validators
        │   │   ├── academics.ts
        │   │   ├── administrative.ts
        │   │   ├── case-management.ts
        │   │   ├── clinical-skills.ts
        │   │   ├── diagnostic-skills.ts
        │   │   ├── evaluation.ts
        │   │   ├── imaging-log.ts
        │   │   ├── other-logs.ts
        │   │   ├── procedure-log.ts
        │   │   ├── professional.ts
        │   │   └── index.ts
        │   ├── constants/                 # moved from src/lib/constants (all 17 files)
        │   ├── types/                     # moved from src/types
        │   └── index.ts
        ├── package.json
        └── tsconfig.json
```

---

## 12. Environment Variables (Mobile-Only)

| Variable | Public? | Purpose | Where to get |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | Base URL for `/api/v1/*` | Railway prod URL or `http://192.168.x.x:3000` for LAN dev |
| `EXPO_PUBLIC_SOCKET_URL` | ✅ | Socket.IO endpoint (same as API in your setup) | same |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk pk | Clerk dashboard (same as web) |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud | Cloudinary dashboard (same as web) |
| `EXPO_PUBLIC_CLOUDINARY_API_KEY` | ✅ | Cloudinary key (public) | same |
| `EXPO_PUBLIC_APP_VARIANT` | ✅ | `development` / `preview` / `production` | EAS Secrets |
| `EXPO_PUBLIC_SENTRY_DSN` | ✅ | Crash reporting (Phase 7) | Sentry |
| (no secret keys on client — all secrets stay on backend) | | | |

**Backend new env vars (Phase 0):**

| Variable | Purpose |
|---|---|
| `MOBILE_CORS_ORIGINS` | Comma-separated allowed origins for `/api/v1/*` (e.g. `exp://*,aiimslogbook://`) |
| (existing: `DATABASE_URL`, `CLERK_*`, `WEB_PUSH_VAPID_*`, `CLOUDINARY_API_SECRET`, `CRON_SECRET`) — unchanged |

---

## 13. Third-Party Integrations

| Service | Web SDK | Mobile SDK | Differences / Gotchas |
|---|---|---|---|
| **Clerk** | `@clerk/nextjs ^6.37.3` | `@clerk/clerk-expo` (latest) | Mobile uses `getToken({ template })` for Bearer auth. Configure JWT template in Clerk dashboard. SecureStore for token cache. OAuth requires custom URL scheme. |
| **Cloudinary** | direct REST with server signature | direct REST with server signature | Same flow. Use `expo-image-picker` + `FormData` upload. Beware large images on cellular — compress with `expo-image-manipulator` to ≤1080p before upload. |
| **Web Push (VAPID)** | `web-push ^3.5.0` | ❌ N/A | Replace with **Expo Notifications** on mobile. Server adds a fan-out: when sending a notification, send to both web `NotificationSubscription` and `MobilePushToken`. Expo's push gateway: `POST https://exp.host/--/api/v2/push/send`. |
| **Socket.IO** | `socket.io-client ^4.8.3` | `socket.io-client ^4.8.3` | Same package, works on RN. Manage reconnect on app foreground (`AppState` listener). |
| **face-api.js** | `^0.22.2` browser | ❌ doesn't work on RN | Switch to **server-side matching** (Phase 4). Mobile sends a cropped face JPEG; server computes descriptor and matches. Side effect: web becomes more secure too. |
| **Recharts** | `^3.7.0` | ❌ N/A | Use `victory-native` v40 or `react-native-svg-charts` for the evaluation graph. |
| **TanStack Table** | `^8.21.3` | ❌ N/A | Mobile uses `@shopify/flash-list` of cards. |
| **`@uiw/react-md-editor`** | `^4.0.11` | ❌ N/A | Replace with plain `TextInput` (multiline) + `react-native-markdown-display` for preview. |
| **`@react-pdf/renderer` / `jspdf` / `xlsx`** | export downloads | ❌ N/A on MVP | Skip export on mobile MVP — students rarely export PDFs from phones. Add later via `expo-print` if needed. |

---

## 14. Performance Considerations

| Concern | Action |
|---|---|
| **Pagination** | `/api/v1/inbox`, `/api/v1/entries/:entityType`, `/api/v1/assessments` — all switch from `findMany` (full table) to cursor pagination on `updatedAt` (Phase 0 Day 7). Mobile list screens use `useInfiniteQuery`. |
| **N+1: department analytics** | Already flagged (Issue #4). HOD stays on web for MVP, but fix anyway in Phase 0 since web HOD pages are slow today. |
| **[getUnifiedInbox](cci:1://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/inbox.ts:22:0-329:1) parallel queries** | Add a `limit` param (default 20 per module = 400 rows max), then merge-sort on `updatedAt`. Mobile cold start should aim for <500ms. |
| **Skeleton loaders** | All list screens (inbox, entry list, attendance calendar, assessments). |
| **Infinite scroll vs pagination** | Infinite scroll everywhere. Page size: 20. |
| **Image caching** | `expo-image` with `cachePolicy="memory-disk"` for Cloudinary thumbnails. |
| **TanStack Query cache** | `staleTime: 30s` for lists, `60s` for dashboard summary, `5min` for `evaluations/graph`. Persist cache to disk for offline-first reads. |
| **Realtime invalidation** | Socket events (`entry:updated`, `entry:signed`) call `queryClient.invalidateQueries(['entries', entityType])` — replaces polling. |
| **Bundle size** | Use `@shopify/flash-list`, lazy-load heavy screens with Expo Router's automatic code splitting. Avoid `lodash` (use ES features). |
| **Cold start** | Defer Clerk + Socket + push init until after first paint. Target <2s to first interactive on mid-range Android. |

---

## 15. Testing Plan

| Layer | Tool | What to test first |
|---|---|---|
| Unit | Jest + `@testing-library/react-native` | Zod validators (already
The previous response timed out at Section 15. Continuing with concise remaining sections:

---

## 15. Testing Plan

| Layer | Tool | Focus |
|---|---|---|
| Unit | Jest + `@testing-library/react-native` | Validators (`packages/shared`), API hooks, GPS-radius math, offline queue logic |
| Integration | Postman/Bruno | All `/api/v1/*` with Bearer tokens (Phase 0 Day 6) |
| E2E | Maestro (preferred over Detox — easier on Expo) | 3 critical flows: (1) sign-in → create case presentation → submit, (2) mark attendance with mocked GPS + face, (3) offline create → reconnect → sync |
| Device matrix | Min iOS 15 / Android 8 (API 26). Physical: Pixel 6, iPhone 12, plus 1 low-end Android (Redmi 9) | |
| Physical-only | Camera, GPS, biometrics, push notifications | |
| Simulator-OK | Forms, lists, navigation, API calls | |

---

## 16. Deployment & Release Plan

- **EAS Build profiles** in `eas.json`: `development` (dev client), `preview` (internal QA APK), `production` (App Store / Play Store).
- **Env strategy**: `EXPO_PUBLIC_API_URL` differs per profile via EAS Secrets.
- **Android**: Internal track → Closed testing (10 residents) → Production. ~2 week rollout.
- **iOS**: TestFlight internal (immediate) → External (beta 25 testers) → App Store. ~1 week Apple review.
- **OTA**: EAS Update on `production` channel for JS-only fixes (no native module changes). Native changes = full rebuild + store submission.
- **Versioning**: semver in `app.json`; `ios.buildNumber` and `android.versionCode` auto-incremented by EAS.
- **Crash reporting**: Sentry via `sentry-expo` (Phase 7).

---

## 17. Timeline Summary

| Phase | Description | Days | Cumulative |
|---|---|---|---|
| 0 | Backend prep — `/api/v1/*` REST layer, Bearer auth, perf fixes, mobile push table | 7 | 7 |
| 1 | Monorepo + Expo scaffold + Clerk auth | 4 | 11 |
| 2 | API client (TanStack Query) + Socket.IO + push registration | 3 | 14 |
| 3 | 18 logbook entry types (list/form/detail each) | 18 | 32 |
| 4 | Attendance: calendar + camera + GPS + server-side face match | 6 | 38 |
| 5 | Inbox, notifications, profile, assessments, evaluation graph | 5 | 43 |
| 6 | Mobile-only features: biometric, deep link, offline queue, daily reminder | 6 | 49 |
| 7 | Polish, skeletons, error states, unit + E2E tests, perf | 5 | 54 |
| 8 | EAS CI/CD + TestFlight + Play Store internal track | 5 | 59 |
| **Total** | **Student MVP live in stores** | **—** | **~59 working days (≈12 weeks @ 1 dev, ≈7 weeks @ 2 devs)** |

**Buffer recommendation:** add 15% (≈9 days) for Apple review iterations, Clerk Expo SDK quirks, and face-detection model tuning. **Realistic target: 70 working days / 14 weeks for one developer.**

---

## Critical Path Risks

1. 🔴 **Clerk Bearer token JWT template** — must be configured Day 1 of Phase 0; blocks every mobile API call until done.
2. 🔴 **Server-side face matching** — requires running `face-api.js` (or `@vladmandic/face-api`) on Node. Validate in a spike before Phase 4 starts; Railway memory may be tight.
3. 🟠 **Apple App Store review** — medical-data apps often face extra scrutiny. Prepare privacy policy, data-safety form, and "approved use by AIIMS Patna" justification ahead of Phase 8.
4. 🟠 **Cloudinary cellular uploads** — implement `expo-image-manipulator` resize-to-1080p before upload; otherwise students on 3G will fail uploads.
5. 🟠 **Workspace package consumption** — Expo Metro bundler needs explicit configuration for monorepo (`metro.config.js` + `watchFolders`). Allocate half a day in Phase 1.

---

## Recommended Pre-Phase-0 Cleanup (1-2 days, optional but high-leverage)

- Delete [src/actions/attendance.ts.bak](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/actions/attendance.ts.bak:0:0-0:0)
- Wire `EntryRevision` recording into [/api/sign-off/route.ts](cci:7://file:///c:/Users/Vikash/Desktop/hospital-residency-logbook/src/app/api/sign-off/route.ts:0:0-0:0) (Issue #2) — otherwise mobile will create un-audited signatures
- Migrate `User.batch String?` queries to `User.batchId` (Issue #5)
- Add `Cloudinary` host to `next.config.ts` `remotePatterns` (Issue #8)

---

This roadmap is anchored to your actual files and routes. Tell me which of the following you want next:

1. **Phase 0 implementation** — I can start writing the `/api/v1/*` route files and the `requireAuthHybrid()` helper now.
2. **Monorepo migration script** — A migration plan + commands to convert the current single-package repo into the workspace layout.
3. **Detailed entry-type screen spec** — Pick one entry (e.g. Case Management) and I'll write the full mobile screen code (list + form + detail).
4. **Backend perf fixes** — Implement the N+1 fix in `/api/analytics/department` and inbox pagination.