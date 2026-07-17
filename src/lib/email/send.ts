import { emailEnabled, fromAddress, getTransport } from "@/lib/email/client";
import { logger } from "@/lib/utils/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a single email. Never throws — delivery problems are logged so they
 * cannot break the surrounding business operation. No-ops (logs) when SMTP
 * is not configured.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    logger.debug(
      { to: message.to, subject: message.subject },
      "email skipped (SMTP not configured)",
    );
    return false;
  }
  try {
    const from = fromAddress();
    // Bare address out of `Name <address>` for the reply/unsubscribe headers.
    const bareAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
    await transport.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html ?? wrapHtml(message.text),
      // Deliverability: mailbox providers score notification mail without a
      // reply path or List-Unsubscribe as spammier. These don't change what
      // recipients see, only how filters classify the message.
      replyTo: from,
      headers: {
        "List-Unsubscribe": `<mailto:${bareAddress}?subject=unsubscribe>`,
      },
    });
    return true;
  } catch (error) {
    logger.error({ error, to: message.to }, "failed to send email");
    return false;
  }
}

/** Send many emails, swallowing individual failures. Returns count sent. */
export async function sendEmails(messages: EmailMessage[]): Promise<number> {
  if (!emailEnabled() || messages.length === 0) return 0;
  let sent = 0;
  for (const m of messages) {
    if (await sendEmail(m)) sent += 1;
  }
  return sent;
}

function wrapHtml(text: string): string {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#0f172a;line-height:1.6">${safe.replace(/\n/g, "<br/>")}</div>`;
}
