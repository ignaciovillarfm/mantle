import { fetchUserWardRoles } from "@/lib/serverRoles";
import { SundayMeetingSchedule } from "../SundayMeetingSchedule";

export default async function BishopricMeetingsPage() {
  const wardRoles = await fetchUserWardRoles();
  const wardName =
    wardRoles.find((r) => r.wards?.name)?.wards?.name ??
    (wardRoles[0] ? "Ward" : null);

  if (!wardName || wardRoles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-foreground/50">
        You are not assigned to any ward yet.
      </div>
    );
  }

  return <SundayMeetingSchedule wardName={wardName} />;
}
