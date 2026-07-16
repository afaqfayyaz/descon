# Caliber

Digital Employee Competency Assessment Platform.

Digitizes Caliber's Project Management competency framework — **8 areas, 45
sub-competencies, 135 scenario questions** — with automated gap analysis,
self-vs-manager calibration, and leadership dashboards.

> Specs: [`01_PRD_Caliber.md`](./01_PRD_Caliber.md) ·
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`SCHEMA.md`](./SCHEMA.md) ·
> [`CODING_STANDARDS.md`](./CODING_STANDARDS.md)

## Tech stack

Next.js 14 (App Router) · TypeScript · MongoDB · Tailwind CSS · NextAuth
(Auth.js v5) · Zod · TanStack Query · Vitest.

## Project layout

```
app/                      Next.js routes (App Router)
  (auth)/login            Sign-in screen
src/
  components/             UI + shared components
  data/                   framework-seed.json (extracted from the Excel files)
  lib/
    domain/               Pure logic — types, Zod schemas, scoring engine
      scoring/            self-level · gap · calibration · rollup (+ tests)
    db/                   MongoDB client, collection names, indexes, repositories
    utils/                errors, logger, cn
scripts/                  seed.ts · create-admin.ts
```

The architecture follows **Clean Architecture** layering: presentation →
API/actions → services → repositories → domain. The domain layer is pure
(no I/O) and fully unit-tested.

## Getting started (local)

Prerequisites: Node 20+, a running MongoDB (local or via Docker).

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env.local   # then edit MONGODB_URI etc.

# 3. (Optional) start MongoDB only
docker compose up -d mongo

# 4. Seed the PM framework (8 areas / 45 sub-comps / 135 questions)
npm run seed

# 5. Create the first HR admin
npm run create-admin -- --email hr@caliber.com --name "HR Admin" --password "<choose>"

# 6. Run the dev server
npm run dev          # http://localhost:3000
```

## Authentication

Two sign-in methods are supported via NextAuth (Auth.js v5):

- **Email + password** (Credentials) — always available; accounts are created
  with `npm run create-admin` or seeded. Good for local/dev.
- **Microsoft Entra ID (Azure AD) SSO** — enabled automatically when
  `AZURE_AD_CLIENT_ID` and `AZURE_AD_CLIENT_SECRET` are set, adding a
  "Sign in with Microsoft" button to the login page.

For SSO, register an app at <https://entra.microsoft.com>, add the redirect URI
`{NEXTAUTH_URL}/api/auth/callback/microsoft-entra-id`, then set
`AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, and optionally
`AZURE_AD_TENANT_ID` (defaults to the multi-tenant `common` endpoint). Only
employees already present in the `users` collection (matched by email) are
allowed in — SSO authenticates, but the local directory still authorizes and
supplies roles.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run unit tests (Vitest) |
| `npm run seed` | Load the framework from `src/data/framework-seed.json` |
| `npm run create-admin` | Create an HR admin (local credentials) |

## Deployment

```bash
docker compose up -d        # app + MongoDB
```

Then seed/admin from inside the app container, e.g.:

```bash
docker compose exec app node scripts/seed.js   # (after a build that includes scripts)
```

## HR administration

Everything in the competency framework is data, managed in-app by HR Admins
(no redeploys). Available screens:

- **Framework** (`/framework`) — CRUD for competency areas, drilling into
  sub-competencies (`/framework/areas/[id]`) and the question bank
  (`/framework/sub-competencies/[id]`) with HR-configurable option scores and
  automatic question versioning.
- **Designations** (`/roles`) — CRUD for roles/job grades.
- **Required levels** (`/required-levels`) — the sub-competency × designation
  matrix editor; edits close the prior row and open a new one so historical
  assessments stay reproducible.
- **Employees** (`/employees`) — directory CRUD with search, reporting-line
  assignment (with circular-reference protection), and CSV bulk import.
- **Trainings** (`/trainings`) — catalog CRUD plus manual assignment and
  status tracking.
- **Reports** (`/reports`) — per-campaign CSV exports and print-ready views.
- **Audit log** (`/audit`) — immutable trail of every state-changing action.

Every mutation is validated with Zod, authorized server-side via
`requirePermission`, and recorded to the `auditLogs` collection.

## Email notifications

When SMTP is configured (`SMTP_HOST`/`SMTP_PORT`, see `.env.example`), campaign
assignments, deadline reminders, and finalized-result notices are emailed in
addition to the in-app inbox. Without SMTP set, email is skipped gracefully and
only in-app notifications are produced.

## Status

Implemented:

- ✅ Framework seed data extracted from the source Excel files
- ✅ Domain layer: types, Zod schemas, and a fully-tested scoring engine
      (self-level, gap, traffic-light, calibration, area/overall rollups)
- ✅ MongoDB client, collection definitions, indexes, repositories (incl.
      audit + training)
- ✅ NextAuth (credentials + Azure AD SSO) with server-side RBAC
- ✅ Full framework CRUD, employee directory + bulk import, training catalog
- ✅ Campaign lifecycle, questionnaire/manager rating, calibration, dashboards
- ✅ Reports library, configurable thresholds, audit log, in-app + email
      notifications
- ✅ Seed + create-admin scripts
