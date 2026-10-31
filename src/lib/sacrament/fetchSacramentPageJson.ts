import type { SacramentPageBundle } from "@/app/(ward)/sacrament/loadSacramentState";
import type { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import { readSacramentPageCache, writeSacramentPageCache } from "./sacramentPageCache";
import { sacramentQueryKeys } from "./sacramentQueryKeys";

export type SacramentPageQueryKey = ReturnType<typeof sacramentQueryKeys.page>;

/** Memory → IndexedDB → network. Prefetch/setQueryData hits skip the network. */
export async function loadSacramentPageQuery(
  queryClient: QueryClient,
  ctx: QueryFunctionContext<SacramentPageQueryKey>,
): Promise<SacramentPageBundle> {
  const hit = queryClient.getQueryData<SacramentPageBundle>(ctx.queryKey);
  if (hit) return hit;
  const [, , wardId, date] = ctx.queryKey;
  const fromIdb = await readSacramentPageCache(wardId, date);
  if (fromIdb) {
    queryClient.setQueryData(ctx.queryKey, fromIdb);
    return fromIdb;
  }
  const fresh = await fetchSacramentPageJson(wardId, date);
  queryClient.setQueryData(ctx.queryKey, fresh);
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
