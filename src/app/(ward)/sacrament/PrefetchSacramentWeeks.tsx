"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Eagerly warm the RSC payload for adjacent weeks so week changes feel instant. */
export function PrefetchSacramentWeeks({ urls }: { urls: string[] }) {
  const router = useRouter();
  useEffect(() => {
    for (const u of urls) {
      router.prefetch(u);
    }
  }, [router, urls]);
  return null;
}
