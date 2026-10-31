import type { SacramentPageBundle } from "@/app/(ward)/sacrament/loadSacramentState";
import { wardDb } from "@/lib/wardDb";

export function sacramentPageCacheKey(wardId: string, date: string): string {
  return `sacrament:page:${wardId}:${date}`;
}

export async function readSacramentPageCache(
  wardId: string,
  date: string,
): Promise<SacramentPageBundle | null> {
  if (!wardDb) return null;
  const row = await wardDb.cache.get(sacramentPageCacheKey(wardId, date));
  if (!row) return null;
  try {
    return JSON.parse(row.json) as SacramentPageBundle;
  } catch {
    return null;
  }
}

export async function writeSacramentPageCache(
  wardId: string,
  date: string,
  bundle: SacramentPageBundle,
): Promise<void> {
  if (!wardDb) return;
  await wardDb.cache.put({
    key: sacramentPageCacheKey(wardId, date),
    json: JSON.stringify(bundle),
    updatedAt: Date.now(),
  });
}
