import { z } from "zod";

const level = z.coerce.number().min(0).max(5);

export const thresholdsSchema = z
  .object({
    gap: z
      .object({
        strongMax: level,
        developingMax: level,
        needsFocusMax: level,
      })
      .refine((g) => g.strongMax < g.developingMax, {
        message: "Strong max must be below developing max",
        path: ["developingMax"],
      })
      .refine((g) => g.developingMax < g.needsFocusMax, {
        message: "Developing max must be below needs-focus max",
        path: ["needsFocusMax"],
      }),
    calibration: z
      .object({
        alignedMax: level,
        minorMax: level,
      })
      .refine((c) => c.alignedMax < c.minorMax, {
        message: "Aligned max must be below minor-outlier max",
        path: ["minorMax"],
      }),
  });
