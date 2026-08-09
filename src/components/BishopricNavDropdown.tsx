"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ITEMS = [
  { href: "/bishopric/organization", label: "Organization" },
  { href: "/bishopric/meetings", label: "Meetings" },
  { href: "/bishopric/youth-activities", label: "Youth Activities" },
  { href: "/bishopric/youth-classes", label: "Youth Classes" },
  { href: "/bishopric/sacrament-bread", label: "Sacrament Bread" },
] as const;

function isBishopricPath(pathname: string) {
  return pathname.startsWith("/bishopric") || pathname === "/dashboard";
}

export function BishopricNavDropdown() {
  const pathname = usePathname();
  const sectionActive = isBishopricPath(pathname);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    updateAnchor();

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [open, updateAnchor]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) updateAnchor();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition",
          sectionActive
            ? "bg-surface-hover text-foreground"
            : "text-foreground/80 hover:bg-surface-hover hover:text-foreground",
        )}
      >
        Bishopric
        <svg
          className={cn("size-3.5 opacity-60 transition", open && "rotate-180")}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && anchor
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Bishopric"
              // Portaled to the document root so page-level stacking contexts and
              // leftover popup overlays cannot swallow the clicks.
              className="fixed z-100 min-w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-foreground/5"
              style={{ top: anchor.top, left: anchor.left, pointerEvents: "auto" }}
            >
              {ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-foreground/75 hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
