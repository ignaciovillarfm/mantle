"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hosts the printable program. For in-page preview the node is nested in app
 * chrome; on beforeprint it moves to document.body so print CSS can hide the
 * rest of the app without blanking the program or leaving an empty first page.
 */
export function SacramentPrintShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const homeRef = useRef<{ parent: Node; next: ChildNode | null } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const moveToBody = () => {
      const node = ref.current;
      if (!node || node.parentElement === document.body) return;
      homeRef.current = {
        parent: node.parentNode as Node,
        next: node.nextSibling,
      };
      document.body.appendChild(node);
    };

    const restore = () => {
      const home = homeRef.current;
      const node = ref.current;
      if (!home || !node) return;
      if (home.next && home.next.parentNode === home.parent) {
        home.parent.insertBefore(node, home.next);
      } else {
        home.parent.appendChild(node);
      }
      homeRef.current = null;
    };

    const onPrintChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) moveToBody();
      else restore();
    };

    window.addEventListener("beforeprint", moveToBody);
    window.addEventListener("afterprint", restore);
    const mql = window.matchMedia("print");
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onPrintChange);
    } else {
      mql.addListener(onPrintChange);
    }

    return () => {
      window.removeEventListener("beforeprint", moveToBody);
      window.removeEventListener("afterprint", restore);
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onPrintChange);
      } else {
        mql.removeListener(onPrintChange);
      }
      restore();
    };
  }, []);

  return (
    <main ref={ref} className={cn("sacrament-print", className)}>
      {children}
    </main>
  );
}
