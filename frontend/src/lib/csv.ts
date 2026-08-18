/**
 * Minimal CSV export — no library. Builds a CSV string from headers +
 * rows and triggers a browser download. Keep this file small and
 * dependency-free so the export path stays maintainable.
 */

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Quote when the cell contains a comma, quote, or newline.
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Builds and downloads a CSV file.
 *
 * @param filename  e.g. "sales-report.csv" (no path)
 * @param headers   column headers
 * @param rows      row values, aligned with headers
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  // BOM so Excel opens UTF-8 (₹ symbols) correctly.
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
