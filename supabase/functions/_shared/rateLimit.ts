/** Per-isolate sliding window; best-effort for serverless. Optional Redis can be wired later. */
const bucket = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX = 100;

export function rateLimitUser(userId: string): boolean {
  const now = Date.now();
  const arr = bucket.get(userId) ?? [];
  const pruned = arr.filter((t) => now - t < WINDOW_MS);
  pruned.push(now);
  bucket.set(userId, pruned);
  return pruned.length <= MAX;
}
