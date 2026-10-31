export type MemberGender = "F" | "M" | null;

export function genderLabel(gender: MemberGender | string | null | undefined): string {
  if (gender === "F") return "female";
  if (gender === "M") return "male";
  return "";
}

export function genderDisplay(gender: MemberGender | string | null | undefined): string {
  if (gender === "F") return "Female";
  if (gender === "M") return "Male";
  return "—";
}

/** Age in whole years from an ISO date (YYYY-MM-DD), or null if unknown. */
export function ageFromBirthDate(
  birthDate: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!birthDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  let age = asOf.getFullYear() - y;
  const beforeBirthday =
    asOf.getMonth() + 1 < mo || (asOf.getMonth() + 1 === mo && asOf.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function formatBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!m) return birthDate;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const year = m[1];
  if (mo < 1 || mo > 12) return birthDate;
  return `${day} ${months[mo - 1]} ${year}`;
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
