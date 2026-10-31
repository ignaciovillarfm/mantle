import { AppNav } from "@/components/AppNav";

export default async function WardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <AppNav />
      <div
        data-ward-content
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-x-hidden px-4 py-4 sm:py-6"
      >
        {children}
      </div>
    </div>
  );
}
