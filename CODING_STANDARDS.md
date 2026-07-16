# Caliber — Coding Standards

**Version:** 1.0
**Last Updated:** 2026-06-05
**Author:** Afaq Fiaz

---

## Document Purpose

This document defines **the rules for writing code** in the Caliber project. These are not suggestions. They are mandatory standards that protect the codebase from drift, bugs, and inconsistency.

If you find yourself wanting to deviate from a rule, **update this document first**, then change the code. Never the other way around.

---

## The Cardinal Rules (Read These First)

1. **TypeScript everywhere. `any` is forbidden.** If you reach for `any`, you don't understand the type yet. Stop and figure it out.

2. **No business logic in components.** Components render UI. Services hold logic. Repositories hold data access. Cross these lines and the codebase rots.

3. **Validate at the boundary.** Every API input, every form, every database read — validated with Zod before being trusted.

4. **Server-side authorization is non-negotiable.** Client-side checks are for UX only. Every Route Handler and Server Action checks permissions.

5. **Errors are typed and predictable.** Throw `AppError` subclasses. Never throw raw strings. Never silently swallow.

6. **No mutation of inputs.** Functions return new objects. Mutating an argument is a bug waiting to happen.

7. **One file, one purpose.** A file with both `getUser` and `sendEmail` is wrong. Split it.

8. **Code review every change.** Even solo. Before you push, re-read your diff. Pretend you're reviewing someone else's code.

---

## File & Folder Naming

### Rules

| Type | Pattern | Example |
|---|---|---|
| React component file | `kebab-case.tsx` | `competency-card.tsx` |
| React component name | `PascalCase` | `CompetencyCard` |
| Server Action file | `actions.ts` (next to page) | `app/(hr)/areas/actions.ts` |
| API route | `route.ts` (inside `app/api/...`) | `app/api/areas/route.ts` |
| Service file | `[domain].service.ts` | `assessment.service.ts` |
| Repository file | `[entity].repository.ts` | `user.repository.ts` |
| Type file | `[domain].types.ts` | `framework.types.ts` |
| Zod schema file | `[domain].schema.ts` | `assessment.schema.ts` |
| Utility file | `kebab-case.ts` | `format-date.ts` |
| Test file | `[file].test.ts` or `[file].spec.ts` | `gap.test.ts` |
| Constants file | `constants.ts` | `constants.ts` |
| Hook file | `use-[name].ts` | `use-current-campaign.ts` |

### Folder names

Always lowercase, kebab-case: `assessment-results`, not `AssessmentResults` or `assessment_results`.

### Index files

**Avoid `index.ts` re-exports unless necessary.** They obscure where code lives. Import from the actual file:

```typescript
// ❌ Bad
import { calculateGap } from "@/lib/domain/scoring";

// ✅ Good
import { calculateGap } from "@/lib/domain/scoring/gap";
```

Exception: shadcn/ui components ship with an `index.ts` — that's fine.

---

## TypeScript Rules

### 1. Strict mode is on. Don't disable it.

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 2. `any` is forbidden. `unknown` is fine.

```typescript
// ❌ Bad
function parse(data: any) { return data.name; }

// ✅ Good — use unknown + validation
function parse(data: unknown) {
  const validated = nameSchema.parse(data);
  return validated.name;
}
```

### 3. Use `type` for unions, `interface` for object shapes

```typescript
// Unions
type TrafficLight = "strong" | "developing" | "needs_focus" | "critical";

// Object shapes
interface User {
  _id: ObjectId;
  email: string;
  // ...
}
```

### 4. Branded types for IDs

Don't pass raw strings/ObjectIds around — wrap them:

```typescript
// src/lib/domain/types/common.types.ts
export type UserId = ObjectId & { readonly __brand: "UserId" };
export type CampaignId = ObjectId & { readonly __brand: "CampaignId" };

// Now this is a compile error:
function getUserById(id: UserId) { /* ... */ }
getUserById(someCampaignId); // ❌ Type error
```

### 5. Prefer readonly when possible

```typescript
interface Question {
  readonly _id: ObjectId;
  text: string;
  options: ReadonlyArray<QuestionOption>; // Can't push to it
}
```

### 6. No `enum` — use `as const` objects

```typescript
// ❌ Bad
enum Status { Active, Inactive }

// ✅ Good
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
type Status = (typeof STATUS)[keyof typeof STATUS];
```

Reason: `enum` has runtime overhead and quirky behavior. `as const` is cleaner.

### 7. Discriminated unions for state

```typescript
type AssessmentState =
  | { status: "not_started" }
  | { status: "in_progress"; startedAt: Date; progress: number }
  | { status: "submitted"; startedAt: Date; submittedAt: Date };
```

This forces exhaustive handling and prevents impossible states.

---

## React Component Rules

### 1. Server Components by default

Only opt into Client Components when you need browser APIs:

```tsx
// ✅ Server Component (default)
export default async function AreaList() {
  const areas = await competencyAreaRepo.findAll();
  return <ul>{areas.map(a => <li key={a._id.toString()}>{a.name}</li>)}</ul>;
}

// ✅ Client Component (only when needed)
"use client";
export function AreaForm() {
  const [name, setName] = useState("");
  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

### 2. Component file structure

```tsx
"use client"; // only if needed, must be first line

import { /* React imports */ } from "react";
import { /* Third-party */ } from "...";
import { /* Internal */ } from "@/...";

// Types (component-specific)
interface Props {
  campaignId: string;
}

// Component
export function CampaignCard({ campaignId }: Props) {
  // 1. Hooks
  const { data } = useCampaign(campaignId);

  // 2. Derived state
  const isActive = data?.status === "active";

  // 3. Event handlers
  const handleClick = () => { /* ... */ };

  // 4. Early returns for loading/error
  if (!data) return <CampaignCardSkeleton />;

  // 5. Main render
  return (
    <Card>
      {/* ... */}
    </Card>
  );
}

// Sub-components (small, private)
function CampaignCardSkeleton() {
  return <div className="animate-pulse">...</div>;
}
```

### 3. Props rules

- Always type props with an `interface` named `Props`
- Required props before optional props
- No prop drilling more than 2 levels — refactor to context or composition
- Pass primitives, not whole objects, when possible: `<Card title={user.name} />` not `<Card user={user} />`

### 4. No inline styles

```tsx
// ❌ Bad
<div style={{ color: "red", padding: "8px" }}>...</div>

// ✅ Good — use Tailwind
<div className="text-red-600 p-2">...</div>
```

Exception: dynamic values from props/state where Tailwind doesn't work.

### 5. Conditional rendering

```tsx
// ✅ Boolean &&
{isLoading && <Spinner />}

// ✅ Ternary for either/or
{isLoading ? <Spinner /> : <Content />}

// ❌ Avoid nested ternaries
{a ? (b ? c : d) : (e ? f : g)} // 🚫 unreadable
```

For complex conditional rendering, extract to a function:

```tsx
function renderContent() {
  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <EmptyState />;
  return <Content data={data} />;
}

return <Card>{renderContent()}</Card>;
```

### 6. Lists need stable keys

```tsx
// ❌ Bad — index is unstable when items reorder
{items.map((item, i) => <Row key={i} {...item} />)}

// ✅ Good — stable unique key
{items.map(item => <Row key={item._id.toString()} {...item} />)}
```

---

## API Routes & Server Actions

### 1. Standard skeleton for Route Handlers

Every API route follows this pattern. No exceptions.

```typescript
// app/api/framework/areas/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { handleApiError } from "@/lib/utils/errors";
import { frameworkService } from "@/lib/services/framework.service";

const createAreaSchema = z.object({
  jobFamilyId: z.string(),
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  sequence: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("framework.area.create");
    const body = createAreaSchema.parse(await req.json());
    const area = await frameworkService.createArea(body, session.userId);
    return NextResponse.json({ data: area }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission("framework.area.view");
    const jobFamilyId = req.nextUrl.searchParams.get("jobFamilyId");
    const areas = await frameworkService.listAreas({ jobFamilyId });
    return NextResponse.json({ data: areas });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 2. Validation is mandatory

```typescript
// ❌ Bad — trusting input
const body = await req.json();
await db.collection("users").insertOne(body);

// ✅ Good — validate first
const validated = createUserSchema.parse(await req.json());
await userService.create(validated);
```

### 3. Never expose internal errors to clients

```typescript
// ❌ Bad
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
  // Could leak: "Connection refused mongodb://...:27017"
}

// ✅ Good — centralized handler
catch (error) {
  return handleApiError(error); // Sanitizes + logs internally
}
```

### 4. Server Actions structure

```typescript
// app/(hr)/framework/areas/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { createAreaSchema } from "@/lib/domain/validation/framework.schema";
import { frameworkService } from "@/lib/services/framework.service";

export async function createAreaAction(input: unknown) {
  try {
    const session = await requirePermission("framework.area.create");
    const validated = createAreaSchema.parse(input);
    const area = await frameworkService.createArea(validated, session.userId);

    // Invalidate cached pages so they re-render with new data
    revalidatePath("/framework/areas");

    return { success: true, data: area };
  } catch (error) {
    // Server Actions return error info instead of HTTP responses
    if (error instanceof AppError) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
    logger.error({ error }, "createAreaAction failed");
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } };
  }
}
```

---

## Service Layer Rules

### 1. Services are stateless

No class state. Use exported objects with methods, or plain functions.

```typescript
// ✅ Good
export const frameworkService = {
  async createArea(input: CreateAreaInput, actorId: ObjectId) { /* ... */ },
  async updateArea(id: ObjectId, input: UpdateAreaInput, actorId: ObjectId) { /* ... */ },
};

// ❌ Avoid — class with state
class FrameworkService {
  private cache = new Map();
  // ...
}
```

### 2. Services delegate to repositories

```typescript
// ❌ Bad — service writes to DB directly
async createArea(input, actorId) {
  const db = await getDb();
  return db.collection("competencyAreas").insertOne({ ... });
}

// ✅ Good — service uses repository
async createArea(input, actorId) {
  const existing = await competencyAreaRepo.findByCode(input.jobFamilyId, input.code);
  if (existing) throw new ConflictError("Code already in use");
  return competencyAreaRepo.insert({ ...input, createdBy: actorId, createdAt: new Date() });
}
```

### 3. Services handle business rules

```typescript
async submitSelfAssessment(assessmentId: ObjectId, actorId: ObjectId) {
  const assessment = await assessmentRepo.findById(assessmentId);
  if (!assessment) throw new NotFoundError("Assessment");

  // Business rules
  if (assessment.employeeId.toString() !== actorId.toString()) {
    throw new ForbiddenError("submit this assessment");
  }
  if (assessment.selfAssessment.status === "submitted") {
    throw new ConflictError("Assessment already submitted");
  }
  if (assessment.selfAssessment.progress < 100) {
    throw new ValidationError("Cannot submit incomplete assessment", { progress: assessment.selfAssessment.progress });
  }

  // Perform the action
  await assessmentRepo.markSelfSubmitted(assessmentId);
  await campaignService.updateStats(assessment.campaignId);
  await notificationService.notifyManager(assessment.lineManagerId, assessment._id);
  await auditService.log({ /* ... */ });
}
```

### 4. Transactions for multi-document operations

```typescript
async finalizeAssessment(assessmentId: ObjectId, actorId: ObjectId) {
  const db = await getDb();
  const session = db.client.startSession();

  try {
    await session.withTransaction(async () => {
      await assessmentRepo.markFinalized(assessmentId, actorId, { session });
      await this.computeAndStoreResults(assessmentId, { session });
      await campaignService.incrementFinalizedCount(/* ... */, { session });
    });
  } finally {
    await session.endSession();
  }
}
```

---

## Repository Layer Rules

### 1. Repositories only do DB operations

```typescript
// ✅ Good
export const userRepo = {
  async findById(id: ObjectId) {
    const db = await getDb();
    return db.collection<User>(COLLECTIONS.USERS).findOne({ _id: id, isActive: true });
  },

  async findByEmail(email: string) {
    const db = await getDb();
    return db.collection<User>(COLLECTIONS.USERS).findOne({
      email: email.toLowerCase(),
      isActive: true,
    });
  },
};

// ❌ Bad — repository has business logic
export const userRepo = {
  async findById(id: ObjectId) {
    const user = await /* ... */;
    if (!user) throw new NotFoundError("User"); // 🚫 throwing belongs in service
    if (user.lastLoginAt < someDate) await sendInactiveEmail(); // 🚫 side effect
    return user;
  },
};
```

### 2. No business decisions in queries

```typescript
// ❌ Bad — repository knows business rules
async findActiveCampaignsForUser(userId: ObjectId) {
  return db.collection("campaigns").find({
    participantIds: userId,
    status: "active",
    selfAssessmentDeadline: { $gt: new Date() }, // 🚫 business rule
  });
}

// ✅ Good — repository takes filters as input
async findCampaigns(filters: CampaignFilters) {
  const query: any = { isActive: true };
  if (filters.participantId) query.participantIds = filters.participantId;
  if (filters.status) query.status = filters.status;
  if (filters.activeBefore) query.selfAssessmentDeadline = { $gt: filters.activeBefore };
  return db.collection("campaigns").find(query).toArray();
}
```

### 3. Use generics for type safety

```typescript
const collection = db.collection<User>(COLLECTIONS.USERS);
// Now TypeScript checks every field access
```

### 4. Consistent return types

| Operation | Returns |
|---|---|
| `findById(id)` | `Entity \| null` |
| `findByX(...)` | `Entity \| null` (single) or `Entity[]` (multi) |
| `findMany(filters)` | `Entity[]` (empty array if no matches) |
| `insert(data)` | The created `Entity` with `_id` |
| `update(id, patch)` | The updated `Entity` or `null` if not found |
| `delete(id)` | `boolean` (true if deleted) |
| `count(filters)` | `number` |

---

## Domain Layer Rules

### 1. Pure functions only

```typescript
// src/lib/domain/scoring/gap.ts

/**
 * Calculate the gap between required and current level.
 * Pure function — no I/O, no side effects.
 */
export function calculateGap(required: number, current: number): number {
  return required - current;
}

/**
 * Map a gap value to a traffic light status.
 * Pure function — no I/O, no side effects.
 */
export function getTrafficLight(gap: number): TrafficLight {
  if (gap <= 0) return "strong";
  if (gap <= 1) return "developing";
  if (gap <= 2) return "needs_focus";
  return "critical";
}
```

### 2. No imports from infrastructure

Files in `src/lib/domain/` MUST NOT import:
- `@/lib/db/*`
- `@/lib/email/*`
- `@/lib/jobs/*`
- Anything that does I/O

This rule is enforced by ESLint:

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["@/lib/db/*", "@/lib/email/*", "@/lib/jobs/*"],
        "message": "Domain layer cannot depend on infrastructure"
      }]
    }]
  }
}
```

### 3. Domain types are the source of truth

```typescript
// src/lib/domain/types/framework.types.ts

export interface CompetencyArea {
  _id: ObjectId;
  jobFamilyId: ObjectId;
  name: string;
  code: string;
  description: string | null;
  sequence: number;
  weight: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

These types match the SCHEMA.md document **exactly**. If they diverge, SCHEMA.md wins — update the type to match.

---

## Validation with Zod

### 1. One schema per concept, reused everywhere

```typescript
// src/lib/domain/validation/framework.schema.ts
import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const createCompetencyAreaSchema = z.object({
  jobFamilyId: objectIdSchema,
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9-]+$/i),
  description: z.string().max(500).optional(),
  sequence: z.number().int().min(1),
  weight: z.number().min(0).max(10).default(1),
});

export type CreateCompetencyAreaInput = z.infer<typeof createCompetencyAreaSchema>;

export const updateCompetencyAreaSchema = createCompetencyAreaSchema.partial();
export type UpdateCompetencyAreaInput = z.infer<typeof updateCompetencyAreaSchema>;
```

Reused in:
- Route Handler (validate request)
- Server Action (validate input)
- Form (`zodResolver(createCompetencyAreaSchema)`)
- Service (re-validate before persistence, optional)

### 2. Infer types from schemas

```typescript
// ❌ Bad — duplicated types
interface CreateAreaInput {
  name: string;
  code: string;
  // ...
}
const schema = z.object({
  name: z.string(),
  code: z.string(),
  // ...
});

// ✅ Good — single source
const schema = z.object({ name: z.string(), code: z.string() });
type CreateAreaInput = z.infer<typeof schema>;
```

### 3. Custom error messages

```typescript
const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  age: z.number().min(18, "Must be at least 18 years old"),
});
```

---

## Database Rules

### 1. Use ObjectId, not strings

```typescript
// ❌ Bad
async findById(id: string) {
  return db.collection("users").findOne({ _id: id });
}

// ✅ Good
async findById(id: ObjectId) {
  return db.collection("users").findOne({ _id: id });
}

// Convert at the boundary
const userId = new ObjectId(request.params.id);
```

### 2. Always use indexes

If you write a query that filters or sorts by a field, that field MUST be indexed (or part of a compound index).

Check by running query with `.explain("executionStats")` — if `winningPlan.stage` is `COLLSCAN`, fix it.

### 3. Project only what you need

```typescript
// ❌ Bad — returns entire document
const users = await db.collection("users").find({}).toArray();

// ✅ Good — projection
const users = await db.collection("users")
  .find({}, { projection: { fullName: 1, email: 1, designation: 1 } })
  .toArray();
```

### 4. Pagination is mandatory for lists

```typescript
async findMany(filters: Filters, options: { page: number; limit: number }) {
  const skip = (options.page - 1) * options.limit;
  return db.collection("users")
    .find(filters)
    .skip(skip)
    .limit(options.limit)
    .toArray();
}
```

Default `limit`: 20. Max `limit`: 100.

### 5. Soft delete by default

```typescript
// ❌ Bad
async delete(id: ObjectId) {
  return db.collection("users").deleteOne({ _id: id });
}

// ✅ Good — soft delete
async deactivate(id: ObjectId, actorId: ObjectId) {
  return db.collection("users").updateOne(
    { _id: id },
    { $set: { isActive: false, updatedAt: new Date(), updatedBy: actorId } }
  );
}
```

Hard delete only when legally required (GDPR right-to-erasure).

### 6. Aggregations live in repositories

Don't write aggregation pipelines in services or routes — they belong in repositories.

```typescript
// src/lib/db/repositories/assessment-result.repository.ts
export const assessmentResultRepo = {
  async getDivisionHeatmap(campaignId: ObjectId) {
    return db.collection("assessmentResults").aggregate([
      { $match: { campaignId } },
      { $group: {
          _id: { division: "$denormalized.division", area: "$denormalized.areaId" },
          avgGap: { $avg: "$gap" },
          count: { $sum: 1 }
      }},
      { $sort: { "_id.division": 1, "_id.area": 1 } },
    ]).toArray();
  },
};
```

---

## Styling Rules

### 1. Tailwind CSS only

No `.css` files except `globals.css`. No CSS-in-JS. No styled-components.

### 2. Design tokens from `tokens.ts`

```typescript
// src/styles/tokens.ts
export const colors = {
  primary: "#16305C",
  primaryHover: "#102544",
  primaryLight: "#EAF0FB",
  gapStrong: "#10B981",
  gapDeveloping: "#F59E0B",
  gapFocus: "#F97316",
  gapCritical: "#EF4444",
} as const;
```

Use semantic Tailwind classes (configured in `tailwind.config.ts` to reference these tokens):

```tsx
<Badge className="bg-gap-critical/10 text-gap-critical">Critical</Badge>
```

### 3. Class order via prettier-plugin-tailwindcss

Auto-sorted on save. No manual ordering needed.

### 4. Reusable component classes

For repeated combinations, use a component, not a class string:

```tsx
// ❌ Bad — copy-pasted everywhere
<button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primaryHover">Save</button>

// ✅ Good — Button component owns the styles
<Button>Save</Button>
```

---

## Testing Rules

### 1. Test pyramid

```
        E2E (few)
       /
      Integration (some)
     /
    Unit (many)
```

### 2. What to test

**Always test:**
- Domain functions (`calculateGap`, `getTrafficLight`, scoring math)
- Service business rules (permission checks, state transitions, validation)
- Critical user flows end-to-end (assessment submission, manager rating)

**Don't waste time testing:**
- Trivial getters/setters
- Implementation details (mock-heavy tests)
- Third-party libraries

### 3. Test file co-location

Unit tests live next to the file they test:

```
src/lib/domain/scoring/
├── gap.ts
└── gap.test.ts
```

Integration and E2E tests live in `tests/`.

### 4. Arrange-Act-Assert

```typescript
it("computes self level from question answers", () => {
  // Arrange
  const questions = [
    { _id: q1, options: [{letter:"A", score:1}, {letter:"D", score:4}] },
    { _id: q2, options: [{letter:"A", score:1}, {letter:"D", score:4}] },
  ];
  const answers = [
    { questionId: q1, selectedOption: "D" }, // 4
    { questionId: q2, selectedOption: "A" }, // 1
  ];

  // Act
  const level = calculateSelfLevel(questions, answers);

  // Assert
  expect(level).toBeCloseTo(3.125); // (5/8) * 5 = 3.125
});
```

---

## Git Workflow

### 1. Branch naming

- `feat/[short-description]` — new feature
- `fix/[short-description]` — bug fix
- `refactor/[short-description]` — code restructure, no behavior change
- `docs/[short-description]` — documentation only
- `chore/[short-description]` — build, deps, config

Examples:
- `feat/assessment-questionnaire`
- `fix/manager-rating-not-saving`
- `refactor/extract-scoring-engine`

### 2. Commit message format

```
<type>(<scope>): <subject>

<body — optional, what and why>
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`

Examples:
- `feat(assessment): add save-and-resume to questionnaire`
- `fix(scoring): handle empty options array in self-level calc`
- `refactor(api): extract permission check to middleware`

### 3. Never commit secrets

`.env.local` is gitignored. Use `.env.example` for documentation.

If you accidentally commit a secret, **rotate it immediately**. Don't just remove the commit.

### 4. PRs / self-review checklist

Before pushing (even solo):
- [ ] Does it build? (`npm run build`)
- [ ] Do tests pass? (`npm test`)
- [ ] Does TypeScript compile with no errors? (`npm run typecheck`)
- [ ] Does ESLint pass? (`npm run lint`)
- [ ] Did I add tests for new logic?
- [ ] Did I update relevant docs (PRD/SCHEMA/ARCHITECTURE)?
- [ ] Did I check the diff line-by-line?
- [ ] No `console.log`, `debugger`, or commented-out code?

---

## Performance Rules

### 1. Avoid N+1 queries

```typescript
// ❌ Bad
const users = await userRepo.findMany({});
for (const user of users) {
  user.manager = await userRepo.findById(user.lineManagerId); // N+1
}

// ✅ Good — batch
const users = await userRepo.findMany({});
const managerIds = users.map(u => u.lineManagerId).filter(Boolean);
const managers = await userRepo.findManyByIds(managerIds);
const managerMap = new Map(managers.map(m => [m._id.toString(), m]));
users.forEach(u => u.manager = managerMap.get(u.lineManagerId?.toString()));
```

### 2. Server Components are async — leverage parallel fetching

```tsx
// ❌ Bad — sequential
export default async function Dashboard() {
  const campaigns = await getCampaigns();
  const stats = await getStats();
  const users = await getUsers();
  return <Layout>...</Layout>;
}

// ✅ Good — parallel
export default async function Dashboard() {
  const [campaigns, stats, users] = await Promise.all([
    getCampaigns(),
    getStats(),
    getUsers(),
  ]);
  return <Layout>...</Layout>;
}
```

### 3. Stream slow data with Suspense

```tsx
<Suspense fallback={<HeatmapSkeleton />}>
  <HeatmapAsync /> {/* slow query — page renders without waiting */}
</Suspense>
```

### 4. Cache static data

```typescript
// app/api/framework/areas/route.ts
export const revalidate = 300; // 5-minute cache
```

### 5. Always paginate

Lists with more than ~50 expected items MUST paginate.

---

## Security Rules

### 1. Every API endpoint checks permissions

```typescript
// ✅ Mandatory pattern
const session = await requirePermission("...");
```

No exceptions. Even "internal" endpoints. Even GET requests.

### 2. Never trust the client

```typescript
// ❌ Bad — trusting client to send the right userId
const { userId } = await req.json();
await deleteUser(userId);

// ✅ Good — use session
const session = await requirePermission("user.delete");
const { userId } = deleteUserSchema.parse(await req.json());
await deleteUser(userId, session.userId);
```

### 3. Sanitize output

React auto-escapes content in JSX. Never use `dangerouslySetInnerHTML` with user input.

### 4. Rate limit auth endpoints

```typescript
// app/api/auth/[...nextauth]/route.ts
import { rateLimit } from "@/lib/utils/rate-limit";

export async function POST(req: Request) {
  await rateLimit(req, { max: 10, window: 60 }); // 10 req/min
  // ...
}
```

### 5. Audit every state change

```typescript
async createArea(input, actorId) {
  const area = await competencyAreaRepo.insert({ ... });
  await auditService.log({
    actorId,
    action: "framework.area.created",
    entityType: "CompetencyArea",
    entityId: area._id,
    changes: { before: null, after: area },
  });
  return area;
}
```

---

## Documentation Rules

### 1. Document the WHY, not the WHAT

```typescript
// ❌ Useless — restates the code
// Find user by ID
async findById(id) { /* ... */ }

// ✅ Useful — explains intent
/**
 * Find an active user by ID. Returns null if user is soft-deleted.
 * Used by AuthGuard to verify session validity on every request.
 */
async findById(id) { /* ... */ }
```

### 2. JSDoc for public API

Every exported function in `src/lib/services/` and `src/lib/domain/` gets JSDoc:

```typescript
/**
 * Calculate the self-assessment level for a sub-competency.
 *
 * Sums the scores from the employee's answers, divides by max possible,
 * then normalizes to a 0-5 scale.
 *
 * @param questions - The questions assigned to this sub-competency
 * @param answers - The employee's selected options
 * @returns Level on 0-5 scale, or null if no answers provided
 *
 * @example
 * const level = calculateSelfLevel(questions, answers); // 2.92
 */
export function calculateSelfLevel(questions, answers) { /* ... */ }
```

### 3. Update docs WITH code, not after

If you change a schema, update SCHEMA.md in the same commit.
If you change a permission, update CODING_STANDARDS.md.
Documentation drift is a process failure, not a documentation failure.

---

## Forbidden Patterns

These patterns are **never** allowed in this codebase:

| Pattern | Why |
|---|---|
| `any` type | Defeats TypeScript |
| `@ts-ignore` / `@ts-expect-error` | Hides type errors |
| Raw SQL strings | We use MongoDB, but the principle applies — no string interpolation in queries |
| `dangerouslySetInnerHTML` with user input | XSS vulnerability |
| `console.log` in committed code | Use logger |
| `setTimeout` for race conditions | Race conditions need explicit synchronization |
| Top-level `await` in components | Doesn't work in Client Components |
| Mutating function arguments | Source of subtle bugs |
| `useEffect` for data fetching | Use TanStack Query or Server Components |
| Empty `catch` blocks | Silent failures are the worst kind |
| Hardcoded secrets | Use env vars |
| `var` keyword | Use `const` or `let` |
| `==` (use `===`) | Type coercion bugs |

---

## Required Tooling

Before writing any code, install these:

```bash
npm install --save-dev \
  typescript \
  @types/node \
  @types/react \
  eslint \
  eslint-config-next \
  prettier \
  prettier-plugin-tailwindcss \
  vitest \
  @vitest/coverage-v8 \
  @playwright/test
```

### VS Code extensions (recommended)

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MongoDB for VS Code
- Error Lens

### Git hooks (Husky)

```json
// package.json
{
  "husky": {
    "pre-commit": "lint-staged",
    "pre-push": "npm run typecheck && npm test"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

---

## When You're Stuck

In order of preference:

1. **Check existing code** — most patterns are already implemented somewhere
2. **Check this document** — the rule probably exists
3. **Check ARCHITECTURE.md** — the layer guidance answers most questions
4. **Check SCHEMA.md** — the data model answers most data questions
5. **Search the Next.js docs** — they're excellent
6. **Take a 10-minute break and re-read your code** — many problems solve themselves

---

## End of Coding Standards

For database schema, see **SCHEMA.md**.
For architecture, see **ARCHITECTURE.md**.
For product features, see **PRD.md**.
