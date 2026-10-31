import { assertWardLeadership } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { parseMembersWithCallingsPdf } from "@/lib/callings/parseMembersWithCallingsPdf";
import {
  planMembersWithCallingsSync,
  resolvePendingApproveIds,
} from "@/lib/callings/syncMembersWithCallings";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";


type DecisionMap = Record<string, "include" | "skip" | "approve">;

function parseDecisions(raw: FormDataEntryValue | null): {
  pending: DecisionMap;
  inserts: DecisionMap;
  newMembers: DecisionMap;
  removes: DecisionMap;
} {
  const empty = { pending: {}, inserts: {}, newMembers: {}, removes: {} };
  if (typeof raw !== "string" || !raw.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as {
      pending?: DecisionMap;
      inserts?: DecisionMap;
      newMembers?: DecisionMap;
      removes?: DecisionMap;
    };
    return {
      pending: parsed.pending ?? {},
      inserts: parsed.inserts ?? {},
      newMembers: parsed.newMembers ?? {},
      removes: parsed.removes ?? {},
    };
  } catch {
    return empty;
  }
}

/**
 * Import Church “Members with Callings” PDF.
 * FormData: wardId, file (PDF), dryRun? ("1"), decisions? (JSON)
 *
 * Review decisions: approve = insert with suggested position; skip/omit = ignore.
 * Unresolved review rows are skipped (not queued).
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected multipart form data" }, { status: 400 });
  }

  const wardId = String(form.get("wardId") ?? "").trim();
  const dryRun = String(form.get("dryRun") ?? "") === "1";
  const decisions = parseDecisions(form.get("decisions"));
  const file = form.get("file");

  if (!wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "PDF file is required" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "File must be a PDF" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const buffer = await file.arrayBuffer();
  let pdfRows;
  try {
    pdfRows = await parseMembersWithCallingsPdf(buffer);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to parse PDF" },
      { status: 400 },
    );
  }


  if (pdfRows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No calling rows found in PDF — check the report format" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const [{ data: members }, { data: positions }, { data: callings }] = await Promise.all([
    supabase.from("members").select("id, name").eq("ward_id", wardId),
    supabase
      .from("calling_positions")
      .select("id, title, allows_multiple")
      .eq("ward_id", wardId),
    supabase
      .from("callings")
      .select("id, member_id, name, calling_position_id, status")
      .eq("ward_id", wardId)
      .eq("status", "Set Apart"),
  ]);

  const plan = planMembersWithCallingsSync({
    pdfRows,
    members: (members ?? []) as { id: string; name: string }[],
    positions: (positions ?? []) as { id: string; title: string; allows_multiple: boolean }[],
    existingCallings: (callings ?? []) as {
      id: string;
      member_id: string;
      name: string;
      calling_position_id: string | null;
      status: string;
    }[],
  });


  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      summary: {
        pdfRows: plan.pdfRowCount,
        inserts: plan.inserts.length,
        newMembers: plan.newMembers.length,
        keeps: plan.keeps.length,
        pending: plan.pending.length,
        removes: plan.removes.length,
      },
      inserts: plan.inserts.map((i) => ({
        key: i.key,
        memberName: i.memberName,
        positionTitle: i.positionTitle,
        pdfTitle: i.pdf.callingTitle,
        organization: i.pdf.organization,
        allowsMultiple: i.allowsMultiple,
        replacesHolders: i.replacesHolders,
      })),
      newMembers: plan.newMembers.map((n) => ({
        key: n.key,
        pdfMemberName: n.pdfMemberName,
        mantleName: n.mantleName,
        positionTitle: n.positionTitle,
        allowsMultiple: n.allowsMultiple,
      })),
      keeps: plan.keeps.map((k) => ({
        key: k.key,
        memberName: k.memberName,
        positionTitle: k.positionTitle,
      })),
      pending: plan.pending.map((p) => {
        const resolved = resolvePendingApproveIds(p);
        const resolveMemberId = resolved.memberId;
        const mantleCallings = resolveMemberId
          ? (callings ?? [])
              .filter((c) => c.member_id === resolveMemberId && c.status === "Set Apart")
              .map((c) => ({
                callingId: c.id,
                callingName: c.name,
              }))
          : [];
        return {
          key: p.key,
          memberName: p.memberName,
          pdfMemberName: p.pdfMemberName,
          memberId: p.memberId,
          pdfTitle: p.pdf.callingTitle,
          organization: p.pdf.organization,
          suggestedPositionId: p.suggestedPositionId,
          suggestedPositionTitle: resolved.positionTitle,
          memberScore: p.memberScore,
          positionScore: p.positionScore,
          closestMemberId: p.closestMemberId,
          closestMemberName: p.closestMemberName,
          closestMemberScore: p.closestMemberScore,
          closestPositionTitle: p.closestPositionTitle,
          closestPositionScore: p.closestPositionScore,
          allowsMultiple: p.allowsMultiple,
          currentHolders: p.currentHolders,
          reasons: p.reasons,
          issue: p.issue,
          // Member match is enough — catalog miss uses PDF title as custom calling
          canApprove: Boolean(resolved.memberId && resolved.positionTitle),
          customTitle: resolved.customTitle,
          approveAsTitle: resolved.positionTitle,
          resolveMemberId,
          mantleCallings,
        };
      }),
      removes: plan.removes.map((r) => ({
        key: r.key,
        callingId: r.callingId,
        memberId: r.memberId,
        memberName: r.memberName,
        callingName: r.callingName,
        source: "pdf_gap" as const,
      })),
    });
  }

  const insertsToApply = plan.inserts.filter((i) => decisions.inserts[i.key] !== "skip");
  const newMembersToApply = plan.newMembers.filter(
    (n) => decisions.newMembers[n.key] !== "skip",
  );
  const pendingApproved = plan.pending.filter((p) => decisions.pending[p.key] === "approve");
  const pendingExplicitSkip = plan.pending.filter((p) => decisions.pending[p.key] === "skip");
  const pendingSkipped = plan.pending.filter((p) => decisions.pending[p.key] !== "approve");

  // Explicit Skip on Review → also release that member's Set Apart callings not kept by this import
  const removeByCallingId = new Map(plan.removes.map((r) => [r.callingId, r]));
  for (const p of pendingExplicitSkip) {
    const memberId = resolvePendingApproveIds(p).memberId;
    if (!memberId) continue;
    for (const c of callings ?? []) {
      if (c.member_id !== memberId || c.status !== "Set Apart") continue;
      if (removeByCallingId.has(c.id)) continue;
      // Still kept via another PDF keep/insert for same member+title
      const stillKept = plan.keeps.some((k) => k.callingId === c.id);
      if (stillKept) continue;
      removeByCallingId.set(c.id, {
        key: `rm-skip-${c.id}`,
        callingId: c.id,
        memberId: c.member_id,
        memberName: p.memberName,
        callingName: c.name,
      });
    }
  }

  const removesToApply = [...removeByCallingId.values()].filter((r) => {
    const decisionKey = plan.removes.find((x) => x.callingId === r.callingId)?.key ?? r.key;
    return decisions.removes[decisionKey] !== "skip" && decisions.removes[r.key] !== "skip";
  });


  // Persist Review omits, then clear leftover pending rows
  if (pendingExplicitSkip.length > 0) {
    await supabase.from("calling_import_suggestions").insert(
      pendingExplicitSkip.map((p) => {
        const resolved = resolvePendingApproveIds(p);
        return {
          ward_id: wardId,
          member_id: resolved.memberId,
          member_name_raw: p.pdfMemberName,
          organization_raw: p.pdf.organization,
          calling_title_raw: p.pdf.callingTitle,
          suggested_position_id: resolved.positionId,
          suggested_position_title: resolved.positionTitle,
          match_score: p.memberScore ?? p.closestMemberScore,
          sustained_date: p.pdf.sustainedDate,
          set_apart: p.pdf.setApart,
          status: "rejected",
        };
      }),
    );
  }

  await supabase
    .from("calling_import_suggestions")
    .delete()
    .eq("ward_id", wardId)
    .eq("status", "pending");

  let inserted = 0;
  let membersCreated = 0;
  const insertErrors: string[] = [];

  const { data: orgSample } = await supabase
    .from("members")
    .select("organization_id")
    .eq("ward_id", wardId)
    .limit(1)
    .maybeSingle();
  const organizationId = (orgSample?.organization_id as string | undefined) ?? null;

  async function insertCalling(
    memberId: string,
    positionId: string | null,
    positionTitle: string,
    label: string,
  ) {
    let existingQuery = supabase
      .from("callings")
      .select("id")
      .eq("ward_id", wardId)
      .eq("member_id", memberId)
      .eq("status", "Set Apart")
      .eq("name", positionTitle);
    if (positionId) {
      existingQuery = supabase
        .from("callings")
        .select("id")
        .eq("ward_id", wardId)
        .eq("member_id", memberId)
        .eq("calling_position_id", positionId)
        .eq("status", "Set Apart");
    }
    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) return;
    const { error } = await supabase.from("callings").insert({
      ward_id: wardId,
      member_id: memberId,
      name: positionTitle,
      calling_position_id: positionId,
      status: "Set Apart",
    });
    if (error) insertErrors.push(`${label}: ${error.message}`);
    else inserted += 1;
  }

  for (const row of insertsToApply) {
    await insertCalling(row.memberId, row.positionId, row.positionTitle, row.memberName);
  }

  for (const row of newMembersToApply) {
    if (!organizationId) {
      insertErrors.push(`${row.mantleName}: ward has no organization_id for new members`);
      continue;
    }
    const gender =
      row.gender === "M" || row.gender === "F" || row.gender === "Male" || row.gender === "Female"
        ? row.gender.startsWith("M")
          ? "M"
          : "F"
        : null;
    const { data: created, error: memErr } = await supabase
      .from("members")
      .insert({
        ward_id: wardId,
        organization_id: organizationId,
        name: row.mantleName,
        gender,
      })
      .select("id")
      .single();
    if (memErr || !created) {
      insertErrors.push(`${row.mantleName}: ${memErr?.message ?? "failed to create member"}`);
      continue;
    }
    membersCreated += 1;
    await insertCalling(
      created.id as string,
      row.positionId,
      row.positionTitle,
      row.mantleName,
    );
  }

  for (const row of pendingApproved) {
    const resolved = resolvePendingApproveIds(row);
    if (!resolved.memberId || !resolved.positionTitle) {
      insertErrors.push(`${row.memberName}: cannot approve without a Mantle member match`);
      continue;
    }
    await insertCalling(
      resolved.memberId,
      resolved.positionId,
      resolved.positionTitle,
      row.memberName,
    );
  }

  let removed = 0;
  const removeErrors: string[] = [];
  for (const row of removesToApply) {
    const { error } = await supabase.from("callings").delete().eq("id", row.callingId);
    if (error) removeErrors.push(`${row.callingName}: ${error.message}`);
    else removed += 1;
  }


  revalidatePath("/callings");
  revalidatePath("/callings/proposed");
  revalidatePath("/callings/import");
  revalidatePath("/members");

  return NextResponse.json({
    ok: true,
    dryRun: false,
    summary: {
      pdfRows: plan.pdfRowCount,
      inserted,
      membersCreated,
      kept: plan.keeps.length,
      pendingQueued: 0,
      pendingApproved: pendingApproved.length,
      pendingSkipped: pendingSkipped.length,
      removed,
      insertErrors,
      removeErrors,
    },
  });
}
