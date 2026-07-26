"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/bishopric/organization", label: "Organization" },
  { href: "/bishopric/meetings", label: "Meetings" },
  { href: "/bishopric/youth-activities", label: "Youth Activities" },
] as const;

function isBishopricPath(pathname: string) {
  return pathname.startsWith("/bishopric") || pathname === "/dashboard";
}

export function BishopricNavDropdown() {
  const pathname = usePathname();
  const sectionActive = isBishopricPath(pathname);

  return (
    <div className="group relative">
      <Link
        href="/bishopric/organization"
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition",
          sectionActive
            ? "bg-surface-hover text-foreground"
            : "text-foreground/80 hover:bg-surface-hover hover:text-foreground",
        )}
        aria-current={sectionActive ? "page" : undefined}
      >
        Bishopric
        <svg
          className="size-3.5 opacity-60 transition group-hover:rotate-180 group-focus-within:rotate-180"
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
      </Link>

      <div
        className={cn(
          "pointer-events-none absolute left-0 top-full z-50 min-w-[11rem] pt-1 opacity-0 transition-opacity duration-150",
          "group-hover:pointer-events-auto group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        )}
      >
        <div className="overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-foreground/5">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-3 py-2 text-sm transition",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-foreground/75 hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
