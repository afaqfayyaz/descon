# Caliber — Workflow Map

Visual companion to [`CALIBER_GUIDE.md`](./CALIBER_GUIDE.md). Every flow below
was executed against the live local deployment on **2026-07-14** and passed
(32 unit tests, full live cycle, calibration + lock, 14 screens, CSV export,
6 Playwright e2e tests).

> These diagrams use Mermaid — they render automatically on GitHub and in
> VS Code's markdown preview (`Ctrl+Shift+V`).

---

## 1. The campaign lifecycle — the spine of everything

A **campaign** is one assessment round (e.g. "2026 H1 Assessment"). It is a
strict state machine: each transition is HR-triggered, one-way, and guarded —
the code refuses out-of-order moves (e.g. locking twice). Enforced in
[`campaign.service.ts`](./src/lib/services/campaign.service.ts).

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Draft : HR creates campaign
    Draft --> Active : Launch
    Active --> In_Calibration : Move to calibration
    In_Calibration --> Locked : Lock
    Locked --> Archived : Archive

    note right of Draft
        Pick participants + deadlines.
        Nothing sent yet — safe to edit.
    end note
    note right of Active
        One assessment record per employee.
        Emails + in-app notices go out.
        Self & manager sides being filled in.
    end note
    note right of In_Calibration
        HR reviews self-vs-manager outliers,
        adjusts ratings with a written reason.
    end note
    note right of Locked
        All results frozen & final.
        Reports, heatmaps, dashboards.
    end note
```

---

## 2. One full cycle, end to end

The master flow across all four roles. Phases 2 and 3 run in parallel for
hundreds of employees at once; everything after them is computed automatically.

```mermaid
flowchart TD
    subgraph P0["Phase 0 — Setup (once)"]
        A["HR builds the framework<br/>8 areas · 45 skills · 135 questions"] --> B["HR sets required levels<br/>per skill × role (180 cells)"]
        B --> C["HR imports employees<br/>+ reporting lines (CSV)"]
    end
    subgraph P1["Phase 1 — Launch"]
        D["HR creates campaign:<br/>participants + 3 deadlines"] --> E["Launch"]
        E --> F["System snapshots each employee's<br/>role, manager & job family"]
        F --> G["Assessment record created<br/>per employee · invites sent"]
    end
    subgraph P2["Phase 2 — Self-assessment (employee)"]
        H["Employee opens questionnaire<br/>(login or secure token link)"] --> I["Answers questions<br/>auto-saved, resume anytime"]
        I --> J["Submit → self level computed<br/>per skill (0–5)"]
    end
    subgraph P3["Phase 3 — Manager rating"]
        K["Manager sees pending list<br/>of direct reports"] --> L["Rates all 45 skills 1–5<br/>+ evidence notes"]
        L --> M["Submit → gaps, traffic lights,<br/>calibration flags, rollups computed"]
    end
    subgraph P4["Phase 4 — Calibration (HR)"]
        N["Review outliers<br/>(self vs manager > ±2)"] --> O["Adjust ratings with reason<br/>(original kept for audit)"]
    end
    subgraph P5["Phase 5 — Lock & report"]
        P["Lock campaign<br/>results frozen"] --> Q["Managers: team heatmap<br/>+ 1-on-1 conversations"]
        P --> R["HR: exports (CSV/PDF)<br/>+ assigns training"]
        P --> S["Executives: org dashboards<br/>divisions · designations · trends"]
    end
    C --> D
    G --> H
    G --> K
    J --> M
    M --> N
    O --> P
```

---

## 3. How a score becomes a color

The scoring pipeline is pure math in
[`src/lib/domain/scoring/`](./src/lib/domain/scoring/) — no database, fully
unit-tested. **The manager's rating is the official number**; self-assessment
exists only to surface disagreement.

```mermaid
flowchart LR
    ANS["Employee's answers<br/>(chosen options have<br/>hidden scores)"] --> SELF["Self level<br/>0–5 per skill"]
    MGR["Manager rating<br/>1–5 per skill"] --> GAP["Gap =<br/>Required − Manager"]
    REQ["Required level<br/>for the role"] --> GAP
    GAP --> TL["Traffic light<br/>per skill"]
    SELF --> DIFF["Difference =<br/>Self − Manager"]
    MGR --> DIFF
    DIFF --> FLAG["Calibration flag<br/>none / minor / major"]
    MGR --> AREA["Area rollup<br/>(average of skills)"]
    AREA --> OVR["Overall capability %<br/>= level ÷ 5 × 100"]
```

**Traffic lights** (keyed on gap = required − manager):

| Color | Status | Rule |
|---|---|---|
| 🟢 | Strong | gap ≤ 0 — at/above target |
| 🟡 | Developing | 0 < gap ≤ 1 |
| 🟠 | Needs focus | 1 < gap ≤ 2 |
| 🔴 | Critical | gap > 2 |

**Calibration flags** (keyed on |self − manager|): ≤ 1 aligned · ≤ 2 minor
outlier · > 2 **major outlier** (HR reviews these). Thresholds are
HR-configurable in Settings.

---

## 4. One assessment record, two halves

Each employee × campaign gets a single assessment document with two independent
sides. Either side can start first; results only exist once the manager side is
submitted.

```mermaid
flowchart LR
    subgraph SS["Self side (employee)"]
        s1["not_started"] --> s2["in_progress<br/>(auto-save)"] --> s3["submitted"]
    end
    subgraph MS["Manager side"]
        m1["not_started"] --> m2["in_progress"] --> m3["submitted"]
    end
    s3 --> R["Results computed:<br/>gaps · lights · flags · rollups"]
    m3 --> R
    R --> FIN["finalStatus: pending → finalized<br/>(when HR locks the campaign)"]
```

---

## 5. Who does what

| Role | Acts in phase | Main screens | Can never |
|---|---|---|---|
| **Employee** | 2 — self-assessment | `/assessment`, token link `/a/…` | See own scores or gaps |
| **Line manager** | 3 — rating · 5 — 1-on-1s | `/team`, `/rate/…` | See other teams; edit framework |
| **HR admin** | 0, 1, 4, 5 — runs the cycle | `/campaigns`, `/framework`, `/audit`… | — (full access, all audited) |
| **Executive** | 5 — consumes results | `/executive` | Edit anything; see individuals |

**Roles are additive** — a division head can be employee + manager + executive
at once and gets the union of permissions. Every state-changing action lands in
the immutable audit log (`/audit`).

---

## 6. Verification run — 2026-07-14

| Flow | How it was exercised | Result |
|---|---|---|
| Scoring math | `npm test` — 32 unit tests | ✓ pass |
| Launch → self → manager → scoring | `npm run cycle` — 14 live assessments | ✓ pass |
| Calibration → adjust → lock | `scripts/verify-lock.ts` — 450 results frozen | ✓ pass |
| Guard rails | Double-lock attempt rejected by state machine | ✓ pass |
| All 14 HR/manager/employee screens | Authenticated HTTP probe — every page 200 | ✓ pass |
| CSV export | Results export incl. calibration note round-trip | ✓ pass |
| Browser journey (login → dashboards → campaign build) | `npm run test:e2e` — 6 Playwright tests | ✓ pass |

Demo logins: `hr@caliber.app / Caliber@123` (demo org, populated dashboards) ·
`hr@caliber.com / Admin@12345` (clean admin). All demo employees:
`Caliber@123`.
