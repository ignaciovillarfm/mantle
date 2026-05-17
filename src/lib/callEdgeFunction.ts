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
    const detailed =
      contextStatus && contextBody
        ? `Function invocation failed (${contextStatus}): ${contextBody}`
        : error.message || "Function invocation failed";
    throw new Error(detailed);
  }
  return data as T;
}
