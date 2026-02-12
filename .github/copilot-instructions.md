# Copilot Instructions — AIIMS Patna PG Residency Digital Logbook

> **CRITICAL:** Read this entire document before writing ANY code for this project.
> Every instruction here is mandatory. Violations result in broken workflows, security risks, or logbook forms being missed.

---

## Table of Contents

1. [Project Context & Domain Knowledge](#1-project-context--domain-knowledge)
2. [Canonical Source of Truth](#2-canonical-source-of-truth)
3. [Tech Stack — Exact Versions & Usage](#3-tech-stack--exact-versions--usage)
4. [Security Rules — Non-Negotiable](#4-security-rules--non-negotiable)
5. [Architecture & System Design Standards](#5-architecture--system-design-standards)
6. [Reusable Component Architecture](#6-reusable-component-architecture)
7. [Database & Prisma Standards](#7-database--prisma-standards)
8. [Authentication & Authorization (Clerk)](#8-authentication--authorization-clerk)
9. [Form Architecture — The Core of This App](#9-form-architecture--the-core-of-this-app)
10. [API Route Standards](#10-api-route-standards)
11. [UI/UX & Hospital Theme Standards](#11-uiux--hospital-theme-standards)
12. [File & Folder Conventions](#12-file--folder-conventions)
13. [TypeScript Standards](#13-typescript-standards)
14. [Error Handling & Validation](#14-error-handling--validation)
15. [Testing Standards](#15-testing-standards)
16. [Git & Version Control](#16-git--version-control)
17. [Performance & Optimization](#17-performance--optimization)
18. [Deployment — Railway](#18-deployment--railway)
19. [Documentation Standards](#19-documentation-standards)
20. [Domain-Specific Rules (Medical Logbook)](#20-domain-specific-rules-medical-logbook)
21. [Anti-Patterns — What NEVER To Do](#21-anti-patterns--what-never-to-do)
22. [Checklist Before Committing Code](#22-checklist-before-committing-code)

---

## 1. Project Context & Domain Knowledge

### What This Project Is

This is a **digital replacement for a physical PG (Post Graduate) Residency Logbook** used by MD Emergency Medicine residents at **AIIMS Patna** (All India Institute of Medical Sciences, Patna, Bihar, India).

### Why This Matters

- This is a **medical education compliance tool** — residents MUST maintain this logbook to complete their MD degree.
- The logbook is reviewed by the **National Medical Commission (NMC)** of India.
- Every form in the physical logbook (`PG Logbook .md`) MUST have a digital equivalent — missing even one form is a project failure.
- Three user roles interact with the system: **HOD** (Head of Department), **Faculty** (supervising doctors), and **Students** (PG residents).

### Key Domain Terms

| Term                 | Meaning                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------- |
| **UHID**             | Unique Hospital Identification Number (patient ID at AIIMS)                              |
| **Semester**         | Academic semester (1-6 over 3 years of MD)                                               |
| **Rotation Posting** | Department where resident is posted for a period                                         |
| **Batch**            | Cohort of residents who joined together (e.g., "July 2022")                              |
| **CBD**              | Case Based Discussion (competency assessment method)                                     |
| **S/O/MS/MI**        | Simulation / Observed / Managed under Supervision / Managed Independently                |
| **S/O/A/PS/PI**      | Simulation / Observed / Assisted / Performed under Supervision / Performed Independently |
| **VC/FC/SC/NC**      | Very Confident / Fairly Confident / Slightly Confident / Not Confident                   |
| **ABG**              | Arterial Blood Gas analysis                                                              |
| **ECG**              | Electrocardiogram                                                                        |
| **POCUS**            | Point of Care Ultrasonography                                                            |
| **ICD**              | Intercostal Chest Drain                                                                  |
| **CPR**              | Cardiopulmonary Resuscitation                                                            |
| **Faculty Sign**     | Digital signature/approval by a supervising faculty member                               |
| **Tally**            | Running count of how many times a procedure/case has been managed                        |

---

## 2. Canonical Source of Truth

### Primary References — ALWAYS Consult

| Document       | Path             | Purpose                                                                                                                                               |
| -------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PG Logbook** | `PG Logbook .md` | The COMPLETE physical logbook. Every form, table, field, and case type is defined here. This is the ultimate authority for what the app must contain. |
| **Roadmap**    | `roadmap.md`     | Technical architecture, database schema, module breakdown, API design, folder structure, development phases.                                          |

### Rules for Using These References

1. **Before creating ANY new form/page/component**, cross-check against `PG Logbook .md` to ensure field names, order, and structure match the physical logbook EXACTLY.
2. **Before creating ANY database model or API route**, cross-check against `roadmap.md` Section 5 (Prisma schema) and Section 8 (API routes).
3. **Before creating ANY page**, cross-check against `roadmap.md` Section 11 (Folder structure).
4. **Never rename or restructure** form fields to be "cleaner" — field names MUST match the physical logbook's terminology (e.g., keep "Faculty Sign" not "approverSignature", keep "Sl. No." not "serialNumber").

### During Development — Always Read Latest Docs

When implementing any library or tool, ALWAYS:

- Read the **current** official documentation for that exact version
- Check the **latest** release notes for breaking changes
- Prefer **stable APIs** over experimental/beta features
- Use the **App Router** pattern for Next.js (NOT Pages Router)
- Use Prisma's **latest stable** migration patterns
- Use Clerk's **latest** Next.js SDK (`@clerk/nextjs`)

**Specific docs to reference:**

- Next.js: https://nextjs.org/docs (App Router section)
- Prisma: https://www.prisma.io/docs
- Clerk: https://clerk.com/docs/quickstarts/nextjs
- shadcn/ui: https://ui.shadcn.com/docs
- React Hook Form: https://react-hook-form.com/docs
- Zod: https://zod.dev
- Tailwind CSS: https://tailwindcss.com/docs
- Recharts: https://recharts.org/en-US/api
- Railway: https://docs.railway.app

---

## 3. Tech Stack — Exact Versions & Usage

### Mandatory Stack (Do Not Substitute)

```
Framework:       Next.js 14+ (App Router ONLY — no Pages Router)
Language:        TypeScript (strict mode — no `any` types)
Styling:         Tailwind CSS 3.4+
UI Components:   shadcn/ui (install via `npx shadcn-ui@latest add`)
Forms:           React Hook Form + Zod resolvers
Database:        PostgreSQL (hosted on Railway)
ORM:             Prisma 5+
Auth:            Clerk (@clerk/nextjs)
Icons:           Lucide React
Charts:          Recharts
PDF Export:      @react-pdf/renderer
Deployment:      Railway.app
Package Manager: npm (use npm, not yarn or pnpm, for consistency)
```

### Library Usage Rules

| Library                             | Use For                                                        | Do NOT Use For                                                              |
| ----------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **React Hook Form**                 | All form state management                                      | Do not use `useState` for form fields                                       |
| **Zod**                             | All input validation (client + server)                         | Do not write manual validation logic                                        |
| **shadcn/ui**                       | All UI primitives (Button, Input, Select, Dialog, Table, etc.) | Do not install other UI libraries (no MUI, Chakra, Ant)                     |
| **Tailwind CSS**                    | All styling                                                    | Do not write CSS modules, styled-components, or inline style objects        |
| **Prisma**                          | All database queries                                           | Do not write raw SQL unless absolutely necessary (and document why)         |
| **Clerk**                           | All auth (sign-in, sign-up, session, role checks)              | Do not build custom auth, do not store passwords                            |
| **Lucide React**                    | All icons                                                      | Do not mix icon libraries                                                   |
| **Recharts**                        | All charts and graphs                                          | Do not use Chart.js, D3 directly, or other charting libs                    |
| **Server Actions / Route Handlers** | All mutations and data fetching                                | Do not use `getServerSideProps` or `getStaticProps` (Pages Router patterns) |

---

## 4. Security Rules — Non-Negotiable

### Environment Variables

```
NEVER commit .env, .env.local, .env.production or ANY file containing secrets.
NEVER hardcode API keys, database URLs, or auth secrets in source code.
NEVER log sensitive data (passwords, tokens, patient info) to console.
ALWAYS use process.env.VARIABLE_NAME to access secrets.
ALWAYS add every .env* file pattern to .gitignore.
ALWAYS provide a .env.example with placeholder values (no real secrets).
```

### Secret Pattern — REQUIRED for every env variable:

```typescript
// ✅ CORRECT
const clerkSecret = process.env.CLERK_SECRET_KEY;
if (!clerkSecret) throw new Error("CLERK_SECRET_KEY is not set");

// ❌ WRONG — NEVER DO THIS
const clerkSecret = "sk_live_abc123..."; // HARDCODED SECRET
```

### Data Security

- **Patient data (UHID, names)** must only be accessible to the student who entered it and their assigned faculty/HOD.
- **Role checks** must happen on BOTH client AND server. Never trust client-side role checks alone.
- **API routes** must validate the requesting user's role before returning data.
- **Prisma queries** must ALWAYS include a `userId` or role-based WHERE clause — never return all records without scoping.
- **No data from one student should ever leak to another student.**

### Clerk Security

```typescript
// ✅ CORRECT — Always verify auth on server
import { auth } from "@clerk/nextjs/server";

export async function GET() {
	const { userId, sessionClaims } = await auth();
	if (!userId) return new Response("Unauthorized", { status: 401 });

	const role = sessionClaims?.metadata?.role;
	if (role !== "hod" && role !== "faculty") {
		return new Response("Forbidden", { status: 403 });
	}
	// ... proceed
}

// ❌ WRONG — Client-side only role check
if (user.role === "hod") {
	showAdminPanel();
} // Can be bypassed
```

### Input Sanitization

- All user inputs must be validated through **Zod schemas** before touching the database.
- Never use `dangerouslySetInnerHTML` unless rendering sanitized Markdown.
- Escape all patient-facing text fields.

---

## 5. Architecture & System Design Standards

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│  PRESENTATION LAYER (React Components)       │
│  - Pages, Layouts, UI Components            │
│  - Form components with React Hook Form     │
│  - Data display with DataTable component    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  APPLICATION LAYER (Server Actions / API)    │
│  - Route Handlers (/api/*)                  │
│  - Server Actions (use "use server")        │
│  - Auth middleware (Clerk)                   │
│  - Zod validation                           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  DATA ACCESS LAYER (Prisma)                  │
│  - Prisma Client singleton                  │
│  - Repository-pattern helper functions      │
│  - Type-safe queries                        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  DATABASE (PostgreSQL on Railway)            │
└─────────────────────────────────────────────┘
```

### Separation of Concerns — STRICTLY enforced

| Layer              | Files                                     | Allowed to Import                                |
| ------------------ | ----------------------------------------- | ------------------------------------------------ |
| **UI Components**  | `src/components/**`                       | Other components, hooks, types, utils, constants |
| **Pages**          | `src/app/**/page.tsx`                     | Components, server actions, lib functions        |
| **Server Actions** | `src/actions/**` or inline `"use server"` | Prisma, validators, auth utilities               |
| **API Routes**     | `src/app/api/**/route.ts`                 | Prisma, validators, auth utilities               |
| **Lib/Utilities**  | `src/lib/**`                              | Only external packages and types                 |
| **Validators**     | `src/lib/validators/**`                   | Only Zod, types, constants                       |
| **Constants**      | `src/lib/constants/**`                    | Nothing (pure data)                              |
| **Types**          | `src/types/**`                            | Nothing (pure types)                             |

### Design Principles

1. **Single Responsibility:** Each file/component does ONE thing.
2. **DRY (Don't Repeat Yourself):** If you write similar code twice, extract it into a reusable component/function.
3. **Open/Closed:** Components are open for extension (via props) but closed for modification.
4. **Dependency Inversion:** High-level modules (pages) depend on abstractions (component props), not on low-level details (database queries).
5. **Composition over Inheritance:** Use component composition and hooks, never class inheritance.

---

## 6. Reusable Component Architecture

### CRITICAL RULE: Everything Must Be Reusable

This application has **100+ forms** across case management, procedures, diagnostics, imaging, academics, and professional development. Building each form from scratch is UNACCEPTABLE. Instead:

### Mandatory Reusable Components

#### 1. `GenericLogForm` — The Master Form Component

```typescript
// src/components/forms/GenericLogForm.tsx
// This is the MOST IMPORTANT component in the entire app.
// It must handle ALL log entry forms through configuration.

interface GenericLogFormProps<T extends FieldValues> {
	schema: ZodType<T>; // Zod validation schema
	defaultValues: DefaultValues<T>; // React Hook Form defaults
	fields: FormFieldConfig[]; // Field definitions (see below)
	onSubmit: (data: T) => Promise<void>; // Server action
	onSaveDraft?: (data: Partial<T>) => void; // Auto-save draft
	entryStatus?: EntryStatus; // Current status (DRAFT, SUBMITTED, etc.)
	isEditable?: boolean; // false when signed off
	title: string; // Form title
	description?: string; // Form description
}
```

#### 2. `FormFieldConfig` — Declarative Field Definitions

```typescript
// src/types/form.ts
interface FormFieldConfig {
	name: string; // Field name matching Zod schema
	label: string; // Display label (MUST match physical logbook field name)
	type:
		| "text"
		| "textarea"
		| "date"
		| "select"
		| "radio"
		| "number"
		| "patient-info"
		| "competency"
		| "confidence"
		| "skill-level";
	placeholder?: string;
	required?: boolean;
	options?: { value: string; label: string }[]; // For select/radio
	colSpan?: 1 | 2 | 3; // Grid column span
	helpText?: string; // Tooltip or helper text
	disabled?: boolean; // Gray out if not editable
}
```

#### 3. `DataTable` — The Universal Table Component

```typescript
// src/components/tables/DataTable.tsx
// Used for EVERY list view in the app.

interface DataTableProps<T> {
	data: T[];
	columns: ColumnDef<T>[]; // TanStack Table column defs
	searchable?: boolean; // Enable search
	searchField?: string; // Which field to search
	filterable?: boolean; // Enable filters
	filterOptions?: FilterConfig[]; // Filter definitions
	pagination?: boolean; // Enable pagination
	pageSize?: number; // Default page size
	onRowClick?: (row: T) => void; // Row click handler
	actions?: (row: T) => ReactNode; // Action buttons per row
	emptyMessage?: string; // "No entries yet"
	exportable?: boolean; // Enable CSV/PDF export
}
```

#### 4. Specialized Reusable Field Components

Each of these MUST be a standalone, importable component:

| Component                 | File                                                | Purpose                                                         |
| ------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `PatientInfoFields`       | `src/components/shared/PatientInfoFields.tsx`       | Name, Age, Sex, UHID — used in 90% of forms                     |
| `CompetencyLevelSelector` | `src/components/shared/CompetencyLevelSelector.tsx` | CBD/S/O/MS/MI radio group — used in all case management logs    |
| `ConfidenceLevelSelector` | `src/components/shared/ConfidenceLevelSelector.tsx` | VC/FC/SC/NC radio group — used in clinical skills & diagnostics |
| `SkillLevelSelector`      | `src/components/shared/SkillLevelSelector.tsx`      | S/O/A/PS/PI selector — used in all procedure logs               |
| `CprSkillLevelSelector`   | `src/components/shared/CprSkillLevelSelector.tsx`   | S/TM/TL selector — used in CPR procedure logs                   |
| `DatePickerField`         | `src/components/shared/DatePickerField.tsx`         | Consistent date picker across all forms                         |
| `DiagnosisFreeTextField`  | `src/components/shared/DiagnosisFreeTextField.tsx`  | Free-text with auto-suggest for diagnosis field                 |
| `DigitalSignatureButton`  | `src/components/shared/DigitalSignatureButton.tsx`  | Faculty sign-off button with confirmation dialog                |
| `RemarkDialog`            | `src/components/shared/RemarkDialog.tsx`            | Faculty add remark dialog                                       |
| `StatusBadge`             | `src/components/shared/StatusBadge.tsx`             | Color-coded status (Draft/Submitted/Signed/Rejected)            |
| `TallyCounter`            | `src/components/shared/TallyCounter.tsx`            | +1 increment button for procedure/case counts                   |
| `SemesterSelector`        | `src/components/shared/SemesterSelector.tsx`        | Dropdown for semesters 1-6                                      |
| `CategorySelector`        | `src/components/shared/CategorySelector.tsx`        | Reusable filtered category dropdown                             |
| `LogEntryCard`            | `src/components/shared/LogEntryCard.tsx`            | Card view of a single log entry (for mobile)                    |
| `ProgressBar`             | `src/components/shared/ProgressBar.tsx`             | Completion progress visualization                               |
| `EvaluationRadar`         | `src/components/charts/EvaluationRadar.tsx`         | 5-domain radar chart for evaluations                            |

#### 5. Layout Components (Reusable Across All Pages)

| Component      | File                                    | Purpose                                              |
| -------------- | --------------------------------------- | ---------------------------------------------------- |
| `Sidebar`      | `src/components/layout/Sidebar.tsx`     | Left navigation, role-aware menu items               |
| `TopBar`       | `src/components/layout/TopBar.tsx`      | Breadcrumbs, notifications, user button              |
| `PageHeader`   | `src/components/layout/PageHeader.tsx`  | Consistent page title + description + action buttons |
| `MobileNav`    | `src/components/layout/MobileNav.tsx`   | Bottom tab bar for mobile                            |
| `Footer`       | `src/components/layout/Footer.tsx`      | AIIMS Patna branding footer                          |
| `StatCard`     | `src/components/cards/StatCard.tsx`     | Dashboard stat card (icon + count + label)           |
| `CategoryCard` | `src/components/cards/CategoryCard.tsx` | Category overview card with completion %             |
| `StudentCard`  | `src/components/cards/StudentCard.tsx`  | Student summary card for faculty/HOD                 |

### Component Independence Rules

```
1. EVERY component must work in ISOLATION.
   - It receives data via props, not by importing global state.
   - It does NOT fetch its own data (parent page fetches, passes via props).
   - Exception: Server Components can fetch their own data.

2. EVERY component must have clearly typed props.
   - Use TypeScript interfaces for ALL props.
   - Export the prop interface alongside the component.
   - Props interface name = ComponentName + "Props" (e.g., DataTableProps).

3. EVERY component must handle its loading, empty, and error states.
   - Show Skeleton loader while loading.
   - Show empty state message when no data.
   - Show error boundary/message on failure.

4. ZERO direct database imports in UI components.
   - Components in src/components/ NEVER import from prisma.
   - Data flows: Page (server) → fetch data → pass as props → Component.

5. ZERO hardcoded strings inside components.
   - All medical terms, category names, labels → import from src/lib/constants/
   - All colors → use Tailwind theme tokens, never raw hex in components.

6. Every form component must accept a `disabled` prop.
   - When a log entry is SIGNED, the form renders as read-only.
```

### How to Add a New Logbook Form (Step-by-Step)

When asked to create a form for a new logbook section:

```
1. Identify the section in `PG Logbook .md`
2. Extract EXACT field names and types
3. Create a Zod schema in `src/lib/validators/{module-name}.ts`
4. Define FormFieldConfig[] in `src/lib/constants/{module-name}.ts`
5. Create or reuse a page at the correct route (per roadmap.md Section 11)
6. Use <GenericLogForm /> with the schema and field config
7. Create a server action in `src/actions/{module-name}.ts`
8. Add columns definition in `src/components/tables/columns/{module-name}.tsx`
9. Wire up the DataTable for the list view
10. Verify ALL fields match the physical logbook — no extra, no missing
```

---

## 7. Database & Prisma Standards

### Schema Location

```
prisma/schema.prisma — Single schema file
prisma/seed.ts — Seed data (rotation names, case categories, procedure types)
```

### Schema Rules

```
1. ALWAYS use @id @default(cuid()) for primary keys.
2. ALWAYS include createdAt DateTime @default(now()) and updatedAt DateTime @updatedAt on every model.
3. ALWAYS include userId for user-scoped data. NEVER create a log without tying it to a user.
4. ALWAYS use enums (defined in schema.prisma) for fixed categories:
   - Role, EntryStatus, CaseCategory, ProcedureCategory, etc.
5. ALWAYS create proper relations with @relation.
6. ALWAYS add @@index on frequently queried fields (userId, category, status).
7. Use the schema from roadmap.md Section 5 as the canonical reference.
8. When adding new models, follow the EXACT same patterns as existing models.
```

### Prisma Client Singleton — REQUIRED

```typescript
// src/lib/prisma.ts — ONLY FILE that instantiates PrismaClient
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

```
RULE: Import prisma from "@/lib/prisma" everywhere.
NEVER create new PrismaClient() anywhere else.
NEVER import PrismaClient directly in a component or page.
```

### Migration Workflow

```bash
# Development: Create and apply migration
npx prisma migrate dev --name descriptive-migration-name

# Production (Railway): Apply pending migrations
npx prisma migrate deploy

# After schema changes: Regenerate client
npx prisma generate

# Seed database (run once after schema setup)
npx prisma db seed
```

### Query Patterns — ALWAYS Follow

```typescript
// ✅ CORRECT — Scoped query with user check
const logs = await prisma.caseManagementLog.findMany({
	where: {
		userId: currentUserId,
		category: "RESUSCITATION",
	},
	orderBy: { createdAt: "desc" },
	take: 50,
});

// ❌ WRONG — Unscoped query returns ALL users' data
const logs = await prisma.caseManagementLog.findMany();

// ✅ CORRECT — Faculty query scoped to assigned students
const studentIds = await getAssignedStudentIds(facultyId);
const logs = await prisma.procedureLog.findMany({
	where: {
		userId: { in: studentIds },
		status: "SUBMITTED",
	},
});
```

---

## 8. Authentication & Authorization (Clerk)

### Middleware — REQUIRED

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
	if (isProtectedRoute(req)) {
		await auth.protect();
	}
});

export const config = {
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### Role Checking — Server Side

```typescript
// src/lib/auth.ts
import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

export async function requireRole(
	allowedRoles: ("hod" | "faculty" | "student")[],
) {
	const { userId, sessionClaims } = await auth();
	if (!userId) throw new Error("Unauthorized");

	const role = (sessionClaims?.metadata as { role?: string })?.role;
	if (!role || !allowedRoles.includes(role as any)) {
		throw new Error("Forbidden");
	}

	return { userId, role };
}
```

### Role Checking — Client Side (for UI rendering only)

```typescript
// src/hooks/useRole.ts
import { useUser } from "@clerk/nextjs";

export function useRole() {
	const { user } = useUser();
	const role = user?.publicMetadata?.role as
		| "hod"
		| "faculty"
		| "student"
		| undefined;
	return {
		role,
		isHod: role === "hod",
		isFaculty: role === "faculty",
		isStudent: role === "student",
	};
}
```

### Authorization Rules (ALWAYS enforce on server)

```
- Student: Can only CRUD their OWN entries.
- Faculty: Can READ entries of their ASSIGNED students only. Can SIGN and ADD REMARKS.
- HOD: Can READ ALL entries. Can sign, remark, and manage assignments.
- Every API route must call requireRole() before processing.
- Every Prisma query must filter by userId or assignment.
```

---

## 9. Form Architecture — The Core of This App

### Why This Section Exists

This app is 90% forms. There are 100+ distinct form types across:

- 25 case management categories (300+ case sub-types)
- 48 procedure categories (1000+ entry slots)
- 30 diagnostic skill types
- 5 imaging categories
- Academic forms (presentations, seminars, journal clubs)
- Administrative forms (attendance, rotation, thesis)
- Professional development forms
- Evaluation forms

**Building each form independently would create 100+ unique form files. This is unacceptable.**

### The Pattern: Schema-Driven Forms

```
Step 1: Define Zod schema for the data model
Step 2: Define field configuration array
Step 3: Pass both to GenericLogForm
Step 4: GenericLogForm renders the correct fields automatically
```

### Example: Creating a Case Management Form

```typescript
// 1. Zod schema — src/lib/validators/case-management.ts
import { z } from "zod";

export const caseManagementSchema = z.object({
	date: z.date({ required_error: "Date is required" }),
	patientName: z.string().min(1, "Patient name is required"),
	patientAge: z.number().min(0).max(150),
	patientSex: z.enum(["Male", "Female", "Other"]),
	uhid: z.string().min(1, "UHID is required"),
	completeDiagnosis: z.string().min(1, "Diagnosis is required"),
	competencyLevel: z.enum(["CBD", "S", "O", "MS", "MI"]),
	category: z.string(),
	caseSubCategory: z.string(),
});

// 2. Field config — src/lib/constants/case-management-fields.ts
import { FormFieldConfig } from "@/types/form";

export const caseManagementFields: FormFieldConfig[] = [
	{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
	{
		name: "patientName",
		label: "Patient Name",
		type: "text",
		required: true,
		colSpan: 1,
	},
	{
		name: "patientAge",
		label: "Age",
		type: "number",
		required: true,
		colSpan: 1,
	},
	{
		name: "patientSex",
		label: "Sex",
		type: "select",
		required: true,
		colSpan: 1,
		options: [
			{ value: "Male", label: "Male" },
			{ value: "Female", label: "Female" },
			{ value: "Other", label: "Other" },
		],
	},
	{ name: "uhid", label: "UHID", type: "text", required: true, colSpan: 1 },
	{
		name: "completeDiagnosis",
		label: "Complete Diagnosis",
		type: "textarea",
		required: true,
		colSpan: 2,
	},
	{
		name: "competencyLevel",
		label: "Competency (CBD/S/O/MS/MI)",
		type: "competency",
		required: true,
		colSpan: 1,
	},
];

// 3. Page uses GenericLogForm — src/app/dashboard/student/case-management/[category]/page.tsx
// (fetches data, passes schema + fields + server action)
```

### Form Behavior Rules

```
1. AUTO-SAVE: Forms must auto-save as DRAFT every 30 seconds.
2. SUBMIT: Student clicks "Submit for Review" → status changes to SUBMITTED.
3. READ-ONLY: Once status is SIGNED, form fields become disabled.
4. REVISION: If NEEDS_REVISION, student can edit and resubmit.
5. TALLY: Forms with tally counters auto-increment when a new entry is added.
6. SERIAL NUMBER: Sl. No. is auto-generated per user per category.
7. VALIDATION: Zod validation runs on BOTH client (instant feedback) and server (security).
```

---

## 10. API Route Standards

### File Naming

```
src/app/api/{resource}/route.ts          → GET (list), POST (create)
src/app/api/{resource}/[id]/route.ts     → GET (single), PATCH (update), DELETE (remove)
```

### Route Handler Template — REQUIRED pattern

```typescript
// src/app/api/case-management/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { caseManagementSchema } from "@/lib/validators/case-management";

// GET — List entries (scoped by role)
export async function GET(req: NextRequest) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as any)?.role;
		const { searchParams } = new URL(req.url);
		const category = searchParams.get("category");

		let where: any = {};

		if (role === "student") {
			where.userId = userId;
		} else if (role === "faculty") {
			const assignments = await prisma.facultyStudentAssignment.findMany({
				where: { facultyId: userId },
				select: { studentId: true },
			});
			where.userId = { in: assignments.map((a) => a.studentId) };
		}
		// HOD: no userId filter (sees all)

		if (category) where.category = category;

		const entries = await prisma.caseManagementLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			include: { user: { select: { firstName: true, lastName: true } } },
		});

		return NextResponse.json(entries);
	} catch (error) {
		console.error("[CASE_MANAGEMENT_GET]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

// POST — Create new entry
export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const body = await req.json();
		const validated = caseManagementSchema.parse(body);

		const entry = await prisma.caseManagementLog.create({
			data: {
				...validated,
				userId,
				status: "DRAFT",
			},
		});

		return NextResponse.json(entry, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		console.error("[CASE_MANAGEMENT_POST]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
```

### API Rules

```
1. ALWAYS authenticate with Clerk's auth() before any operation.
2. ALWAYS validate input with Zod before database operations.
3. ALWAYS scope data by user role (student sees own, faculty sees assigned, HOD sees all).
4. ALWAYS return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500).
5. ALWAYS wrap in try/catch and log errors with a prefix tag (e.g., [CASE_MANAGEMENT_GET]).
6. NEVER expose internal error messages to the client in production.
7. ALWAYS use Prisma transactions for multi-step operations.
8. ALWAYS sanitize and validate query parameters.
```

---

## 11. UI/UX & Hospital Theme Standards

### Tailwind Theme Configuration — MANDATORY

```typescript
// tailwind.config.ts — These tokens MUST be used everywhere
const config = {
	theme: {
		extend: {
			colors: {
				hospital: {
					primary: "#0066CC", // Hospital Blue
					"primary-dark": "#003D7A", // Deep Navy
					secondary: "#00897B", // Medical Teal
					accent: "#D32F2F", // Emergency Red
					background: "#FAFBFC", // Clean White
					surface: "#F0F2F5", // Soft Gray
					"text-primary": "#1A1A2E", // Dark Charcoal
					"text-secondary": "#6B7280", // Medium Gray
					border: "#E5E7EB", // Light Gray
					warning: "#F59E0B", // Amber
					success: "#10B981", // Green
				},
			},
			fontFamily: {
				sans: ["Inter", "sans-serif"],
				mono: ["JetBrains Mono", "monospace"],
			},
		},
	},
};
```

### UI Rules

```
1. ALWAYS use theme tokens: `bg-hospital-primary` not `bg-[#0066CC]`.
2. ALWAYS use shadcn/ui components as base — customize via className prop.
3. ALWAYS show loading skeletons while data is being fetched.
4. ALWAYS show empty states ("No case logs yet. Add your first entry.").
5. ALWAYS make forms responsive — single column on mobile, multi-column on desktop.
6. ALWAYS include the AIIMS Patna logo in the sidebar header.
7. NEVER use arbitrary colors or fonts outside the theme.
8. NEVER use !important in Tailwind classes.
9. Status badges must use consistent colors:
   - DRAFT = gray
   - SUBMITTED = amber/warning
   - SIGNED = green/success
   - REJECTED = red/accent
   - NEEDS_REVISION = orange
```

### Mobile-First Development

```
1. All layouts default to mobile view, then expand at md: and lg: breakpoints.
2. Sidebar: visible on lg:, collapses to bottom tabs on mobile.
3. Tables: become scrollable card lists on screens < md.
4. Forms: single column on mobile, 2-3 columns on desktop.
5. The "Quick Add" floating action button must be visible on mobile.
```

---

## 12. File & Folder Conventions

### Naming Conventions

| Item               | Convention                      | Example                                      |
| ------------------ | ------------------------------- | -------------------------------------------- |
| **Components**     | PascalCase                      | `DataTable.tsx`, `GenericLogForm.tsx`        |
| **Pages**          | `page.tsx` (Next.js convention) | `src/app/dashboard/student/page.tsx`         |
| **Layouts**        | `layout.tsx`                    | `src/app/dashboard/layout.tsx`               |
| **API Routes**     | `route.ts`                      | `src/app/api/case-management/route.ts`       |
| **Hooks**          | camelCase, prefix `use`         | `useRole.ts`, `useDebounce.ts`               |
| **Utilities**      | camelCase                       | `formatDate.ts`, `calculateProgress.ts`      |
| **Validators**     | kebab-case                      | `case-management.ts`, `procedure-log.ts`     |
| **Constants**      | kebab-case                      | `case-categories.ts`, `rotation-postings.ts` |
| **Types**          | PascalCase                      | `index.ts` (central type export)             |
| **Server Actions** | kebab-case                      | `case-management.ts`                         |

### Import Aliases — ALWAYS use path aliases

```typescript
// tsconfig.json paths
{
  "paths": {
    "@/*": ["./src/*"]
  }
}

// ✅ CORRECT
import { DataTable } from "@/components/tables/DataTable";
import { prisma } from "@/lib/prisma";

// ❌ WRONG
import { DataTable } from "../../../components/tables/DataTable";
```

### Folder Structure — Follow `roadmap.md` Section 11 exactly

Do not deviate from the folder structure defined in the roadmap unless specifically discussed and approved. The structure maps directly to the logbook's sections.

---

## 13. TypeScript Standards

### Strict Mode — ENFORCED

```json
// tsconfig.json — Required settings
{
	"compilerOptions": {
		"strict": true,
		"noImplicitAny": true,
		"strictNullChecks": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true
	}
}
```

### Type Rules

```
1. NEVER use `any` type. Use `unknown` and narrow with type guards if needed.
2. ALWAYS define interfaces for component props.
3. ALWAYS use Prisma-generated types for database models.
4. Export types from src/types/index.ts for shared types.
5. Use `as const` for constant arrays (case categories, procedure types).
6. Prefer `interface` over `type` for object shapes.
7. Use discriminated unions for state management (loading | error | success).
8. ALWAYS type API response data.
```

### No Magic Strings

```typescript
// ✅ CORRECT — Use constants
import { CASE_CATEGORIES } from "@/lib/constants/case-categories";
const category = CASE_CATEGORIES.RESUSCITATION;

// ❌ WRONG — Magic string
const category = "RESUSCITATION";
```

---

## 14. Error Handling & Validation

### Client-Side Errors

```typescript
// Use React Hook Form + Zod for instant validation feedback
const form = useForm<CaseManagementInput>({
  resolver: zodResolver(caseManagementSchema),
  defaultValues: { ... },
});

// Display field-level errors using shadcn FormMessage
<FormField
  control={form.control}
  name="patientName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Patient Name</FormLabel>
      <FormControl><Input {...field} /></FormControl>
      <FormMessage /> {/* Auto-shows Zod error */}
    </FormItem>
  )}
/>
```

### Server-Side Errors

```typescript
// API routes MUST catch and categorize errors
try {
	// ... operation
} catch (error) {
	if (error instanceof z.ZodError) {
		return NextResponse.json(
			{ error: "Validation failed", details: error.errors },
			{ status: 400 },
		);
	}
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002") {
			return NextResponse.json({ error: "Duplicate entry" }, { status: 409 });
		}
	}
	console.error("[MODULE_ACTION]", error);
	return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
```

### Error Boundary

```
Every route group (/dashboard/student/, /dashboard/faculty/, /dashboard/hod/) MUST have an error.tsx file.
The root layout MUST have a global-error.tsx.
```

---

## 15. Testing Standards

### Test Structure

```
__tests__/
  unit/            → Utility functions, validators
  components/      → Component rendering, interactions
  integration/     → API routes with test database
  e2e/             → Playwright end-to-end tests
```

### What Must Be Tested

```
1. ALL Zod validators (every schema must have tests for valid/invalid inputs)
2. ALL API route handlers (auth, validation, CRUD, role-scoping)
3. GenericLogForm rendering with different field configs
4. DataTable rendering, sorting, filtering, pagination
5. Role-based rendering (student sees X, faculty sees Y, HOD sees Z)
6. Digital signature flow (submit → review → sign/reject)
7. PDF export generates correct content
```

### Test Naming

```typescript
describe("CaseManagementValidator", () => {
  it("should accept valid case management entry", () => { ... });
  it("should reject entry without UHID", () => { ... });
  it("should reject invalid competency level", () => { ... });
});
```

---

## 16. Git & Version Control

### Branch Naming

```
main                    — Production branch (deployed on Railway)
dev                     — Development branch
feature/{module-name}   — Feature branches (e.g., feature/case-management)
bugfix/{description}    — Bug fix branches
hotfix/{description}    — Production hotfix branches
```

### Commit Messages — Conventional Commits

```
feat(case-management): add resuscitation case log form
fix(auth): role check fails for faculty API routes
chore(prisma): add migration for imaging logs
docs(readme): update deployment instructions
refactor(forms): extract PatientInfoFields component
test(validators): add tests for procedure log schema
style(theme): update hospital blue to match AIIMS branding
```

### What NEVER to Commit

```
.env, .env.local, .env.production    → Contains secrets
node_modules/                         → Dependencies (installed via npm)
.next/                                → Build output
*.pem, *.key                          → Certificates
prisma/*.db                           → SQLite dev databases
```

---

## 17. Performance & Optimization

### Data Fetching

```
1. Use Server Components by default — fetch data on the server.
2. Use `loading.tsx` files for Suspense-based streaming.
3. Paginate ALL lists — default 20 items per page.
4. Use Prisma's `select` to fetch only needed fields (don't fetch entire user object).
5. Use Prisma's `take` and `skip` for database-level pagination.
6. Cache static data (rotation posting names, case categories) using React cache().
```

### Optimization Rules

```
1. Lazy load heavy components (PDF renderer, charts) with next/dynamic.
2. Optimize images (AIIMS logo) with next/image.
3. Debounce search inputs (300ms).
4. Use Prisma's @@index for fields used in WHERE/ORDER BY.
5. Use connection pooling in Railway PostgreSQL settings.
6. No N+1 queries — use Prisma includes or batch queries.
```

---

## 18. Deployment — Railway

### Railway Setup Checklist

```
1. Create Railway project: "aiims-patna-logbook"
2. Add PostgreSQL service from Railway Marketplace.
3. Add Next.js service connected to GitHub repo.
4. Set all environment variables (from .env.example) in Railway dashboard.
5. Build command: npx prisma generate && npx prisma migrate deploy && npm run build
6. Start command: npm start
7. Enable health check at /api/health
8. Set up custom domain (optional): logbook.aiims-patna.edu.in
```

### Railway-Specific Rules

```
1. NEVER put DATABASE_URL in source code — Railway injects it automatically.
2. Use Railway's reference variables: ${{Postgres.DATABASE_URL}}
3. Set NODE_ENV=production in Railway environment.
4. Enable Railway's auto-deploy on push to main branch.
5. Use Railway's metrics to monitor memory/CPU usage.
```

---

## 19. Documentation Standards

### Every New File Must Have

```typescript
/**
 * @module CaseManagementForm
 * @description Form component for logging case management entries across all
 *              25 emergency medicine categories. Uses GenericLogForm internally.
 *
 * @see PG Logbook .md — Section: "LOG OF CASE MANAGEMENT"
 * @see roadmap.md — Section 6, "D. CASE MANAGEMENT LOGS"
 *
 * @example
 * <CaseManagementForm
 *   category="RESUSCITATION"
 *   onSubmit={handleSubmit}
 *   initialData={existingEntry}
 * />
 */
```

### README Sections Required

```
- Project description
- Tech stack
- Local development setup (step-by-step)
- Environment variables (reference .env.example)
- Database setup (Prisma commands)
- Folder structure explanation
- Deployment instructions
- Contributing guidelines
```

---

## 20. Domain-Specific Rules (Medical Logbook)

### Case Category Constants — MUST Match Logbook Exactly

When defining case categories, the sub-categories MUST use the exact names from `PG Logbook .md`. Examples:

```typescript
// ✅ CORRECT — Exact match from logbook
"Acute Airway Obstruction";
"Anaphylaxis and Severe allergic reaction";
"Unresponsive Patient Assessment and management";

// ❌ WRONG — Paraphrased
"Airway Blockage";
"Allergic Reaction";
"Unconscious Patient";
```

### Competency Progression

The logbook tracks competency progression over 3 years. The app must:

```
1. Show progression charts (how a student advances from S → O → MS → MI).
2. Allow filtering by semester to see semester-wise growth.
3. Display competency distribution per category (pie chart).
4. Flag students who are still at "S" or "O" level in their final semester.
```

### Entry Counts

The physical logbook has fixed maximum entries per section (e.g., 90 entries for Airway Adult). The digital version:

```
1. Should NOT hard-limit entries — allow more than the physical max.
2. Should SHOW progress against the physical target (e.g., "12 of 90 entries").
3. Should HIGHLIGHT if target is not met by the end of the semester.
```

### Evaluation Graph

The roadmap specifies a 5-domain × 6-semester evaluation graph. This MUST be implemented as:

```
- Interactive chart (Recharts radar or bar chart)
- 5 domains: Knowledge, Clinical Skills, Procedural Skills, Soft Skills, Research
- Each scored 1-5 per semester
- Faculty fills this during periodic reviews
- HOD can see all students' graphs on one page for comparison
```

---

## 21. Anti-Patterns — What NEVER To Do

```
❌ NEVER hardcode secrets, API keys, or database URLs
❌ NEVER use `any` type in TypeScript
❌ NEVER create a form component that only works for one specific category
❌ NEVER write raw SQL when Prisma can handle it
❌ NEVER skip auth checks in API routes
❌ NEVER return unscoped data (all users' records) from an API
❌ NEVER use Pages Router patterns (getServerSideProps, getStaticProps)
❌ NEVER install duplicate UI libraries (no MUI alongside shadcn)
❌ NEVER use inline styles or CSS modules — use Tailwind only
❌ NEVER commit node_modules or .next or .env files
❌ NEVER create a component with more than 300 lines — break it up
❌ NEVER fetch data inside a UI component (use server components or page-level fetching)
❌ NEVER rename medical terms from the physical logbook
❌ NEVER skip the Zod validation step
❌ NEVER store Clerk session data in your own database (use Clerk's API)
❌ NEVER use console.log in production code (use proper error logging)
❌ NEVER use default exports (use named exports for better tree-shaking)
❌ NEVER make breaking changes to the Prisma schema without a migration
❌ NEVER hard-delete data — always soft-delete with a status field or deletedAt timestamp
```

---

## 22. Checklist Before Committing Code

Use this checklist for EVERY piece of code before committing:

### Security

- [ ] No secrets or API keys in source code
- [ ] All .env files are in .gitignore
- [ ] API routes check authentication
- [ ] API routes check role-based authorization
- [ ] Prisma queries are scoped by userId/role
- [ ] Input is validated with Zod before database operations

### Code Quality

- [ ] TypeScript strict mode — no `any` types
- [ ] Named exports only (no `export default`)
- [ ] Components have typed props interface
- [ ] Consistent naming conventions followed
- [ ] No hardcoded strings — constants used
- [ ] Import aliases used (`@/` prefix)
- [ ] No unused imports or variables

### Architecture

- [ ] Component is reusable — works for multiple categories
- [ ] Data flows: Server → Props → Component
- [ ] No Prisma imports in UI components
- [ ] Form uses React Hook Form + Zod
- [ ] New page follows roadmap.md folder structure
- [ ] New model follows existing Prisma patterns

### Completeness

- [ ] All fields from `PG Logbook .md` are present
- [ ] Field labels match physical logbook exactly
- [ ] Loading, empty, and error states handled
- [ ] Form auto-saves as draft
- [ ] Mobile responsive layout works
- [ ] Status badge colors are correct

### Domain Accuracy

- [ ] Case/procedure names match `PG Logbook .md` exactly
- [ ] Competency levels correct for this form type
- [ ] Auto-numbering (Sl. No.) works correctly
- [ ] Tally counter works for applicable forms
- [ ] Faculty sign-off flow works end-to-end

---

## Quick Reference — Where to Find Things

| Need                          | Look In                 |
| ----------------------------- | ----------------------- |
| All logbook forms & fields    | `PG Logbook .md`        |
| Database schema               | `roadmap.md` Section 5  |
| Module breakdown              | `roadmap.md` Section 6  |
| API routes                    | `roadmap.md` Section 8  |
| Folder structure              | `roadmap.md` Section 11 |
| Env variables                 | `roadmap.md` Section 12 |
| Color palette                 | `roadmap.md` Section 4  |
| Role permissions              | `roadmap.md` Section 3  |
| Case categories (all 300+)    | `roadmap.md` Section 6D |
| Procedure categories (all 48) | `roadmap.md` Section 6E |
| Diagnostic types (30)         | `roadmap.md` Section 6F |
| Imaging categories (5)        | `roadmap.md` Section 6G |

---

_This instructions file is the law of this codebase. Every line of code written in this project must comply._
