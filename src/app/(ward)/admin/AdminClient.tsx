"use client";

import { useOnline } from "@/hooks/useOnline";
import { useState } from "react";

export function AdminClient() {
  const online = useOnline();
  const [userId, setUserId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function offboard() {
    setMsg(null);
    try {
      const res = await fetch("/api/edge/admin-offboard-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const j = await res.json().catch(async () => ({ error: await res.text() }));
      if (!res.ok) throw new Error(j.error ?? JSON.stringify(j));
      setMsg(`Offboarded. New session_version: ${j.session_version}`);
      setUserId("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-sm text-foreground/60">
        Offboarding bumps <code className="text-foreground">session_version</code> so the user is
        signed out on next request (cookie mismatch).
      </p>
      {!online && (
        <p className="text-sm text-warning">Offline — admin actions are disabled.</p>
      )}
      <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <h2 className="font-medium">Offboard user</h2>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          placeholder="Profile / auth user UUID"
        />
        <button
          type="button"
          disabled={!online || !userId}
          onClick={() => void offboard()}
          className="rounded-lg bg-warning/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          Revoke access
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </section>
    </div>
  );
}
