import { MantleLogo } from "@/components/MantleLogo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        className={cn(
          buttonVariants({ variant: "default" }),
          "h-auto rounded-xl px-6 py-3 shadow-lg shadow-primary/20",
        )}
      >
        Sign in
      </Link>
    </main>
  );
}
