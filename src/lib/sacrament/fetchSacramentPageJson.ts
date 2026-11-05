import type { SacramentPageBundle } from "@/app/(ward)/sacrament/loadSacramentState";
import type { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import { writeSacramentPageCache } from "./sacramentPageCache";
import { sacramentQueryKeys } from "./sacramentQueryKeys";

export type SacramentPageQueryKey = ReturnType<typeof sacramentQueryKeys.page>;

/**
 * Always fetch from the network when React Query asks.
 * IndexedDB is only for instant paint (see SacramentClient hydrate) — never a
 * permanent substitute for the DB, or localhost drifts from production forever.
 */
export async function loadSacramentPageQuery(
  _queryClient: QueryClient,
  ctx: QueryFunctionContext<SacramentPageQueryKey>,
): Promise<SacramentPageBundle> {
  const [, , wardId, date] = ctx.queryKey;
  const fresh = await fetchSacramentPageJson(wardId, date);
  void writeSacramentPageCache(wardId, date, fresh);
  return fresh;
}

export async function fetchSacramentPageJson(wardId: string, meetingDate: string): Promise<SacramentPageBundle> {
  const q = new URLSearchParams({ wardId, date: meetingDate });
  const res = await fetch(`/api/sacrament/state?${q}`, { credentials: "same-origin" });
  const json = (await res.json()) as { error?: string } | SacramentPageBundle;
  if (!res.ok) {
    throw new Error(typeof json === "object" && json && "error" in json && typeof json.error === "string" ? json.error : `HTTP ${res.status}`);
  }
  return json as SacramentPageBundle;
}
