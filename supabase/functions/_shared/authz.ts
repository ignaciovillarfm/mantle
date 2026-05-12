import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type WardRole = "bishop" | "counselor" | "clerk";
export type UserWardRole = { role: WardRole; ward_id: string };

export async function getAuthedUser(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getUserRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<WardRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r) => r.role as WardRole);
}

export async function getUserWardRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserWardRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, ward_id")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r) => ({
    role: r.role as WardRole,
    ward_id: r.ward_id as string,
  }));
}

export function hasAnyRole(roles: WardRole[], allowed: WardRole[]): boolean {
  return roles.some((r) => allowed.includes(r));
}

export async function requireUser(supabase: SupabaseClient) {
  const user = await getAuthedUser(supabase);
  if (!user) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  return user;
}

export async function requireRoles(
  supabase: SupabaseClient,
  userId: string,
  allowed: WardRole[],
) {
  const roles = await getUserRoles(supabase, userId);
  if (!hasAnyRole(roles, allowed)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  return roles;
}
