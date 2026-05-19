import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SacramentLoading() {
  return (
    <div className="space-y-8 p-4 text-foreground">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Card>
        <CardContent className="space-y-3 pt-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
