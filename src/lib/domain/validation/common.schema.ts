import { z } from "zod";
import { ObjectId } from "mongodb";

/** Accepts a 24-char hex string or an ObjectId, returns an ObjectId. */
export const objectIdSchema = z
  .union([z.string(), z.instanceof(ObjectId)])
  .refine((v) => ObjectId.isValid(v), { message: "Invalid ObjectId" })
  .transform((v) => new ObjectId(v));
