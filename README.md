# AIIMS Patna PG Residency Digital Logbook

A comprehensive digital replacement for the physical PG (Post Graduate) Residency Logbook used by **MD Emergency Medicine** residents at **AIIMS Patna** (All India Institute of Medical Sciences, Patna, Bihar, India).

## Overview

This application digitizes the NMC-mandated logbook covering:

- **25 Case Management categories** with 300+ case sub-types
- **48 Procedure categories** with skill-level tracking (S/O/A/PS/PI)
- **30+ Diagnostic skill types** (ABG, ECG, etc.)
- **5 Imaging categories** (X-ray, USG, CT, POCUS, MRI)
- **Academic tracking** (presentations, seminars, journal clubs)
- **Professional development** (courses, conferences, research, thesis)
- **Administrative** (rotation postings, attendance, evaluations)
- **5-domain evaluation graph** with semester-wise progression

Three user roles: **HOD**, **Faculty**, and **Student** with full role-based access control.

## Tech Stack

| Layer          | Technology               |
| -------------- | ------------------------ |
| Framework      | Next.js 16 (App Router)  |
| Language       | TypeScript (strict mode) |
| Styling        | Tailwind CSS v4          |
| UI Components  | shadcn/ui                |
| Forms          | React Hook Form + Zod    |
| Database       | PostgreSQL               |
| ORM            | Prisma 7                 |
| Authentication | Clerk                    |
| Charts         | Recharts                 |
| Icons          | Lucide React             |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Docker)
- Clerk account (free tier works)

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd Hospital-Residency-Logbook

# Install dependencies
npm install

# Copy environment variables and fill in real values
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker PostgreSQL (quick setup)

```bash
docker run --name aiims-pgdb -e POSTGRES_USER=vikash -e POSTGRES_PASSWORD=1234 -e POSTGRES_DB=mydb -p 5434:5432 -d postgres
```

Set in `.env.local`:

```
DATABASE_URL="postgresql://vikash:1234@localhost:5434/mydb"
```

## Environment Variables

See [.env.example](.env.example) for all required variables. Key variables:

| Variable                            | Description                  |
| ----------------------------------- | ---------------------------- |
| `DATABASE_URL`                      | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key        |
| `CLERK_SECRET_KEY`                  | Clerk secret key             |
| `CLERK_WEBHOOK_SECRET`              | Clerk webhook signing secret |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API route handlers
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── student/        # Student pages (case-mgmt, procedures, etc.)
│   │   ├── faculty/        # Faculty pages (reviews, students, evaluations)
│   │   ├── hod/            # HOD pages (manage users, analytics)
│   │   └── help/           # Help & user guide
│   ├── sign-in/            # Clerk sign-in
│   └── sign-up/            # Clerk sign-up
├── actions/                # Server actions (mutations)
├── components/             # Reusable React components
│   ├── cards/              # StatCard, CategoryCard, StudentCard
│   ├── charts/             # EvaluationGraph
│   ├── forms/              # GenericLogForm (master form component)
│   ├── layout/             # Sidebar, TopBar, MobileNav, PageHeader
│   ├── shared/             # Shared field components
│   ├── tables/             # DataTable (universal table)
│   └── ui/                 # shadcn/ui primitives
├── lib/                    # Utilities, constants, validators
│   ├── constants/          # Case categories, procedures, diagnostics
│   ├── validators/         # Zod schemas for all forms
│   ├── auth.ts             # Auth helpers (requireAuth, requireRole)
│   └── prisma.ts           # Prisma client singleton
├── hooks/                  # Custom hooks (useRole, useDebounce)
└── types/                  # TypeScript type definitions
prisma/
├── schema.prisma           # Database schema (27 models, 12 enums)
└── seed.ts                 # Seed data
```

## Key Architecture Decisions

- **Schema-driven forms**: `GenericLogForm` renders 100+ form types from Zod schemas + field configs
- **DataTable**: Universal table with search, filter, sort, and pagination
- **Auto-save**: Forms auto-save as draft every 30 seconds
- **Sign-off workflow**: Draft → Submitted → Signed (or Needs Revision)
- **Role-based middleware**: Clerk proxy enforces route-level access (student/faculty/hod)
- **Lazy loading**: Heavy chart components loaded via `next/dynamic`

## Database

27 Prisma models covering all logbook sections. Run migrations with:

```bash
npx prisma migrate dev --name descriptive-name
npx prisma generate
```

## Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Production build             |
| `npm start`     | Start production server      |
| `npm run lint`  | Run ESLint                   |

## Contributing

1. Create a feature branch: `git checkout -b feature/module-name`
2. Follow the conventions in `.github/copilot-instructions.md`
3. Commit with conventional commits: `feat(module): description`
4. Submit a pull request

## References

- [PG Logbook .md](PG%20Logbook%20.md) — Complete physical logbook (canonical source)
- [roadmap.md](roadmap.md) — Technical architecture and development plan
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — Coding standards

## License

Private — AIIMS Patna, Department of Emergency Medicine
