/** Church report "Last, First Middle" → Mantle "First Middle Last". */
export function reportNameToMantleName(reportName: string): string {
  const raw = reportName.replace(/\s+/g, " ").trim();
  if (!raw) return raw;
  if (!raw.includes(",")) return raw;
  const [last, ...rest] = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const first = rest.join(" ").trim();
  if (!first) return last;
  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}
