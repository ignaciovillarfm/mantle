"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-slate-300 px-3 py-1 text-sm"
    >
      {label}
    </button>
  );
}

