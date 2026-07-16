import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@/lib/utils/logger";

let cached: Transporter | null = null;

/** True when SMTP is configured via environment variables. */
export function emailEnabled(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

/**
 * Lazily build a shared Nodemailer transport from SMTP_* env vars
 * (ARCHITECTURE.md §Email). Returns null when email is not configured so
 * callers can degrade gracefully in dev.
 */
export function getTransport(): Transporter | null {
  if (!emailEnabled()) return null;
  if (cached) return cached;

  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });
  logger.info({ host: process.env.SMTP_HOST }, "SMTP transport initialized");
  return cached;
}

export function fromAddress(): string {
  return process.env.SMTP_FROM ?? "Caliber <noreply@caliber.app>";
}
