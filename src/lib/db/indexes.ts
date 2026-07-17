import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";

/**
 * Create all indexes defined in SCHEMA.md. Idempotent — safe to run repeatedly
 * (createIndexes is a no-op when an identical index already exists).
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  await db.collection(COLLECTIONS.USERS).createIndexes([
    { key: { email: 1 }, unique: true, name: "uniq_email" },
    { key: { employeeCode: 1 }, unique: true, name: "uniq_employeeCode" },
    { key: { lineManagerId: 1 }, name: "by_manager" },
    { key: { division: 1, department: 1, designation: 1 }, name: "by_org" },
    { key: { systemRoles: 1 }, name: "by_roles" },
  ]);

  await db
    .collection(COLLECTIONS.JOB_FAMILIES)
    .createIndexes([
      { key: { code: 1 }, unique: true, name: "uniq_code" },
      { key: { status: 1 }, name: "by_status" },
    ]);

  await db
    .collection(COLLECTIONS.COMPETENCY_AREAS)
    .createIndexes([
      { key: { jobFamilyId: 1, sequence: 1 }, name: "by_family_seq" },
      { key: { jobFamilyId: 1, code: 1 }, unique: true, name: "uniq_family_code" },
    ]);

  await db
    .collection(COLLECTIONS.SUB_COMPETENCIES)
    .createIndexes([
      { key: { areaId: 1, sequence: 1 }, name: "by_area_seq" },
      { key: { areaId: 1, code: 1 }, unique: true, name: "uniq_area_code" },
    ]);

  await db
    .collection(COLLECTIONS.QUESTIONS)
    .createIndexes([
      { key: { subCompetencyId: 1, sequence: 1 }, name: "by_sub_seq" },
      { key: { isActive: 1 }, name: "by_active" },
    ]);

  await db
    .collection(COLLECTIONS.ROLES)
    .createIndexes([
      { key: { code: 1 }, unique: true, name: "uniq_code" },
      { key: { level: 1 }, name: "by_level" },
    ]);

  await db
    .collection(COLLECTIONS.REQUIRED_LEVELS)
    .createIndexes([
      {
        key: { subCompetencyId: 1, roleId: 1, effectiveFrom: 1 },
        name: "by_sub_role_from",
      },
      { key: { subCompetencyId: 1, roleId: 1 }, name: "by_sub_role" },
    ]);

  await db
    .collection(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
    .createIndexes([
      { key: { status: 1, startDate: 1 }, name: "by_status_date" },
      { key: { participantIds: 1 }, name: "by_participant" },
    ]);

  await db
    .collection(COLLECTIONS.ASSESSMENTS)
    .createIndexes([
      { key: { campaignId: 1, employeeId: 1 }, unique: true, name: "uniq_campaign_emp" },
      { key: { employeeId: 1, finalStatus: 1 }, name: "by_emp_status" },
      {
        key: { lineManagerId: 1, "managerAssessment.status": 1 },
        name: "by_manager_status",
      },
      { key: { campaignId: 1, finalStatus: 1 }, name: "by_campaign_status" },
    ]);

  await db
    .collection(COLLECTIONS.ASSESSMENT_RESULTS)
    .createIndexes([
      {
        key: { campaignId: 1, employeeId: 1, subCompetencyId: 1 },
        unique: true,
        name: "uniq_result",
      },
      {
        key: { campaignId: 1, "denormalized.division": 1, trafficLight: 1 },
        name: "by_division_light",
      },
      {
        key: { campaignId: 1, "denormalized.designation": 1, trafficLight: 1 },
        name: "by_designation_light",
      },
      { key: { campaignId: 1, "denormalized.areaId": 1 }, name: "by_area" },
      { key: { campaignId: 1, calibrationFlag: 1 }, name: "by_calibration" },
    ]);

  await db
    .collection(COLLECTIONS.TRAININGS)
    .createIndexes([
      { key: { addressesSubCompetencies: 1 }, name: "by_subcomp" },
      { key: { "assignments.employeeId": 1 }, name: "by_assignee" },
      { key: { isActive: 1 }, name: "by_active" },
    ]);

  await db
    .collection(COLLECTIONS.NOTIFICATIONS)
    .createIndexes([
      { key: { dedupeKey: 1 }, unique: true, name: "uniq_dedupe" },
      {
        key: { recipientId: 1, read: 1, createdAt: -1 },
        name: "by_recipient_read",
      },
    ]);

  await db
    .collection(COLLECTIONS.ACCESS_TOKENS)
    .createIndexes([
      { key: { tokenHash: 1 }, unique: true, name: "uniq_tokenHash" },
      { key: { assessmentId: 1, kind: 1 }, name: "by_assessment_kind" },
    ]);

  await db.collection(COLLECTIONS.LOGIN_ATTEMPTS).createIndexes([
    { key: { email: 1, createdAt: -1 }, name: "by_email_time" },
    // Self-pruning: attempts vanish 15 minutes after they're recorded, which
    // is also the lockout window checked in auth.ts.
    { key: { createdAt: 1 }, expireAfterSeconds: 900, name: "ttl" },
  ]);

  await db
    .collection(COLLECTIONS.AUDIT_LOGS)
    .createIndexes([
      { key: { timestamp: -1 }, name: "by_time" },
      { key: { actorId: 1, timestamp: -1 }, name: "by_actor" },
      {
        key: { entityType: 1, entityId: 1, timestamp: -1 },
        name: "by_entity",
      },
      { key: { action: 1, timestamp: -1 }, name: "by_action" },
    ]);
}
