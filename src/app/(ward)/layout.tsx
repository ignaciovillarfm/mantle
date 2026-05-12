import { AppNav } from "@/components/AppNav";

export default async function WardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh pb-20">
      <AppNav />
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
