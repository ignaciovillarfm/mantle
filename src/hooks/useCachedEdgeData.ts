"use client";

import { wardDb } from "@/lib/wardDb";
import { useEffect, useState } from "react";

/** Stale-while-revalidate: show IndexedDB immediately, then refresh from the network. */
export function useCachedEdgeData<T>(
  cacheKey: string,
  apiPath: string,
  initial: T | null = null,
) {
  const [data, setData] = useState<T | null>(initial);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCache(): Promise<T | null> {
      if (!wardDb) return null;
      const row = await wardDb.cache.get(cacheKey);
      if (!row) return null;
      try {
        return JSON.parse(row.json) as T;
      } catch {
        return null;
      }
    }

    async function run() {
      const cached = await loadFromCache();
      if (!cancelled && cached) {
        setData(cached);
        setFromCache(true);
        setLoading(false);
      }

      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        if (!cancelled) {
          if (!cached) setData(null);
          setFromCache(!!cached);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(apiPath);
        const text = await res.text();
        if (!cancelled) {
          if (!res.ok) throw new Error(text);
          const json = JSON.parse(text) as T;
          setData(json);
          setFromCache(false);
          if (wardDb) {
            await wardDb.cache.put({
              key: cacheKey,
              json: JSON.stringify(json),
              updatedAt: Date.now(),
            });
          }
        }
      } catch {
        if (!cancelled && !cached) {
          setData(null);
          setFromCache(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, apiPath]);

  return { data, fromCache, loading };
}
