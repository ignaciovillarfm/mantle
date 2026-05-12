import type { SacramentPageBundle } from "@/app/(ward)/sacrament/loadSacramentState";
import type { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import { sacramentQueryKeys } from "./sacramentQueryKeys";

export type SacramentPageQueryKey = ReturnType<typeof sacramentQueryKeys.page>;

/** Prefetch fills the cache but `placeholderData` does not count as `data`, so the default `queryFn` still hit the network. Return cache first to avoid duplicate ~GET /api/sacrament/state. */
export function loadSacramentPageQuery(
  queryClient: QueryClient,
  ctx: QueryFunctionContext<SacramentPageQueryKey>,
): Promise<SacramentPageBundle> {
  const hit = queryClient.getQueryData<SacramentPageBundle>(ctx.queryKey);
  if (hit) return Promise.resolve(hit);
  const [, , wardId, date] = ctx.queryKey;
  return fetchSacramentPageJson(wardId, date);
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
