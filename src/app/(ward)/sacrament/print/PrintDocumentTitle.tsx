"use client";

import { useEffect } from "react";

/** Sets `document.title` so Save as PDF uses ward + date as the default filename. */
export function PrintDocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return null;
}
