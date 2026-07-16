# Caliber — MongoDB Schema

**Version:** 1.0
**Last Updated:** 2026-06-05
**Author:** Afaq Fiaz

---

## Document Purpose

This document is the **single source of truth** for the database design of the Caliber platform. Every collection, every field, every index, and every relationship is defined here. The Next.js application reads from and writes to MongoDB according to this contract.

If a field is not in this document, it does not exist. If you need a new field, update this document first, then write the code.

---

## Design Principles

1. **Configurable, not hardcoded** — The competency framework (areas, sub-competencies, questions, required levels) is data, not code. HR Admin manages everything through the admin UI.

2. **Normalized for integrity, denormalized for reads** — Critical relationships use references (`_id` lookups). Frequently-read computed values (gap, traffic-light status) are pre-computed and stored on the `AssessmentResult` documents.

3. **Soft deletes everywhere** — No document is ever truly deleted from the database. Every collection has an `isActive` (or `status`) field. This protects against accidental deletion and preserves audit trails.

4. **Timestamps on everything** — Every document has `createdAt` and `updatedAt`. Every state change is logged in `AuditLog`.

5. **Single tenant** — No `tenantId` fields. The entire database belongs to Caliber.

6. **ObjectId everywhere** — Every `_id` is a MongoDB `ObjectId`. References between collections store the `ObjectId` of the referenced document.

---

## Collection Overview

The platform uses **12 collections**:

| # | Collection | Purpose | Approx Volume |
|---|---|---|---|
| 1 | `users` | All system users (Employee, Manager, HR, Executive) | ~1,500 |
| 2 | `jobFamilies` | Top-level groupings (PM, Engineering, HSE) | ~5–10 |
| 3 | `competencyAreas` | Main skill categories (the 8 areas) | ~8–20 |
| 4 | `subCompetencies` | Assessable skills under each area (the 45) | ~45–100 |
| 5 | `questions` | Scenario questions with configurable options & scores | ~135–300 |
| 6 | `roles` | Designations (IC/DM, Manager, Head, Chief) | ~4–10 |
| 7 | `requiredLevels` | Required level per sub-comp × role | ~180–1,000 |
| 8 | `assessmentCampaigns` | Each assessment cycle (e.g., "2026 H1") | ~2–4/year |
| 9 | `assessments` | One assessment per employee per campaign | ~3,000/year |
| 10 | `assessmentResults` | Computed gap data per sub-comp per assessment | ~135,000/year |
| 11 | `trainings` | Training catalog + assignments | ~50–500 |
| 12 | `auditLogs` | Every system action logged | Millions |

---

## 1. users

Stores every person who logs into the platform.

### Schema

```typescript
interface User {
  _id: ObjectId;
  email: string;                      // unique, lowercased
  fullName: string;
  employeeCode: string;               // unique, e.g., "EMP-12345"

  // Authentication
  passwordHash: string | null;        // null if SSO-only
  authProvider: 'local' | 'azure_ad' | 'saml';

  // Organizational data
  designation: ObjectId;              // → roles._id
  division: string;                   // e.g., "EPC", "ISD", "Corporate"
  department: string | null;          // e.g., "Civil", "I&C"
  jobFamily: ObjectId;                // → jobFamilies._id
  lineManagerId: ObjectId | null;     // → users._id (the user's manager)

  // Roles & permissions (a single user can hold multiple roles)
  systemRoles: Array<'employee' | 'line_manager' | 'hr_admin' | 'executive'>;

  // Profile
  avatarUrl: string | null;
  phoneNumber: string | null;
  joinedAt: Date;

  // Account state
  isActive: boolean;
  lastLoginAt: Date | null;

  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId | null;         // → users._id
  updatedBy: ObjectId | null;         // → users._id
}
```

### Indexes
- `email` (unique)
- `employeeCode` (unique)
- `lineManagerId` (for "find my team" queries)
- `division, department, designation` (compound, for filtering in dashboards)
- `systemRoles` (multikey, for "find all HR admins" queries)

### Sample Document
```json
{
  "_id": "ObjectId('64a1...')",
  "email": "ahmed.raza@caliber.com",
  "fullName": "Ahmed Raza",
  "employeeCode": "EMP-10234",
  "passwordHash": null,
  "authProvider": "azure_ad",
  "designation": "ObjectId('64b2...')",
  "division": "EPC",
  "department": "Civil",
  "jobFamily": "ObjectId('64c3...')",
  "lineManagerId": "ObjectId('64d4...')",
  "systemRoles": ["employee", "line_manager"],
  "avatarUrl": null,
  "phoneNumber": "+92 322 7376346",
  "joinedAt": "2022-03-15T00:00:00Z",
  "isActive": true,
  "lastLoginAt": "2026-06-04T10:23:00Z",
  "createdAt": "2022-03-15T00:00:00Z",
  "updatedAt": "2026-06-04T10:23:00Z",
  "createdBy": null,
  "updatedBy": "ObjectId('64e5...')"
}
```

### Notes
- A user can have multiple `systemRoles`. Most users are just `["employee"]`. Some are `["employee", "line_manager"]`. HR Admins have `["hr_admin", "employee"]`.
- `lineManagerId` is critical — it powers "show me my team" queries.

---

## 2. jobFamilies

Top-level groupings. The MVP supports configurable job families (PM, Engineering, etc.), each with its own set of competency areas.

### Schema

```typescript
interface JobFamily {
  _id: ObjectId;
  name: string;                       // e.g., "Project Management"
  code: string;                       // unique short code, e.g., "PM"
  description: string | null;
  version: number;                    // increments when framework changes
  status: 'active' | 'draft' | 'archived';

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `code` (unique)
- `status`

### Sample Document
```json
{
  "_id": "ObjectId('64c3...')",
  "name": "Project Management",
  "code": "PM",
  "description": "Core PM competency framework based on PMI standards",
  "version": 1,
  "status": "active",
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

---

## 3. competencyAreas

The main skill categories under each Job Family. Examples: "Risk Assessment", "Stakeholder Management", etc.

### Schema

```typescript
interface CompetencyArea {
  _id: ObjectId;
  jobFamilyId: ObjectId;              // → jobFamilies._id
  name: string;                       // e.g., "Root Cause Analysis & Risk Assessment"
  code: string;                       // e.g., "1" or "PM-RCA"
  description: string | null;
  sequence: number;                   // display order (1, 2, 3, ..., 8)
  weight: number;                     // for weighted scoring (default 1.0)
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `jobFamilyId, sequence` (compound, for ordered display)
- `jobFamilyId, code` (compound unique)

### Sample Document
```json
{
  "_id": "ObjectId('64f1...')",
  "jobFamilyId": "ObjectId('64c3...')",
  "name": "Root Cause Analysis & Risk Assessment",
  "code": "1",
  "description": "Finding the real reasons things go wrong and preventing future problems",
  "sequence": 1,
  "weight": 1.0,
  "isActive": true,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

---

## 4. subCompetencies

The assessable units. The 45 sub-competencies in Caliber's PM framework live here. HR can add unlimited more.

### Schema

```typescript
interface SubCompetency {
  _id: ObjectId;
  areaId: ObjectId;                   // → competencyAreas._id
  name: string;                       // e.g., "Root Cause & Risk Management Mastery"
  code: string;                       // e.g., "1.1"
  description: string | null;
  behavioralIndicators: string[];     // e.g., ["Identifies root causes systematically", ...]
  sequence: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `areaId, sequence` (compound, for ordered display)
- `areaId, code` (compound unique)

### Sample Document
```json
{
  "_id": "ObjectId('6501...')",
  "areaId": "ObjectId('64f1...')",
  "name": "Root Cause & Risk Management Mastery",
  "code": "1.1",
  "description": "Ability to identify root causes and manage risks proactively",
  "behavioralIndicators": [
    "Uses structured methods (5-Whys, Fishbone) to identify causes",
    "Maintains a current risk register",
    "Proactively communicates risks to stakeholders"
  ],
  "sequence": 1,
  "isActive": true,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

---

## 5. questions

The scenario questions. **HR sets the score for each option per question** (this is the key flexibility you specified).

### Schema

```typescript
interface Question {
  _id: ObjectId;
  subCompetencyId: ObjectId;          // → subCompetencies._id
  text: string;                       // The question itself

  options: Array<{
    letter: string;                   // "A", "B", "C", "D" (or more if HR wants)
    text: string;                     // The answer text
    score: number;                    // HR-configurable, e.g., 1, 2, 3, 4
  }>;

  sequence: number;                   // order within the sub-competency
  isActive: boolean;
  version: number;                    // increments when question text/scores change

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `subCompetencyId, sequence` (compound, for ordered display)
- `isActive`

### Sample Document
```json
{
  "_id": "ObjectId('6611...')",
  "subCompetencyId": "ObjectId('6501...')",
  "text": "A major project deliverable is consistently late. What is your first step?",
  "options": [
    { "letter": "A", "text": "Ask the team to work overtime to recover the delay", "score": 1 },
    { "letter": "B", "text": "Log the delay in the risk register and notify the sponsor", "score": 2 },
    { "letter": "C", "text": "Conduct a structured root cause analysis (5-Whys)", "score": 3 },
    { "letter": "D", "text": "Redesign the project schedule with predictive indicators", "score": 4 }
  ],
  "sequence": 1,
  "isActive": true,
  "version": 1,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

### Notes
- Number of options is **not fixed at 4**. HR can create questions with 2, 3, 4, 5, or more options.
- Scores can be any non-negative integer. HR isn't limited to 1-2-3-4. Could be 0-3-6-9 or 1-1-3-5 — whatever HR decides.
- When HR edits a question after it's been used in an assessment, the system stores the **version**. Existing assessment answers reference the version they answered.

---

## 6. roles

Designations / job grades (IC/DM, Manager, Head, Chief).

### Schema

```typescript
interface Role {
  _id: ObjectId;
  name: string;                       // e.g., "Manager"
  code: string;                       // unique short code, e.g., "MGR"
  level: number;                      // numeric grade (1 = junior, 10 = senior)
  description: string | null;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `code` (unique)
- `level`

### Sample Document
```json
{
  "_id": "ObjectId('64b2...')",
  "name": "Manager",
  "code": "MGR",
  "level": 5,
  "description": "Mid-level managerial position",
  "isActive": true,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

---

## 7. requiredLevels

The matrix that says "for sub-competency X, a Y-grade person needs Z level." This is what your Excel file calls the "role-based requirements table."

### Schema

```typescript
interface RequiredLevel {
  _id: ObjectId;
  subCompetencyId: ObjectId;          // → subCompetencies._id
  roleId: ObjectId;                   // → roles._id
  requiredLevel: number;              // 1 to 5
  effectiveFrom: Date;                // when this requirement starts applying
  effectiveTo: Date | null;           // null = currently active

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `subCompetencyId, roleId, effectiveFrom` (compound)
- `subCompetencyId, roleId` (for "find current requirement" queries)

### Sample Document
```json
{
  "_id": "ObjectId('6701...')",
  "subCompetencyId": "ObjectId('6501...')",
  "roleId": "ObjectId('64b2...')",
  "requiredLevel": 4,
  "effectiveFrom": "2026-01-01T00:00:00Z",
  "effectiveTo": null,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

### Notes
- `effectiveFrom`/`effectiveTo` allows HR to change required levels over time without breaking historical assessments.
- When HR updates a required level, the system **closes the old one** (sets `effectiveTo`) and **creates a new one** (with new `effectiveFrom`).

---

## 8. assessmentCampaigns

Each assessment cycle. "H1 2026 PM Family Assessment" is one campaign.

### Schema

```typescript
interface AssessmentCampaign {
  _id: ObjectId;
  name: string;                       // e.g., "H1 2026 PM Family Assessment"
  description: string | null;
  jobFamilyIds: ObjectId[];           // which job families are in scope
  divisionFilter: string[];           // ["EPC", "ISD"] or [] for all
  participantIds: ObjectId[];         // → users._id (auto-populated)

  startDate: Date;                    // when campaign opens
  selfAssessmentDeadline: Date;       // employees must submit by
  managerAssessmentDeadline: Date;    // managers must complete by
  calibrationDeadline: Date;          // HR locks results by

  status: 'draft' | 'active' | 'in_calibration' | 'locked' | 'archived';

  // Reminder configuration
  reminderConfig: {
    enabled: boolean;
    daysBefore: number[];             // [7, 3, 1] = reminders at 7, 3, 1 days before deadline
  };

  // Stats (denormalized for quick dashboards)
  stats: {
    totalParticipants: number;
    selfCompleted: number;
    managerCompleted: number;
    calibrationOutliers: number;
    finalized: number;
  };

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `status, startDate`
- `participantIds` (multikey, for "find my active campaigns" per user)

### Sample Document
```json
{
  "_id": "ObjectId('6801...')",
  "name": "H1 2026 PM Family Assessment",
  "description": "Half-yearly assessment for all PM employees",
  "jobFamilyIds": ["ObjectId('64c3...')"],
  "divisionFilter": [],
  "participantIds": ["ObjectId('64a1...')", "ObjectId('64a2...')"],
  "startDate": "2026-06-01T00:00:00Z",
  "selfAssessmentDeadline": "2026-06-30T23:59:59Z",
  "managerAssessmentDeadline": "2026-07-15T23:59:59Z",
  "calibrationDeadline": "2026-07-31T23:59:59Z",
  "status": "active",
  "reminderConfig": {
    "enabled": true,
    "daysBefore": [7, 3, 1]
  },
  "stats": {
    "totalParticipants": 247,
    "selfCompleted": 89,
    "managerCompleted": 12,
    "calibrationOutliers": 0,
    "finalized": 0
  },
  "createdAt": "2026-05-20T00:00:00Z",
  "updatedAt": "2026-06-04T10:30:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

---

## 9. assessments

One document per employee per campaign. Holds both the employee's questionnaire answers AND the manager's ratings.

### Schema

```typescript
interface Assessment {
  _id: ObjectId;
  campaignId: ObjectId;               // → assessmentCampaigns._id
  employeeId: ObjectId;               // → users._id
  lineManagerId: ObjectId;            // → users._id (snapshot at campaign launch)
  designationAtCampaign: ObjectId;    // → roles._id (snapshot at campaign launch)
  jobFamilyAtCampaign: ObjectId;      // → jobFamilies._id (snapshot)

  // Employee self-assessment (questionnaire answers)
  selfAssessment: {
    status: 'not_started' | 'in_progress' | 'submitted';
    startedAt: Date | null;
    submittedAt: Date | null;
    progress: number;                 // 0-100, % of questions answered

    answers: Array<{
      questionId: ObjectId;           // → questions._id
      questionVersion: number;        // snapshot of question version at time of answer
      selectedOption: string;         // "A", "B", "C", "D"
      answeredAt: Date;
    }>;
  };

  // Manager rating
  managerAssessment: {
    status: 'not_started' | 'in_progress' | 'submitted';
    startedAt: Date | null;
    submittedAt: Date | null;
    progress: number;

    ratings: Array<{
      subCompetencyId: ObjectId;
      rating: number;                 // 1 to 5
      evidence: string | null;        // optional manager comments
      ratedAt: Date;
    }>;
  };

  // Final state
  finalStatus: 'pending' | 'calibration_required' | 'finalized' | 'archived';
  finalizedAt: Date | null;
  finalizedBy: ObjectId | null;       // → users._id (HR who finalized)

  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes
- `campaignId, employeeId` (compound unique — one assessment per emp per campaign)
- `employeeId, finalStatus` (for "my assessment history")
- `lineManagerId, "managerAssessment.status"` (for "team I need to rate")
- `campaignId, finalStatus` (for HR dashboard)

### Sample Document
```json
{
  "_id": "ObjectId('6901...')",
  "campaignId": "ObjectId('6801...')",
  "employeeId": "ObjectId('64a1...')",
  "lineManagerId": "ObjectId('64d4...')",
  "designationAtCampaign": "ObjectId('64b2...')",
  "jobFamilyAtCampaign": "ObjectId('64c3...')",
  "selfAssessment": {
    "status": "in_progress",
    "startedAt": "2026-06-02T09:15:00Z",
    "submittedAt": null,
    "progress": 31,
    "answers": [
      {
        "questionId": "ObjectId('6611...')",
        "questionVersion": 1,
        "selectedOption": "B",
        "answeredAt": "2026-06-02T09:18:00Z"
      }
    ]
  },
  "managerAssessment": {
    "status": "not_started",
    "startedAt": null,
    "submittedAt": null,
    "progress": 0,
    "ratings": []
  },
  "finalStatus": "pending",
  "finalizedAt": null,
  "finalizedBy": null,
  "createdAt": "2026-06-01T00:00:00Z",
  "updatedAt": "2026-06-02T09:18:00Z"
}
```

### Notes on Snapshotting
- `designationAtCampaign`, `jobFamilyAtCampaign`, `lineManagerId` are **snapshotted at campaign launch**. If Ahmed gets promoted mid-campaign, the assessment still uses the role he was when the campaign started.
- `questionVersion` is snapshotted with each answer. If HR edits a question mid-campaign, answers already given still reference the old version.

---

## 10. assessmentResults

Pre-computed gap data per sub-competency per assessment. **This collection drives all dashboards.**

### Schema

```typescript
interface AssessmentResult {
  _id: ObjectId;
  assessmentId: ObjectId;             // → assessments._id
  campaignId: ObjectId;               // → assessmentCampaigns._id (denormalized for fast filtering)
  employeeId: ObjectId;               // → users._id (denormalized)
  subCompetencyId: ObjectId;          // → subCompetencies._id

  // Computed levels
  selfLevel: number | null;           // 0-5, normalized from questionnaire
  managerLevel: number | null;        // 1-5, direct rating
  difference: number | null;          // selfLevel - managerLevel

  // Gap analysis
  requiredLevel: number;              // snapshot from requiredLevels at finalization time
  gap: number | null;                 // requiredLevel - managerLevel
  trafficLight: 'strong' | 'developing' | 'needs_focus' | 'critical' | null;

  // Calibration
  calibrationFlag: 'none' | 'minor_outlier' | 'major_outlier' | null;
  calibrationNote: string | null;     // HR's calibration comment

  // Metadata
  computedAt: Date;
  status: 'pending' | 'computed' | 'locked';

  // Denormalized organizational data for fast dashboard queries
  denormalized: {
    division: string;
    department: string | null;
    designation: ObjectId;
    jobFamily: ObjectId;
    areaId: ObjectId;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes
- `campaignId, employeeId, subCompetencyId` (compound unique)
- `campaignId, "denormalized.division", trafficLight` (for division heatmaps)
- `campaignId, "denormalized.designation", trafficLight` (for designation heatmaps)
- `campaignId, "denormalized.areaId"` (for area roll-ups)
- `employeeId, computedAt` (for employee history)
- `campaignId, calibrationFlag` (for HR calibration view)

### Sample Document
```json
{
  "_id": "ObjectId('7001...')",
  "assessmentId": "ObjectId('6901...')",
  "campaignId": "ObjectId('6801...')",
  "employeeId": "ObjectId('64a1...')",
  "subCompetencyId": "ObjectId('6501...')",
  "selfLevel": 2.92,
  "managerLevel": 3.00,
  "difference": -0.08,
  "requiredLevel": 4,
  "gap": 1.0,
  "trafficLight": "developing",
  "calibrationFlag": "none",
  "calibrationNote": null,
  "computedAt": "2026-07-16T14:22:00Z",
  "status": "locked",
  "denormalized": {
    "division": "EPC",
    "department": "Civil",
    "designation": "ObjectId('64b2...')",
    "jobFamily": "ObjectId('64c3...')",
    "areaId": "ObjectId('64f1...')"
  },
  "createdAt": "2026-07-16T14:22:00Z",
  "updatedAt": "2026-07-31T17:00:00Z"
}
```

### Computation Logic

**selfLevel** (normalized to 0-5):
```
For all questions in this sub-competency:
  totalEarned += score of selected option
  totalMax += max score among options

selfLevel = (totalEarned / totalMax) * 5
```

**managerLevel:** Direct from `assessments.managerAssessment.ratings[i].rating`.

**gap:** `requiredLevel - managerLevel`

**trafficLight:**
- `gap <= 0` → `strong`
- `gap <= 1` → `developing`
- `gap <= 2` → `needs_focus`
- `gap > 2` → `critical`

**calibrationFlag:**
- `|difference| <= 1` → `none`
- `|difference| <= 2` → `minor_outlier`
- `|difference| > 2` → `major_outlier`

---

## 11. trainings

Training activities catalog + assignments. **No auto-recommendation** — HR maintains the catalog and assigns trainings manually.

### Schema

```typescript
interface Training {
  _id: ObjectId;
  name: string;
  description: string | null;
  type: 'course' | 'certification' | 'workshop' | 'mentoring' | 'stretch_assignment' | 'other';
  durationHours: number | null;
  provider: string | null;            // "Internal", "Coursera", "PMI", etc.
  url: string | null;

  // Which competencies this training addresses (manually tagged by HR)
  addressesSubCompetencies: ObjectId[]; // → subCompetencies._id

  isActive: boolean;

  // Assignments (one training can be assigned to many employees)
  assignments: Array<{
    employeeId: ObjectId;
    assignedAt: Date;
    assignedBy: ObjectId;
    dueDate: Date | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
    completedAt: Date | null;
    notes: string | null;
  }>;

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

### Indexes
- `addressesSubCompetencies` (multikey, for "what trainings help with sub-comp X")
- `"assignments.employeeId"` (multikey, for "what trainings is Ahmed assigned")
- `isActive`

### Sample Document
```json
{
  "_id": "ObjectId('7101...')",
  "name": "PMP Certification Course",
  "description": "Standard Project Management Professional preparation course",
  "type": "certification",
  "durationHours": 35,
  "provider": "PMI",
  "url": "https://www.pmi.org/certifications/project-management-pmp",
  "addressesSubCompetencies": [
    "ObjectId('6501...')",
    "ObjectId('6502...')"
  ],
  "isActive": true,
  "assignments": [
    {
      "employeeId": "ObjectId('64a1...')",
      "assignedAt": "2026-07-20T10:00:00Z",
      "assignedBy": "ObjectId('hr-admin-id')",
      "dueDate": "2026-12-31T00:00:00Z",
      "status": "assigned",
      "completedAt": null,
      "notes": "Recommended for Ahmed to close Critical gap in 1.1"
    }
  ],
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-07-20T10:00:00Z",
  "createdBy": "ObjectId('hr-admin-id')",
  "updatedBy": "ObjectId('hr-admin-id')"
}
```

---

## 12. auditLogs

Immutable record of every significant action. **No update or delete operations on this collection** — only inserts.

### Schema

```typescript
interface AuditLog {
  _id: ObjectId;
  timestamp: Date;
  actorId: ObjectId | null;           // → users._id (null for system actions)
  actorEmail: string | null;          // denormalized for forensics
  actorIp: string | null;

  action: string;                     // e.g., "framework.area.created", "assessment.submitted"
  entityType: string;                 // e.g., "CompetencyArea", "Assessment"
  entityId: ObjectId | null;

  // What changed
  changes: {
    before: object | null;            // null for creates
    after: object | null;             // null for deletes
  } | null;

  // Context
  metadata: {
    userAgent: string | null;
    requestId: string | null;
    [key: string]: any;
  };
}
```

### Indexes
- `timestamp` (DESC)
- `actorId, timestamp` (for "what did this user do")
- `entityType, entityId, timestamp` (for "history of this document")
- `action, timestamp` (for "all logins last week")

### Sample Document
```json
{
  "_id": "ObjectId('8001...')",
  "timestamp": "2026-06-04T10:23:00Z",
  "actorId": "ObjectId('hr-admin-id')",
  "actorEmail": "hr.admin@caliber.com",
  "actorIp": "10.0.5.123",
  "action": "framework.subCompetency.updated",
  "entityType": "SubCompetency",
  "entityId": "ObjectId('6501...')",
  "changes": {
    "before": {
      "name": "Root Cause & Risk Mastery",
      "description": "Old description"
    },
    "after": {
      "name": "Root Cause & Risk Management Mastery",
      "description": "Updated description"
    }
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "requestId": "req-abc-123"
  }
}
```

### Standard Action Names

Use these consistently across the codebase:

| Domain | Actions |
|---|---|
| `auth.*` | `auth.login`, `auth.logout`, `auth.failed_login`, `auth.password_changed` |
| `framework.*` | `framework.area.created`, `framework.area.updated`, `framework.area.deactivated`, (same pattern for subCompetency, question, role) |
| `requiredLevel.*` | `requiredLevel.created`, `requiredLevel.updated` |
| `user.*` | `user.created`, `user.updated`, `user.deactivated`, `user.role_changed` |
| `campaign.*` | `campaign.created`, `campaign.launched`, `campaign.locked`, `campaign.archived` |
| `assessment.*` | `assessment.started`, `assessment.answer_saved`, `assessment.submitted`, `assessment.finalized` |
| `manager.*` | `manager.rating_started`, `manager.rating_submitted` |
| `training.*` | `training.created`, `training.assigned`, `training.completed` |
| `report.*` | `report.generated`, `report.exported` |

---

## Relationships Diagram

```
                    ┌──────────────────┐
                    │   jobFamilies    │
                    └────────┬─────────┘
                             │ 1:N
                             ▼
                    ┌──────────────────┐
                    │ competencyAreas  │
                    └────────┬─────────┘
                             │ 1:N
                             ▼
                    ┌──────────────────┐         ┌──────────────────┐
                    │ subCompetencies  │◄────────│   questions      │
                    └────────┬─────────┘  1:N    └──────────────────┘
                             │
                             │ N:M
                             ▼
            ┌────────────────┴────────────────┐
            │                                  │
            ▼                                  ▼
    ┌──────────────┐                  ┌──────────────────┐
    │    roles     │◄─────────────────│ requiredLevels   │
    └──────────────┘     1:N          └──────────────────┘

    ┌──────────────┐
    │    users     │
    └──────┬───────┘
           │
           │ 1:N (as participant)
           ▼
    ┌──────────────────────┐
    │ assessmentCampaigns  │
    └──────────┬───────────┘
               │ 1:N
               ▼
    ┌──────────────────┐
    │   assessments    │
    └────────┬─────────┘
             │ 1:N (one per sub-comp)
             ▼
    ┌──────────────────────┐
    │  assessmentResults   │  ◄── This drives all dashboards
    └──────────────────────┘

    ┌──────────────────┐
    │    trainings     │  (independent; assignments embedded)
    └──────────────────┘

    ┌──────────────────┐
    │    auditLogs     │  (independent; immutable)
    └──────────────────┘
```

---

## Index Strategy Summary

### For HR Admin Performance
- `users` indexes on division/department/designation enable fast filtering
- `assessmentResults` denormalized fields enable single-collection dashboard queries

### For Employee Performance
- `assessments` indexed on `employeeId + finalStatus` for "my assessments" page

### For Line Manager Performance
- `users.lineManagerId` index for "my team" queries
- `assessments` indexed on `lineManagerId + managerAssessment.status` for "pending validations"

### For Executive Performance
- `assessmentResults.denormalized.*` indexes power division/designation heatmaps without joins

### Total Indexes
~24 indexes across 12 collections. MongoDB handles this comfortably.

---

## Migration & Seeding

### Initial Seed (Phase 1, Week 1)

Import from your Excel files:
1. Read PM Competency Assessment Tool → seed `jobFamilies`, `competencyAreas`, `subCompetencies`, `roles`, `requiredLevels`
2. Read PM Competency Questionnaire → seed `questions` (with options and default scores A=1, B=2, C=3, D=4)

A seeding script (`scripts/seed-from-excel.ts`) does this automatically.

### Schema Versioning

Every document includes implicit versioning through:
- `version` field on `jobFamilies`, `questions`
- `effectiveFrom`/`effectiveTo` on `requiredLevels`
- Snapshotted fields on `assessments` (designation, jobFamily, lineManagerId, questionVersion)

This ensures historical data remains accurate even as the framework evolves.

---

## Data Volume Projections (Year 1)

| Collection | Year 1 Volume | Year 3 Projection |
|---|---|---|
| users | 1,500 | 2,500 |
| jobFamilies | 5 | 8 |
| competencyAreas | 40 | 80 |
| subCompetencies | 200 | 400 |
| questions | 600 | 1,500 |
| roles | 10 | 15 |
| requiredLevels | 2,000 | 6,000 |
| assessmentCampaigns | 4 | 12 |
| assessments | 6,000 | 30,000 |
| assessmentResults | 270,000 | 1.5M |
| trainings (with assignments) | 500 (10k assignments) | 2,000 (50k assignments) |
| auditLogs | 5M | 30M |

**MongoDB sizing:** All collections comfortable on a single replica set. Sharding not required at any projected scale.

---

## End of Schema Document

For the application code that consumes this schema, see **ARCHITECTURE.md**.
For coding conventions, see **CODING_STANDARDS.md**.
For the product features that drive these collections, see **PRD.md**.
