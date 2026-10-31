import {
  callingTitleSimilarity,
  findClosestCallingPosition,
  matchCallingPosition,
} from "@/lib/callings/callingTitleMatch";
import { findClosestMember, matchMember } from "@/lib/callings/memberNameMatch";
import type { PdfCallingRow } from "@/lib/callings/parseMembersWithCallingsPdf";
import { reportNameToMantleName } from "@/lib/callings/reportNameToMantle";

export type SyncMember = { id: string; name: string };
export type SyncPosition = { id: string; title: string; allows_multiple: boolean };
export type SyncCalling = {
  id: string;
  member_id: string;
  name: string;
  calling_position_id: string | null;
  status: string;
};

export type PendingReason =
  | "member_not_found"
  | "member_uncertain"
  | "position_not_found"
  | "position_uncertain"
  | "replaces_unique_holder";

export type SyncPlan = {
  inserts: {
    key: string;
    memberId: string;
    memberName: string;
    positionId: string;
    positionTitle: string;
    allowsMultiple: boolean;
    replacesHolders: string[];
    pdf: PdfCallingRow;
  }[];
  /** PDF person not in Mantle, but calling title matched exactly → create member + calling. */
  newMembers: {
    key: string;
    pdfMemberName: string;
    mantleName: string;
    positionId: string;
    positionTitle: string;
    allowsMultiple: boolean;
    gender: string | null;
    pdf: PdfCallingRow;
  }[];
  keeps: {
    key: string;
    callingId: string;
    memberId: string;
    memberName: string;
    positionTitle: string;
  }[];
  pending: {
    key: string;
    memberId: string | null;
    memberName: string;
    pdfMemberName: string;
    memberScore: number | null;
    closestMemberId: string | null;
    closestMemberName: string | null;
    closestMemberScore: number | null;
    suggestedPositionId: string | null;
    suggestedPositionTitle: string | null;
    positionScore: number | null;
    closestPositionId: string | null;
    closestPositionTitle: string | null;
    closestPositionScore: number | null;
    allowsMultiple: boolean | null;
    currentHolders: string[];
    reasons: PendingReason[];
    issue: string;
    pdf: PdfCallingRow;
  }[];
  removes: {
    key: string;
    callingId: string;
    memberId: string;
    memberName: string;
    callingName: string;
  }[];
  pdfRowCount: number;
};

const PROTECT_TITLE_SCORE = 0.85;
/** Only allow Approve when closest member is at least a normal match threshold. */
const APPROVE_MEMBER_MIN = 0.55;
const APPROVE_POSITION_MIN = 0.55;

function pendingReasons(
  mem: ReturnType<typeof matchMember>,
  pos: ReturnType<typeof matchCallingPosition>,
  replacesUnique: boolean,
): PendingReason[] {
  const reasons: PendingReason[] = [];
  if (!mem) reasons.push("member_not_found");
  else if (mem.kind !== "exact") reasons.push("member_uncertain");
  if (!pos) reasons.push("position_not_found");
  else if (pos.kind !== "exact") reasons.push("position_uncertain");
  if (replacesUnique) reasons.push("replaces_unique_holder");
  return reasons;
}

function buildIssue(input: {
  pdfMemberName: string;
  pdfTitle: string;
  reasons: PendingReason[];
  closestMemberName: string | null;
  closestMemberScore: number | null;
  closestPositionTitle: string | null;
  closestPositionScore: number | null;
  currentHolders: string[];
  allowsMultiple: boolean | null;
}): string {
  const parts: string[] = [];
  const pct = (n: number | null) => (n == null ? "" : ` (${Math.round(n * 100)}%)`);

  if (input.reasons.includes("member_not_found")) {
    if (input.closestMemberName && (input.closestMemberScore ?? 0) >= 0.25) {
      parts.push(
        `No confident member match for “${input.pdfMemberName}”. Closest in Mantle: ${input.closestMemberName}${pct(input.closestMemberScore)}.`,
      );
    } else {
      parts.push(
        `“${input.pdfMemberName}” is not in Mantle members. Add them first, then re-import — or Skip.`,
      );
    }
  } else if (input.reasons.includes("member_uncertain")) {
    const name = input.closestMemberName ?? "unknown";
    parts.push(
      `Report name is close to Mantle member “${name}”${pct(input.closestMemberScore)} but not exact.`,
    );
  }

  if (input.reasons.includes("position_not_found")) {
    if (input.closestPositionTitle && (input.closestPositionScore ?? 0) >= 0.25) {
      parts.push(
        `“${input.pdfTitle}” is not in your calling catalog. Closest: ${input.closestPositionTitle}${pct(input.closestPositionScore)}.`,
      );
    } else {
      parts.push(
        `“${input.pdfTitle}” is not in your calling catalog (stake/custom titles often need Skip).`,
      );
    }
  } else if (input.reasons.includes("position_uncertain")) {
    const title = input.closestPositionTitle ?? "unknown";
    parts.push(
      `Calling title is close to “${title}”${pct(input.closestPositionScore)} but not exact.`,
    );
  }

  if (input.reasons.includes("replaces_unique_holder") && input.currentHolders.length > 0) {
    parts.push(
      `This is a one-person calling. Currently held by ${input.currentHolders.join(", ")} — approving replaces them.`,
    );
  }

  return parts.join(" ");
}

function holdersForPosition(
  setApart: SyncCalling[],
  positionId: string,
  memberNameById: Map<string, string>,
  exceptMemberId?: string | null,
): string[] {
  return setApart
    .filter(
      (c) =>
        c.calling_position_id === positionId &&
        (!exceptMemberId || c.member_id !== exceptMemberId),
    )
    .map((c) => memberNameById.get(c.member_id) ?? "Member");
}

/**
 * Exact member+position → insert or keep.
 * Near-misses → pending (no insert until approved).
 * DB Set Apart not protected by PDF → remove.
 */
export function planMembersWithCallingsSync(input: {
  pdfRows: PdfCallingRow[];
  members: SyncMember[];
  positions: SyncPosition[];
  existingCallings: SyncCalling[];
}): SyncPlan {
  const { pdfRows, members, positions, existingCallings } = input;
  const memberOpts = members.map((m) => ({ id: m.id, full_name: m.name }));
  const setApart = existingCallings.filter((c) => c.status === "Set Apart");

  const inserts: SyncPlan["inserts"] = [];
  const newMembers: SyncPlan["newMembers"] = [];
  const keeps: SyncPlan["keeps"] = [];
  const pending: SyncPlan["pending"] = [];

  const protectedCallingIds = new Set<string>();
  const protectedPairs = new Set<string>();
  const pdfTitlesByMember = new Map<string, string[]>();
  const memberNameById = new Map(members.map((m) => [m.id, m.name]));

  let pdfIdx = 0;
  for (const pdf of pdfRows) {
    const rowKey = `pdf-${pdfIdx++}`;
    const closestMem = findClosestMember(pdf.memberName, memberOpts);
    const closestPos = findClosestCallingPosition(pdf.callingTitle, positions);
    const mem = matchMember(pdf.memberName, memberOpts);
    const pos = matchCallingPosition(pdf.callingTitle, positions);

    if (mem) {
      const list = pdfTitlesByMember.get(mem.id) ?? [];
      list.push(pdf.callingTitle);
      pdfTitlesByMember.set(mem.id, list);
    }

    const exactMember = Boolean(mem && mem.kind === "exact");
    const exactPos = Boolean(pos && pos.kind === "exact");

    if (exactMember && exactPos && mem && pos) {
      const existing = setApart.find(
        (c) =>
          c.member_id === mem.id &&
          (c.calling_position_id === pos.id ||
            callingTitleSimilarity(c.name, pos.title) >= 0.92),
      );
      if (existing) {
        keeps.push({
          key: rowKey,
          callingId: existing.id,
          memberId: mem.id,
          memberName: mem.full_name,
          positionTitle: pos.title,
        });
        protectedCallingIds.add(existing.id);
      } else {
        const fullPos = positions.find((p) => p.id === pos.id);
        const replacesHolders =
          fullPos && !fullPos.allows_multiple
            ? holdersForPosition(setApart, pos.id, memberNameById, mem.id)
            : [];
        inserts.push({
          key: rowKey,
          memberId: mem.id,
          memberName: mem.full_name,
          positionId: pos.id,
          positionTitle: pos.title,
          allowsMultiple: fullPos?.allows_multiple ?? false,
          replacesHolders,
          pdf,
        });
      }
      protectedPairs.add(`${mem.id}|${pos.id}`);
      continue;
    }

    // Not in Mantle, but calling is known → Add as new member (not Review)
    if (!mem && exactPos && pos) {
      const fullPos = positions.find((p) => p.id === pos.id);
      newMembers.push({
        key: rowKey,
        pdfMemberName: pdf.memberName,
        mantleName: reportNameToMantleName(pdf.memberName),
        positionId: pos.id,
        positionTitle: pos.title,
        allowsMultiple: fullPos?.allows_multiple ?? false,
        gender: pdf.gender,
        pdf,
      });
      continue;
    }

    const candidatePosId = pos?.id ?? closestPos?.id ?? null;
    const fullPos = candidatePosId
      ? positions.find((p) => p.id === candidatePosId)
      : undefined;
    const candidateMemberId = mem?.id ?? null;
    const currentHolders =
      fullPos && !fullPos.allows_multiple && candidatePosId
        ? holdersForPosition(setApart, candidatePosId, memberNameById, candidateMemberId)
        : [];
    const replacesUnique = currentHolders.length > 0;

    const reasons = pendingReasons(mem, pos, replacesUnique);
    const closestMemberName = closestMem?.full_name ?? null;
    const closestMemberScore = closestMem?.score ?? null;
    const closestPositionTitle = closestPos?.title ?? null;
    const closestPositionScore = closestPos?.score ?? null;

    pending.push({
      key: rowKey,
      memberId: mem?.id ?? null,
      memberName: mem?.full_name ?? pdf.memberName,
      pdfMemberName: pdf.memberName,
      memberScore: mem?.score ?? null,
      closestMemberId: closestMem?.id ?? null,
      closestMemberName,
      closestMemberScore,
      suggestedPositionId: pos?.id ?? null,
      suggestedPositionTitle: pos?.title ?? null,
      positionScore: pos?.score ?? null,
      closestPositionId: closestPos?.id ?? null,
      closestPositionTitle,
      closestPositionScore,
      allowsMultiple: fullPos?.allows_multiple ?? null,
      currentHolders,
      reasons,
      issue: buildIssue({
        pdfMemberName: pdf.memberName,
        pdfTitle: pdf.callingTitle,
        reasons,
        closestMemberName,
        closestMemberScore,
        closestPositionTitle,
        closestPositionScore,
        currentHolders,
        allowsMultiple: fullPos?.allows_multiple ?? null,
      }),
      pdf,
    });

    const protectMemId = mem?.id ?? (closestMem && closestMem.score >= 0.7 ? closestMem.id : null);
    const protectPos =
      pos ?? (closestPos && closestPos.score >= PROTECT_TITLE_SCORE ? closestPos : null);
    if (protectMemId && protectPos && protectPos.score >= PROTECT_TITLE_SCORE) {
      const soft = setApart.find(
        (c) =>
          c.member_id === protectMemId &&
          (c.calling_position_id === protectPos.id ||
            callingTitleSimilarity(c.name, pdf.callingTitle) >= PROTECT_TITLE_SCORE),
      );
      if (soft) {
        protectedCallingIds.add(soft.id);
        protectedPairs.add(`${protectMemId}|${protectPos.id}`);
      }
    }
  }

  const removes: SyncPlan["removes"] = [];
  let removeIdx = 0;
  for (const c of setApart) {
    if (protectedCallingIds.has(c.id)) continue;
    if (c.calling_position_id && protectedPairs.has(`${c.member_id}|${c.calling_position_id}`)) {
      continue;
    }
    const titles = pdfTitlesByMember.get(c.member_id) ?? [];
    if (titles.some((t) => callingTitleSimilarity(t, c.name) >= PROTECT_TITLE_SCORE)) {
      continue;
    }
    removes.push({
      key: `rm-${removeIdx++}`,
      callingId: c.id,
      memberId: c.member_id,
      memberName: memberNameById.get(c.member_id) ?? "Member",
      callingName: c.name,
    });
  }

  return {
    inserts,
    newMembers,
    keeps,
    pending,
    removes,
    pdfRowCount: pdfRows.length,
  };
}

export function resolvePendingApproveIds(row: SyncPlan["pending"][number]): {
  memberId: string | null;
  positionId: string | null;
  positionTitle: string | null;
  /** True when title is the raw PDF string (not in calling catalog). */
  customTitle: boolean;
} {
  const memberId =
    row.memberId ??
    ((row.closestMemberScore ?? 0) >= APPROVE_MEMBER_MIN ? row.closestMemberId : null);
  const catalogPositionId =
    row.suggestedPositionId ??
    ((row.closestPositionScore ?? 0) >= APPROVE_POSITION_MIN ? row.closestPositionId : null);
  const catalogPositionTitle =
    row.suggestedPositionTitle ??
    ((row.closestPositionScore ?? 0) >= APPROVE_POSITION_MIN ? row.closestPositionTitle : null);

  // Allow Approve with PDF title when catalog has no usable match (stake/custom callings).
  if (!catalogPositionId) {
    const pdfTitle = row.pdf.callingTitle.trim();
    return {
      memberId,
      positionId: null,
      positionTitle: pdfTitle || null,
      customTitle: Boolean(pdfTitle),
    };
  }
  return {
    memberId,
    positionId: catalogPositionId,
    positionTitle: catalogPositionTitle,
    customTitle: false,
  };
}
