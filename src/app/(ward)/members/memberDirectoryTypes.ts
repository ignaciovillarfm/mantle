export type MembersDirectoryRow = {
  id: string;
  name: string;
  is_youth: boolean;
  gender: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  wardName: string;
  lastTalkSunday: string | null;
  lastTalkNote: string | null;
  lastTalkDelivered: boolean | null;
  lastPrayerSunday: string | null;
  lastPrayerRole: string;
  lastPrayerNote: string | null;
  lastPrayerFulfilled: boolean | null;
};

/** @deprecated Use MembersDirectoryRow */
export type MemberQuickViewData = MembersDirectoryRow;
