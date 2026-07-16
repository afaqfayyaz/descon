import { tokenService } from "@/lib/services/token.service";
import { questionnaireService } from "@/lib/services/questionnaire.service";
import { TokenQuestionnaire } from "@/components/features/assessment/token-questionnaire";
import { TokenRatingForm } from "@/components/features/manager/token-rating-form";

export const dynamic = "force-dynamic";

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{body}</p>
      </div>
    </div>
  );
}

export default async function TokenAssessmentPage({
  params,
}: {
  params: { token: string };
}) {
  const res = await tokenService.resolveToken(params.token);

  if (res.status === "consumed") {
    return (
      <Notice
        title="Already submitted"
        body="This assessment has already been submitted. Thank you — no further action is needed."
      />
    );
  }
  if (res.status === "expired") {
    return (
      <Notice
        title="Link expired"
        body="This secure link has expired. Please contact HR to have a new one sent to you."
      />
    );
  }
  if (res.status !== "ok") {
    return (
      <Notice
        title="Invalid link"
        body="This link is not valid. Please use the most recent link emailed to you, or contact HR."
      />
    );
  }

  if (res.kind === "self") {
    const data = await questionnaireService.getSelfQuestionnaire(
      res.assessment._id,
      res.assessment.employeeId,
      false,
    );
    return <TokenQuestionnaire data={data} token={params.token} />;
  }

  // manager
  if (!res.assessment.lineManagerId) {
    return (
      <Notice
        title="No reviewer assigned"
        body="There is no line manager on file for this assessment. Please contact HR."
      />
    );
  }
  const data = await questionnaireService.getManagerSheet(
    res.assessment._id,
    res.assessment.lineManagerId,
    false,
  );
  return <TokenRatingForm data={data} token={params.token} />;
}
