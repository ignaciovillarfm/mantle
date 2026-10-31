/**
 * Parse Church “Members with Callings” PDF into structured rows.
 * Uses pdfjs text items + X positions (columns are fixed on the report).
 */

export type PdfCallingRow = {
  memberName: string;
  gender: string | null;
  age: number | null;
  organization: string;
  callingTitle: string;
  sustainedDate: string | null;
  setApart: boolean;
};

type TextItem = { str: string; x: number; y: number };

const COL = {
  name: 39,
  gender: 158,
  age: 193,
  birth: 215,
  org: 269,
  calling: 356,
  sustained: 483,
  setApart: 549,
} as const;

const COL_TOL = {
  name: 50,
  gender: 18,
  age: 12,
  birth: 25,
  org: 40,
  calling: 55,
  sustained: 35,
  setApart: 40,
} as const;

function nearestCol(x: number): keyof typeof COL | null {
  let best: keyof typeof COL | null = null;
  let bestDist = Infinity;
  for (const key of Object.keys(COL) as (keyof typeof COL)[]) {
    const dist = Math.abs(x - COL[key]);
    if (dist < bestDist && dist <= COL_TOL[key]) {
      bestDist = dist;
      best = key;
    }
  }
  return best;
}

function parseSustainedDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const mon = months[m[2].toLowerCase()];
  if (!mon) return null;
  const day = m[1].padStart(2, "0");
  return `${m[3]}-${mon}-${day}`;
}

function isJunkLine(name: string, org: string, calling: string): boolean {
  const n = name.toLowerCase();
  if (!name.trim() && !calling.trim()) return true;
  if (n.includes("members with callings")) return true;
  if (n.includes("printed by")) return true;
  if (n.includes("page ")) return true;
  if (n === "name" || org.toLowerCase() === "organization") return true;
  if (n.startsWith("west park")) return true;
  return false;
}

type LineBucket = {
  y: number;
  name: string;
  gender: string;
  age: string;
  birth: string;
  org: string;
  calling: string;
  sustained: string;
  setApart: string;
};

function emptyLine(y: number): LineBucket {
  return {
    y,
    name: "",
    gender: "",
    age: "",
    birth: "",
    org: "",
    calling: "",
    sustained: "",
    setApart: "",
  };
}

function mergeContinuation(prev: LineBucket, cur: LineBucket): void {
  if (cur.name) prev.name = `${prev.name} ${cur.name}`.trim();
  if (cur.org) prev.org = `${prev.org} ${cur.org}`.trim();
  if (cur.calling) prev.calling = `${prev.calling} ${cur.calling}`.trim();
  if (cur.gender) prev.gender = cur.gender;
  if (cur.age) prev.age = cur.age;
  if (cur.birth) prev.birth = cur.birth;
  if (cur.sustained) prev.sustained = cur.sustained;
  if (cur.setApart) prev.setApart = cur.setApart;
}

function isContinuation(line: LineBucket): boolean {
  // Wrapped name/calling with no age/gender/sustained of its own
  const hasMeta = Boolean(line.gender || line.age || line.sustained || line.setApart);
  if (hasMeta) return false;
  if (line.name && !line.calling && !line.org) return true;
  if (line.calling && !line.name && !line.org) return true;
  if (line.org && !line.name && !line.calling) return true;
  if (line.name && line.calling && !line.age && !line.gender) return true;
  return false;
}

export async function parseMembersWithCallingsPdf(
  data: ArrayBuffer | Uint8Array,
): Promise<PdfCallingRow[]> {
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const fs = await import("node:fs");

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Next/webpack otherwise looks for pdf.worker.mjs under .next/server/vendor-chunks.
  const workerFsPath = path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  );
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerFsPath).href;

  // pdfjs rejects Node Buffer; always pass a plain Uint8Array copy.
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise;


  const items: TextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str?.trim()) continue;
      const t = raw.transform;
      items.push({ str: raw.str, x: t[4], y: t[5] + p * 10000 });
    }
  }

  // Group by Y (same line)
  const byY = new Map<number, TextItem[]>();
  for (const it of items) {
    const key = Math.round(it.y);
    const list = byY.get(key) ?? [];
    list.push(it);
    byY.set(key, list);
  }

  const lines: LineBucket[] = [];
  const sortedYs = [...byY.keys()].sort((a, b) => b - a);
  for (const y of sortedYs) {
    const lineItems = byY.get(y)!;
    lineItems.sort((a, b) => a.x - b.x);
    const bucket = emptyLine(y);
    for (const it of lineItems) {
      const col = nearestCol(it.x);
      if (!col) continue;
      const piece = it.str.trim();
      if (!piece) continue;
      bucket[col] = bucket[col] ? `${bucket[col]} ${piece}` : piece;
    }
    if (!bucket.name && !bucket.calling && !bucket.org) continue;
    lines.push(bucket);
  }

  // Merge wrapped continuations into previous data row
  const merged: LineBucket[] = [];
  for (const line of lines) {
    if (isJunkLine(line.name, line.org, line.calling)) continue;
    if (merged.length > 0 && isContinuation(line)) {
      mergeContinuation(merged[merged.length - 1], line);
      continue;
    }
    // Real rows usually have a name; org/calling may wrap onto next lines
    if (!line.name.trim() && merged.length > 0) {
      mergeContinuation(merged[merged.length - 1], line);
      continue;
    }
    merged.push(line);
  }

  const rows: PdfCallingRow[] = [];
  for (const line of merged) {
    const memberName = line.name.replace(/\s+/g, " ").trim();
    const callingTitle = line.calling.replace(/\s+/g, " ").trim();
    const organization = line.org.replace(/\s+/g, " ").trim();
    if (!memberName || !callingTitle) continue;
    if (isJunkLine(memberName, organization, callingTitle)) continue;

    const ageNum = line.age ? Number.parseInt(line.age, 10) : NaN;
    rows.push({
      memberName,
      gender: line.gender || null,
      age: Number.isFinite(ageNum) ? ageNum : null,
      organization,
      callingTitle,
      sustainedDate: parseSustainedDate(line.sustained),
      setApart: isSetApartMark(line.setApart),
    });
  }

  return rows;
}

/** Church PDF uses ✔ (or Yes) in the Set Apart column. */
function isSetApartMark(raw: string): boolean {
  const s = raw.trim();
  if (!s) return true;
  if (/^yes$/i.test(s)) return true;
  if (/[✓✔☑]/.test(s)) return true;
  if (/^no$/i.test(s)) return false;
  return true;
}
