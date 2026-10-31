"use client";

import { cn } from "@/lib/utils";
import { userInitialsFromDisplayName } from "@/lib/userDisplayName";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function UserNavMenu({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
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
        aria-label={`${displayName}, account menu`}
        className={cn(
          "flex min-h-10 min-w-10 items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-hover",
          open && "bg-surface-hover",
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- OAuth URLs
          <img
            src={avatarUrl}
            alt=""
            className="pointer-events-none h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="pointer-events-none flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-border"
            aria-hidden
          >
            {userInitialsFromDisplayName(displayName)}
          </span>
        )}
        <span className="max-w-[8rem] truncate text-sm font-medium text-foreground sm:max-w-[10rem]">
          {displayName}
        </span>
        <svg
          className={cn("size-3.5 shrink-0 opacity-60 transition", open && "rotate-180")}
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
              aria-label="Account"
              className="fixed z-100 min-w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-foreground/5"
              style={{ top: anchor.top, right: anchor.right, pointerEvents: "auto" }}
            >
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-3 py-2.5 text-sm transition",
                  pathname.startsWith("/settings")
                    ? "bg-muted font-medium text-foreground"
                    : "text-foreground/75 hover:bg-muted/60 hover:text-foreground",
                )}
              >
                Settings
              </Link>
              <form action="/auth/sign-out" method="post">
                <button
                  type="submit"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm text-foreground/75 transition hover:bg-muted/60 hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
