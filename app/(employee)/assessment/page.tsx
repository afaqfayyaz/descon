import Link from "next/link";
import { Clock, CalendarClock, CheckCircle2, Plus, User } from "lucide-react";
import { currentUserId } from "@/lib/auth/session";
import { requireSession } from "@/lib/auth/session";
import { questionnaireService } from "@/lib/services/questionnaire.service";
import { campaignService } from "@/lib/services/campaign.service";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { SendOneOnOne } from "@/components/features/assessment/send-one-on-one";
import { ResendLinkButton } from "@/components/features/assessment/resend-link-button";
import {
  SendManagerLinkButton,
  type RaterOption,
} from "@/components/features/assessment/send-manager-link-button";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
};

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-info/10 text-info",
  in_calibration: "bg-gap-developing/10 text-gap-developing",
  locked: "bg-gap-strong/10 text-gap-strong",
  archived: "bg-slate-100 text-slate-400",
};

/** Whole days from today until the deadline (date-only). */
function daysUntil(deadline: Date | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(deadline);
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86_400_000);
}

function shortDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AssessmentsPage() {
  const session = await requireSession();
  const uid = await currentUserId();
  const isHr = session.user.roles.includes("hr_admin");

  const [assessments, hub, jobFamilies, pending, raterUsers, roles] =
    await Promise.all([
    questionnaireService.listMyAssessments(uid),
    isHr ? campaignService.listForHub() : Promise.resolve(null),
    isHr ? jobFamilyRepo.findAll() : Promise.resolve([]),
    isHr ? questionnaireService.listPendingOrgWide() : Promise.resolve([]),
    // Raters are staff — an admin account isn't part of the reporting line.
    isHr
      ? userRepo.findMany({ kind: "staff" }, { page: 1, limit: 500 })
      : Promise.resolve([]),
    isHr ? roleRepo.findAll() : Promise.resolve([]),
  ]);
  const firstName = (session.user.name ?? "there").split(/\s+/)[0];

  // Any active employee may be picked as a rater (chosen at send time).
  const roleNameById = new Map(roles.map((r) => [r._id.toString(), r.name]));
  const raters: RaterOption[] = raterUsers
    .filter((u) => u.isActive)
    .map((u) => ({
      id: u._id.toString(),
      fullName: u.fullName,
      designation: roleNameById.get(u.designation?.toString() ?? "") ?? "—",
      division: u.division ?? null,
    }));

  return (
    <div className={`mx-auto space-y-8 ${isHr ? "max-w-6xl" : "max-w-3xl"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assessments</h1>
          <p className="text-sm text-text-secondary">
            {isHr
              ? "Everything in one place — assessments to complete, campaigns you've sent, and one-on-one assignments."
              : `Welcome, ${firstName}. Complete your competency self-assessment before the deadline.`}
          </p>
        </div>
        {isHr && (
          <div className="flex items-center gap-3">
            <SendOneOnOne
              jobFamilies={jobFamilies.map((jf) => ({
                id: jf._id.toString(),
                name: jf.name,
                code: jf.code,
              }))}
            />
            <Link
              href="/campaigns/new"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New campaign
            </Link>
          </div>
        )}
      </div>

      {/* ---- To complete (your own) ---------------------------------------- */}
      {(!isHr || assessments.length > 0) && (
      <section className="space-y-4">
        {isHr && (
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            To complete{assessments.length > 0 ? ` (${assessments.length})` : ""}
          </h2>
        )}
        {assessments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-secondary">
            You have no assessments assigned to you right now.
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((a) => {
              const days = daysUntil(a.deadline);
              const submitted = a.status === "submitted";
              const cta = submitted
                ? "Review"
                : a.status === "in_progress"
                  ? "Continue Assessment"
                  : "Start Assessment";
              return (
                <div
                  key={a.assessmentId}
                  className="rounded-lg border border-border bg-surface p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Pending Assessment
                      </div>
                      <h2 className="mt-1 text-lg font-semibold text-text-primary">
                        {a.campaignName}
                      </h2>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        submitted
                          ? "bg-gap-strong/10 text-gap-strong"
                          : "bg-primary-light text-primary"
                      }`}
                    >
                      {submitted && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4 text-text-tertiary" />
                      {a.deadline
                        ? days !== null && days >= 0
                          ? `Due in ${days} day${days === 1 ? "" : "s"}`
                          : `Overdue`
                        : "No deadline"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-text-tertiary" />
                      Estimated time: ~45 minutes
                    </span>
                    {!submitted && (
                      <span className="text-text-tertiary">
                        {a.progress}% complete
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/assessment/${a.assessmentId}`}
                      className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
                    >
                      {cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* ---- HR: everything still outstanding, org-wide --------------------- */}
      {isHr && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pending assessments ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Nothing outstanding — every assessment has been completed.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-3 py-3 font-medium">Assessment</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Due</th>
                    <th className="px-3 py-3 font-medium">Waiting on</th>
                    <th className="px-3 py-3 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => {
                    const days = daysUntil(p.deadline);
                    return (
                      <tr
                        key={p.assessmentId}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/employees/${p.employeeId}`}
                            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                          >
                            <User className="h-3.5 w-3.5" />
                            {p.employeeName}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={
                              p.type === "one_on_one"
                                ? `/employees/${p.employeeId}`
                                : `/campaigns/${p.campaignId}`
                            }
                            className="text-slate-600 hover:text-primary hover:underline"
                          >
                            {p.campaignName}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.type === "one_on_one"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-primary-light text-primary"
                            }`}
                          >
                            {p.type === "one_on_one" ? "One-on-one" : "Campaign"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {p.deadline
                            ? days !== null && days >= 0
                              ? `${shortDate(p.deadline)} · in ${days}d`
                              : `${shortDate(p.deadline)} · overdue`
                            : "No deadline"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.waitingOn === "manager"
                                ? "bg-gap-developing/10 text-gap-developing"
                                : "bg-info/10 text-info"
                            }`}
                          >
                            {p.waitingOn === "manager"
                              ? "Manager rating"
                              : "Employee self"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {p.waitingOn === "manager"
                            ? (STATUS_LABEL[p.managerStatus] ?? p.managerStatus)
                            : `${p.selfProgress}% self`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ---- HR: campaigns sent -------------------------------------------- */}
      {isHr && hub && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Campaigns ({hub.campaigns.length})
              </h2>
              <Link
                href="/campaigns"
                className="text-xs font-medium text-primary hover:underline"
              >
                Manage campaigns →
              </Link>
            </div>
            {hub.campaigns.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No campaigns sent yet. Create one to assess a group of employees.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-medium">Campaign</th>
                      <th className="px-3 py-3 font-medium">Started</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 text-center font-medium">
                        Participants
                      </th>
                      <th className="px-3 py-3 text-center font-medium">
                        Self done
                      </th>
                      <th className="px-3 py-3 text-center font-medium">
                        Mgr done
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hub.campaigns.map((c) => (
                      <tr
                        key={c._id.toString()}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/campaigns/${c._id.toString()}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {shortDate(c.startDate)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              CAMPAIGN_STATUS_STYLES[c.status] ??
                              CAMPAIGN_STATUS_STYLES.draft
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-600">
                          {c.stats.totalParticipants}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-600">
                          {c.stats.selfCompleted}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-600">
                          {c.stats.managerCompleted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---- HR: one-on-one assignments -------------------------------- */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              One-on-one assessments ({hub.oneOnOnes.length})
            </h2>
            {hub.oneOnOnes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No one-on-one assessments sent yet. Use “Send one-on-one” to
                assess a single employee.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-medium">Employee</th>
                      <th className="px-3 py-3 font-medium">Sent</th>
                      <th className="px-3 py-3 font-medium">Self side</th>
                      <th className="px-3 py-3 font-medium">Manager side</th>
                      <th className="px-3 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hub.oneOnOnes.map((o) => (
                      <tr
                        key={o.campaignId.toString()}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-3">
                          {o.employeeId ? (
                            <Link
                              href={`/employees/${o.employeeId.toString()}`}
                              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                            >
                              <User className="h-3.5 w-3.5" />
                              {o.employeeName}
                            </Link>
                          ) : (
                            <span className="text-slate-500">
                              {o.employeeName}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {shortDate(o.sentAt)}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {STATUS_LABEL[o.selfStatus] ?? o.selfStatus}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {o.selfStatus === "submitted" &&
                          o.managerStatus === "not_started" ? (
                            <span className="text-gap-developing">
                              Awaiting rating
                            </span>
                          ) : (
                            (STATUS_LABEL[o.managerStatus] ?? o.managerStatus)
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {o.assessmentId && o.selfStatus !== "submitted" && (
                            <ResendLinkButton
                              assessmentId={o.assessmentId.toString()}
                            />
                          )}
                          {o.assessmentId &&
                            o.selfStatus === "submitted" &&
                            o.managerStatus !== "submitted" && (
                              <SendManagerLinkButton
                                assessmentId={o.assessmentId.toString()}
                                raters={raters}
                                currentRaterId={
                                  o.lineManagerId?.toString() ?? null
                                }
                                label={
                                  o.managerStatus === "not_started"
                                    ? "Send to manager"
                                    : "Resend to manager"
                                }
                              />
                            )}
                          {o.assessmentId &&
                            o.managerStatus === "submitted" && (
                              <Link
                                href={`/results/${o.assessmentId.toString()}`}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                View results
                              </Link>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
