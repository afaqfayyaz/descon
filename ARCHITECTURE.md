# Caliber — Application Architecture

**Version:** 1.0
**Last Updated:** 2026-06-05
**Author:** Afaq Fiaz

---

## Document Purpose

This document defines the **technical architecture** of the Caliber platform: folder structure, layers, design patterns, technology choices, and how the pieces fit together. Read this before writing any code.

For database design, see **SCHEMA.md**.
For coding conventions, see **CODING_STANDARDS.md**.
For features and product behavior, see **PRD.md**.

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Single full-stack codebase; production-grade React framework |
| Language | TypeScript 5.x | Type safety end-to-end; catches errors at compile time |
| Database | MongoDB 7.x | Document model fits the configurable framework; HR can add fields without migrations |
| MongoDB Driver | `mongodb` (official Node.js driver) | Raw driver chosen for control; thin repository layer added on top |
| UI Components | shadcn/ui + Radix UI | Accessible, customizable, code lives in repo (not a heavy dependency) |
| Styling | Tailwind CSS | Utility-first; consistent design tokens |
| Forms | react-hook-form + zod | Performant forms with schema validation (same Zod schemas used server-side) |
| State Management | TanStack Query (React Query) | Server-state caching; optimistic updates |
| Charts | Recharts + D3 (heatmap only) | Standard charts via Recharts; D3 for the custom heatmap |
| Authentication | NextAuth.js (Auth.js v5) | First-class Next.js integration; supports Azure AD/SAML/credentials |
| Validation | Zod | Single source of truth for validation on client + server |
| Email | Nodemailer (SMTP) | Simple, reliable, works with any SMTP server |
| Background Jobs | node-cron + MongoDB-based queue | No Redis needed for MVP; reminder emails, result computation |
| File Storage | Local filesystem (MVP); S3-compatible (Phase 2) | Avatars, evidence files, exported reports |
| Logging | Pino | Structured JSON logs; fast |
| Error Tracking | Sentry (optional) | Production error monitoring |
| Testing | Vitest + Playwright | Unit tests + end-to-end tests |
| Deployment | Docker + Docker Compose | One file, one command (`docker compose up`) |

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                        │
│  ┌───────────────────┐    ┌───────────────────────────────┐    │
│  │ Server Components │    │ Client Components             │    │
│  │ (default in App   │    │ (with "use client")           │    │
│  │  Router)          │    │ Interactive UI, forms, charts │    │
│  └───────────────────┘    └───────────────────────────────┘    │
└────────────────┬───────────────────────────────────────────────┘
                 │  HTTPS
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                  NEXT.JS APP (Server)                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  APP ROUTER (app/)                                   │     │
│  │  ┌────────────────┐  ┌────────────────────────────┐  │     │
│  │  │ Server Comps   │  │ Route Handlers (REST API)  │  │     │
│  │  │ (pages)        │  │ (app/api/...)              │  │     │
│  │  └────────────────┘  └────────────────────────────┘  │     │
│  │  ┌────────────────┐                                  │     │
│  │  │ Server Actions │  ← for forms & mutations        │     │
│  │  └────────────────┘                                  │     │
│  └──────────────────────────────────────────────────────┘     │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  APPLICATION LAYER (src/lib/)                        │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │     │
│  │  │  Services   │  │   Domain    │  │ Validation  │  │     │
│  │  │ (use cases) │  │  (entities) │  │  (Zod)      │  │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │     │
│  └──────────────────────────────────────────────────────┘     │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  INFRASTRUCTURE LAYER (src/lib/db/, src/lib/email/)  │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │     │
│  │  │Repositories │  │  Email      │  │ Background  │  │     │
│  │  │(MongoDB)    │  │ (SMTP)      │  │ Jobs        │  │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────┬──────────────────────────────────────────────┘
                  │
                  ▼
            ┌──────────┐
            │ MongoDB  │
            └──────────┘
```

---

## Architectural Layers

The application follows **Clean Architecture** principles, adapted to Next.js. Each layer has a single responsibility and depends only on layers below it.

### Layer 1: Presentation (UI)

**What lives here:** React components, pages, layouts, forms.

**Responsibilities:**
- Render UI
- Capture user input
- Call Server Actions or fetch from Route Handlers
- Display loading and error states

**Must NOT:**
- Talk directly to MongoDB
- Contain business logic
- Make decisions that should be centralized

### Layer 2: API / Route Handlers

**What lives here:** `app/api/**/route.ts` files and Server Actions.

**Responsibilities:**
- Validate HTTP requests (via Zod schemas)
- Authenticate the user (via NextAuth)
- Authorize the action (RBAC check)
- Call a service method
- Format the response

**Must NOT:**
- Contain business logic (delegate to services)
- Talk directly to MongoDB (use repositories)
- Make multiple unrelated service calls (split into separate endpoints)

### Layer 3: Services (Application Logic)

**What lives here:** `src/lib/services/*.service.ts`

**Responsibilities:**
- Orchestrate business operations (e.g., "submit assessment" coordinates: save answers, compute results, update campaign stats, send notification, log to audit)
- Enforce business rules (e.g., "can't submit if not in_progress")
- Transactional consistency (wrap multi-document writes in MongoDB transactions)

**Must NOT:**
- Talk directly to MongoDB (use repositories)
- Know about HTTP (no `req`, `res`, status codes)
- Format presentation data (return plain objects)

### Layer 4: Repositories (Data Access)

**What lives here:** `src/lib/db/repositories/*.repository.ts`

**Responsibilities:**
- All MongoDB queries (`find`, `insert`, `update`, `aggregate`)
- Convert between domain objects and MongoDB documents
- Handle index hints for performance

**Must NOT:**
- Contain business logic
- Compose multiple operations (services do that)

### Layer 5: Domain (Pure Logic)

**What lives here:** `src/lib/domain/*.ts`

**Responsibilities:**
- Pure business calculations: `calculateSelfLevel()`, `calculateGap()`, `getTrafficLight()`
- Domain types and interfaces
- Pure validation rules (Zod schemas)

**Must NOT:**
- Have any I/O (no DB, no network, no filesystem)
- Import from infrastructure layers
- Have any side effects

---

## Folder Structure

```
caliber/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Route group for auth pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (employee)/                   # Route group: Employee pages
│   │   ├── home/
│   │   │   └── page.tsx              # Server component
│   │   ├── assessment/
│   │   │   ├── [campaignId]/
│   │   │   │   ├── page.tsx          # The questionnaire UI
│   │   │   │   └── actions.ts        # Server actions (save answer, submit)
│   │   │   └── done/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (manager)/                    # Route group: Line Manager pages
│   │   ├── team/
│   │   │   └── page.tsx
│   │   ├── rate/
│   │   │   └── [assessmentId]/
│   │   │       ├── page.tsx
│   │   │       └── actions.ts
│   │   ├── heatmap/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (hr)/                         # Route group: HR Admin pages
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── framework/
│   │   │   ├── areas/page.tsx
│   │   │   ├── sub-competencies/page.tsx
│   │   │   └── questions/page.tsx
│   │   ├── roles/
│   │   │   └── page.tsx
│   │   ├── required-levels/
│   │   │   └── page.tsx
│   │   ├── employees/
│   │   │   └── page.tsx
│   │   ├── campaigns/
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── page.tsx
│   │   ├── calibration/
│   │   │   └── [campaignId]/page.tsx
│   │   ├── trainings/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── audit/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (executive)/                  # Route group: Executive pages
│   │   ├── overview/page.tsx
│   │   ├── division/page.tsx
│   │   ├── designation/page.tsx
│   │   └── layout.tsx
│   │
│   ├── api/                          # REST API routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts
│   │   ├── framework/
│   │   │   ├── areas/route.ts        # GET, POST
│   │   │   ├── areas/[id]/route.ts   # GET, PUT, DELETE
│   │   │   ├── sub-competencies/
│   │   │   ├── questions/
│   │   │   └── ...
│   │   ├── assessments/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── self-answer/route.ts
│   │   │       ├── self-submit/route.ts
│   │   │       ├── manager-rate/route.ts
│   │   │       └── manager-submit/route.ts
│   │   ├── campaigns/
│   │   ├── results/
│   │   │   └── compute/route.ts      # Triggered after submission
│   │   ├── reports/
│   │   └── webhooks/
│   │
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Root page (redirects based on role)
│   ├── globals.css
│   └── error.tsx                     # Global error boundary
│
├── src/                              # All non-route code
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/                   # AppShell, Sidebar, TopBar
│   │   │   ├── app-shell.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── top-bar.tsx
│   │   ├── shared/                   # Cross-cutting components
│   │   │   ├── traffic-light.tsx
│   │   │   ├── gap-badge.tsx
│   │   │   ├── kpi-card.tsx
│   │   │   ├── data-table.tsx
│   │   │   └── ...
│   │   ├── charts/                   # Chart components
│   │   │   ├── donut-chart.tsx
│   │   │   ├── bar-chart.tsx
│   │   │   ├── heatmap.tsx
│   │   │   └── ...
│   │   └── features/                 # Feature-specific composed components
│   │       ├── assessment/
│   │       │   ├── question-card.tsx
│   │       │   ├── progress-bar.tsx
│   │       │   └── ...
│   │       ├── framework/
│   │       ├── manager/
│   │       └── ...
│   │
│   ├── lib/                          # Application + Infrastructure code
│   │   ├── auth/                     # Authentication
│   │   │   ├── auth.config.ts
│   │   │   ├── permissions.ts        # RBAC: canAccess(role, action)
│   │   │   └── session.ts            # Get current session
│   │   │
│   │   ├── db/                       # Infrastructure: MongoDB
│   │   │   ├── client.ts             # Singleton MongoClient
│   │   │   ├── collections.ts        # Collection name constants
│   │   │   └── repositories/
│   │   │       ├── user.repository.ts
│   │   │       ├── job-family.repository.ts
│   │   │       ├── competency-area.repository.ts
│   │   │       ├── sub-competency.repository.ts
│   │   │       ├── question.repository.ts
│   │   │       ├── role.repository.ts
│   │   │       ├── required-level.repository.ts
│   │   │       ├── campaign.repository.ts
│   │   │       ├── assessment.repository.ts
│   │   │       ├── assessment-result.repository.ts
│   │   │       ├── training.repository.ts
│   │   │       └── audit-log.repository.ts
│   │   │
│   │   ├── services/                 # Application: business logic
│   │   │   ├── framework.service.ts
│   │   │   ├── campaign.service.ts
│   │   │   ├── assessment.service.ts
│   │   │   ├── scoring.service.ts    # The math engine
│   │   │   ├── calibration.service.ts
│   │   │   ├── reporting.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── audit.service.ts
│   │   │
│   │   ├── domain/                   # Domain: pure logic, types
│   │   │   ├── types/
│   │   │   │   ├── user.types.ts
│   │   │   │   ├── framework.types.ts
│   │   │   │   ├── assessment.types.ts
│   │   │   │   └── result.types.ts
│   │   │   ├── validation/
│   │   │   │   ├── user.schema.ts    # Zod schemas
│   │   │   │   ├── framework.schema.ts
│   │   │   │   └── assessment.schema.ts
│   │   │   ├── scoring/
│   │   │   │   ├── self-level.ts     # calculateSelfLevel()
│   │   │   │   ├── gap.ts            # calculateGap()
│   │   │   │   ├── traffic-light.ts  # getTrafficLight()
│   │   │   │   └── calibration.ts    # getCalibrationFlag()
│   │   │   └── constants.ts
│   │   │
│   │   ├── email/                    # Email service
│   │   │   ├── client.ts             # Nodemailer setup
│   │   │   ├── templates/
│   │   │   │   ├── assessment-invite.tsx
│   │   │   │   ├── reminder.tsx
│   │   │   │   └── ...
│   │   │   └── send.ts
│   │   │
│   │   ├── jobs/                     # Background jobs
│   │   │   ├── scheduler.ts          # node-cron setup
│   │   │   ├── send-reminders.job.ts
│   │   │   ├── compute-results.job.ts
│   │   │   └── cleanup.job.ts
│   │   │
│   │   ├── reports/                  # Report generation
│   │   │   ├── pdf/
│   │   │   │   ├── generator.ts
│   │   │   │   └── templates/
│   │   │   └── xlsx/
│   │   │       ├── generator.ts
│   │   │       └── templates/
│   │   │
│   │   └── utils/                    # Generic utilities
│   │       ├── logger.ts
│   │       ├── format.ts
│   │       ├── errors.ts             # Custom error classes
│   │       └── ...
│   │
│   └── styles/
│       └── tokens.ts                 # Design tokens (colors, spacing)
│
├── public/                           # Static assets
│   ├── logo.svg
│   └── favicon.ico
│
├── scripts/                          # CLI scripts
│   ├── seed-from-excel.ts            # Initial data seed
│   ├── create-admin.ts               # Create first HR admin user
│   └── reset-db.ts                   # Dev only
│
├── tests/                            # Tests
│   ├── unit/
│   │   └── lib/
│   │       └── domain/
│   │           └── scoring/
│   ├── integration/
│   │   └── api/
│   └── e2e/                          # Playwright
│       ├── employee-flow.spec.ts
│       ├── manager-flow.spec.ts
│       └── hr-flow.spec.ts
│
├── .env.example
├── .env.local                        # gitignored
├── .gitignore
├── docker-compose.yml                # One file, one command deploy
├── Dockerfile
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── README.md
└── docs/
    ├── PRD.md
    ├── SCHEMA.md
    ├── ARCHITECTURE.md               # this file
    └── CODING_STANDARDS.md
```

---

## Route Groups Explained

Next.js Route Groups (folders in parentheses like `(employee)`) allow grouping routes without affecting the URL path. We use them to:
1. Apply different layouts per persona (each group has its own `layout.tsx`)
2. Logically separate code by audience
3. Apply different middleware/auth checks per group

URL examples:
- `/home` → `app/(employee)/home/page.tsx`
- `/team` → `app/(manager)/team/page.tsx`
- `/dashboard` → `app/(hr)/dashboard/page.tsx`
- `/overview` → `app/(executive)/overview/page.tsx`

---

## Authentication & Authorization

### Authentication: NextAuth.js (Auth.js v5)

```typescript
// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import AzureAD from "next-auth/providers/azure-ad";
import { authConfig } from "@/lib/auth/auth.config";

const { handlers } = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    Credentials({
      // For local/development login
      credentials: { email: {}, password: {} },
      authorize: async (creds) => { /* ... */ },
    }),
  ],
  ...authConfig,
});

export const { GET, POST } = handlers;
```

### Authorization: RBAC

Five system roles: `employee`, `line_manager`, `hr_admin`, `executive`, `system`.

Permission checks happen in **two places**:

**1. Server-side (always required):**
```typescript
// In Route Handlers and Server Actions
import { requirePermission } from "@/lib/auth/permissions";

export async function POST(req: Request) {
  await requirePermission("framework.area.create");
  // ... proceed
}
```

**2. Client-side (UX only, never trusted):**
```typescript
import { useSession } from "next-auth/react";

const session = useSession();
if (!session?.user.permissions.includes("framework.area.create")) {
  return null; // hide UI
}
```

### Permission Map (sample)

```typescript
// src/lib/auth/permissions.ts

export const PERMISSIONS = {
  // Framework management (HR only)
  "framework.area.create": ["hr_admin"],
  "framework.area.update": ["hr_admin"],
  "framework.area.delete": ["hr_admin"],
  "framework.subCompetency.*": ["hr_admin"],
  "framework.question.*": ["hr_admin"],
  "framework.role.*": ["hr_admin"],
  "framework.requiredLevel.*": ["hr_admin"],

  // Campaign management
  "campaign.create": ["hr_admin"],
  "campaign.launch": ["hr_admin"],
  "campaign.finalize": ["hr_admin"],
  "campaign.view": ["hr_admin", "executive"],

  // Assessment
  "assessment.self.submit": ["employee", "line_manager", "hr_admin", "executive"], // any logged-in user with an assigned assessment
  "assessment.manager.rate": ["line_manager", "hr_admin"], // managers and HR
  "assessment.view.own": ["*"], // any authenticated user
  "assessment.view.team": ["line_manager", "hr_admin"],
  "assessment.view.all": ["hr_admin", "executive"],

  // Reports
  "report.team": ["line_manager", "hr_admin"],
  "report.org": ["hr_admin", "executive"],
  "report.export": ["hr_admin", "executive"],
};
```

---

## Request Lifecycle Example

Let's trace one user action through every layer: **HR Admin creates a new Competency Area.**

### Step 1: User clicks "Save" in the form

```tsx
// app/(hr)/framework/areas/page.tsx (client component)
async function handleSubmit(values: AreaFormValues) {
  await createArea(values); // Server Action
}
```

### Step 2: Server Action runs (presentation/api layer)

```typescript
// app/(hr)/framework/areas/actions.ts
"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { competencyAreaSchema } from "@/lib/domain/validation/framework.schema";
import { frameworkService } from "@/lib/services/framework.service";

export async function createArea(input: unknown) {
  // 1. Authenticate + authorize
  const session = await requirePermission("framework.area.create");

  // 2. Validate input
  const validated = competencyAreaSchema.parse(input);

  // 3. Delegate to service
  const area = await frameworkService.createArea(validated, session.userId);

  // 4. Return to client (Next.js will re-render the page)
  return { success: true, areaId: area._id };
}
```

### Step 3: Service runs (application layer)

```typescript
// src/lib/services/framework.service.ts

import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { auditService } from "./audit.service";

export const frameworkService = {
  async createArea(input: CreateAreaInput, actorId: ObjectId) {
    // Business rule: check sequence number isn't taken
    const existing = await competencyAreaRepo.findByCode(input.jobFamilyId, input.code);
    if (existing) {
      throw new ConflictError("An area with this code already exists in this job family");
    }

    // Create the area
    const area = await competencyAreaRepo.insert({
      ...input,
      createdAt: new Date(),
      createdBy: actorId,
    });

    // Log the action
    await auditService.log({
      actorId,
      action: "framework.area.created",
      entityType: "CompetencyArea",
      entityId: area._id,
      changes: { before: null, after: area },
    });

    return area;
  },
};
```

### Step 4: Repository runs (infrastructure layer)

```typescript
// src/lib/db/repositories/competency-area.repository.ts

import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import { CompetencyArea } from "@/lib/domain/types/framework.types";

export const competencyAreaRepo = {
  async findByCode(jobFamilyId: ObjectId, code: string) {
    const db = await getDb();
    return db.collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS).findOne({
      jobFamilyId,
      code,
      isActive: true,
    });
  },

  async insert(data: Omit<CompetencyArea, "_id" | "updatedAt" | "updatedBy">) {
    const db = await getDb();
    const result = await db.collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS).insertOne({
      ...data,
      updatedAt: data.createdAt,
      updatedBy: data.createdBy,
    });
    return { ...data, _id: result.insertedId };
  },
};
```

### Step 5: Response flows back

- Repository returns the new area object
- Service returns it to the Server Action
- Server Action returns `{ success: true, areaId }` to the client
- Client component re-renders (Next.js cache invalidation triggers automatic data refresh)

---

## API Design Conventions

### Route Handler Pattern

Every API route follows this skeleton:

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { handleApiError } from "@/lib/utils/errors";

const inputSchema = z.object({
  // ...
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("some.permission");
    const body = inputSchema.parse(await req.json());
    const result = await someService.doSomething(body, session.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Standard Response Format

**Success (200/201):**
```json
{
  "data": { ... },
  "meta": { "page": 1, "total": 247 }
}
```

**Error (400/401/403/404/500):**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input",
    "details": [
      { "path": "code", "message": "Code must be unique" }
    ]
  }
}
```

### URL Conventions

- `GET /api/framework/areas` → list
- `GET /api/framework/areas/[id]` → single
- `POST /api/framework/areas` → create
- `PUT /api/framework/areas/[id]` → update
- `DELETE /api/framework/areas/[id]` → soft delete (sets `isActive: false`)
- `POST /api/framework/areas/[id]/restore` → un-delete

For nested resources:
- `GET /api/campaigns/[id]/assessments` → assessments within a campaign

For actions on a resource:
- `POST /api/assessments/[id]/self-submit`
- `POST /api/assessments/[id]/manager-submit`
- `POST /api/campaigns/[id]/launch`

---

## State Management Strategy

### Server State (TanStack Query)

For all data fetched from the API:

```typescript
// In client components
import { useQuery, useMutation } from "@tanstack/react-query";

function AreasList() {
  const { data, isLoading } = useQuery({
    queryKey: ["areas", { jobFamilyId }],
    queryFn: () => fetch(`/api/framework/areas?jobFamilyId=${jobFamilyId}`).then(r => r.json()),
  });

  // ...
}
```

### Form State (react-hook-form + Zod)

```typescript
const form = useForm<AreaFormValues>({
  resolver: zodResolver(competencyAreaSchema),
  defaultValues: { name: "", code: "", description: "" },
});
```

### Global Client State (Zustand — only if needed)

For genuinely global state (theme, sidebar open/closed, current campaign filter). Most state is server state — Zustand should be used sparingly.

### URL State (search params)

Filters, sorts, pagination → store in URL via `useSearchParams`. Shareable, bookmarkable.

---

## Background Jobs

For MVP, no Redis dependency. We use **node-cron** + a MongoDB-based job queue.

```typescript
// src/lib/jobs/scheduler.ts
import cron from "node-cron";
import { sendRemindersJob } from "./send-reminders.job";
import { computeResultsJob } from "./compute-results.job";

export function startScheduler() {
  // Every hour, check for reminders to send
  cron.schedule("0 * * * *", sendRemindersJob);

  // Every 5 minutes, process pending result computations
  cron.schedule("*/5 * * * *", computeResultsJob);
}
```

The scheduler runs as part of the same Next.js process (Custom Server mode) — see `server.ts`.

### Result Computation Job

When an assessment is submitted, we don't compute results synchronously. Instead:
1. Submission marks `assessment.finalStatus = "pending"`
2. Background job picks it up within 5 minutes
3. Computes all 45 `assessmentResults` for that assessment
4. Updates campaign stats
5. Marks `finalStatus = "calibration_required"` or `"finalized"`

This keeps user requests fast and allows for retries.

---

## Error Handling

### Custom Error Hierarchy

```typescript
// src/lib/utils/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super("VALIDATION_FAILED", message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(action: string) {
    super("FORBIDDEN", `Not authorized to ${action}`, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}
```

### Centralized API Error Handler

```typescript
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid input", details: error.errors } },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode }
    );
  }

  // Log unexpected errors but don't leak details
  logger.error({ error }, "Unhandled error in API route");
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 }
  );
}
```

---

## Logging

### Structured logging with Pino

```typescript
// src/lib/utils/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty" },
  }),
});

// Usage
logger.info({ userId, action: "assessment.submitted" }, "Assessment submitted");
logger.error({ error, requestId }, "Failed to send email");
```

### What to log

- Every API request (auto-logged via middleware)
- Every authentication event
- Every state-changing action (also goes to `auditLogs` collection)
- Every error
- Job execution (start, completion, failure)

### What NOT to log

- Passwords, tokens, PII (mask or omit)
- Full document contents (log IDs, not entire docs)

---

## Performance Strategy

### 1. Server Components by Default

Pages render on the server. Only opt into client components (`"use client"`) when you need interactivity (forms, click handlers, real-time updates).

### 2. Streaming with Suspense

```tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <>
      <KPISection />
      <Suspense fallback={<HeatmapSkeleton />}>
        <Heatmap /> {/* slow query — streams in after */}
      </Suspense>
    </>
  );
}
```

### 3. MongoDB Indexes

Every query that hits more than 100 docs MUST use an index. Indexes defined in `SCHEMA.md`.

### 4. Caching Strategy

- **Static framework data** (areas, sub-comps, questions) → 5-minute Next.js cache
- **User session** → in-memory for request duration
- **Dashboard data** → TanStack Query cache (5 min stale, 10 min invalidation)
- **No CDN caching for personalized pages**

### 5. Pagination

Lists with >50 items MUST be paginated. Standard query params: `?page=1&limit=20`.

---

## Deployment: Single Docker Compose File

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/caliber
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID}
      - AZURE_AD_CLIENT_SECRET=${AZURE_AD_CLIENT_SECRET}
      - AZURE_AD_TENANT_ID=${AZURE_AD_TENANT_ID}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
    depends_on:
      - mongo
    volumes:
      - app_uploads:/app/uploads

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
  app_uploads:
```

### `Dockerfile`

```dockerfile
# Multi-stage build for smaller production image
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### One-command deploy

```bash
docker compose up -d
```

That's it. Application + database both running.

---

## Environment Variables

```env
# .env.example

# Application
NODE_ENV=production
NEXTAUTH_URL=https://caliber.app
NEXTAUTH_SECRET=<generated-secret>

# Database
MONGODB_URI=mongodb://mongo:27017/caliber

# Authentication (Azure AD)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Email (SMTP)
SMTP_HOST=smtp.caliber.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="Caliber <noreply@caliber.app>"

# Optional
SENTRY_DSN=
LOG_LEVEL=info
```

---

## Testing Strategy

### Unit Tests (Vitest)

Pure functions in `src/lib/domain/` get unit tests:

```typescript
// tests/unit/lib/domain/scoring/gap.test.ts
import { describe, it, expect } from "vitest";
import { calculateGap, getTrafficLight } from "@/lib/domain/scoring/gap";

describe("calculateGap", () => {
  it("returns positive gap when below required", () => {
    expect(calculateGap(4, 2.5)).toBe(1.5);
  });

  it("returns negative gap when above required", () => {
    expect(calculateGap(3, 4)).toBe(-1);
  });
});

describe("getTrafficLight", () => {
  it.each([
    [0, "strong"],
    [-0.5, "strong"],
    [0.5, "developing"],
    [1.5, "needs_focus"],
    [2.5, "critical"],
  ])("gap %s → %s", (gap, expected) => {
    expect(getTrafficLight(gap)).toBe(expected);
  });
});
```

### Integration Tests (Vitest + MongoDB Memory Server)

API routes get integration tests with an in-memory MongoDB:

```typescript
// tests/integration/api/framework/areas.test.ts
import { describe, beforeAll, it, expect } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

describe("POST /api/framework/areas", () => {
  it("creates a new area when HR admin authenticated", async () => {
    // ...
  });

  it("rejects when non-HR user attempts", async () => {
    // ...
  });
});
```

### E2E Tests (Playwright)

Critical user flows:
1. Employee logs in, takes assessment, submits
2. Manager rates an employee
3. HR launches a campaign

```typescript
// tests/e2e/employee-flow.spec.ts
test("employee completes assessment", async ({ page }) => {
  await page.goto("/login");
  await page.fill("[name=email]", "ahmed@caliber.com");
  await page.fill("[name=password]", "...");
  await page.click("button[type=submit]");

  await page.click("text=Start Assessment");
  // ... answer 135 questions
  await page.click("text=Submit");

  await expect(page).toHaveURL("/assessment/done");
});
```

---

## Observability

For MVP, basic logging is enough. Phase 2 considerations:
- **APM:** Sentry for error tracking
- **Metrics:** Prometheus endpoint at `/api/metrics`
- **Tracing:** OpenTelemetry instrumentation
- **Uptime monitor:** External service (Uptime Robot, etc.)

---

## Security

### At-rest
- Database: MongoDB encryption at rest (configure on the volume)
- Files: Same — server filesystem encrypted

### In-transit
- HTTPS only (force redirect in production)
- TLS 1.2+ minimum

### Application
- All inputs validated with Zod schemas
- All outputs sanitized (React auto-escapes; raw HTML never accepted from users)
- Passwords hashed with bcrypt (cost factor 12)
- Sessions in HTTP-only secure cookies
- CSRF protection via NextAuth
- Rate limiting on auth endpoints (max 10 requests/min)
- Audit log for every state change

### OWASP Top 10
| Risk | Mitigation |
|---|---|
| Injection | Parameterized MongoDB queries; Zod validation |
| Broken Auth | NextAuth, MFA via Azure AD |
| Sensitive Data Exposure | Audit logs encrypted, no PII in regular logs |
| XXE | Not applicable (no XML) |
| Broken Access Control | Server-side RBAC on every endpoint |
| Security Misconfig | Env vars never committed; secrets via secret manager in prod |
| XSS | React auto-escape; no `dangerouslySetInnerHTML` |
| Deserialization | All JSON parsed and validated with Zod |
| Vulnerable Dependencies | Dependabot + monthly `npm audit` |
| Insufficient Logging | Comprehensive audit trail |

---

## End of Architecture Document

For database schema, see **SCHEMA.md**.
For coding conventions, see **CODING_STANDARDS.md**.
For product features, see **PRD.md**.
