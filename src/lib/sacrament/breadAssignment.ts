export type SacramentBreadAssignment = {
  id: string;
  ward_id: string;
  sunday_date: string;
  member_id: string | null;
  assigned_to: string | null;
  phone: string | null;
  reminder_preference: string | null;
  notes: string | null;
  confirmed: boolean;
};

export type SacramentBreadAssignmentInput = {
  wardId: string;
  sundayDate: string;
  memberId: string | null;
  assignedTo: string | null;
  phone: string | null;
  reminderPreference: string | null;
  notes: string | null;
  confirmed: boolean;
};

export type SacramentBreadRideContact = {
  ward_id: string;
  name: string | null;
  phone: string | null;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

export function normalizeBreadAssignmentRow(
  row: Record<string, unknown>,
): SacramentBreadAssignment {
  return {
    id: String(row.id ?? ""),
    ward_id: String(row.ward_id ?? ""),
    sunday_date: String(row.sunday_date ?? "").slice(0, 10),
    member_id: str(row.member_id),
    assigned_to: str(row.assigned_to),
    phone: str(row.phone),
    reminder_preference: str(row.reminder_preference),
    notes: str(row.notes),
    confirmed: row.confirmed === true,
  };
}

export function normalizeRideContactRow(
  row: Record<string, unknown>,
): SacramentBreadRideContact {
  return {
    ward_id: String(row.ward_id ?? ""),
    name: str(row.name),
    phone: str(row.phone),
  };
}

/** Phone numbers are stored as typed, so strip the formatting for the tel: link. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** An assignment only counts as filled when someone is actually named. */
export function isBreadAssignmentFilled(
  assignment: Pick<SacramentBreadAssignment, "member_id" | "assigned_to"> | undefined,
): boolean {
  if (!assignment) return false;
  return Boolean(assignment.member_id || assignment.assigned_to);
}
