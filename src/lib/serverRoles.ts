import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

/** Supabase may return a single FK embed as an object or (rarely) as a one-element array. */
export type WardEmbed = { id: string; name: string };

export function normalizeWardsEmbed(wards: unknown): WardEmbed | null {
  if (wards == null) return null;
  if (Array.isArray(wards)) {
    const first = wards[0];
    if (!first || typeof first !== "object") return null;
    const id = String((first as { id?: unknown }).id ?? "");
    const name = String((first as { name?: unknown }).name ?? "");
    if (!id) return null;
    return { id, name };
  }
  if (typeof wards !== "object") return null;
  const o = wards as { id?: unknown; name?: unknown };
  const id = String(o.id ?? "");
  if (!id) return null;
  return { id, name: String(o.name ?? "") };
}

export type UserWardRole = {
  role: string;
  ward_id: string;
  wards: WardEmbed | null;
};

export async function fetchUserRoles(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => r.role as string);
}

async function fetchUserWardRolesUncached(): Promise<UserWardRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_roles")
    .select("role, ward_id, wards ( id, name )")
    .eq("user_id", user.id);

  return (data ?? []).map((row) => ({
    role: row.role as string,
    ward_id: row.ward_id as string,
    wards: normalizeWardsEmbed(row.wards),
  }));
}

/** Deduped per request — avoids triple auth/roles work when the page and loaders each check access. */
export const fetchUserWardRoles = cache(fetchUserWardRolesUncached);

const WARD_LEADERSHIP_ROLES = new Set(["bishop", "counselor", "clerk"]);

/** Throws if the signed-in user does not hold bishop/counselor/clerk on this ward. */
export async function assertWardLeadership(wardId: string): Promise<void> {
  const roles = await fetchUserWardRoles();
  if (!roles.some((r) => r.ward_id === wardId && WARD_LEADERSHIP_ROLES.has(r.role))) {
    throw new Error("Not authorized for this ward");
  }
}

export async function isBishop(): Promise<boolean> {
  const roles = await fetchUserRoles();
  return roles.includes("bishop");
}
