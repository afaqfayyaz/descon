# Product Requirements Document

## Caliber — Digital Employee Competency Assessment Platform

---

| | |
|---|---|
| **Document Type** | Product Requirements Document (PRD) |
| **Product Name** | Caliber |
| **Version** | 1.0 |
| **Status** | Draft — For Review |
| **Date** | May 2026 |
| **Author** | Afaq Fiaz, Senior Software Engineer |
| **Contact** | afaqfiaz2311@gmail.com · +92 322 7376346 |
| **Stakeholder** | Mr. Mehmood Ul Hassan, Caliber |
| **Build Target** | 12-week MVP |
| **Stack** | Next.js 14+ (App Router) · MongoDB · Single deployment |

---

## Document Purpose

This Product Requirements Document defines **what** Caliber is, **who** it serves, **how** it behaves, and **what success looks like**. It is the single source of truth for product scope and behavior.

It is paired with three companion documents:
- **Database Schema Document** — defines the data
- **Technical Architecture Document** — defines how the code is organized
- **Coding Standards & Conventions** — defines how the code is written

When something contradicts between documents, this PRD takes precedence on product behavior; the Architecture document takes precedence on technical implementation.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [User Personas & Roles](#3-user-personas--roles)
4. [The Competency Framework — Domain Model](#4-the-competency-framework--domain-model)
5. [Functional Requirements](#5-functional-requirements)
6. [User Journeys — End-to-End Flows](#6-user-journeys--end-to-end-flows)
7. [Screen Inventory & Specifications](#7-screen-inventory--specifications)
8. [Design System & Visual Language](#8-design-system--visual-language)
9. [Business Rules & Logic](#9-business-rules--logic)
10. [Notifications & Communications](#10-notifications--communications)
11. [Permissions & Access Control](#11-permissions--access-control)
12. [Edge Cases & Error Scenarios](#12-edge-cases--error-scenarios)
13. [Out of Scope](#13-out-of-scope)
14. [Success Criteria](#14-success-criteria)
15. [Glossary](#15-glossary)

---

## 1. Executive Summary

### 1.1 The Problem

Caliber currently manages employee competency assessment through Excel spreadsheets. This works at small scale but breaks down as the organization grows. The current process involves:

- **Manual data collection** across hundreds of employees, each with 45 sub-competencies
- **Manual gap calculation** for every employee, every assessment cycle
- **Manual aggregation** to produce division, designation, and organizational views
- **No real-time visibility** for leadership into workforce capability
- **No audit trail** for who changed what, when
- **Risk of inconsistent ratings** across managers due to lack of calibration
- **Time-consuming reporting** that takes weeks to compile

### 1.2 The Solution

Caliber is a web-based competency assessment platform that:

1. **Digitizes** the existing competency framework (8 areas, 45 sub-competencies, 135 scenario questions) Caliber already developed in Excel
2. **Automates** the assessment workflow — employee questionnaire, manager rating, gap analysis
3. **Visualizes** results through professional dashboards modeled on PetroSkills Caliber
4. **Empowers HR** to evolve the framework over time without developer intervention
5. **Provides leadership** with real-time, drill-down workforce capability insights

### 1.3 The Outcome

After deployment, Caliber will:

- Cut assessment cycle time from weeks to days
- Replace manual spreadsheet work with one-click reports
- Identify critical capability gaps in real-time across divisions
- Establish a single source of truth for workforce capability data
- Enable strategic workforce planning based on actual data, not estimates
- Scale the assessment process from hundreds to thousands of employees without proportional HR overhead

### 1.4 Build Approach

- **Solo developer** (Afaq Fiaz) delivering the full MVP
- **12-week timeline** from contract signing to production go-live
- **Next.js 14+** unified frontend and backend in a single deployable application
- **MongoDB** as the single data store
- **Single Docker container** deployment — one command to launch the entire platform

### 1.5 What's In the MVP

**Included:**
- Configurable competency framework (HR controls everything)
- Employee questionnaire experience
- Line Manager rating experience
- Gap analysis with traffic-light visualization
- Self vs Manager comparison and calibration flagging
- Dashboards for Manager, HR Admin, and Executive personas
- Heatmaps (employee, team, division, designation)
- Simple training list with manual assignment
- PDF and Excel report exports
- Full audit trail

**Explicitly NOT in MVP (Phase 2 candidates):**
- Auto-generated Individual Development Plans (IDP) with AI recommendations
- Certification expiry tracking and renewal workflows
- Mentor pairing algorithms
- Stretch assignment suggestions
- 9-box talent grid
- Succession planning module
- LMS integration (SCORM / xAPI)
- Mobile native applications
- Multi-language interface (English only at MVP)
- Multi-tenancy (single Caliber deployment only)

---

## 2. Product Vision & Strategy

### 2.1 Product Vision Statement

> Caliber is the system of record for "what skills do our people have, and what skills do they need?" — answered instantly, accurately, and visually, for every employee, every team, and every division.

### 2.2 Strategic Pillars

The product rests on four strategic pillars. Every feature decision must reinforce at least one of these.

#### Pillar 1: Framework First, Software Second

The platform exists to serve Caliber's competency framework — not to impose its own. The 8 areas, 45 sub-competencies, 135 questions, and required levels Caliber already developed are first-class configurable data. HR can extend or modify any of these without involving the developer.

#### Pillar 2: Calibration is a Feature

The system surfaces inconsistency between self-assessment and manager rating as a primary signal. Managers who systematically over-rate or under-rate are visible to HR. Calibration becomes a workflow, not an afterthought.

#### Pillar 3: Speed and Visual Clarity

Every dashboard answers a question in under 5 seconds of looking. Traffic-light colors carry universal meaning (🟢 strong, 🟡 developing, 🟠 needs focus, 🔴 critical). Heatmaps reveal patterns at a glance. Reports export with one click.

#### Pillar 4: Trust Through Transparency

Every action is auditable. Every score is traceable to the source data. Every report can be regenerated identically. HR can prove how any number was computed, to any auditor, at any time.

### 2.3 Non-Goals

To prevent scope creep, the following are **explicit non-goals** of Caliber:

- ❌ Performance management (KPIs, goal-setting, appraisals) — competency is not performance
- ❌ Compensation or payroll integration
- ❌ Recruitment / applicant tracking
- ❌ Learning Management (course delivery, video hosting) — we link to training, we do not host it
- ❌ AI-driven recommendations in MVP — kept for Phase 2 to ensure quality
- ❌ Social features (likes, comments, peer feedback walls) — this is not LinkedIn

### 2.4 Design Principles

1. **HR controls the framework, the developer never does.** No hardcoded competency areas, sub-competencies, questions, scores, or required levels. All are data.
2. **The Manager's rating is the source of truth for gap analysis.** Self-assessment exists only to surface calibration signals.
3. **The employee experience is intentionally narrow.** Employees see only what they need (questionnaire); they do not see scores, gaps, or comparisons in MVP.
4. **Every screen earns its place.** No screen exists unless a real user role has a real reason to see it.
5. **Bug-resistant over bug-fast.** Choices that prevent whole categories of bugs (TypeScript everywhere, Zod validation, schema enforcement) take priority over choices that make bugs easier to fix.

---

## 3. User Personas & Roles

The platform has **four distinct user personas**. Each has a specific role, scope, and set of permissions.

### 3.1 Persona 1 — The Employee

**Profile:**
- Any individual contributor or manager who is being assessed
- Logs in periodically when prompted (typically twice per year)
- Spends 30–45 minutes per assessment cycle on the platform
- Otherwise has minimal interaction with the system

**Goals:**
- Complete required assessments before the deadline
- Understand what's being asked of them
- Spend as little cognitive load as possible on the tool itself

**Pain Points (Current State):**
- Receives Excel files via email; loses them
- Cannot save progress mid-assessment
- Unsure if their submission was received

**Frustrations to Avoid:**
- Being shown their own gap scores or weaknesses on screen (handled via Manager 1-on-1s instead)
- Being compared to peers or shown rankings
- Having to chase down which Excel version is current

**Primary Actions:**
- Login (via SSO)
- View "you have an assessment due" notification
- Take the 135-question questionnaire
- Save and resume across multiple sittings
- Submit the assessment
- Receive confirmation

**What They Do NOT See in MVP:**
- Their own gap scores
- Traffic-light status
- Comparison with manager's rating
- Other employees' data
- Training recommendations (delivered through Manager conversations)

**Expected Volume:** ~500–1,500 active employees per cycle

---

### 3.2 Persona 2 — The Line Manager

**Profile:**
- Manages a team of 3–15 direct reports
- Conducts performance and development conversations
- Is themselves an Employee (gets assessed by their own manager)
- Logs in regularly during assessment cycles, occasionally otherwise

**Goals:**
- Rate each direct report fairly and consistently
- Understand their team's capability profile
- Identify which team members need development support
- Justify ratings with evidence when challenged

**Pain Points (Current State):**
- No visibility into how peers (other managers) are rating
- No way to compare self-assessments with their ratings
- Manual heatmap construction in Excel takes hours

**Frustrations to Avoid:**
- Re-rating the same competencies that haven't changed
- Cannot delegate during leave
- Mass-rating UI forcing one click per cell × 45 competencies × N team members

**Primary Actions:**
- Login (via SSO)
- View their team dashboard
- See list of pending validations
- Rate a single employee on 45 sub-competencies (1–5 scale)
- View the Self vs Manager comparison after both sides complete
- Drill into team heatmap
- View individual employee detail with gap analysis
- Assign training from the simple training list
- Export team report

**What They Do NOT See in MVP:**
- Calibration outlier reports (HR-only)
- Cross-division data (only their own team and reporting line)
- Other managers' ratings of other teams

**Expected Volume:** ~80–150 line managers in Caliber

---

### 3.3 Persona 3 — The HR Admin

**Profile:**
- Owns the competency framework
- Runs assessment cycles
- Configures the system
- Generates reports for leadership
- Heaviest user of the platform

**Goals:**
- Maintain an accurate, evolving competency framework
- Launch and monitor assessment campaigns
- Identify and resolve calibration issues
- Produce reports for executives on time
- Onboard new employees and roles without developer involvement

**Pain Points (Current State):**
- Excel framework files become unmanageable as they grow
- Calibration is impossible at scale — no way to spot outliers across hundreds of managers
- Reports take days to compile
- Audit trail does not exist — cannot prove ratings were not modified

**Frustrations to Avoid:**
- Needing the developer to add a new sub-competency
- No way to bulk-import employees
- Can't easily duplicate a campaign for the next cycle
- Reports that take a long time to generate

**Primary Actions:**
- Manage the entire competency framework (areas, sub-comps, questions, options, scores, required levels, job families, roles)
- Manage the employee directory (master data)
- Build the training catalog (simple CRUD list)
- Launch and monitor assessment campaigns
- Review calibration outliers
- Run calibration workshops to align manager ratings
- Finalize and lock results
- Generate and export reports
- Configure system settings
- Review the audit log

**What They Have UNIQUE Access To:**
- The full configuration UI for the framework
- Calibration workshop view
- Audit log
- All employee data (no division restriction)
- Bulk operations (import, export, reassignment)

**Expected Volume:** 2–5 HR Admins typically

---

### 3.4 Persona 4 — The Executive

**Profile:**
- Senior leadership: CEO, COO, Division Heads, HR Director
- Strategic decision-maker
- Logs in periodically (monthly or quarterly)
- Cares about patterns and trends, not individuals

**Goals:**
- Understand workforce capability at a glance
- Identify divisions or roles at risk
- Make strategic decisions on hiring, training investment, restructuring
- Brief the board with current capability data

**Pain Points (Current State):**
- Capability discussions happen with stale data
- Cannot drill into a specific weakness without asking HR to prepare a report
- No way to track improvement over time

**Frustrations to Avoid:**
- Having to ask HR for every chart
- Slow-loading reports
- Drowning in individual-employee detail when they only care about aggregates

**Primary Actions:**
- Login (via SSO)
- View organizational capability KPIs
- Drill into division heatmap
- Drill into designation heatmap
- Export PDF for board presentations

**What They Do NOT See in MVP:**
- Individual employee details (anonymized aggregates only, by default)
- Framework configuration UI
- Calibration workshop tools

**Expected Volume:** 5–15 executives

---

### 3.5 Role Hierarchy & Inheritance

The four personas represent **roles**, not necessarily distinct people. The same person may hold multiple roles:

```
Example: A Division Head is simultaneously:
  • An Employee (assessed by the CEO)
  • A Line Manager (rates their direct reports)
  • An Executive (sees org-wide dashboards for their division)
```

Permissions are **additive** — holding multiple roles grants the union of their permissions. The audit log records which role was active during each action.

### 3.6 Authentication & Identity

- Authentication is via **Single Sign-On (SSO)** integrated with Caliber's identity provider (Azure AD or equivalent)
- Local username/password is supported only as a fallback for HR Admins during initial setup
- Role assignment happens via HR Admin in the platform (not via Active Directory groups in MVP — kept simple)
- Sessions expire after 8 hours of inactivity
- All authentication events are logged

---

*[Document continues in next file — Sections 4 through 15]*

## 4. The Competency Framework — Domain Model

This section defines the **conceptual model** of the competency framework. It is the foundation of every feature, every screen, and every database schema. Understanding this section is mandatory before reading any other.

### 4.1 The Five-Level Hierarchy

The framework is a strict hierarchy with exactly five layers:

```
JOB FAMILY
   └─ COMPETENCY AREA
        └─ SUB-COMPETENCY
             └─ QUESTION
                  └─ OPTION (with score)
```

Each layer has clear, distinct semantics.

### 4.2 Layer 1 — Job Family

A **Job Family** is a top-level grouping of related roles that share a competency profile.

**Examples:**
- Project Management (the current focus)
- Construction Engineering
- Health, Safety & Environment
- Commercial / Procurement
- Information Technology

**Key Properties:**
- Each Job Family has its own set of Competency Areas
- An employee belongs to exactly one Job Family at a time
- Different Job Families can share Competency Areas, but each maintains its own required levels

**MVP Scope:** Caliber MVP launches with the Project Management job family fully configured (matching the supplied Excel files). The architecture supports unlimited additional Job Families to be added by HR Admin post-launch.

### 4.3 Layer 2 — Competency Area

A **Competency Area** is a broad skill category within a Job Family.

**Examples (PM Job Family — 8 areas):**
1. Root Cause Analysis & Risk Assessment
2. Stakeholder & Contract Management
3. Project Planning & Execution
4. Proposal Development & Internal Coordination
5. Resource Management & Budget Control
6. Digital PM & Technology Innovation
7. Operations & Sustainability Management
8. Professional Certifications

**Key Properties:**
- Areas are **labels**; they do not have their own scoring
- An Area's score is **derived** by averaging its child Sub-Competencies
- Each Area has a `sequence` number for display order
- Each Area has a `weight` (default 1.0) that can affect overall rollups if HR chooses to weight areas differently
- An Area can be **active** or **archived** — archived areas are not assessed but their historical data is preserved

### 4.4 Layer 3 — Sub-Competency

A **Sub-Competency** is the **fundamental unit of measurement**. All scoring happens at this layer.

**Examples (under Area 1):**
- 1.1 Root Cause & Risk Management Mastery
- 1.2 Strategic Risk & Failure Prevention
- 1.3 Integrated Risk & Impact Analysis
- 1.4 Proactive Risk & Operational Resilience
- 1.5 Executive Risk Strategy & Innovation

**Key Properties:**
- A Sub-Competency belongs to exactly one Competency Area
- Each Sub-Competency has a **code** (e.g., "1.1") for display
- Each Sub-Competency has a **name** and a **description**
- Each Sub-Competency has **behavioural indicators** (a description of what each rating level looks like)
- Each Sub-Competency has its own set of **Required Levels per Role** (the target value for each designation)
- A Sub-Competency can be **active** or **archived**

### 4.5 Layer 4 — Question

A **Question** is a scenario-based item used in the employee questionnaire. It tests skill at one Sub-Competency.

**Example (under Sub-Comp 1.1):**
> Q1: A major project deliverable is consistently late. What is your first step?

**Key Properties:**
- A Question belongs to exactly one Sub-Competency
- A Sub-Competency typically has 3 Questions, but **the system does not enforce this** — HR can add more or fewer
- Questions have a **sequence** number for display order
- Questions have **text** (the scenario)
- Questions have between 2 and 6 **Options** (typically 4)
- A Question can be **active** or **archived**

### 4.6 Layer 5 — Option

An **Option** is one of the multiple-choice answers to a Question.

**Example (Options for Q1):**
- A) Ask the team to work overtime to recover the delay → 1 point
- B) Log the delay in the risk register and notify the sponsor → 2 points
- C) Conduct a structured root cause analysis (5-Whys) → 3 points
- D) Redesign the project schedule with predictive indicators → 4 points

**Key Properties:**
- An Option belongs to exactly one Question
- Each Option has a **letter** (A, B, C, D, etc.) for display
- Each Option has **text** (the answer description)
- Each Option has a **score** — set by HR Admin, can be any integer typically 0–5
- Different Options can have the same score if HR decides
- The system does NOT enforce that scores follow a 1, 2, 3, 4 pattern — HR has full control

### 4.7 Roles & Required Levels

A **Role** (or Designation) defines a position within a Job Family.

**Examples (PM Job Family):**
- In-Charge / Deputy Manager (IC/DM)
- Manager
- Head
- Chief

**Key Properties:**
- A Role belongs to exactly one Job Family
- Roles have a `sequence` number for hierarchy display
- An Employee has exactly one Role at any given time

**Required Level** is the target value an Employee in a specific Role should achieve for a specific Sub-Competency.

**Example:**
> For Sub-Comp 1.1 "Root Cause & Risk Mastery":
>   - IC/DM requires Level 3
>   - Manager requires Level 4
>   - Head requires Level 5
>   - Chief requires Level 5

**Key Properties:**
- Required Levels are stored per (Sub-Competency × Role) combination
- Required Levels are integers from 1 to 5
- HR Admin can update Required Levels at any time
- When Required Levels change, the system clearly marks which assessment cycle used which version

### 4.8 The 1–5 Rating Scale

The Manager rates each Sub-Competency on a fixed 1–5 scale.

| Level | Label | Meaning |
|---|---|---|
| 1 | Amateur | Has limited knowledge; requires close supervision |
| 2 | Collaborator | Performs basic tasks with guidance |
| 3 | Enabler | Performs independently in standard situations |
| 4 | Driving Force | Performs advanced tasks; coaches others |
| 5 | Visionary | Sets standards; shapes the discipline |

**MVP:** This scale and these labels are fixed.
**Phase 2:** HR will be able to configure scale stages and labels.

### 4.9 Traffic Light System

After gap calculation, each Sub-Competency, Area, and Overall score gets a traffic-light status:

| Status | Symbol | Gap Value | Meaning |
|---|---|---|---|
| Strong | 🟢 | ≤ 0 | Meets or exceeds requirement |
| Developing | 🟡 | 0 < gap ≤ 1 | Small gap, on track |
| Needs Focus | 🟠 | 1 < gap ≤ 2 | Significant gap, requires attention |
| Critical | 🔴 | > 2 | Urgent intervention required |

**MVP:** These thresholds are configurable by HR Admin but ship with the defaults above.

### 4.10 Assessment Campaign

A **Campaign** is a scheduled assessment cycle that HR Admin launches.

**Key Properties:**
- Has a **name** (e.g., "2026 H1 Assessment")
- Has a **start date** and **deadline**
- Targets a **set of employees** (selected by HR)
- Includes both Self (questionnaire) and Manager (rating) sides
- Has a **status**: Draft → Active → Closed → Locked
- Captures a snapshot of the framework version used (so re-running historical reports always reproduces identical results)

### 4.11 Assessment

An **Assessment** is the participation of one employee in one campaign.

**Key Properties:**
- Linked to one Campaign and one Employee
- Has two parallel "sides":
  - **Self-side**: Employee's questionnaire responses
  - **Manager-side**: Manager's 1–5 ratings
- Each side has its own status (Not Started / In Progress / Submitted)
- Once both sides are submitted, the system computes scores and gaps

### 4.12 Diagram — Complete Domain Model

```
                            ┌─────────────────┐
                            │   JOB FAMILY    │
                            │  (e.g., PM)     │
                            └────────┬────────┘
                                     │ 1..*
                ┌────────────────────┴────────────────────┐
                │                                         │
        ┌───────▼────────┐                       ┌───────▼──────┐
        │ COMPETENCY     │                       │     ROLE     │
        │     AREA       │                       │ (Manager,    │
        │ (8 areas)      │                       │  Head, etc.) │
        └───────┬────────┘                       └──────────────┘
                │ 1..*                                   │
        ┌───────▼────────────┐                          │
        │  SUB-COMPETENCY    │◄─────────────────────────┘
        │  (45 sub-comps)    │      REQUIRED LEVEL
        │                    │      (one per sub-comp × role)
        └───────┬────────────┘
                │ 1..*
        ┌───────▼────────┐
        │   QUESTION     │
        │  (135 total)   │
        └───────┬────────┘
                │ 2..6
        ┌───────▼────────┐
        │    OPTION      │
        │  (with score)  │
        └────────────────┘

   ┌──────────────┐              ┌──────────────┐
   │   EMPLOYEE   │──────────────│  ASSESSMENT  │──────────► CAMPAIGN
   │  (in a role) │              │  (per cycle) │
   └──────────────┘              └──────┬───────┘
                                        │
                          ┌─────────────┴──────────────┐
                          │                            │
                    ┌─────▼──────┐              ┌──────▼─────┐
                    │ SELF SIDE  │              │ MGR SIDE   │
                    │  (135 Qs)  │              │ (45 ratings)│
                    └────────────┘              └────────────┘
```

---

## 5. Functional Requirements

This section enumerates every feature the platform must support. Requirements are grouped by **functional module**.

Each requirement has:
- A unique **ID** (e.g., `FR-FRM-001`)
- A **priority**: P0 (must have for MVP), P1 (should have), P2 (nice to have)
- A **description**
- **Acceptance criteria** (what "done" looks like)

---

### 5.1 Framework Management Module

The module HR uses to define the entire competency framework.

#### FR-FRM-001 — Manage Job Families (P0)
**Description:** HR Admin can create, edit, archive, and view Job Families.
**Acceptance Criteria:**
- Create form captures: name, description, status (active/archived)
- List view shows all Job Families with employee count per family
- Editing a Job Family does not affect historical assessment data
- Job Family cannot be deleted if any employees are assigned to it (must reassign first)

#### FR-FRM-002 — Manage Competency Areas (P0)
**Description:** HR Admin can create, edit, archive, and reorder Competency Areas within a Job Family.
**Acceptance Criteria:**
- Create form captures: name, description, sequence number, weight (default 1.0), parent Job Family
- Sequence number controls display order
- Weight affects overall rollup if non-1.0 — clearly labeled
- Cannot delete an Area that has Sub-Competencies (must move or delete children first)
- Archiving preserves historical data; new assessments skip archived Areas

#### FR-FRM-003 — Manage Sub-Competencies (P0)
**Description:** HR Admin can create, edit, archive, and reorder Sub-Competencies within an Area.
**Acceptance Criteria:**
- Create form captures: code (e.g., "1.1"), name, description, behavioural indicators per level (1–5), sequence, parent Area
- Behavioural indicators are optional but recommended
- Cannot delete a Sub-Competency that has Questions or Required Levels (must remove first)
- Archiving preserves historical data

#### FR-FRM-004 — Manage Questions (P0)
**Description:** HR Admin can create, edit, archive, and reorder Questions within a Sub-Competency.
**Acceptance Criteria:**
- Create form captures: question text (scenario), sequence, parent Sub-Competency, options
- A Question must have between 2 and 6 Options before it can be saved
- Question text supports basic formatting (paragraphs, bold)
- Editing question text mid-campaign triggers a warning ("This will not affect already-submitted answers")
- Archived questions do not appear in new assessments

#### FR-FRM-005 — Manage Options & Scores (P0)
**Description:** Within each Question, HR Admin can define Options A, B, C, etc., with a custom score per option.
**Acceptance Criteria:**
- Options are entered as letter + text + score
- Score is an integer (typically 0 to 5 but no hard limit)
- Letters are auto-assigned (A, B, C, ...) but HR can override
- HR can change scores at any time — change is captured in audit log
- Different options can have the same score (e.g., two "novice" answers both worth 1)

#### FR-FRM-006 — Manage Roles / Designations (P0)
**Description:** HR Admin can create, edit, archive, and reorder Roles within a Job Family.
**Acceptance Criteria:**
- Create form captures: name (e.g., "Manager"), sequence (for hierarchy), parent Job Family
- Cannot delete a Role with employees assigned (reassign first)

#### FR-FRM-007 — Set Required Levels (P0)
**Description:** HR Admin can set the Required Level (1–5) for each (Sub-Competency × Role) combination.
**Acceptance Criteria:**
- A bulk editing interface presents a matrix: Sub-Competencies as rows, Roles as columns
- HR can edit any cell inline
- Empty cells default to "Not Applicable" (excluded from gap analysis)
- Changes are versioned — a campaign uses the version active at campaign start

#### FR-FRM-008 — Framework Versioning (P0)
**Description:** Every change to the framework creates a new version, but historical campaigns reference the version they were launched with.
**Acceptance Criteria:**
- A campaign launched on May 1 with framework v3 always reports against v3, even if framework is later updated to v4
- HR can view diff between versions
- HR can roll back to a previous version (creates a new version that mirrors the old)

#### FR-FRM-009 — Import Framework from Excel (P1)
**Description:** HR Admin can import a complete framework from an Excel template.
**Acceptance Criteria:**
- A template file is downloadable from the system
- Upload validates structure before committing
- Validation errors are displayed clearly with row/column references
- Successful import creates a new framework version

---

### 5.2 Employee Directory & Master Data Module

#### FR-EMP-001 — Manage Employees (P0)
**Description:** HR Admin can create, edit, deactivate, and view Employees.
**Acceptance Criteria:**
- Employee record captures: name, employee ID, email, role, job family, division, department, location, manager (reference to another employee), active status
- Email is unique across the system
- An Employee can be deactivated but not deleted (historical data preserved)
- Employee can be assigned to one manager (their Line Manager)

#### FR-EMP-002 — Manage Organizational Structure (P0)
**Description:** HR Admin can manage Divisions and Departments as a flat or hierarchical structure.
**Acceptance Criteria:**
- Divisions and Departments are simple named entities at MVP
- Each Employee belongs to one Division and one Department
- Filtering by Division/Department works across all dashboards

#### FR-EMP-003 — Bulk Import Employees (P0)
**Description:** HR Admin can import employees in bulk via Excel.
**Acceptance Criteria:**
- Template file downloadable from system
- Upload validates each row; errors shown clearly
- Successful rows imported, failed rows reported back
- Duplicate detection by employee ID

#### FR-EMP-004 — Manager Assignment (P0)
**Description:** Every Employee must have a Line Manager assigned (or be flagged as having no manager).
**Acceptance Criteria:**
- Manager field is a reference to another Employee
- Circular reporting is prevented (A reports to B, B reports to A is blocked)
- "No Manager" employees show up in HR's "Unassigned" view

---

### 5.3 Training Catalog Module (Simplified)

#### FR-TRN-001 — Manage Training Activities (P0)
**Description:** HR Admin maintains a simple list of training activities (no auto-recommendation).
**Acceptance Criteria:**
- Each Training Activity has: name, type (course / workshop / certification / mentoring / stretch assignment), description, duration, link (optional URL), status
- Training Activities can be tagged with which Sub-Competencies they relate to (multi-select)
- Tags are informational only — used for filtering/searching, not auto-recommendation in MVP

#### FR-TRN-002 — Assign Training to Employee (P0)
**Description:** HR Admin or Line Manager can manually assign Training Activities to an Employee.
**Acceptance Criteria:**
- Assignment captures: employee, training, target completion date, status (assigned / in progress / completed / cancelled)
- Employee does NOT see this list in MVP (delivered via manager conversation)
- HR can see all assignments; Manager can see assignments for their team

---

### 5.4 Assessment Campaign Module

#### FR-CMP-001 — Create Campaign (P0)
**Description:** HR Admin creates a new assessment campaign.
**Acceptance Criteria:**
- Campaign captures: name, description, start date, deadline, target employees (selected by filters or individually), framework version snapshot
- Campaign starts in "Draft" status
- HR can preview the campaign before launching

#### FR-CMP-002 — Launch Campaign (P0)
**Description:** HR Admin launches a Draft campaign, transitioning it to Active.
**Acceptance Criteria:**
- Launch triggers email invitations to all targeted Employees and their Line Managers
- Once launched, the framework version is locked for this campaign
- Targeted employees/managers cannot be modified after launch (only added with restart)

#### FR-CMP-003 — Monitor Active Campaign (P0)
**Description:** HR Admin tracks campaign progress in real-time.
**Acceptance Criteria:**
- Dashboard shows: # invited, # self-side submitted, # manager-side submitted, # complete (both sides), # overdue
- Can drill into individual employees to see their status
- Can send reminders (bulk or individual)
- Can extend the deadline

#### FR-CMP-004 — Close Campaign (P0)
**Description:** HR Admin closes a campaign once enough responses are collected.
**Acceptance Criteria:**
- Closing locks out further submissions
- Incomplete assessments are flagged
- All computed scores are finalized

#### FR-CMP-005 — Lock Campaign (P0)
**Description:** HR Admin locks a closed campaign to prevent any further changes.
**Acceptance Criteria:**
- Locked campaigns cannot be edited at all
- All reports remain accessible
- Audit log shows who locked the campaign and when

---

### 5.5 Employee Assessment (Self-Side) Module

#### FR-SLF-001 — Employee Receives Invitation (P0)
**Description:** Employee receives an email when invited to an assessment.
**Acceptance Criteria:**
- Email arrives within 5 minutes of campaign launch
- Contains: campaign name, deadline, login link, estimated time
- Login link uses SSO

#### FR-SLF-002 — Employee Home Screen (P0)
**Description:** Employee logs in and sees a clean home screen with assessment status.
**Acceptance Criteria:**
- Shows: current assessment status, progress (%), days remaining
- Single primary action: "Start" / "Continue" / "Review & Submit"
- No other navigation distracting from the assessment

#### FR-SLF-003 — Take Questionnaire (P0)
**Description:** Employee answers questions one at a time or in groups by Sub-Competency.
**Acceptance Criteria:**
- Questions presented in sequence by Sub-Competency
- Progress bar shows X of 135 complete
- Each question shows: text, options (radio buttons), evidence textarea (optional)
- Single answer per question
- Cannot move forward without answering (or explicit "Skip")
- Can navigate backward to change earlier answers

#### FR-SLF-004 — Save & Resume (P0)
**Description:** Employee can leave the assessment and resume later without losing progress.
**Acceptance Criteria:**
- Every answer is auto-saved on selection
- Closing the browser does not lose data
- Returning to the assessment lands on the next unanswered question

#### FR-SLF-005 — Review Before Submit (P0)
**Description:** Employee can review all answers before final submission.
**Acceptance Criteria:**
- Review screen shows all 135 questions with selected answers
- Can edit any answer from review screen
- Single "Submit Final" button at the bottom (with confirmation modal)

#### FR-SLF-006 — Submit Assessment (P0)
**Description:** Employee finalizes their submission.
**Acceptance Criteria:**
- Confirmation modal requires explicit click
- After submit, assessment is locked (cannot be edited)
- Confirmation screen shown: "Thanks, you're done. Your manager will follow up."

---

### 5.6 Manager Rating Module

#### FR-MGR-001 — Manager Receives Invitation (P0)
**Description:** Manager receives an email when their team members are invited to a campaign.
**Acceptance Criteria:**
- One email per campaign (not per team member)
- Lists all team members they need to rate
- Login link uses SSO

#### FR-MGR-002 — Team Pending List (P0)
**Description:** Manager sees a list of all team members pending their rating.
**Acceptance Criteria:**
- List shows: name, role, days until deadline, status (Not started / In progress / Complete)
- Sortable by name, status, deadline
- Click any row to start/continue rating that person

#### FR-MGR-003 — Rate an Employee (P0)
**Description:** Manager rates one employee on all relevant Sub-Competencies.
**Acceptance Criteria:**
- Sub-Competencies grouped by Area
- For each Sub-Competency: name, description, behavioural indicators per level, 1–5 selector, optional comment/evidence
- Required Level for this employee's Role is clearly displayed for context
- Manager cannot see employee's self-assessment answers (prevents bias)
- Progress indicator: X of 45 rated

#### FR-MGR-004 — Save & Resume Rating (P0)
**Description:** Manager can pause and resume rating without losing data.
**Acceptance Criteria:**
- Each rating change is auto-saved
- Closing browser does not lose data

#### FR-MGR-005 — Submit Rating (P0)
**Description:** Manager finalizes their rating for one employee.
**Acceptance Criteria:**
- All Sub-Competencies must be rated (no skip)
- Confirmation modal before submission
- After submit, rating is locked unless HR reopens

#### FR-MGR-006 — Delegate Rating (P1)
**Description:** Manager on leave can delegate rating rights to another Manager.
**Acceptance Criteria:**
- Delegation has a start and end date
- Delegate receives the same access during the window
- Audit log captures the delegation

---

### 5.7 Scoring & Gap Analysis Module

#### FR-GAP-001 — Compute Self Level (P0)
**Description:** After Employee submits, the system computes Self Level for each Sub-Competency.
**Acceptance Criteria:**
- For each Sub-Competency: Self Level = (Σ option scores chosen / Σ max possible scores) × 5
- Result rounded to 2 decimal places
- Result range: 0.00 to 5.00

#### FR-GAP-002 — Capture Manager Level (P0)
**Description:** After Manager submits, the system stores Manager Level for each Sub-Competency.
**Acceptance Criteria:**
- Manager Level is the raw 1–5 rating
- Stored as integer (1, 2, 3, 4, or 5)

#### FR-GAP-003 — Compute Self vs Manager Difference (P0)
**Description:** System computes the difference for each Sub-Competency once both sides are submitted.
**Acceptance Criteria:**
- Difference = Self Level − Manager Level
- Stored as a decimal (e.g., -0.08, +1.50)

#### FR-GAP-004 — Flag Calibration Outliers (P0)
**Description:** System flags Sub-Competencies where Self and Manager ratings diverge significantly.
**Acceptance Criteria:**
- Difference > +2 or < −2 → Major outlier
- Difference > +1 or < −1 → Minor outlier
- Thresholds configurable by HR
- Outliers visible in HR dashboard

#### FR-GAP-005 — Compute Gap (P0)
**Description:** System computes the gap (Required − Manager Level) for each Sub-Competency.
**Acceptance Criteria:**
- Gap = Required Level (from employee's Role) − Manager Level
- Negative gap means employee exceeds requirement
- Gap is the basis for traffic-light coloring

#### FR-GAP-006 — Assign Traffic Light Status (P0)
**Description:** System assigns 🟢 / 🟡 / 🟠 / 🔴 status based on gap.
**Acceptance Criteria:**
- 🟢 Strong: gap ≤ 0
- 🟡 Developing: 0 < gap ≤ 1
- 🟠 Needs Focus: 1 < gap ≤ 2
- 🔴 Critical: gap > 2
- Thresholds configurable by HR

#### FR-GAP-007 — Roll Up to Area (P0)
**Description:** System computes Area-level scores as the average of child Sub-Competencies.
**Acceptance Criteria:**
- Area Manager Level = average of (Manager Level) across Sub-Competencies in the Area
- Area Required Level = average of (Required Level) across Sub-Competencies in the Area
- Area Gap = Area Required − Area Manager Level
- Area traffic light from the same thresholds

#### FR-GAP-008 — Roll Up to Overall (P0)
**Description:** System computes Overall Capability Score for the Employee.
**Acceptance Criteria:**
- Overall = weighted average of Area scores (weights from FR-FRM-002)
- Overall % Capability = (Overall Manager Level / 5) × 100
- Overall Gap = average of Area Gaps

#### FR-GAP-009 — Compute Aggregate Dashboards (P0)
**Description:** System computes aggregate scores for Team, Division, Designation, and Organization levels.
**Acceptance Criteria:**
- Team aggregate = average across direct reports
- Division aggregate = average across all employees in division
- Designation aggregate = average across all employees in role
- Organization aggregate = average across all employees

---

### 5.8 Calibration Workshop Module

#### FR-CAL-001 — View Calibration Outliers (P0)
**Description:** HR Admin sees a list of all flagged calibration outliers across the active campaign.
**Acceptance Criteria:**
- List sortable by difference size, employee, manager, division
- Each row shows: employee, sub-competency, self level, manager level, difference, flag severity
- Click any row to drill into details

#### FR-CAL-002 — Run Calibration Workshop (P1)
**Description:** HR can host an in-app calibration session showing a grid of all employees in a peer group.
**Acceptance Criteria:**
- Grid shows employees as rows, sub-competencies as columns, manager ratings in cells
- HR can adjust any rating with explanation (logged in audit)
- HR can approve all ratings in bulk
- Workshop session is a tracked entity (who attended, what was changed)

#### FR-CAL-003 — Lock Final Results (P0)
**Description:** After calibration, HR locks the campaign results.
**Acceptance Criteria:**
- Locking prevents further changes
- All dashboards and reports use locked data
- Audit log captures who locked and when

---

### 5.9 Dashboards Module

#### FR-DSH-001 — Manager Team Dashboard (P0)
**Description:** Line Manager sees their team's overall capability at a glance.
**Acceptance Criteria:**
- KPI cards: # team members, avg gap, # critical gaps, % complete in current cycle
- Team heatmap: rows = employees, columns = areas, cells = colored by traffic light
- Pending validations widget
- Recent activity log

#### FR-DSH-002 — Team Heatmap (P0)
**Description:** Visual matrix view of team capability.
**Acceptance Criteria:**
- Rows = employees, columns = Sub-Competencies (default) or Areas (toggle)
- Cell color = traffic light status
- Cell value = current Manager Level
- Click any cell drills to that employee's detail
- Export to PDF and Excel

#### FR-DSH-003 — Single Employee Detail (P0)
**Description:** Manager and HR can view detailed competency profile for one employee.
**Acceptance Criteria:**
- Header: name, role, division, assessment status
- Overall capability donut + KPIs
- Competency breakdown: list of all 45 Sub-Competencies with required, current, gap, status
- Self vs Manager comparison view (toggle)
- Proficiency bars by Area
- Next steps / recommended training (manually assigned)

#### FR-DSH-004 — HR Control Center (P0)
**Description:** HR Admin sees a comprehensive overview of all active activity.
**Acceptance Criteria:**
- Active campaigns: status, completion %, deadline
- Calibration alerts: # outliers requiring review
- KPI cards: total assessed, % critical org-wide, calibration outliers, overdue assessments
- Quick actions: launch campaign, export reports

#### FR-DSH-005 — Organizational Overview (Executive) (P0)
**Description:** Executive sees high-level organizational capability.
**Acceptance Criteria:**
- KPI cards: total employees assessed, overall % capability, % critical gaps, trend vs last cycle
- Slicer: filter by Division / Department / Job Family / Designation
- Top-5 strengths and Top-5 critical gaps org-wide
- Trend line: % capability over last 8 campaigns

#### FR-DSH-006 — Division Heatmap (P0)
**Description:** View competency areas × divisions as a colored matrix.
**Acceptance Criteria:**
- Rows = Divisions, columns = Competency Areas
- Cell = avg gap across all employees in that intersection
- Color = aggregate traffic light
- Click any cell drills into that division's employees

#### FR-DSH-007 — Designation Heatmap (P0)
**Description:** Same as Division Heatmap but by Designation (role).
**Acceptance Criteria:**
- Rows = Designations, columns = Competency Areas
- Same interaction pattern as Division Heatmap

---

### 5.10 Reporting Module

#### FR-RPT-001 — Standard Reports Library (P0)
**Description:** Pre-built report templates that HR can run on-demand.
**Acceptance Criteria:**
- Templates include:
  - Assessment Status by Position
  - Gap Analysis by Position
  - Skill Gaps Detail
  - Calibration Outliers
  - Team Roster with KPIs
  - Division Summary
  - Designation Summary
  - Overall Capability Snapshot
- Each report has parameters (campaign, division, role, etc.)
- Reports are generated as PDF and Excel

#### FR-RPT-002 — Custom Report Builder (P1)
**Description:** HR can build a custom report with selected columns, filters, and sorting.
**Acceptance Criteria:**
- Drag-and-drop column selection
- Filter builder
- Sort multiple columns
- Save as template for reuse
- Export to PDF and Excel

#### FR-RPT-003 — Scheduled Reports (P1)
**Description:** Reports can be scheduled to email recipients automatically.
**Acceptance Criteria:**
- Schedule by: daily, weekly, monthly
- Recipients are platform users (or external email addresses)
- Report attached as PDF to email

#### FR-RPT-004 — Export to BI Tools (P1)
**Description:** Read-only secured API endpoint for external BI tools.
**Acceptance Criteria:**
- API key authentication
- Endpoints return assessment data in JSON
- Documented in OpenAPI 3.0

---

### 5.11 System Administration Module

#### FR-SYS-001 — User Role Management (P0)
**Description:** HR Admin assigns roles to users.
**Acceptance Criteria:**
- Users can have one or more roles (Employee, Manager, HR Admin, Executive)
- Role assignments take effect immediately
- All changes logged

#### FR-SYS-002 — System Settings (P0)
**Description:** HR Admin configures global system settings.
**Acceptance Criteria:**
- Settings include: gap thresholds, calibration thresholds, SLA defaults, branding, email templates
- All settings are versioned

#### FR-SYS-003 — Audit Log (P0)
**Description:** All actions are logged to an immutable audit trail.
**Acceptance Criteria:**
- Captures: who, what, when, before-value, after-value, IP address
- Searchable by user, date range, action type
- Exportable to CSV
- Cannot be edited or deleted

#### FR-SYS-004 — Email Template Management (P1)
**Description:** HR can customize email notification templates.
**Acceptance Criteria:**
- Templates support variables (employee name, deadline, etc.)
- Preview before saving
- Per-event templates (invitation, reminder, completion, etc.)

---

*[Document continues — Sections 6 through 15 in part 3]*

## 6. User Journeys — End-to-End Flows

This section maps the complete flow each persona experiences. These are the **canonical journeys** — every screen and every feature must trace back to enabling one of these flows.

### 6.1 Journey 1 — The Complete Assessment Cycle (Master Flow)

```
─────────────────────────────────────────────────────────────────────
PHASE 0 — Setup (one-time, when platform first launches)
─────────────────────────────────────────────────────────────────────
HR Admin:
  1. Logs in
  2. Configures Job Family (Project Management)
  3. Creates 8 Competency Areas
  4. Creates 45 Sub-Competencies under those areas
  5. Creates 135 Questions with options and scores
  6. Defines Roles (IC/DM, Manager, Head, Chief)
  7. Sets Required Levels per (Sub-Comp × Role) — 180 cells
  8. Imports employee directory (CSV upload)
  9. Builds training catalog (CRUD list)
  10. Configures system settings (thresholds, branding)

─────────────────────────────────────────────────────────────────────
PHASE 1 — Campaign Launch (each cycle)
─────────────────────────────────────────────────────────────────────
HR Admin:
  1. Navigates to "Campaigns"
  2. Clicks "New Campaign"
  3. Names it ("2026 H1 Assessment")
  4. Selects target employees (filter by Division/Role or pick individually)
  5. Sets deadline
  6. Previews
  7. Clicks "Launch"

System:
  8. Snapshot framework version
  9. Create Assessment records for each employee
  10. Send invitation emails to employees AND their managers

─────────────────────────────────────────────────────────────────────
PHASE 2 — Self Assessment (parallel for all employees)
─────────────────────────────────────────────────────────────────────
Employee:
  1. Receives email
  2. Clicks link → SSO login
  3. Lands on home screen
  4. Clicks "Start Assessment"
  5. Reads brief instructions
  6. Answers questions one by one (auto-save)
  7. Can leave and resume any time
  8. Reviews answers
  9. Submits

System:
  10. Compute Self Level for each Sub-Competency
  11. Mark self-side as Submitted

─────────────────────────────────────────────────────────────────────
PHASE 3 — Manager Rating (parallel for all managers)
─────────────────────────────────────────────────────────────────────
Manager:
  1. Receives email listing team members to rate
  2. Logs in
  3. Sees team pending list
  4. Picks a team member
  5. Rates all 45 Sub-Competencies (1–5 scale)
  6. Adds evidence notes where useful
  7. Submits
  8. Repeats for next team member

System:
  9. Compute Self vs Manager Difference
  10. Compute Gap (Required − Manager Level)
  11. Assign Traffic Light
  12. Flag calibration outliers
  13. Roll up to Area and Overall

─────────────────────────────────────────────────────────────────────
PHASE 4 — Calibration (HR-led)
─────────────────────────────────────────────────────────────────────
HR Admin:
  1. Reviews "Calibration Outliers" dashboard
  2. Identifies major differences (>+/-2)
  3. Hosts calibration workshop (in-app)
  4. Adjusts ratings with explanations
  5. Finalizes results

─────────────────────────────────────────────────────────────────────
PHASE 5 — Lock & Report (HR-led)
─────────────────────────────────────────────────────────────────────
HR Admin:
  1. Locks the campaign
  2. Generates standard reports
  3. Shares dashboards with executives
  4. Assigns training to employees with gaps

Manager:
  5. Reviews team heatmap
  6. Has 1-on-1 with each team member (off-platform)
  7. Discusses gaps and training plan

Executive:
  8. Views org capability dashboard
  9. Drills into divisions / designations
  10. Makes strategic decisions
```

**Total cycle duration:** Typically 4–6 weeks from launch to lock, depending on Caliber's pace.

### 6.2 Journey 2 — Employee Detailed Flow

```
EMPLOYEE PERSPECTIVE
─────────────────────────────────────────────────

DAY 1 — Email received
─────────────────────────
  "Hi Ahmed,
   Your H1 2026 competency assessment is due by 15 July.
   Estimated time: 45 minutes (can save & resume).
   [Start Assessment]"
   ↓

DAY 1 — Click link, SSO login
─────────────────────────
  Lands on EMPLOYEE HOME
  ┌──────────────────────────────────┐
  │ Welcome, Ahmed                    │
  │                                   │
  │ Pending: 2026 H1 Assessment       │
  │ Due in 14 days                    │
  │ Estimated time: 45 minutes        │
  │                                   │
  │ Status: Not Started               │
  │                                   │
  │      [Start Assessment ▶]         │
  └──────────────────────────────────┘
   ↓

DAY 1 — Reads brief instructions
─────────────────────────
  ┌──────────────────────────────────┐
  │ Before You Begin                 │
  │ • You'll see 135 scenario        │
  │   questions across 8 areas       │
  │ • Pick the answer that best      │
  │   reflects your approach         │
  │ • You can save and resume        │
  │   anytime                        │
  │ • Submission is final            │
  │                                   │
  │  [Cancel]    [I Understand]      │
  └──────────────────────────────────┘
   ↓

DAY 1 — Takes 50 questions, saves
─────────────────────────
  Progress: 50 / 135
  Time spent: 18 minutes
  Closes browser
   ↓

DAY 3 — Returns, resumes
─────────────────────────
  Logs in → "Continue Assessment"
  Lands on Question 51
  Completes another 60 questions
  Saves & closes
   ↓

DAY 5 — Returns, finishes
─────────────────────────
  Completes remaining 25 questions
  Reaches review screen
   ↓

DAY 5 — Reviews & Submits
─────────────────────────
  REVIEW SCREEN
  Shows all 135 Q&A with edit links
  Spends 8 minutes reviewing/changing
   ↓
  Clicks [Submit Final]
   ↓
  Confirmation modal
  Clicks [Yes, Submit]
   ↓
  CONFIRMATION SCREEN
  ┌──────────────────────────────────┐
  │       ✓ Submitted Successfully    │
  │                                   │
  │ Thank you, Ahmed!                 │
  │ Your manager will be in touch    │
  │ once both sides complete.        │
  │                                   │
  │           [Return Home]           │
  └──────────────────────────────────┘
```

### 6.3 Journey 3 — Line Manager Detailed Flow

```
LINE MANAGER PERSPECTIVE
─────────────────────────────────────────────────

DAY 1 — Email received
─────────────────────────
  "Hi Maria,
   You have 8 team members to rate for H1 2026.
   Estimated time: ~20 min per person.
   Deadline: 25 July.
   [Open Manager Dashboard]"
   ↓

DAY 1 — Click link, SSO login
─────────────────────────
  Lands on MANAGER DASHBOARD
  ┌─────────────────────────────────────────────┐
  │ My Team — 2026 H1 Cycle                     │
  │                                             │
  │ KPI: 0/8 ratings complete · 14 days left   │
  │                                             │
  │ PENDING RATINGS                             │
  │ ┌─────────────────────────────────────┐    │
  │ │ Ahmed Raza      Manager  · 14 days  │    │
  │ │ Sara Khan       IC/DM    · 14 days  │    │
  │ │ Bilal Ahmed     Manager  · 14 days  │    │
  │ │ ... (5 more)                         │    │
  │ └─────────────────────────────────────┘    │
  │                                             │
  │ TEAM HEATMAP (last cycle reference)         │
  │ [Visual heatmap of previous results]        │
  └─────────────────────────────────────────────┘
   ↓

DAY 2 — Starts rating Ahmed
─────────────────────────
  Clicks "Ahmed Raza" → RATE EMPLOYEE screen

  ┌─────────────────────────────────────────────┐
  │ Rating Ahmed Raza (Manager, EPC Division)   │
  │                                             │
  │ Progress: 0 / 45                            │
  │                                             │
  │ AREA 1: Root Cause Analysis & Risk          │
  │ ─────────────────────────────                │
  │ 1.1 Root Cause & Risk Management Mastery    │
  │   Required Level for Manager: 4             │
  │                                             │
  │   Rate Ahmed: ○1 ○2 ●3 ○4 ○5                │
  │                                             │
  │   Evidence (optional):                      │
  │   [_______________________________]         │
  │                                             │
  │ 1.2 Strategic Risk & Failure Prevention     │
  │   ...                                       │
  └─────────────────────────────────────────────┘
   ↓

  Rates all 45 sub-competencies (auto-saves)
   ↓
  Clicks [Submit Rating for Ahmed]
   ↓
  Confirmation modal → confirms
   ↓
  Returns to dashboard. Ahmed marked ✓
   ↓

DAY 3–5 — Rates remaining 7 team members
─────────────────────────
  Repeat same flow for each
  Spreads over multiple days
   ↓

POST-CALIBRATION (after HR closes campaign)
─────────────────────────
  Logs in, sees TEAM HEATMAP now populated
  ┌─────────────────────────────────────────────┐
  │ TEAM HEATMAP — 2026 H1 (LOCKED)             │
  │                                             │
  │           Area1 Area2 Area3 ... Area8       │
  │ Ahmed     🟡    🟢    🟠    ... 🟢          │
  │ Sara      🟢    🟢    🟢    ... 🟡          │
  │ Bilal     🟠    🟠    🔴    ... 🟠          │
  │ ...                                          │
  │                                             │
  │ Click any cell to drill in.                 │
  └─────────────────────────────────────────────┘
   ↓

  Clicks Bilal's row → BILAL'S DETAIL
   ↓
  Reviews gaps, sees suggested training (from HR list)
  Schedules 1-on-1 with Bilal
   ↓
  In 1-on-1, discusses gaps and assigns training
  Assignment recorded in system
```

### 6.4 Journey 4 — HR Admin Detailed Flow

```
HR ADMIN PERSPECTIVE
─────────────────────────────────────────────────

PHASE A — Setup (one-time at platform launch)
─────────────────────────

  Step 1: FRAMEWORK MANAGER
  ─────────────────────────
  Navigate to "Framework"
  Create Job Family: "Project Management"
   ↓
  Inside PM family, add 8 Areas:
    1. Root Cause Analysis & Risk Assessment
    2. Stakeholder & Contract Management
    ...
   ↓
  Inside each Area, add Sub-Competencies (45 total)
   ↓
  Inside each Sub-Comp, add Questions (135 total)
    For each question, define options A/B/C/D + scores
   ↓

  Step 2: ROLES & REQUIRED LEVELS
  ─────────────────────────
  Define 4 Roles: IC/DM, Manager, Head, Chief
   ↓
  Open Required Levels matrix (45 rows × 4 cols)
  Enter required value for each cell (180 entries)
   ↓

  Step 3: EMPLOYEE DIRECTORY
  ─────────────────────────
  Download Excel template
  Fill with all employees (name, ID, role, manager, division)
  Upload
   ↓
  System validates, imports
  Errors shown clearly if any
   ↓

  Step 4: TRAINING CATALOG
  ─────────────────────────
  Create training activities
  Tag each with relevant sub-competencies
   ↓

PHASE B — Launch a Campaign
─────────────────────────

  Step 1: CREATE CAMPAIGN
  ─────────────────────────
  Navigate to "Campaigns" → "New"
  Name: "2026 H1 Assessment"
  Deadline: 15 August 2026
  Target: All PM employees (filter applied)
   ↓
  Preview: 280 employees, 45 managers
   ↓
  Launch
   ↓

  System sends 325 emails (280 employees + 45 managers)

  Step 2: MONITOR
  ─────────────────────────
  Daily check on Active Campaigns dashboard
  KPI: 180/280 self-side done, 22/45 manager-side done, 12 days left
   ↓
  Sees 5 employees haven't even started
  Sends targeted reminder
   ↓
  Day 14: 268/280 self, 41/45 manager done
  Extends deadline 3 days for stragglers
   ↓
  Day 17: 278/280 self, 45/45 manager done
  Closes 2 incomplete with note
   ↓

PHASE C — Calibration
─────────────────────────

  Open "Calibration Outliers" view
  See list of 23 sub-comp ratings flagged as major outliers
   ↓
  Filter by manager: which managers have most outliers?
  Bilal (manager Khan) has 8 outliers — Khan systematically over-rates
   ↓
  Schedule calibration call with Khan
  Reviews Bilal's ratings with him in a call
  Adjusts 6 of the 8 ratings with notes
   ↓
  Repeat for other flagged managers
   ↓

PHASE D — Lock & Report
─────────────────────────

  Click "Lock Campaign"
  Confirmation → confirmed
   ↓
  All data is now final
   ↓
  Generate reports:
    - Org capability snapshot → PDF for CEO
    - Division summary → PDF per Division Head
    - Skill gaps report → Excel for L&D team
   ↓
  Send emails with reports attached
   ↓
  Update dashboards (auto-refresh)
```

### 6.5 Journey 5 — Executive Detailed Flow

```
EXECUTIVE PERSPECTIVE (e.g., COO)
─────────────────────────────────────────────────

QUARTERLY REVIEW (logs in monthly or as needed)
─────────────────────────

  Logs in (SSO)
   ↓
  Lands on EXECUTIVE OVERVIEW
  ┌─────────────────────────────────────────────┐
  │ Caliber Workforce Capability                 │
  │                                             │
  │ KPI CARDS                                   │
  │ • 487 employees assessed                    │
  │ • Overall capability: 72% ▲4%               │
  │ • Critical gaps: 18% (84 employees)         │
  │ • Trend: Improving since H2 2025            │
  │                                             │
  │ SLICERS: Division ▼  Role ▼  Job Family ▼   │
  │                                             │
  │ TOP 5 STRENGTHS:                            │
  │ • Cross-Functional Project Leadership       │
  │ • Communication Excellence                  │
  │ ...                                         │
  │                                             │
  │ TOP 5 CRITICAL GAPS:                        │
  │ • AI-Driven Digital Efficiency  (🔴 26%)    │
  │ • Strategic Risk & Prevention   (🔴 23%)    │
  │ ...                                         │
  └─────────────────────────────────────────────┘
   ↓

  Concern: "Why so many digital PM gaps?"
  Clicks "Division Heatmap"
   ↓
  DIVISION HEATMAP
  ┌─────────────────────────────────────────────┐
  │              Area1 Area2 ... Area6  ... Area8│
  │ EPC          🟢    🟡   ... 🔴    ... 🟢    │
  │ ISD          🟡    🟢   ... 🔴    ... 🟡    │
  │ Construction 🟢    🟡   ... 🟠    ... 🟡    │
  │ Corporate    🟢    🟢   ... 🟠    ... 🟢    │
  └─────────────────────────────────────────────┘
   ↓

  Sees: EPC and ISD have CRITICAL digital gaps
  Clicks EPC × Area6 cell
   ↓
  EPC DIGITAL PM DETAIL
  ┌─────────────────────────────────────────────┐
  │ EPC × Digital PM & Technology Innovation    │
  │                                             │
  │ 145 employees affected                      │
  │ Avg gap: 2.4 (CRITICAL)                     │
  │                                             │
  │ Worst sub-competencies:                     │
  │ • 6.2 AI-Driven Efficiency: gap 2.8         │
  │ • 6.1 PM System Optimization: gap 2.3       │
  │                                             │
  │ [Export to PDF]                             │
  └─────────────────────────────────────────────┘
   ↓

  Exports PDF
  Brings to next board meeting
  Decision: invest in digital upskilling program for EPC
```

---

## 7. Screen Inventory & Specifications

### 7.1 Complete Screen List (25 Screens for MVP)

| # | Screen | Persona | Priority |
|---|---|---|---|
| **Shared (5)** |
| 1 | Login / SSO redirect | All | P0 |
| 2 | Logout | All | P0 |
| 3 | 404 / Error pages | All | P0 |
| 4 | Notification center | All | P0 |
| 5 | Help / FAQ | All | P1 |
| **Employee (3)** |
| 6 | Employee home (assessment status) | Employee | P0 |
| 7 | Take questionnaire | Employee | P0 |
| 8 | Submitted confirmation | Employee | P0 |
| **Line Manager (5)** |
| 9 | Manager team dashboard | Manager | P0 |
| 10 | Pending validations queue | Manager | P0 |
| 11 | Rate an employee | Manager | P0 |
| 12 | Team heatmap | Manager | P0 |
| 13 | Single employee detail | Manager + HR | P0 |
| **HR Admin (9)** |
| 14 | HR control center | HR | P0 |
| 15 | Framework manager (tree view) | HR | P0 |
| 16 | Question bank manager | HR | P0 |
| 17 | Roles & required levels matrix | HR | P0 |
| 18 | Employee directory | HR | P0 |
| 19 | Campaign builder | HR | P0 |
| 20 | Active campaigns monitor | HR | P0 |
| 21 | Calibration workshop | HR | P0 |
| 22 | Training catalog + assignments | HR | P0 |
| 23 | Reports library | HR | P0 |
| **Executive (3)** |
| 24 | Org capability overview | Executive | P0 |
| 25 | Division heatmap | Executive | P0 |
| 26 | Designation heatmap | Executive | P0 |

### 7.2 Screen Specification Format

Each screen specification (in companion documents) follows this template:

```
SCREEN: [Name]
PERSONA: [Who sees this]
PURPOSE: [Why this screen exists in one sentence]
ENTRY POINTS: [How users get here]
EXIT POINTS: [Where users go from here]

LAYOUT:
  - Header area
  - Main content area
  - Sidebar (if any)
  - Footer

COMPONENTS USED: [From design system]

DATA SHOWN: [What's on the screen]

INTERACTIONS:
  - Action 1: result
  - Action 2: result

STATE VARIATIONS:
  - Empty state
  - Loading state
  - Error state
  - Filled state

EDGE CASES: [Specific edge cases to handle]
```

Detailed specifications for all 25 screens are maintained in a separate "Screen Specifications" addendum to this PRD.

### 7.3 Reference Screen — Employee Detail View

**(Already designed — see existing HTML mockup `01_employee_dashboard.html`.)**

This is the **canonical reference screen** that establishes the visual language for the entire platform. All other screens use the same:
- Sidebar navigation pattern
- Top bar with search + notifications + user chip
- KPI card layout
- Card-based content sections
- Color coding system
- Typography scale

Note: this mockup was originally labeled "Employee Dashboard" but in the final scope it represents the **Manager's view of an Employee** (Screen #13 above), since Employees do not see scores/gaps in MVP.

---

## 8. Design System & Visual Language

### 8.1 Brand & Aesthetic

- **Direction:** Modern minimal — inspired by Linear, Notion, Vercel
- **Tone:** Professional but warm; data-dense without being overwhelming
- **Reference:** Mockup file `01_employee_dashboard.html` defines the canonical look

### 8.2 Color Tokens

#### Primary
- `--primary` `#16305C` — Brand teal, used for CTAs, links, active states
- `--primary-hover` `#102544` — Hover state
- `--primary-light` `#EAF0FB` — Backgrounds for active nav items, hover states
- `--primary-bg` `#F0FDFA` — Lightest tint for subtle backgrounds

#### Neutrals
- `--bg` `#FAFAFA` — Page background
- `--surface` `#FFFFFF` — Card backgrounds
- `--border` `#E5E7EB` — Default borders
- `--border-strong` `#D1D5DB` — Emphasized borders
- `--text-primary` `#0F172A` — Headings, primary content
- `--text-secondary` `#475569` — Body text
- `--text-tertiary` `#94A3B8` — Hints, captions

#### Semantic
- `--success` `#10B981` (Strong) — Green
- `--warning` `#F59E0B` (Developing) — Amber
- `--focus` `#F97316` (Needs Focus) — Orange
- `--danger` `#EF4444` (Critical) — Red
- `--info` `#3B82F6` — Informational blue

### 8.3 Typography

- **Font:** Inter (Google Fonts)
- **Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Sizes:**
  - `12px` Caption / hints
  - `13px` Small body
  - `14px` Default body
  - `16px` Emphasized body
  - `20px` H4
  - `24px` H3
  - `28px` H2 / KPI numbers
  - `32px` Donut center values
  - `40px` Page title (rare)
- **Line height:** 1.5 for body, 1.2 for headings
- **Letter spacing:** -0.01em for headings, 0 for body

### 8.4 Spacing

Use a `4px` base scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

- Component internal padding: 12–20px
- Card padding: 20–24px
- Section gap: 20–24px
- Page margin: 32px

### 8.5 Border Radius

- `--radius-sm` `6px` — Small elements (badges, small buttons)
- `--radius-md` `10px` — Standard (buttons, inputs)
- `--radius-lg` `14px` — Cards, large containers
- `--radius-full` `9999px` — Pills, avatars

### 8.6 Shadows

- `--shadow-sm` — Subtle, for hover states
- `--shadow-md` — Cards lifting on hover
- No heavy shadows; rely on borders for separation

### 8.7 Component Library

Components to be built once and reused across all 25 screens:

#### Layout (5)
- `AppShell` — top-level wrapper
- `TopNav` — top bar with search, notifications, user chip
- `SideNav` — left sidebar with role-based menu
- `PageHeader` — title + subtitle + actions row
- `EmptyState` — empty data placeholder

#### Inputs (6)
- `Button` (variants: primary, secondary, ghost, danger)
- `Input`, `Textarea`, `Select`, `RadioGroup`, `Checkbox`
- `DatePicker`
- `FileUpload`
- `SearchBox`

#### Display (6)
- `Card` (with variants for KPI, content, callout)
- `Badge` (with semantic color variants)
- `Avatar` (with initials fallback)
- `ProgressBar`
- `TrafficLight` (the gap indicator)
- `KpiCard` (number + delta + label)

#### Data (5)
- `DataTable` (sortable, filterable, paginated)
- `Heatmap` (responsive cell grid)
- `DonutChart`
- `BarChart`
- `ProficiencyBar` (target marker bar)

#### Overlays (5)
- `Modal`, `Drawer`, `Toast`, `ConfirmDialog`, `LoadingSpinner`

#### Domain-Specific (4)
- `CompetencyTree` (collapsible tree for framework view)
- `QuestionCard` (one question in the questionnaire)
- `GapBadge` (traffic light + value)
- `AssessmentProgress` (X of 135 visualization)

**Total: ~31 reusable components.** Built in Week 2 of the build; every screen after that is composition.

---

## 9. Business Rules & Logic

### 9.1 Scoring Formulas

#### Self Level Calculation
For each Sub-Competency:
```
Self Level = (Σ scores of selected options / Σ max scores possible) × 5
```

Examples:
- 3 questions, max scores [4, 4, 4], selected [3, 2, 3] → Self Level = (8/12) × 5 = 3.33
- 3 questions, max scores [5, 4, 4], selected [4, 3, 3] → Self Level = (10/13) × 5 = 3.85
- 2 questions only, max scores [4, 4], selected [4, 2] → Self Level = (6/8) × 5 = 3.75

#### Manager Level Storage
Manager Level is stored as the raw integer 1–5; no transformation needed.

#### Difference
```
Difference = Self Level − Manager Level
```

#### Gap
```
Gap = Required Level (from employee's role) − Manager Level
```

#### Area-Level Score
```
Area Manager Level = average of (Manager Level) over all Sub-Comps in Area
Area Gap = Area Required Level − Area Manager Level
```

#### Overall Score
```
Overall Manager Level = Σ (Area Score × Area Weight) / Σ Area Weights
Overall Capability % = (Overall Manager Level / 5) × 100
```

### 9.2 Status Transitions

#### Campaign States
```
DRAFT → ACTIVE → CLOSED → LOCKED
  (can't go backward except DRAFT→DRAFT)
```

- **DRAFT**: HR can edit anything
- **ACTIVE**: Invitations sent, employees and managers responding; HR cannot edit framework changes that affect this campaign
- **CLOSED**: No more submissions allowed; calibration phase
- **LOCKED**: Final, immutable; all reports are based on this

#### Assessment States (per employee per campaign)
```
Self side:    NOT_STARTED → IN_PROGRESS → SUBMITTED
Manager side: NOT_STARTED → IN_PROGRESS → SUBMITTED

Overall:      INCOMPLETE (either side pending) → COMPLETE (both submitted)
```

### 9.3 Calibration Rules

#### Outlier Definitions (Defaults — Configurable)
- |Difference| > 2 → Major Outlier
- |Difference| > 1 → Minor Outlier
- |Difference| ≤ 1 → Aligned

#### Bulk Manager Pattern Detection
A manager who has > 30% of their team's ratings as outliers is flagged for special attention by HR.

### 9.4 Validation Rules

#### Framework
- Question must have ≥ 2 options
- Option score must be 0 or positive integer
- Required Level must be 1–5
- Sub-Competency code must be unique within an Area

#### Employees
- Email must be unique
- Employee ID must be unique
- A Manager reference must point to an active employee
- Circular reporting blocked

#### Assessments
- Cannot submit if any required question is unanswered
- Cannot submit if any required rating is missing
- Manager cannot rate themselves (system blocks)

### 9.5 Time & Date Rules

- All timestamps stored in UTC
- Displayed in user's local timezone (Pakistan Standard Time default)
- Deadlines end at 23:59:59 local time on the deadline date
- Audit log entries include both UTC timestamp and IP

---

## 10. Notifications & Communications

### 10.1 Email Notifications (MVP)

| Trigger | Recipient | Subject | Content Summary |
|---|---|---|---|
| Campaign launched (employee invited) | Employee | "Your competency assessment is due" | Campaign name, deadline, login link |
| Campaign launched (manager invited) | Manager | "Team competency assessments due" | List of team members, deadline, login link |
| Reminder — 7 days before deadline | Both | "Assessment due in 7 days" | Status, remaining work |
| Reminder — 1 day before deadline | Both | "Final reminder — due tomorrow" | Status, link |
| Self side submitted | Manager | "[Employee] has submitted their self-assessment" | Status update |
| Both sides complete | HR Admin (digest) | "X assessments complete today" | Daily digest |
| Campaign closed | HR Admin | "Campaign [name] is now closed" | Summary statistics |
| Campaign locked | HR Admin | "Campaign [name] is locked" | Confirmation |

### 10.2 In-App Notifications

Same triggers as above, plus:
- Calibration outlier flagged (HR only)
- Training assigned (Manager assigning)
- New campaign launched (everyone)
- System maintenance scheduled (everyone)

### 10.3 Email Template Variables

Available variables:
- `{employee_name}` — full name
- `{employee_first_name}` — first name only
- `{campaign_name}` — campaign title
- `{deadline}` — formatted date
- `{days_remaining}` — integer
- `{login_url}` — direct link to relevant screen
- `{manager_name}` — for employee emails

---

## 11. Permissions & Access Control

### 11.1 Role-Based Access Matrix

| Action | Employee | Manager | HR Admin | Executive |
|---|---|---|---|---|
| Take own assessment | ✓ | ✓ | ✓ | ✓ |
| View own results | ✗ | ✗ | ✓ | ✓ |
| Rate direct reports | ✗ | ✓ | ✓ | ✓ |
| View own team heatmap | ✗ | ✓ | ✓ | ✓ |
| View other team data | ✗ | ✗ | ✓ | ✓ (Exec scope) |
| View Division data | ✗ | ✗ | ✓ | ✓ |
| View Org data | ✗ | ✗ | ✓ | ✓ |
| Configure framework | ✗ | ✗ | ✓ | ✗ |
| Manage employees | ✗ | ✗ | ✓ | ✗ |
| Launch campaigns | ✗ | ✗ | ✓ | ✗ |
| Run calibration | ✗ | ✗ | ✓ | ✗ |
| Lock campaign | ✗ | ✗ | ✓ | ✗ |
| Generate reports | Partial | Partial | ✓ | Partial |
| View audit log | ✗ | ✗ | ✓ | ✗ |

### 11.2 Data Scope Rules

- **Employee**: own data only
- **Manager**: own data + direct reports only
- **HR Admin**: all data
- **Executive**: aggregate data (no individual records by default, unless configured)

### 11.3 Multi-Role Users

A user holding multiple roles gets the union of permissions. The active context (which role they're using) is shown in the UI header.

---

## 12. Edge Cases & Error Scenarios

### 12.1 Assessment Edge Cases

#### Employee has no Manager assigned
- Self-assessment proceeds normally
- Manager-side stays at NOT_STARTED indefinitely
- HR sees an alert in the Active Campaigns view
- HR can manually assign a Manager mid-campaign

#### Manager has 30 direct reports
- Manager dashboard shows pagination (10 per page)
- "Quick Rate" mode (Phase 2) — for MVP, manual one-by-one

#### Employee submits but Manager doesn't (deadline passed)
- Campaign closes with this employee marked as "Incomplete"
- HR can extend deadline for specific managers
- Locked campaign with incomplete records: data preserved but no gap analysis

#### Manager strongly disagrees with HR calibration adjustment
- All adjustments logged with reason
- Manager can file an objection (note attached to record)
- HR has final say in MVP — formal appeal process is Phase 2

#### New employee mid-cycle
- HR can add to active campaign or skip until next
- Default: skip until next campaign
- Configurable per campaign

#### Employee changes role mid-cycle
- Assessment continues with original role's Required Levels
- New role takes effect from next campaign
- Audit log captures the change

### 12.2 Framework Edge Cases

#### HR archives a Sub-Competency mid-campaign
- Currently-active campaigns continue with old version (snapshot)
- New campaigns skip the archived item
- Historical reports remain accurate

#### HR changes Question scores mid-campaign
- System warning: "This will affect future submissions, not already-submitted ones"
- Change applies to new submissions only
- Audit log captures the change

#### HR uploads a malformed Excel framework
- Validation runs before commit
- Errors displayed line-by-line
- Nothing changes until all errors fixed
- Partial import not allowed

### 12.3 System Edge Cases

#### Network failure during assessment submission
- Auto-save on every action minimizes data loss
- Last-saved state is recoverable
- "Submit" action is idempotent — duplicate submits don't duplicate data

#### SSO provider unavailable
- Fallback login for HR Admin (username/password)
- Other users see helpful error message
- HR Admin can switch to fallback mode if SSO outage extends

#### Concurrent edits (two HR Admins editing framework simultaneously)
- Optimistic locking with version numbers
- Second save shows "Someone else changed this. Reload?"
- No silent data loss

---

## 13. Out of Scope

The following are **explicitly NOT in MVP**. Listing them here prevents scope creep.

### 13.1 Phase 2 Features (post-MVP)
- AI-driven training recommendations
- Individual Development Plan (IDP) auto-generation
- Certification expiry tracking
- Mentor pairing algorithms
- Stretch assignment suggestions
- 9-box talent grid
- Succession planning module
- LMS integration (SCORM / xAPI)
- 360-degree feedback (peer ratings)
- Mobile native apps (iOS/Android)
- Multi-language UI (English only at MVP)
- Configurable rating scales (fixed at 1–5 in MVP)
- Multi-tenancy (single Caliber deployment only)
- Performance management (KPIs, goals, reviews) — never in scope
- Compensation integration — never in scope
- Recruitment / ATS — never in scope

### 13.2 Integrations Deferred to Phase 2
- HRIS sync (SAP SuccessFactors, Workday, Oracle)
- LMS integration
- Power BI / Tableau native connectors (API export exists; UI integration is Phase 2)
- SCIM provisioning

---

## 14. Success Criteria

### 14.1 MVP Launch Criteria

The MVP is considered **launched** when:
- ✅ All P0 functional requirements (~70 items) pass acceptance criteria
- ✅ HR Admin can configure the framework end-to-end without developer support
- ✅ A full assessment cycle (50+ employees) completes successfully
- ✅ All 25 P0 screens are implemented and tested
- ✅ Performance: any dashboard loads in under 3 seconds (for 1,500-employee dataset)
- ✅ Security: passes basic OWASP Top 10 review
- ✅ Documentation: HR Admin manual + Architecture Decision Records exist
- ✅ Deployment: `docker-compose up` brings up the complete stack on a fresh server

### 14.2 Business Success Criteria (6 months post-launch)

- 80% of invited employees complete their self-assessment
- 90% of invited managers complete their ratings
- < 5% calibration outliers requiring HR intervention (sign of mature ratings)
- HR reports being run weekly (high engagement)
- Executive dashboards being viewed at least monthly by leadership
- Zero data inconsistencies between dashboards and source data

### 14.3 Technical Success Criteria

- ≥ 99.5% uptime (excluding scheduled maintenance)
- < 3 second page load on all dashboards
- < 1 second response time on all API calls (p95)
- Zero critical bugs in production after Week 4 post-launch
- Audit log captures 100% of state-changing operations

---

## 15. Glossary

| Term | Definition |
|---|---|
| **Area** | Top-level competency category (8 in PM family) |
| **Assessment** | One employee's participation in one campaign |
| **Calibration** | Process of aligning manager ratings across the organization |
| **Campaign** | Scheduled assessment cycle (e.g., "2026 H1 Assessment") |
| **Caliber** | Product name (Caliber) |
| **Difference** | Self Level minus Manager Level |
| **Designation** | Synonym for Role |
| **Employee** | Individual being assessed |
| **Executive** | Senior leadership persona |
| **Framework** | The complete competency model (areas, sub-comps, questions, etc.) |
| **Gap** | Required Level minus Manager Level |
| **HR Admin** | Persona responsible for framework and campaigns |
| **Job Family** | Top-level grouping (e.g., Project Management) |
| **Line Manager** | Person an employee reports to; rates the employee |
| **Manager Level** | The 1–5 score the Line Manager assigns |
| **MVP** | Minimum Viable Product — first release of the platform |
| **Outlier** | Sub-Competency where Self vs Manager differ significantly |
| **PetroSkills Caliber** | Reference benchmark product that inspired the design |
| **Required Level** | Target score for a sub-competency given a role |
| **Role** | Designation (e.g., Manager, Head, Chief) |
| **Self Level** | Computed score from employee's questionnaire answers |
| **Sub-Competency** | Fundamental measurable unit (45 in PM family) |
| **Traffic Light** | Color-coded gap status (🟢🟡🟠🔴) |

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | May 2026 | Afaq Fiaz | Initial draft |

**Next review:** After Phase 1 Discovery workshops with Caliber HR

**Companion documents:**
- `02_Database_Schema.md` — MongoDB schema details
- `03_Technical_Architecture.md` — Next.js application architecture
- `04_Coding_Standards.md` — Conventions and rules

---

**END OF PRD**
