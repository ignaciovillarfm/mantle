"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-warning/40 bg-warning/20 px-4 py-2 text-center text-sm text-warning"
    >
      You are offline – showing last synced data
    </div>
  );
}
