export type SundayMeeting = {
  id: string;
  name: string;
  nameEs: string;
  time: string;
  endTime?: string;
  cadence: "weekly" | "monthly";
  who: string;
  notes?: string;
};

/** Fixed Sunday leadership schedule — the same rhythm each week. */
export const SUNDAY_MEETING_SCHEDULE: SundayMeeting[] = [
  {
    id: "bishopric",
    name: "Bishopric meeting",
    nameEs: "Reunión de obispado",
    time: "09:30",
    cadence: "weekly",
    who: "Bishop, counselors, executive secretary",
  },
  {
    id: "ward-council",
    name: "Ward council",
    nameEs: "Consejo de barrio",
    time: "10:20",
    cadence: "weekly",
    who: "Bishopric and organization presidencies",
  },
  {
    id: "sacrament",
    name: "Sacrament meeting",
    nameEs: "Reunión sacramental",
    time: "12:00",
    cadence: "weekly",
    who: "Entire congregation",
  },
];
