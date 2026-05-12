/**
 * Calling workflow order — keep in sync with
 * `supabase/functions/_shared/callingTransitions.ts` (CALLING_STATUSES).
 */
const CALLING_STATUSES = [
  "Proposed",
  "Extended",
  "Accepted",
  "To Sustain",
  "Set Apart",
] as const;

export function getNextCallingStatus(current: string): string | null {
  const i = CALLING_STATUSES.indexOf(current as (typeof CALLING_STATUSES)[number]);
  if (i < 0 || i >= CALLING_STATUSES.length - 1) return null;
  return CALLING_STATUSES[i + 1];
}
