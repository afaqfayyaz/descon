"use client";

import { RatingForm } from "./rating-form";
import {
  saveRatingByTokenAction,
  submitManagerByTokenAction,
} from "@/lib/actions/token-assessment.actions";
import type { ManagerSheet } from "@/lib/services/questionnaire.service";

/** Manager rating sheet bound to a secure access token (no login). */
export function TokenRatingForm({
  data,
  token,
}: {
  data: ManagerSheet;
  token: string;
}) {
  return (
    <RatingForm
      data={data}
      saveRating={(subId, rating, evidence) =>
        saveRatingByTokenAction(token, subId, rating, evidence)
      }
      submitRatings={() => submitManagerByTokenAction(token)}
      doneHref={`/a/${token}/done`}
      exitHref={`/a/${token}`}
    />
  );
}
