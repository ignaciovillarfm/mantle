import { wardDb } from "@/lib/wardDb";

/** Keep inactive page caches around across navigations (matches sacrament). */
export const WARD_PAGE_GC_MS = 24 * 60 * 60 * 1000;
export const WARD_PAGE_STALE_MS = Number.POSITIVE_INFINITY;

export const wardPageKeys = {
  members: ["ward", "members"] as const,
  callings: (scope: string) => ["ward", "callings", scope] as const,
  calendar: (wardId: string, month: string) => ["ward", "calendar", wardId, month] as const,
  sacramentBread: (wardId: string) => ["ward", "sacrament-bread", wardId] as const,
  youthClasses: (wardId: string) => ["ward", "youth-classes", wardId] as const,
  youthActivities: (wardId: string) => ["ward", "youth-activities", wardId] as const,
};

export function wardPageCacheStorageKey(queryKey: readonly unknown[]): string {
  return `page:${queryKey.map(String).join(":")}`;
}

export async function readWardPageCache<T>(queryKey: readonly unknown[]): Promise<T | null> {
  if (!wardDb) return null;
  const row = await wardDb.cache.get(wardPageCacheStorageKey(queryKey));
  if (!row) return null;
  try {
    return JSON.parse(row.json) as T;
  } catch {
    return null;
  }
}

export async function writeWardPageCache<T>(
  queryKey: readonly unknown[],
  data: T,
): Promise<void> {
  if (!wardDb) return;
  await wardDb.cache.put({
    key: wardPageCacheStorageKey(queryKey),
    json: JSON.stringify(data),
    updatedAt: Date.now(),
  });
}
