"use client";

import { useOnline } from "@/hooks/useOnline";
import { useState } from "react";

export function BishopNotesClient({ members }: { members: { id: string; name: string }[] }) {
  const online = useOnline();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [plaintext, setPlaintext] = useState("");
  const [readId, setReadId] = useState("");
  const [readOut, setReadOut] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function createNote() {
    setMsg(null);
    try {
      const res = await fetch("/api/edge/bishop-note-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, plaintext }),
      });
      const t = await res.text();
      if (!res.ok) throw new Error(t);
      setMsg("Saved encrypted note.");
      setPlaintext("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function readNote() {
    setMsg(null);
    setReadOut(null);
    try {
      const res = await fetch(
        `/api/edge/bishop-note-read?id=${encodeURIComponent(readId)}`,
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      setReadOut(j.plaintext as string);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bishop notes</h1>
      <p className="text-sm text-foreground/60">
        Notes are encrypted in the Edge Function; the database stores ciphertext only.
      </p>
      {!online && (
        <p className="text-sm text-warning">Offline — creating or reading notes is disabled.</p>
      )}
      {msg && <p className="text-sm text-accent">{msg}</p>}

      <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <h2 className="font-medium">New note</h2>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <textarea
          value={plaintext}
          onChange={(e) => setPlaintext(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Note text (plaintext only inside this secure form)"
        />
        <button
          type="button"
          disabled={!online}
          onClick={() => void createNote()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Encrypt & save
        </button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <h2 className="font-medium">Read note by id</h2>
        <input
          value={readId}
          onChange={(e) => setReadId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Note UUID"
        />
        <button
          type="button"
          disabled={!online}
          onClick={() => void readNote()}
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
        >
          Decrypt & load
        </button>
        {readOut !== null && (
          <pre className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm">
            {readOut}
          </pre>
        )}
      </section>
    </div>
  );
}
