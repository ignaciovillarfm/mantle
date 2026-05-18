/** Google OAuth / Supabase user_metadata shape (provider-dependent). */
export type AuthUserNameSource = {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
};

/**
 * Prefer Google `given_name` (middle → initial) + first surname from `family_name`.
 */
export function userDisplayNameFromAuth(user: AuthUserNameSource): string {
  const meta = user.user_metadata ?? {};
  const given = readMetaString(meta, "given_name");
  const family = readMetaString(meta, "family_name");
  const firstSurname = firstToken(family);

  if (given && firstSurname) return `${formatGivenNames(given)} ${firstSurname}`;
  if (given) return formatGivenNames(given);
  if (firstSurname) return firstSurname;

  const full =
    readMetaString(meta, "full_name") ||
    readMetaString(meta, "name") ||
    "";
  if (full) return displayNameFromFullName(full);

  return user.email?.split("@")[0]?.trim() || "Account";
}

export function userInitialsFromDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  const s = displayName.trim().slice(0, 2);
  return (s || "?").toUpperCase();
}

/** "Juan Carlos" → "Juan C." */
export function formatGivenNames(given: string): string {
  const parts = given.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const initials = parts
    .slice(1)
    .map((p) => middleInitial(p))
    .filter(Boolean)
    .join(" ");
  return `${first} ${initials}`.trim();
}

function middleInitial(token: string): string {
  const c = token[0];
  return c ? `${c.toUpperCase()}.` : "";
}

function readMetaString(meta: Record<string, unknown>, key: string): string {
  const v = meta[key];
  return typeof v === "string" ? v.trim() : "";
}

function firstToken(value: string): string {
  const t = value.trim().split(/\s+/).filter(Boolean)[0];
  return t ?? "";
}

function displayNameFromFullName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  if (parts.length === 3) {
    return `${parts[0]} ${parts[1]}`;
  }
  const firstSurname = parts[parts.length - 2];
  const givenPart = formatGivenNames(parts.slice(0, -2).join(" "));
  return `${givenPart} ${firstSurname}`.trim();
}
