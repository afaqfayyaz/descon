/**
 * Branded HTML email rendering.
 *
 * Email clients are not browsers: Outlook renders through Word (no flexbox,
 * grid, or modern CSS), Gmail strips much of <head>, and support for external
 * assets is unreliable. So every template here is a nested table with inline
 * styles, fixed at 600px, using only web-safe fonts and hex colours drawn from
 * the app's palette (tailwind.config.ts). No images — the wordmark is text, so
 * nothing breaks when a client blocks remote content by default.
 *
 * Pure functions — no I/O (CODING_STANDARDS §Domain).
 */

/** Palette mirrored from tailwind.config.ts — keep in sync. */
const C = {
  navy: "#16305C",
  navyDark: "#102544",
  accent: "#0A84FF",
  accentHover: "#0066E0",
  textPrimary: "#0F1B2D",
  textSecondary: "#475569",
  textTertiary: "#8190A5",
  border: "#E2E8F0",
  surface: "#FFFFFF",
  sunken: "#F4F6FA",
  bg: "#F1F4F9",
  warning: "#F59E0B",
  warningBg: "#FEF6E7",
} as const;

const FONT =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface EmailMeta {
  label: string;
  value: string;
}

export interface EmailContent {
  /** Big line at the top of the card. */
  heading: string;
  /** Recipient's first name; omitted greeting when absent. */
  greeting?: string;
  /** Body paragraphs, plain text (escaped on render). */
  body: string[];
  /** Optional call-to-action button. */
  cta?: { label: string; url: string };
  /** Optional key/value rows shown in a bordered box (deadline, campaign…). */
  meta?: EmailMeta[];
  /** Optional highlighted caution line (e.g. "don't share this link"). */
  callout?: string;
  /** Small print under the button. */
  footnote?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render one branded email to HTML plus a plain-text fallback. Both are always
 * produced: some clients (and most spam filters) want a real text/plain part.
 */
export function renderEmail(content: EmailContent): {
  html: string;
  text: string;
} {
  return { html: renderHtml(content), text: renderText(content) };
}

function renderText(c: EmailContent): string {
  const lines: string[] = [];
  if (c.greeting) lines.push(`Hi ${c.greeting},`, "");
  lines.push(c.heading, "");
  for (const p of c.body) lines.push(p, "");
  if (c.meta?.length) {
    for (const m of c.meta) lines.push(`${m.label}: ${m.value}`);
    lines.push("");
  }
  if (c.callout) lines.push(c.callout, "");
  if (c.cta) lines.push(`${c.cta.label}: ${c.cta.url}`, "");
  if (c.footnote) lines.push(c.footnote);
  return lines.join("\n").trim();
}

function renderHtml(c: EmailContent): string {
  const paragraphs = c.body
    .map(
      (p) =>
        `<p class="t-secondary" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.textSecondary};">${escapeHtml(p)}</p>`,
    )
    .join("");

  const greeting = c.greeting
    ? `<p class="t-secondary" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.textSecondary};">Hi ${escapeHtml(c.greeting)},</p>`
    : "";

  const meta = c.meta?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="metabox" style="border-collapse:separate;background-color:${C.sunken};border:1px solid ${C.border};border-radius:8px;margin:0 0 24px;">
         <tr><td style="padding:16px 20px;">
           <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
             ${c.meta
               .map(
                 (m, i) => `<tr>
               <td class="t-tertiary" style="padding:${i === 0 ? "0" : "8px"} 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.textTertiary};text-transform:uppercase;letter-spacing:0.4px;white-space:nowrap;">${escapeHtml(m.label)}</td>
               <td align="right" class="t-primary" style="padding:${i === 0 ? "0" : "8px"} 0 0;font-family:${FONT};font-size:14px;line-height:18px;color:${C.textPrimary};font-weight:600;">${escapeHtml(m.value)}</td>
             </tr>`,
               )
               .join("")}
           </table>
         </td></tr>
       </table>`
    : "";

  const callout = c.callout
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;background-color:${C.warningBg};border-left:3px solid ${C.warning};border-radius:4px;margin:0 0 24px;">
         <tr><td style="padding:12px 16px;font-family:${FONT};font-size:13px;line-height:20px;color:#8A5A00;">${escapeHtml(c.callout)}</td></tr>
       </table>`
    : "";

  // Bulletproof button: VML for Outlook (which ignores padding on <a>),
  // a padded anchor everywhere else.
  const cta = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
         <tr><td align="center" bgcolor="${C.accent}" style="border-radius:8px;">
           <!--[if mso]>
           <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
             href="${escapeHtml(c.cta.url)}" style="height:44px;v-text-anchor:middle;width:260px;" arcsize="18%" stroke="f" fillcolor="${C.accent}">
             <w:anchorlock/>
             <center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;">${escapeHtml(c.cta.label)}</center>
           </v:roundrect>
           <![endif]-->
           <!--[if !mso]><!-- -->
           <a href="${escapeHtml(c.cta.url)}"
              style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${C.accent};">${escapeHtml(c.cta.label)}</a>
           <!--<![endif]-->
         </td></tr>
       </table>
       <p class="t-tertiary" style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.textTertiary};">Or paste this link into your browser:</p>
       <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:18px;word-break:break-all;">
         <a href="${escapeHtml(c.cta.url)}" style="color:${C.accent};text-decoration:underline;">${escapeHtml(c.cta.url)}</a>
       </p>`
    : "";

  const footnote = c.footnote
    ? `<p class="t-tertiary" style="margin:16px 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.textTertiary};">${escapeHtml(c.footnote)}</p>`
    : "";

  // Preheader: the grey preview line in the inbox. Pulled from the first body
  // paragraph, then padded so the client doesn't spill body copy into it.
  const preheader = escapeHtml(c.body[0] ?? c.heading);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="color-scheme" content="light dark"/>
<meta name="supported-color-schemes" content="light dark"/>
<title>${escapeHtml(c.heading)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  @media only screen and (max-width:620px){
    .wrap{width:100% !important;}
    .pad{padding-left:24px !important;padding-right:24px !important;}
  }
  @media (prefers-color-scheme:dark){
    .body-bg{background-color:#0B1220 !important;}
    .card{background-color:#111C31 !important;border-color:#22314C !important;}
    .t-primary{color:#E8EEF9 !important;}
    .t-secondary{color:#AEBBD0 !important;}
    .t-tertiary{color:#7F8DA5 !important;}
    .metabox{background-color:#0E1829 !important;border-color:#22314C !important;}
  }
</style>
</head>
<body class="body-bg" style="margin:0;padding:0;background-color:${C.bg};">
<div style="display:none;font-size:1px;color:${C.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="body-bg" style="background-color:${C.bg};">
  <tr><td align="center" style="padding:32px 12px;">

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="wrap" style="width:600px;max-width:600px;">

      <!-- header -->
      <tr><td style="padding:0 0 20px;">
        <span style="font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:2px;color:${C.navy};" class="t-primary">CALIBER</span>
      </td></tr>

      <!-- card -->
      <tr><td class="card" style="background-color:${C.surface};border:1px solid ${C.border};border-radius:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="height:4px;background-color:${C.navy};border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td class="pad" style="padding:32px 40px 36px;">
            <h1 style="margin:0 0 20px;font-family:${FONT};font-size:21px;line-height:29px;font-weight:700;color:${C.textPrimary};" class="t-primary">${escapeHtml(c.heading)}</h1>
            ${greeting}
            ${paragraphs}
            ${meta}
            ${callout}
            ${cta}
            ${footnote}
          </td></tr>
        </table>
      </td></tr>

      <!-- footer -->
      <tr><td class="pad" style="padding:20px 40px 0;">
        <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.textTertiary};" class="t-tertiary">
          Caliber — competency assessment platform. This is an automated message; replies aren't monitored.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
