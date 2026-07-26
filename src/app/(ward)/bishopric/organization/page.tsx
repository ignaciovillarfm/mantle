import { WardLeadershipView } from "@/app/(ward)/WardLeadershipView";

export default async function BishopricOrganizationPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Ward leadership and organization callings from active assignments.
        </p>
      </div>

      <WardLeadershipView />
    </div>
  );
}
