# Caliber — Plain-English Project Guide

> A friendly, non-jargon walkthrough of what this app is, how it works, and
> what "checking the workflows" actually means. Written for someone picking the
> project up cold.
>
> For the deep/formal versions see [`01_PRD_Caliber.md`](./01_PRD_Caliber.md)
> (what it does), [`ARCHITECTURE.md`](./ARCHITECTURE.md) (how the code is laid
> out), [`SCHEMA.md`](./SCHEMA.md) (the data), and [`README.md`](./README.md)
> (setup). This guide is the "start here" summary.

---

## 1. What is this app, in one paragraph?

**Caliber** is an internal HR web app that replaces a big Excel spreadsheet. A
company wants to measure **how skilled each employee is** across a list of
job skills ("competencies"), compare that to **how skilled they're supposed to
be** for their role, and see the **gaps** — for one person, a team, or the whole
company. Employees rate themselves, their manager rates them, the app compares
the two, calculates the gaps, colors them like traffic lights (🟢🟡🟠🔴), and
draws dashboards and reports. That's the entire product.

It is **not** a payroll, recruiting, performance-review, or course-hosting tool.
It only answers: *"What skills do our people have, and what skills do they need?"*

---

## 2. The core idea in one picture

```
   Employee rates themselves  ──┐
                                 ├──►  App compares them  ──►  GAP  ──►  🟢🟡🟠🔴
   Manager rates the employee ──┘        (manager rating          (colored
                                          is the "official"        status per skill)
   Required level for the role ─────────► number for gaps)
```

Three numbers per skill:
- **Self level** – what the employee thinks (used only to spot disagreements).
- **Manager level** – what the manager says (this is the *official* score).
- **Required level** – what the role demands (set by HR).

**Gap = Required − Manager.** A positive gap means the person is below where they
should be. The size of the gap decides the traffic-light color.

---

## 3. Who uses it — the four roles

The same person can hold several roles at once (a manager is also an employee).
Permissions add up.

| Role | What they do | What they see |
|---|---|---|
| **Employee** | Takes the questionnaire about themselves, twice a year | Only their own questionnaire. **Not** their scores/gaps (those are discussed in 1-on-1s). |
| **Line Manager** | Rates each of their direct reports on every skill; sees their team's results | Their own team only. Team heatmap, gaps, can assign training. |
| **HR Admin** | Runs the whole thing: builds the skill framework, launches assessment "campaigns", reviews disagreements, locks results, exports reports | Everything. The only role that can edit the framework. |
| **Executive** | Senior leadership; looks at big-picture dashboards | Company-wide aggregates and trends. No individual editing. |

The seeded test login (`hr@caliber.com`) is an **HR Admin**, so it can see all screens.

---

## 4. Key vocabulary (learn these 6 words and the app makes sense)

1. **Competency framework** – the master list of skills, arranged as a 5-level
   tree:

   ```
   Job Family        e.g. "Project Management"
     └─ Competency Area      8 of them   e.g. "Risk Management"
          └─ Sub-Competency  45 total    e.g. "Identifying Risks"
               └─ Question    135 total   scenario questions
                    └─ Option (A/B/C/D…) each option has a hidden score
   ```
   HR owns and edits all of this **inside the app** — no developer needed.

2. **Rating scale (1–5)** – every skill level is on this fixed scale:
   `1 Amateur · 2 Collaborator · 3 Enabler · 4 Driving Force · 5 Visionary`.

3. **Required level** – the target 1–5 value for each *Sub-Competency × Role*
   combination (e.g. a "Manager" needs level 4 in "Identifying Risks"). There are
   180 of these cells (45 skills × 4 roles) in the seed data.

4. **Gap** – `Required − Manager level`. Higher = worse.

5. **Traffic light** – the gap turned into a color (see §5).

6. **Calibration** – catching when an employee's self-rating and the manager's
   rating disagree a lot. Big disagreements get flagged so HR can review whether
   a manager is systematically too soft or too harsh.

---

## 5. How the numbers actually work (with examples)

All of this logic lives in [`src/lib/domain/scoring/`](./src/lib/domain/scoring/)
and is fully unit-tested — it's the "brain" of the app.

### a) Self level — from the employee's answers
Each answered question's chosen option has a score; it's normalized to 0–5 and
averaged (optionally weighted). Example: two questions, employee picks the top
option on one and the bottom on the other → `avg(5.0, 1.25) = 3.13`.
→ [`self-level.ts`](./src/lib/domain/scoring/self-level.ts)

### b) Gap + traffic light
`gap = required − managerLevel`, then colored using these default thresholds:

| Gap | Meaning | Color |
|---|---|---|
| `gap ≤ 0` | at or above target | 🟢 **strong** |
| `0 < gap ≤ 1` | slightly below | 🟡 **developing** |
| `1 < gap ≤ 2` | notably below | 🟠 **needs focus** |
| `gap > 2` | far below | 🔴 **critical** |

→ [`gap.ts`](./src/lib/domain/scoring/gap.ts)

### c) Calibration flag (self vs manager)
Based on `|self − manager|`:

| Difference | Flag |
|---|---|
| `≤ 1` | aligned (none) |
| `1 < diff ≤ 2` | minor outlier |
| `> 2` | **major outlier** (HR reviews these) |

→ [`calibration.ts`](./src/lib/domain/scoring/calibration.ts)

### d) Roll-ups (skill → area → overall)
Sub-competency results are averaged up into each **Area** score, and areas are
weighted-averaged into an **Overall capability %** = `(managerLevel / 5) × 100`.
That overall % is what feeds the executive dashboards.
→ [`rollup.ts`](./src/lib/domain/scoring/rollup.ts)

> **Defaults are configurable.** These thresholds are the built-in defaults; HR
> can change them in Settings. See
> [`src/lib/domain/constants.ts`](./src/lib/domain/constants.ts).

---

## 6. THE main workflow — the assessment "campaign" lifecycle

This is the heart of the app and **the thing your friend means by "check the
workflows."** A *campaign* is one assessment round (e.g. "2026 H1 Assessment").
It moves through states, and each state unlocks the next action.

```
 DRAFT ──launch──► ACTIVE ──move to calibration──► IN_CALIBRATION ──lock──► LOCKED ──► (ARCHIVED)
   │                  │                                  │                    │
HR builds it     Employees + managers          HR reviews the           Results frozen,
& previews       fill in their ratings         disagreements &          reports & dashboards
                                                adjusts ratings          are final
```

The state rules are enforced in
[`src/lib/services/campaign.service.ts`](./src/lib/services/campaign.service.ts)
(e.g. "only a Draft can be launched", "only a campaign in calibration can be
locked"). Walking through these transitions is the checklist in §9.

**The five phases end-to-end** (from the PRD):

0. **Setup (once):** HR builds the framework, imports employees, builds the
   training list. *(Already done for you — the seed script loaded a full PM
   framework: 8 areas, 45 sub-competencies, 135 questions, 4 roles, 180 required
   levels.)*
1. **Launch:** HR creates a campaign, picks participants + deadlines, hits
   Launch. The app snapshots the framework, creates one assessment record per
   employee, and emails everyone.
2. **Self-assessment:** each employee answers the 135 questions (auto-saved, can
   resume). On submit, the app computes their self levels.
3. **Manager rating:** each manager rates their reports 1–5 on every skill. On
   submit, the app computes gaps, traffic lights, and calibration flags, and
   rolls everything up.
4. **Calibration:** HR reviews the outliers (big self-vs-manager gaps) and
   adjusts ratings with explanations.
5. **Lock & report:** HR locks the campaign (freezing all results), managers
   review team heatmaps and hold 1-on-1s, executives view org dashboards,
   training gets assigned.

### A neat extra: no-login assessment links
Employees don't strictly need an SSO account. HR can send a **secure one-time
link** (`/a/<token>`) that opens straight into their questionnaire. The token is
hashed, expires (default 30 days), and is consumed on submit.
→ [`src/lib/services/token.service.ts`](./src/lib/services/token.service.ts)

---

## 7. The screens (grouped by who sees them)

Routes live under [`app/`](./app/), grouped by role in parentheses folders.

**Employee** — `/assessment` (take/resume/submit the questionnaire) ·
`/a/[token]` (the public no-login version).

**Manager** — `/team` (your reports + pending ratings) · `/rate/[assessmentId]`
(the 45-skill rating form).

**HR Admin** (the big one) —
`/dashboard` · `/framework` (+ areas / sub-competencies / questions editors) ·
`/roles` · `/required-levels` (the skill × role matrix) · `/employees`
(directory + CSV import) · `/trainings` · `/campaigns` (+ `/new`, detail,
`/calibration`, `/heatmap`) · `/reports` · `/results/[id]` · `/settings`
(thresholds) · `/audit` (immutable log of every change).

**Executive** — `/executive` (org-wide KPIs and drill-down heatmaps).

Everyone starts at `/login`; `/` redirects there if you're not signed in.

---

## 8. How the pieces fit (tech, in plain terms)

It's **one Next.js app** that is both the website and the backend — no separate
server. Data lives in **MongoDB**. The code is layered so logic is easy to find
and test:

```
Page/Screen  (app/…)               what the user sees
   │ calls
Server Action / API  (src/lib/actions, app/api)   handles a click/form
   │ calls
Service  (src/lib/services)        the "use case" steps for a feature
   │ uses
Domain   (src/lib/domain)          pure math + rules (scoring, validation) — no database
   │ and
Repository (src/lib/db)            the only place that talks to MongoDB
```

Rule of thumb: **the deeper the layer, the more reusable and the less it knows
about the web.** The `domain` layer is pure functions with no database calls,
which is why it can be unit-tested so thoroughly.

Every change that writes data is (a) validated with **Zod** schemas, (b)
permission-checked server-side via `requirePermission(...)`
([`src/lib/auth/permissions.ts`](./src/lib/auth/permissions.ts)), and (c)
recorded in the **audit log**.

Stack in one line: *Next.js 14 · TypeScript · MongoDB · Tailwind · NextAuth
(Auth.js v5) · Zod · TanStack Query · Recharts · Vitest/Playwright tests.*

---

## 9. "Check the workflows" — a hands-on verification checklist

This is the practical to-do your friend handed you. The app is already running
locally (see §10). Log in as `hr@caliber.com` and click through these. Note
anything that errors, looks wrong, or dead-ends.

**Framework is intact (setup phase)**
- [ ] `/framework` shows **8 areas**; drill in → sub-competencies → questions
      with options/scores.
- [ ] `/roles` shows the 4 roles; `/required-levels` shows a filled 45×4 matrix.
- [ ] `/employees` — add an employee, and try the CSV import.

**Run one campaign end-to-end (the core test)**
- [ ] `/campaigns` → **New Campaign** → pick participants + deadlines → it saves
      as **Draft**.
- [ ] **Launch** it → status flips to **Active**, and assessment records appear.
- [ ] Do a **self-assessment** as a participant (`/assessment` or a token link):
      answer questions, leave, come back (auto-save/resume works?), submit.
- [ ] Do a **manager rating** (`/team` → `/rate/[id]`): rate all 45 skills,
      submit. Confirm gaps + traffic lights now show.
- [ ] Move campaign to **calibration**; open `/campaigns/[id]/calibration` and
      confirm big self-vs-manager gaps are flagged; adjust one.
- [ ] **Lock** the campaign → results freeze; `/campaigns/[id]/heatmap` and
      `/results/[id]` render.

**Views & outputs**
- [ ] `/dashboard`, `/executive` charts render with the new data.
- [ ] `/reports` — export a CSV/PDF for the campaign.
- [ ] `/audit` — every action above shows up in the log.
- [ ] `/settings` — change a threshold and confirm traffic-light colors shift.

**Cross-cutting**
- [ ] Email: without SMTP configured, sends should *skip gracefully* (in-app
      notifications still appear) — confirm nothing crashes.
- [ ] Permissions: a non-HR role can't reach HR-only screens.

**Automated tests (quick confidence check):**
```bash
npm test            # unit tests (the scoring brain)
npm run test:e2e    # Playwright end-to-end (needs the app running)
```

---

## 10. How it's running right now (already set up)

The app is deployed on this machine:

- **URL:** http://localhost:3000
- **Login:** `hr@caliber.com` / `Admin@12345`
- **Database:** MongoDB **6.0** (portable) on `127.0.0.1:27017`, data in
  `../mongo-data`. *(MongoDB 7/8 don't run on this Windows version — see
  [`README.md`](./README.md) notes.)*

**To restart after a reboot:**
```powershell
# 1) start MongoDB
& "..\mongodb6\mongodb-win32-x86_64-windows-6.0.16\bin\mongod.exe" --config "..\mongod.cfg"
# 2) start the app (from this folder)
npm run start        # production build, http://localhost:3000
# or: npm run dev    # dev mode with hot reload
```

Useful scripts: `npm run seed` (reload framework), `npm run create-admin`
(make another admin), `npm run build` (production build).

---

## 11. What is deliberately NOT built (so you don't go looking)

These are out of scope for this version (possible "Phase 2"): AI development-plan
recommendations, certification-expiry tracking, mentor matching, 9-box talent
grid, succession planning, LMS/course hosting, mobile apps, and multiple
languages. If a stakeholder asks "where's the AI training suggestions?" — that's
intentionally not here yet.

---

## 12. Fast file map (where to look when something breaks)

| You want to change… | Look in… |
|---|---|
| The scoring math (gaps, colors, calibration) | `src/lib/domain/scoring/` |
| What a role is allowed to do | `src/lib/auth/permissions.ts` |
| A feature's steps (launch, lock, rate…) | `src/lib/services/*.service.ts` |
| Anything that touches the database | `src/lib/db/repositories/` |
| A screen's layout | `app/(role)/…/page.tsx` |
| Form/data validation rules | `src/lib/domain/validation/` |
| The seeded framework data | `src/data/framework-seed.json` |

---

*Generated as an onboarding aid. If anything here disagrees with
`01_PRD_Caliber.md`, the PRD wins on product behavior and `ARCHITECTURE.md` wins
on code structure.*
