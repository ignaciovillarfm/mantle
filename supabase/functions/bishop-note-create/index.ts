import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";
import { encryptNote } from "../_shared/crypto.ts";

type Body = { member_id?: string; plaintext?: string; expires_at?: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const userSb = createUserClient(req);
    const user = await requireUser(userSb);
    if (!rateLimitUser(user.id)) {
      return errorResponse("Rate limit exceeded", 429);
    }
    await requireRoles(userSb, user.id, ["bishop"]);

    const body = (await req.json()) as Body;
    if (!body.member_id || body.plaintext === undefined) {
      return errorResponse("member_id and plaintext required", 400);
    }

    const ciphertext = await encryptNote(body.plaintext);
    const service = createServiceClient();
    const wardRoles = await getUserWardRoles(userSb, user.id);
    const bishopWardIds = wardRoles
      .filter((r) => r.role === "bishop")
      .map((r) => r.ward_id);
    if (bishopWardIds.length === 0) return errorResponse("No ward assigned", 403);

    const { data: member, error: memberErr } = await userSb
      .from("members")
      .select("id, ward_id")
      .eq("id", body.member_id)
      .maybeSingle();
    if (memberErr || !member) return errorResponse("Member not found", 404);
    if (!bishopWardIds.includes(member.ward_id as string)) {
      return errorResponse("Forbidden", 403);
    }

    const { data: inserted, error: insErr } = await service
      .from("bishop_notes")
      .insert({
        member_id: body.member_id,
        ward_id: member.ward_id as string,
        encrypted_note_text: ciphertext,
        created_by: user.id,
        expires_at: body.expires_at ?? null,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    await writeAudit(service, {
      user_id: user.id,
      action: "bishop_note_create",
      table_name: "bishop_notes",
      record_id: inserted.id,
      ward_id: member.ward_id as string,
    });

    return jsonResponse({ id: inserted.id });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
