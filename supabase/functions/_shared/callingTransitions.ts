export const CALLING_STATUSES = [
  "Proposed",
  "Extended",
  "Accepted",
  "To Sustain",
  "Set Apart",
] as const;

export type CallingStatus = (typeof CALLING_STATUSES)[number];

const ORDER = new Map<string, number>(
  CALLING_STATUSES.map((s, i) => [s, i]),
);

/** Single forward step in the workflow (server source of truth). */
export function nextCallingStatus(from: string): CallingStatus | null {
  if (!ORDER.has(from)) return null;
  const i = ORDER.get(from)!;
  if (i >= CALLING_STATUSES.length - 1) return null;
  return CALLING_STATUSES[i + 1];
}

export function assertAllowedTransition(
  from: string | null,
  to: string,
): CallingStatus {
  if (!ORDER.has(to)) {
    throw new Error(`Invalid status: ${to}`);
  }
  const next = to as CallingStatus;
  if (from === null || from === "") {
    if (next !== "Proposed") throw new Error("Initial status must be Proposed");
    return next;
  }
  if (!ORDER.has(from)) throw new Error(`Unknown current status: ${from}`);
  const i = ORDER.get(from)!;
  const j = ORDER.get(next)!;
  if (j !== i + 1) {
    throw new Error(`Disallowed transition: ${from} → ${next}`);
  }
  return next;
}
