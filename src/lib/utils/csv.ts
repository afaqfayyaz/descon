export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV document from a header row and data rows.
 * Prepends a UTF-8 BOM so Excel renders accented characters correctly,
 * and uses CRLF line endings per RFC 4180.
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCell).join(","),
  );
  return "\uFEFF" + lines.join("\r\n");
}

/** Slugify a label into a safe filename fragment. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "export"
  );
}
