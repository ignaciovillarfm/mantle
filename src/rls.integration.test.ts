import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe.skipIf(!url || !anon)("RLS smoke (live Supabase with migrations applied)", () => {
  it("anon key cannot read audit_logs", async () => {
    const sb = createClient(url!, anon!);
    const { data, error } = await sb.from("audit_logs").select("id").limit(1);
    expect(error !== null || (Array.isArray(data) && data.length === 0)).toBe(
      true,
    );
  });
});
