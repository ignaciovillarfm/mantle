import { createClient } from "@/lib/supabase/server";

export async function callEdgeFunction<T>(
  name: string,
  options: {
    method?: "GET" | "POST";
    query?: Record<string, string>;
    body?: unknown;
  } = {},
): Promise<T> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const payload =
    options.method === "GET"
      ? options.query ?? {}
      : options.body ?? options.query ?? {};

  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
  });

  if (error) {
    let contextStatus: number | null = null;
    let contextBody: string | null = null;
    const errAny = error as unknown as { context?: Response; message?: string };
    if (errAny?.context && typeof errAny.context.status === "number") {
      contextStatus = errAny.context.status;
      try {
        contextBody = await errAny.context.text();
      } catch {
        contextBody = null;
      }
    }
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "callings-advance-500-debug-2",
        hypothesisId: "H6",
        location: "lib/callEdgeFunction.ts:invokeError",
        message: "Supabase function invoke failed with raw context",
        data: {
          functionName: name,
          errorMessage: errAny?.message ?? String(error),
          contextStatus,
          contextBody,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const detailed =
      contextStatus && contextBody
        ? `Function invocation failed (${contextStatus}): ${contextBody}`
        : error.message || "Function invocation failed";
    throw new Error(detailed);
  }
  return data as T;
}
