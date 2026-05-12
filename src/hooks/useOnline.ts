"use client";

import { useEffect, useState } from "react";

export function useOnline() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  return online;
}
