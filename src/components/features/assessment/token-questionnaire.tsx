"use client";

import { Questionnaire } from "./questionnaire";
import {
  saveAnswerByTokenAction,
  submitSelfByTokenAction,
} from "@/lib/actions/token-assessment.actions";
import type { SelfQuestionnaire } from "@/lib/services/questionnaire.service";

/** Self-assessment questionnaire bound to a secure access token (no login). */
export function TokenQuestionnaire({
  data,
  token,
}: {
  data: SelfQuestionnaire;
  token: string;
}) {
  return (
    <Questionnaire
      data={data}
      saveAnswer={(questionId, version, option) =>
        saveAnswerByTokenAction(token, questionId, version, option)
      }
      submitAssessment={() => submitSelfByTokenAction(token)}
      doneHref={`/a/${token}/done`}
      exitHref={`/a/${token}`}
    />
  );
}
