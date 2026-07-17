import { describe, expect, it } from "vitest";

import { escapeHtml, renderEmail } from "@/lib/email/template";

describe("escapeHtml", () => {
  it("neutralises markup and quotes", () => {
    expect(escapeHtml(`<img src=x onerror="pwn('&')">`)).toBe(
      "&lt;img src=x onerror=&quot;pwn(&#39;&amp;&#39;)&quot;&gt;",
    );
  });
});

describe("renderEmail", () => {
  const content = {
    heading: "Your assessment is ready",
    greeting: "Afaq",
    body: ["First paragraph.", "Second paragraph."],
    meta: [{ label: "Due by", value: "15 August 2026" }],
    cta: { label: "Start assessment", url: "https://app.example/a/tok123" },
    callout: "Don't forward this link.",
    footnote: "Expires in 30 days.",
  };

  it("produces both an HTML part and a plain-text part", () => {
    const { html, text } = renderEmail(content);
    expect(html).toContain("<html");
    expect(text).not.toContain("<");
  });

  it("carries every piece of content into both parts", () => {
    const { html, text } = renderEmail(content);
    for (const part of [html, text]) {
      expect(part).toContain("Your assessment is ready");
      expect(part).toContain("Afaq");
      expect(part).toContain("First paragraph.");
      expect(part).toContain("15 August 2026");
      expect(part).toContain("https://app.example/a/tok123");
      expect(part).toContain("Expires in 30 days.");
    }
  });

  it("escapes user-controlled values in the HTML part", () => {
    const { html } = renderEmail({
      heading: `<script>alert(1)</script>`,
      body: [`Bob <bob@evil.example> says "hi" & bye`],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;hi&quot; &amp; bye");
  });

  it("omits optional sections cleanly", () => {
    const { html, text } = renderEmail({ heading: "Just a note", body: ["Hi."] });
    expect(html).not.toContain("Or paste this link");
    expect(text.trim().startsWith("Just a note")).toBe(true);
  });
});
