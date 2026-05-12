import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function writeAudit(
  service: SupabaseClient,
  row: {
    user_id: string | null;
    action: string;
    table_name?: string | null;
    record_id?: string | null;
    ward_id?: string | null;
  },
) {
  const { error } = await service.from("audit_logs").insert({
    user_id: row.user_id,
    action: row.action,
    table_name: row.table_name ?? null,
    record_id: row.record_id ?? null,
    ward_id: row.ward_id ?? null,
  });
  if (error) console.error("audit insert failed", error.message);
}
