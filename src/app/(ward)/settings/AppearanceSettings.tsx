"use client";

import { migrateLegacyThemeStorage } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  MANTLE_PALETTES,
  normalizeStoredTheme,
  parseMantleThemeId,
  readAppearanceMode,
  resolveThemeForAppearance,
  writeAppearanceMode,
  type MantleAppearanceMode,
  type MantlePaletteId,
  type MantleThemeId,
} from "@/lib/themes/mantleThemes";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const MODE_OPTIONS: { id: MantleAppearanceMode; label: string; description: string }[] = [
  { id: "light", label: "Light", description: "Light background" },
  { id: "dark", label: "Dark", description: "Dark background" },
  { id: "system", label: "System", description: "Match device" },
];

function GradientThemeSwatch({ colors }: { colors: [string, string] }) {
  const [from, to] = colors;
  return (
    <span
      className="relative h-10 w-10 shrink-0 rounded-full ring-1 ring-black/10"
      style={{
        background: `
          radial-gradient(circle at 32% 28%, color-mix(in srgb, ${from} 92%, white) 0%, transparent 55%),
          linear-gradient(145deg, ${from} 0%, color-mix(in srgb, ${from} 55%, ${to}) 45%, ${to} 100%)
        `,
        boxShadow: `inset 0 1px 2px color-mix(in srgb, white 25%, transparent)`,
      }}
      aria-hidden
    />
  );
}

function PaletteRow({
  label,
  swatch,
  selected,
  onSelect,
}: {
  label: string;
  swatch: [string, string];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-muted/80 ring-1 ring-primary"
          : "border-border bg-background hover:bg-muted/50",
      )}
    >
      <GradientThemeSwatch colors={swatch} />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [appearanceMode, setAppearanceMode] = useState<MantleAppearanceMode>("system");

  useEffect(() => {
    migrateLegacyThemeStorage();
    setAppearanceMode(readAppearanceMode());
    setMounted(true);
  }, []);

  const active: MantleThemeId = mounted
    ? normalizeStoredTheme(theme)
    : normalizeStoredTheme(undefined);
  const { palette: activePalette } = parseMantleThemeId(active);

  const applyMode = (next: MantleAppearanceMode) => {
    writeAppearanceMode(next);
    setAppearanceMode(next);
    setTheme(resolveThemeForAppearance(activePalette, next));
  };

  const applyPalette = (paletteId: MantlePaletteId) => {
    setTheme(resolveThemeForAppearance(paletteId, appearanceMode));
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-foreground/60">
        Mode sets light or dark backgrounds. Color picks the palette for either mode.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mode
          </p>
          <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Appearance mode"
          >
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={mounted && appearanceMode === option.id}
                onClick={() => applyMode(option.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-center transition-colors",
                  mounted && appearanceMode === option.id
                    ? "border-primary bg-muted/80 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-muted/50",
                )}
              >
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Color
          </p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Color palette">
            {MANTLE_PALETTES.map((palette) => (
              <PaletteRow
                key={palette.id}
                label={palette.label}
                swatch={palette.swatch}
                selected={mounted && activePalette === palette.id}
                onSelect={() => applyPalette(palette.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
