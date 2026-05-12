"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const err = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function signInGoogle() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    setLoading(false);
    if (error) alert(error.message);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {err && (
        <p className="max-w-md rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
          {err === "not_whitelisted" && "Your account is not authorized for this ward app."}
          {err === "session_stale" && "Your session was ended. Please sign in again."}
          {err === "no_code" && "Missing OAuth code. Try again."}
          {err === "config" && "Server is missing Supabase configuration."}
          {err === "oauth" && "Sign-in failed unexpectedly. Try again, or check server logs."}
          {!["not_whitelisted", "session_stale", "no_code", "config", "oauth"].includes(err) &&
            `Error: ${err}`}
        </p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => void signInGoogle()}
        className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-gray-900 shadow disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
        Back home
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
