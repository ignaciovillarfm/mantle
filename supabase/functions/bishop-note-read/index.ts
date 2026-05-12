import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";
import { decryptNote } from "../_shared/crypto.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const userSb = createUserClient(req);
    const user = await requireUser(userSb);
    if (!rateLimitUser(user.id)) {
      return errorResponse("Rate limit exceeded", 429);
    }
    await requireRoles(userSb, user.id, ["bishop"]);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("id query param required", 400);

    const service = createServiceClient();
    const wardRoles = await getUserWardRoles(userSb, user.id);
    const bishopWardIds = wardRoles
      .filter((r) => r.role === "bishop")
      .map((r) => r.ward_id);
    if (bishopWardIds.length === 0) return errorResponse("No ward assigned", 403);
    const { data: row, error } = await service
      .from("bishop_notes")
      .select("id, encrypted_note_text, ward_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !row) return errorResponse("Not found", 404);
    if (!bishopWardIds.includes(row.ward_id as string)) {
      return errorResponse("Forbidden", 403);
    }

    const plaintext = await decryptNote(row.encrypted_note_text as string);

    await writeAudit(service, {
      user_id: user.id,
      action: "bishop_note_read",
      table_name: "bishop_notes",
      record_id: row.id,
      ward_id: row.ward_id as string,
    });

    return jsonResponse({ id: row.id, plaintext });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
