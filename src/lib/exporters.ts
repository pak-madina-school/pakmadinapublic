/**
 * Export helpers shared by every "Export PDF / Export Excel / Print" button
 * in the app. Excel export uses the `xlsx` (SheetJS) package — add it with
 * `npm install xlsx`. PDF export reuses the browser's print-to-PDF via a
 * dedicated printable view (see printAsPdf) rather than a separate PDF
 * library, since report cards/receipts already need print-perfect HTML.
 */

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export async function exportToExcel(filename: string, rows: Record<string, unknown>[], sheetName = "Sheet1") {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Opens a hidden iframe containing `html`, triggers the browser's print
 * dialog (which offers "Save as PDF"), then cleans up. Use for report
 * cards, receipts, question papers — anything that needs exact layout.
 */
export function printAsPdf(html: string, title = "Document") {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body>${html}</body></html>`);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 250);
}
