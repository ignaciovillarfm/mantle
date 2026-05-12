import { WardLeadershipView } from "@/app/(ward)/WardLeadershipView";

export default async function DashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Ward leadership diagrams based on active calling assignments.
        </p>
      </div>

      <WardLeadershipView />
    </div>
  );
}
