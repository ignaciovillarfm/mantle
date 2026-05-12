import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";
import { buildSpeakerSuggestions, type MemberInput } from "../_shared/speakerSuggestions.ts";

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
    await requireRoles(userSb, user.id, ["bishop", "counselor", "clerk"]);
    const wardRoles = await getUserWardRoles(userSb, user.id);
    let requestedWardId: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body === "object" && typeof (body as { ward_id?: unknown }).ward_id === "string") {
        requestedWardId = (body as { ward_id: string }).ward_id;
      }
    } catch {
      /* empty body */
    }
    const allowedIds = new Set(wardRoles.map((w) => w.ward_id));
    const wardId =
      requestedWardId && allowedIds.has(requestedWardId)
        ? requestedWardId
        : wardRoles[0]?.ward_id;
    if (!wardId) return errorResponse("No ward assigned", 403);

    const today = new Date().toISOString().slice(0, 10);

    const { data: meetings, error: mErr } = await userSb
      .from("sacrament_meetings")
      .select("id")
      .eq("ward_id", wardId)
      .gte("date", today);
    if (mErr) throw mErr;

    const meetingIds = (meetings ?? []).map((m) => m.id);
    let excluded = new Set<string>();
    if (meetingIds.length > 0) {
      const { data: parts, error: sErr } = await userSb
        .from("sacrament_participations")
        .select("member_id")
        .in("meeting_id", meetingIds)
        .in("slot", [
          "discourse_1",
          "discourse_2",
          "discourse_3",
          "discourse_4",
          "discourse_5",
          "discourse_6",
          "discourse_7",
          "discourse_8",
        ]);
      if (sErr) throw sErr;
      excluded = new Set(
        (parts ?? [])
          .map((s) => s.member_id as string | null)
          .filter((id): id is string => Boolean(id)),
      );
    }

    const { data: rows, error: memErr } = await userSb
      .from("members")
      .select(
        "id, name, last_pulpit_date, is_youth, organization_id, organizations ( name )",
      )
      .eq("ward_id", wardId);
    if (memErr) throw memErr;

    const members: MemberInput[] = (rows ?? []).map((r: Record<string, unknown>) => {
      const org = r.organizations as { name: string } | null;
      return {
        id: r.id as string,
        name: r.name as string,
        last_pulpit_date: (r.last_pulpit_date as string | null) ?? null,
        is_youth: Boolean(r.is_youth),
        organization_id: r.organization_id as string,
        organization_name: org?.name ?? "",
      };
    });

    const suggestions = buildSpeakerSuggestions(members, excluded, 20);

    const service = createServiceClient();
    await writeAudit(service, {
      user_id: user.id,
      action: "get_speaker_suggestions",
      table_name: "members",
      record_id: null,
      ward_id: wardId,
    });

    return jsonResponse({ suggestions });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
