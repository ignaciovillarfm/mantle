import type { SupabaseClient } from "@supabase/supabase-js";

/** Whether the signed-in user has bishop/counselor/clerk on any ward (RLS: own rows only). */
export async function fetchUserHasWardAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return false;
  return (count ?? 0) > 0;
}
