"use client";

import {
  readWardPageCache,
  writeWardPageCache,
  WARD_PAGE_GC_MS,
  WARD_PAGE_STALE_MS,
} from "@/lib/wardPageCache";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type SetStateAction,
} from "react";

/**
 * Page list/state cache: React Query memory → IndexedDB → SSR seed.
 * Never lets a later RSC `serverData` clobber a warm client cache.
 * Call `setData` after mutations so the UI and IDB update immediately.
 */
export function useWardCachedState<T>(queryKey: readonly unknown[], serverData: T) {
  const queryClient = useQueryClient();
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;
  const keyStable = JSON.stringify(queryKey);

  const memory = queryClient.getQueryData<T>(queryKey);
  if (memory === undefined) {
    queryClient.setQueryData(queryKey, serverData);
  }

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const hit = queryClient.getQueryData<T>(queryKey);
      if (hit !== undefined) return hit;
      const fromIdb = await readWardPageCache<T>(queryKey);
      if (fromIdb !== null) {
        queryClient.setQueryData(queryKey, fromIdb);
        return fromIdb;
      }
      return serverData;
    },
    initialData: memory ?? serverData,
    staleTime: WARD_PAGE_STALE_MS,
    gcTime: WARD_PAGE_GC_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useLayoutEffect(() => {
    if (queryClient.getQueryData(queryKey) !== undefined) return;
    let cancelled = false;
    void (async () => {
      const fromIdb = await readWardPageCache<T>(queryKey);
      if (cancelled || fromIdb === null) return;
      if (queryClient.getQueryData(queryKey) !== undefined) return;
      queryClient.setQueryData(queryKey, fromIdb);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyStable, queryClient]);

  const value = (queryClient.getQueryData<T>(queryKey) ?? data ?? serverData) as T;

  useEffect(() => {
    void writeWardPageCache(queryKey, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyStable, value]);

  const setData = useCallback(
    (updater: SetStateAction<T>) => {
      const key = keyRef.current;
      queryClient.setQueryData<T>(key, (prev) => {
        const base = (prev ?? value) as T;
        return typeof updater === "function" ? (updater as (p: T) => T)(base) : updater;
      });
    },
    [queryClient, value],
  );

  return [value, setData] as const;
}
