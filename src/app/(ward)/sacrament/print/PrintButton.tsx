"use client";

export function PrintButton({ label, documentTitle }: { label: string; documentTitle: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        document.title = documentTitle;
        window.print();
      }}
      className="rounded border border-slate-300 px-3 py-1 text-sm"
    >
      {label}
    </button>
  );
}
