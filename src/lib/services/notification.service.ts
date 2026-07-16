import { ObjectId } from "mongodb";

import { notificationRepo } from "@/lib/db/repositories/notification.repository";
import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { emailEnabled } from "@/lib/email/client";
import { sendEmails, type EmailMessage } from "@/lib/email/send";
import { CAMPAIGN_STATUS, STATUS } from "@/lib/domain/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

interface EmailIntent {
  recipientId: ObjectId;
  subject: string;
  text: string;
  link: string | null;
}

function appUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
}

/** Deadlines are date-only in the PRD; render in a stable, readable form. */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function firstName(fullName: string | null): string {
  if (!fullName) return "there";
  return fullName.trim().split(/\s+/)[0] || "there";
}

/**
 * Resolve recipient emails in one batch and send. Mirrors the in-app
 * notifications so users are reached even when not logged in (PRD §10).
 */
async function dispatchEmails(intents: EmailIntent[]): Promise<void> {
  if (intents.length === 0 || !emailEnabled()) return;
  const ids = Array.from(
    new Map(intents.map((i) => [i.recipientId.toString(), i.recipientId])).values(),
  );
  const users = await userRepo.findManyByIds(ids);
  const emailById = new Map(users.map((u) => [u._id.toString(), u.email]));

  const messages: EmailMessage[] = [];
  for (const intent of intents) {
    const to = emailById.get(intent.recipientId.toString());
    if (!to) continue;
    const url = appUrl(intent.link);
    messages.push({
      to,
      subject: intent.subject,
      text: url ? `${intent.text}\n\nOpen: ${url}` : intent.text,
    });
  }
  await sendEmails(messages);
}

/** Whole days from the start of today to the start of the deadline's day. */
function daysUntil(deadline: Date, now = new Date()): number {
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
  );
  return Math.floor((b - a) / DAY_MS);
}

/** Smallest configured window the remaining days have entered, or null. */
function dueMilestone(remaining: number, milestones: number[]): number | null {
  const qualifying = milestones.filter((m) => remaining <= m);
  if (qualifying.length === 0) return null;
  return Math.min(...qualifying);
}

function dueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return "due today";
  return `due in ${days} day(s)`;
}

export const notificationService = {
  /**
   * Scan active campaigns and create deadline reminders for participants who
   * haven't submitted. Idempotent: each (assessment, side, milestone) reminder
   * is created at most once via a dedupe key.
   */
  async generateReminders(now = new Date()): Promise<{ created: number }> {
    const campaigns = await campaignRepo.findAll();
    const active = campaigns.filter(
      (c) => c.status === CAMPAIGN_STATUS.ACTIVE && c.reminderConfig.enabled,
    );
    let created = 0;
    const emails: EmailIntent[] = [];

    for (const campaign of active) {
      const milestones = campaign.reminderConfig.daysBefore;
      if (milestones.length === 0) continue;

      const assessments = await assessmentRepo.findByCampaign(campaign._id);
      // The milestone for the current run is the most-urgent (smallest) window
      // the remaining days have entered. Each milestone is deduped, so daily
      // runs produce exactly one reminder per threshold over the campaign life.
      const selfMilestone = dueMilestone(
        daysUntil(campaign.selfAssessmentDeadline, now),
        milestones,
      );
      const mgrMilestone = dueMilestone(
        daysUntil(campaign.managerAssessmentDeadline, now),
        milestones,
      );
      const selfRemaining = daysUntil(campaign.selfAssessmentDeadline, now);
      const mgrRemaining = daysUntil(campaign.managerAssessmentDeadline, now);

      for (const a of assessments) {
        const aid = a._id.toString();

        if (
          selfMilestone !== null &&
          a.selfAssessment.status !== STATUS.SUBMITTED
        ) {
          const ok = await notificationRepo.insertIfAbsent({
            recipientId: a.employeeId,
            type: "self_reminder",
            title: "Self-assessment reminder",
            message: `Your self-assessment for "${campaign.name}" is ${dueLabel(selfRemaining)}.`,
            link: `/assessment/${aid}`,
            campaignId: campaign._id,
            assessmentId: a._id,
            dedupeKey: `${aid}:self:d${selfMilestone}`,
          });
          if (ok) {
            created += 1;
            emails.push({
              recipientId: a.employeeId,
              subject: "Self-assessment reminder",
              text: `Your self-assessment for "${campaign.name}" is ${dueLabel(selfRemaining)}.`,
              link: `/assessment/${aid}`,
            });
          }
        }

        if (
          mgrMilestone !== null &&
          a.lineManagerId &&
          a.managerAssessment.status !== STATUS.SUBMITTED
        ) {
          const ok = await notificationRepo.insertIfAbsent({
            recipientId: a.lineManagerId,
            type: "manager_reminder",
            title: "Manager rating reminder",
            message: `A rating for "${campaign.name}" is ${dueLabel(mgrRemaining)}.`,
            link: `/rate/${aid}`,
            campaignId: campaign._id,
            assessmentId: a._id,
            dedupeKey: `${aid}:manager:d${mgrMilestone}`,
          });
          if (ok) {
            created += 1;
            emails.push({
              recipientId: a.lineManagerId,
              subject: "Manager rating reminder",
              text: `A rating for "${campaign.name}" is ${dueLabel(mgrRemaining)}.`,
              link: `/rate/${aid}`,
            });
          }
        }
      }
    }

    await dispatchEmails(emails);
    return { created };
  },

  /**
   * On campaign launch, invite every participant and their line managers
   * (PRD §6.1 step 10, FR-CMP-002). Employees get a per-assessment invitation;
   * each manager gets ONE email per campaign listing all team members to rate
   * (FR-SLF-001 / FR-MGR-001 / §10.1). In-app notifications mirror both.
   */
  async notifyAssignments(campaignId: ObjectId): Promise<{ created: number }> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) return { created: 0 };
    const assessments = await assessmentRepo.findByCampaign(campaignId);
    if (assessments.length === 0) return { created: 0 };

    // Resolve names/emails for everyone we may contact in one batch.
    const employeeIds = assessments.map((a) => a.employeeId);
    const managerIds = assessments
      .map((a) => a.lineManagerId)
      .filter((id): id is ObjectId => id !== null);
    const users = await userRepo.findManyByIds([...employeeIds, ...managerIds]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const selfDeadline = formatDate(campaign.selfAssessmentDeadline);
    const mgrDeadline = formatDate(campaign.managerAssessmentDeadline);
    const selfDays = daysUntil(campaign.selfAssessmentDeadline);

    let created = 0;
    const messages: EmailMessage[] = [];

    // ---- Employee invitations (one per assessment) --------------------------
    for (const a of assessments) {
      const employee = userById.get(a.employeeId.toString());
      const link = `/assessment/${a._id.toString()}`;
      const inApp = `Your self-assessment for "${campaign.name}" is due by ${selfDeadline}. Estimated time: ~45 minutes (save & resume any time).`;
      const ok = await notificationRepo.insertIfAbsent({
        recipientId: a.employeeId,
        type: "assignment",
        title: "Your competency assessment is due",
        message: inApp,
        link,
        campaignId: campaign._id,
        assessmentId: a._id,
        dedupeKey: `${a._id.toString()}:assignment`,
      });
      if (ok) {
        created += 1;
        const url = appUrl(link);
        const first = firstName(employee?.fullName ?? null);
        messages.push({
          to: employee?.email ?? "",
          subject: "Your competency assessment is due",
          text:
            `Hi ${first},\n\n` +
            `Your ${campaign.name} competency assessment is due by ${selfDeadline}` +
            `${selfDays >= 0 ? ` (${selfDays} day(s) remaining)` : ""}.\n` +
            `Estimated time: ~45 minutes — you can save and resume any time.\n\n` +
            (url ? `Start your assessment: ${url}\n` : ""),
        });
      }
    }

    // ---- Manager invitations (one per manager, listing their team) ----------
    const byManager = new Map<string, { managerId: ObjectId; names: string[] }>();
    for (const a of assessments) {
      if (!a.lineManagerId) continue;
      const key = a.lineManagerId.toString();
      const entry =
        byManager.get(key) ?? { managerId: a.lineManagerId, names: [] };
      const emp = userById.get(a.employeeId.toString());
      entry.names.push(emp?.fullName ?? "A team member");
      byManager.set(key, entry);
    }

    for (const { managerId, names } of byManager.values()) {
      const link = `/team`;
      const inApp = `You have ${names.length} team member(s) to rate for "${campaign.name}". Ratings are due by ${mgrDeadline}.`;
      const ok = await notificationRepo.insertIfAbsent({
        recipientId: managerId,
        type: "assignment",
        title: "Team competency assessments due",
        message: inApp,
        link,
        campaignId: campaign._id,
        assessmentId: null,
        dedupeKey: `${campaign._id.toString()}:manager-invite:${managerId.toString()}`,
      });
      if (ok) {
        created += 1;
        const manager = userById.get(managerId.toString());
        const url = appUrl(link);
        const first = firstName(manager?.fullName ?? null);
        const list = names.map((n) => `  • ${n}`).join("\n");
        messages.push({
          to: manager?.email ?? "",
          subject: "Team competency assessments due",
          text:
            `Hi ${first},\n\n` +
            `You have ${names.length} team member(s) to rate for ${campaign.name}:\n` +
            `${list}\n\n` +
            `Estimated time: ~20 minutes per person.\n` +
            `Deadline: ${mgrDeadline}.\n\n` +
            (url ? `Open your manager dashboard: ${url}\n` : ""),
        });
      }
    }

    if (emailEnabled()) {
      await sendEmails(messages.filter((m) => m.to));
    }
    return { created };
  },

  /** Notify each participant that their results are finalized. */
  async notifyFinalized(campaignId: ObjectId): Promise<{ created: number }> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) return { created: 0 };
    const assessments = await assessmentRepo.findByCampaign(campaignId);
    let created = 0;
    const emails: EmailIntent[] = [];
    for (const a of assessments) {
      const message = `Your results for "${campaign.name}" have been finalized.`;
      const ok = await notificationRepo.insertIfAbsent({
        recipientId: a.employeeId,
        type: "finalized",
        title: "Assessment results ready",
        message,
        link: `/assessment/${a._id.toString()}`,
        campaignId: campaign._id,
        assessmentId: a._id,
        dedupeKey: `${a._id.toString()}:finalized`,
      });
      if (ok) {
        created += 1;
        emails.push({
          recipientId: a.employeeId,
          subject: "Assessment results ready",
          text: message,
          link: `/assessment/${a._id.toString()}`,
        });
      }
    }
    await dispatchEmails(emails);
    return { created };
  },

  async getInbox(userId: ObjectId) {
    const [items, unread] = await Promise.all([
      notificationRepo.listForUser(userId),
      notificationRepo.unreadCount(userId),
    ]);
    return { items, unread };
  },

  async markRead(id: ObjectId, userId: ObjectId) {
    await notificationRepo.markRead(id, userId);
  },

  async markAllRead(userId: ObjectId) {
    await notificationRepo.markAllRead(userId);
  },
};
