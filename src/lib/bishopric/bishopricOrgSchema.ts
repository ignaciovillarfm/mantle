/** Slot map for the ward bishopric / clerical org chart. */
export type BishopricSlots = {
  bishop: string | null;
  firstCounselor: string | null;
  secondCounselor: string | null;
  wardClerk: string | null;
  assistantWardClerk: string | null;
  wardExecutiveSecretary: string | null;
};

/** Canonical ward bishopric/clerical hierarchy used by the org chart. */
export type OrgRoleKey = keyof BishopricSlots;

export type OrgRoleNode = {
  key: OrgRoleKey;
  title: string;
};

export type OrgBand = {
  id: "bishopric" | "clerical";
  label: string;
  /** Root of this band (sits on the center spine, or left when `peer` is set). */
  root: OrgRoleNode;
  /**
   * Optional peer at the same level as `root` (not reporting to root).
   * Handbook: ward clerk and ward executive secretary both assist the bishopric.
   */
  peer?: OrgRoleNode;
  /**
   * Roles that report to `root` only (e.g. Assistant Ward Clerk → Ward Clerk).
   * 0–2 entries; two entries fork left/right under root.
   */
  branches: OrgRoleNode[];
};

/**
 * Visual reporting schema (General Handbook ch. 6):
 *   Bishop
 *     ├─ First Counselor
 *     └─ Second Counselor
 *   Clerical (assist the bishopric — peers, not a clerk→secretary chain)
 *     Ward Clerk │ Ward Executive Secretary
 *       └─ Assistant Ward Clerk  (helps the clerk only)
 */
export const BISHOPRIC_ORG_BANDS: OrgBand[] = [
  {
    id: "bishopric",
    label: "Bishopric",
    root: { key: "bishop", title: "Bishop" },
    branches: [
      { key: "firstCounselor", title: "First Counselor" },
      { key: "secondCounselor", title: "Second Counselor" },
    ],
  },
  {
    id: "clerical",
    label: "Clerical",
    root: { key: "wardClerk", title: "Ward Clerk" },
    peer: { key: "wardExecutiveSecretary", title: "Ward Executive Secretary" },
    branches: [{ key: "assistantWardClerk", title: "Assistant Ward Clerk" }],
  },
];

