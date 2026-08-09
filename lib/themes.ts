/** Storefront theme presets — stored on creators.theme.preset */
export const THEME_PRESETS = {
  teal: {
    name: "Muya Teal",
    bg: "#faf8f4",
    card: "#ffffff",
    ink: "#16211f",
    accent: "#1d6a64",
    button: "#1d6a64",
    buttonText: "#ffffff",
  },
  sunset: {
    name: "Sunset",
    bg: "#fff7f0",
    card: "#ffffff",
    ink: "#2a1a10",
    accent: "#c2410c",
    button: "#ea580c",
    buttonText: "#ffffff",
  },
  forest: {
    name: "Forest",
    bg: "#f4f8f4",
    card: "#ffffff",
    ink: "#14211a",
    accent: "#166534",
    button: "#16a34a",
    buttonText: "#ffffff",
  },
  midnight: {
    name: "Midnight",
    bg: "#101418",
    card: "#1b2129",
    ink: "#e8ecf0",
    accent: "#7dd3c8",
    button: "#2a7f78",
    buttonText: "#ffffff",
  },
} as const;

export type ThemePresetKey = keyof typeof THEME_PRESETS;

export function themeOf(preset?: string) {
  return THEME_PRESETS[(preset as ThemePresetKey) ?? "teal"] ?? THEME_PRESETS.teal;
}
