export type MantlePaletteId = "warm" | "slate" | "forest" | "ocean";

export type MantleThemeMode = "light" | "dark";

export type MantleThemeId = `${MantlePaletteId}-${MantleThemeMode}`;

export type MantleThemeOption = {
  id: MantleThemeId;
  label: string;
  description: string;
  /** Fixed preview colors — always shown the same on the swatch */
  swatch: [string, string];
};

export const MANTLE_THEME_OPTIONS: MantleThemeOption[] = [
  {
    id: "warm-light",
    label: "Warm",
    description: "Cream + brown (original light)",
    swatch: ["#f5f1e8", "#6b4e3d"],
  },
  {
    id: "warm-dark",
    label: "Warm night",
    description: "Dark brown + tan",
    swatch: ["#1c1814", "#c4a88a"],
  },
  {
    id: "slate-light",
    label: "Slate",
    description: "Cool gray + slate blue",
    swatch: ["#f4f6f8", "#475569"],
  },
  {
    id: "slate-dark",
    label: "Slate night",
    description: "Charcoal + silver",
    swatch: ["#0f1419", "#94a3b8"],
  },
  {
    id: "forest-light",
    label: "Forest",
    description: "Soft green + forest green",
    swatch: ["#f2f6f3", "#3d5c47"],
  },
  {
    id: "forest-dark",
    label: "Forest night",
    description: "Deep green + sage",
    swatch: ["#141a16", "#8fb39a"],
  },
  {
    id: "ocean-light",
    label: "Ocean",
    description: "Sky blue + navy",
    swatch: ["#f2f6fa", "#2c5282"],
  },
  {
    id: "ocean-dark",
    label: "Ocean night",
    description: "Midnight + sky blue",
    swatch: ["#121820", "#7eb6d9"],
  },
];

export const MANTLE_THEME_IDS = MANTLE_THEME_OPTIONS.map((t) => t.id);

export const MANTLE_PALETTE_IDS: MantlePaletteId[] = ["warm", "slate", "forest", "ocean"];

export type MantlePaletteOption = {
  id: MantlePaletteId;
  label: string;
  /** Fixed night-style preview — same swatch in the color picker regardless of mode */
  swatch: [string, string];
};

export const MANTLE_PALETTES: MantlePaletteOption[] = MANTLE_PALETTE_IDS.map((id) => {
  const light = MANTLE_THEME_OPTIONS.find((t) => t.id === `${id}-light`)!;
  const night = MANTLE_THEME_OPTIONS.find((t) => t.id === `${id}-dark`)!;
  return {
    id,
    label: light.label,
    swatch: night.swatch,
  };
});

export const DEFAULT_MANTLE_THEME: MantleThemeId = "warm-light";

export type MantleAppearanceMode = "light" | "dark" | "system";

export const MANTLE_APPEARANCE_MODE_KEY = "mantle-appearance-mode";

export const DEFAULT_APPEARANCE_MODE: MantleAppearanceMode = "system";

export function readAppearanceMode(): MantleAppearanceMode {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE_MODE;
  try {
    const value = localStorage.getItem(MANTLE_APPEARANCE_MODE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* ignore */
  }
  return DEFAULT_APPEARANCE_MODE;
}

export function writeAppearanceMode(mode: MantleAppearanceMode) {
  try {
    localStorage.setItem(MANTLE_APPEARANCE_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveThemeForAppearance(
  palette: MantlePaletteId,
  appearanceMode: MantleAppearanceMode,
): MantleThemeId {
  if (appearanceMode === "light") return composeMantleThemeId(palette, "light");
  if (appearanceMode === "dark") return composeMantleThemeId(palette, "dark");
  return composeMantleThemeId(palette, systemPrefersDark() ? "dark" : "light");
}

export function composeMantleThemeId(
  palette: MantlePaletteId,
  mode: MantleThemeMode,
): MantleThemeId {
  return `${palette}-${mode}`;
}

export function parseMantleThemeId(theme: string | undefined): {
  palette: MantlePaletteId;
  mode: MantleThemeMode;
} {
  const normalized = normalizeStoredTheme(theme);
  const [palette, mode] = normalized.split("-") as [MantlePaletteId, MantleThemeMode];
  return { palette, mode };
}

export function isMantleThemeId(value: string): value is MantleThemeId {
  return (MANTLE_THEME_IDS as string[]).includes(value);
}

export function isMantlePaletteId(value: string): value is MantlePaletteId {
  return (MANTLE_PALETTE_IDS as string[]).includes(value);
}

/** Migrate legacy storage values from earlier releases. */
export function normalizeStoredTheme(value: string | null | undefined): MantleThemeId {
  if (!value) return DEFAULT_MANTLE_THEME;
  if (value === "light") return "warm-light";
  if (value === "dark") return "warm-dark";
  return isMantleThemeId(value) ? value : DEFAULT_MANTLE_THEME;
}

export function isDarkMantleTheme(theme: string | undefined): boolean {
  return parseMantleThemeId(theme).mode === "dark";
}

export function paletteOption(id: MantlePaletteId): MantlePaletteOption {
  return MANTLE_PALETTES.find((p) => p.id === id) ?? MANTLE_PALETTES[0]!;
}
