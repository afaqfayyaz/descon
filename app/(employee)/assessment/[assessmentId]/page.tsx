import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { questionnaireService } from "@/lib/services/questionnaire.service";
import { Questionnaire } from "@/components/features/assessment/questionnaire";
import { AppError } from "@/lib/utils/errors";

export default async function AssessmentPage({
  params,
}: {
  params: { assessmentId: string };
}) {
  const session = await requireSession();
  if (!ObjectId.isValid(params.assessmentId)) notFound();

  try {
    const data = await questionnaireService.getSelfQuestionnaire(
      new ObjectId(params.assessmentId),
      new ObjectId(session.user.id),
      session.user.roles.includes("hr_admin"),
    );
    return <Questionnaire data={data} />;
  } catch (error) {
    if (error instanceof AppError) notFound();
    throw error;
  }
}
