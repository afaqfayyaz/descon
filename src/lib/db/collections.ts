/** Canonical MongoDB collection names (SCHEMA.md). */
export const COLLECTIONS = {
  USERS: "users",
  JOB_FAMILIES: "jobFamilies",
  COMPETENCY_AREAS: "competencyAreas",
  SUB_COMPETENCIES: "subCompetencies",
  QUESTIONS: "questions",
  ROLES: "roles",
  REQUIRED_LEVELS: "requiredLevels",
  ASSESSMENT_CAMPAIGNS: "assessmentCampaigns",
  ASSESSMENTS: "assessments",
  ASSESSMENT_RESULTS: "assessmentResults",
  TRAININGS: "trainings",
  AUDIT_LOGS: "auditLogs",
  SETTINGS: "settings",
  NOTIFICATIONS: "notifications",
  ACCESS_TOKENS: "accessTokens",
} as const;
