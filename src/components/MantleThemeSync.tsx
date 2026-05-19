"use client";

import {
  normalizeStoredTheme,
  parseMantleThemeId,
  readAppearanceMode,
  resolveThemeForAppearance,
} from "@/lib/themes/mantleThemes";
import { useTheme } from "next-themes";
import { useEffect } from "react";

/** Keeps the applied theme in sync when appearance mode is System. */
export function MantleThemeSync() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const sync = () => {
      if (readAppearanceMode() !== "system") return;
      const { palette } = parseMantleThemeId(theme);
      const next = resolveThemeForAppearance(palette, "system");
      if (normalizeStoredTheme(theme) !== next) setTheme(next);
    };

    sync();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [theme, setTheme]);

  return null;
}
