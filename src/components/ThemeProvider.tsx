"use client";

import {
  DEFAULT_APPEARANCE_MODE,
  DEFAULT_MANTLE_THEME,
  MANTLE_APPEARANCE_MODE_KEY,
  MANTLE_THEME_IDS,
  normalizeStoredTheme,
  parseMantleThemeId,
  readAppearanceMode,
  resolveThemeForAppearance,
} from "@/lib/themes/mantleThemes";
import { MantleThemeSync } from "@/components/MantleThemeSync";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export const MANTLE_THEME_STORAGE_KEY = "mantle-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={DEFAULT_MANTLE_THEME}
      enableSystem={false}
      storageKey={MANTLE_THEME_STORAGE_KEY}
      themes={[...MANTLE_THEME_IDS]}
      disableTransitionOnChange
    >
      <MantleThemeSync />
      {children}
    </NextThemesProvider>
  );
}

/** Call once on client after mount to migrate legacy theme keys. */
export function migrateLegacyThemeStorage() {
  try {
    const raw = localStorage.getItem(MANTLE_THEME_STORAGE_KEY);
    const next = normalizeStoredTheme(raw);
    if (raw !== next) localStorage.setItem(MANTLE_THEME_STORAGE_KEY, next);

    if (!localStorage.getItem(MANTLE_APPEARANCE_MODE_KEY)) {
      localStorage.setItem(MANTLE_APPEARANCE_MODE_KEY, DEFAULT_APPEARANCE_MODE);
    }

    const appearanceMode = readAppearanceMode();
    if (appearanceMode === "system") {
      const { palette } = parseMantleThemeId(next);
      const resolved = resolveThemeForAppearance(palette, "system");
      if (resolved !== next) localStorage.setItem(MANTLE_THEME_STORAGE_KEY, resolved);
    }
  } catch {
    /* ignore */
  }
}
