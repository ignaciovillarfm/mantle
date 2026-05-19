import { MantleLogo } from "@/components/MantleLogo";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <MantleLogo priority />
      <p className="max-w-md text-center text-foreground/70">
        Sign in to access the dashboard and ward tools.
      </p>
      <Link
        href="/login"
        className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:bg-accent-muted"
      >
        Sign in
      </Link>
    </main>
  );
}
