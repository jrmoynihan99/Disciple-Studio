import type { CSSProperties } from "react";
import type {
  ChurchConfig,
  ColorSet,
  SansFont,
  SerifFont,
  ThemeFonts,
} from "./types";
import { hexToTriple, darken } from "./color";

/**
 * Theme system for the demo templates.
 *
 * Each template ships predetermined light + dark palettes (semantic ColorSets).
 * Every palette carries its OWN accent, tuned to match it — so picking a palette
 * per mode also picks an accent that fits (and light vs dark can differ). A
 * church selects presets per mode via `config.palette` and can still override
 * any token via `config.themeOverrides`. `config.brand.accent` is OPTIONAL: when
 * present it overrides the palette accent in both modes; when omitted the
 * palette's accent is used as-is.
 *
 * DemoChrome resolves the active set (system light/dark + toggle) and injects it
 * as CSS vars the Tailwind tokens in globals.css read.
 */

type Palettes = { light: Record<string, ColorSet>; dark: Record<string, ColorSet> };
type TemplateTheme = {
  fonts: ThemeFonts;
  palettes: Palettes;
  defaultLight: string;
  defaultDark: string;
};

const SERIF_STACKS: Record<SerifFont, string> = {
  newsreader: "var(--font-newsreader), 'Newsreader', ui-serif, Georgia, serif",
  spectral: "var(--ff-spectral), 'Spectral', ui-serif, Georgia, serif",
};
const SANS_STACKS: Record<SansFont, string> = {
  hanken: "var(--font-hanken), 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif",
};

/**
 * Shared palette presets. `white`/`black` are the DEFAULT for every template: a
 * soft off-white / soft charcoal (never pure #fff or #000) paired with a
 * refined, muted clay accent. The rest are warm alternatives, also with
 * restrained, low-saturation accents (nothing loud or "techy"):
 *
 *   light: white (soft neutral) · ivory (warm off-white) · sand (warm tan) · sage (soft green) · blush (warm rose)
 *   dark:  black (soft charcoal) · espresso (warm neutral) · clay (warm brown) · pine (deep green) · port (wine)
 *
 * Each preset's `accent`/`accentDeep` is what renders by default;
 * `config.brand.accent` (optional) overrides it. `onAccent` is the near-white
 * text color on accent surfaces.
 */
const LIGHT_PRESETS: Record<string, ColorSet> = {
  white: {
    bg: "#f6f5f3", ink: "#222020", inkSoft: "#575452", inkMuted: "#827e7a", faint: "#aaa6a0",
    card: "#fdfdfc", cardAlt: "#eeece8", line: "#e5e2dd", divider: "#eeebe6", track: "#e0ddd6",
    accent: "#9e6450", accentDeep: "#7f4e3d", onAccent: "#fbf6f1",
  },
  ivory: {
    bg: "#faf7f1", ink: "#2a2620", inkSoft: "#5f574b", inkMuted: "#837a6c", faint: "#b4a994",
    card: "#fffefb", cardAlt: "#f3ede2", line: "#e9e1d3", divider: "#f1ebdf", track: "#e1d7c5",
    accent: "#9b6553", accentDeep: "#7d5040", onAccent: "#fdf6ef",
  },
  sand: {
    bg: "#f6efe2", ink: "#2c2418", inkSoft: "#6d6150", inkMuted: "#8a7d69", faint: "#b3a88f",
    card: "#fffdf7", cardAlt: "#efe5d2", line: "#e6dbc5", divider: "#f0e7d5", track: "#ddd1ba",
    accent: "#a87c52", accentDeep: "#876240", onAccent: "#fdf4e8",
  },
  sage: {
    bg: "#eef1e8", ink: "#232a1f", inkSoft: "#4f5847", inkMuted: "#6e7764", faint: "#9aa28c",
    card: "#fbfcf8", cardAlt: "#e6ebdb", line: "#d8dfca", divider: "#e6ebd9", track: "#cfd7be",
    accent: "#6e7a59", accentDeep: "#566145", onAccent: "#f4f7ec",
  },
  blush: {
    bg: "#f8efe9", ink: "#2e231f", inkSoft: "#6b5a52", inkMuted: "#8a766b", faint: "#bda79b",
    card: "#fffaf6", cardAlt: "#f1e2d8", line: "#ecdccf", divider: "#f4e7de", track: "#e6d2c5",
    accent: "#a07a7b", accentDeep: "#826064", onAccent: "#fdf4f0",
  },
};

const DARK_PRESETS: Record<string, ColorSet> = {
  black: {
    bg: "#161513", ink: "#f1efea", inkSoft: "#bbb6ad", inkMuted: "#8a857c", faint: "#5e584f",
    card: "#201e1a", cardAlt: "#2a2722", line: "#34302a", divider: "#221f1b", track: "#3f3a32",
    accent: "#c98a6b", accentDeep: "#a96f53", onAccent: "#fbf3ec",
  },
  espresso: {
    bg: "#14110d", ink: "#f6f1e8", inkSoft: "#cabfae", inkMuted: "#968b78", faint: "#6a5f4f",
    card: "#1f1a14", cardAlt: "#2a241c", line: "#352d20", divider: "#241e16", track: "#423829",
    accent: "#c49a70", accentDeep: "#a17e56", onAccent: "#fff7ea",
  },
  clay: {
    bg: "#161210", ink: "#f3ece4", inkSoft: "#c7b9ac", inkMuted: "#948578", faint: "#685b4e",
    card: "#211b16", cardAlt: "#2c241d", line: "#392f25", divider: "#251e18", track: "#443a2d",
    accent: "#bd8b6e", accentDeep: "#996f55", onAccent: "#fdf3ec",
  },
  pine: {
    bg: "#0f150f", ink: "#e9f1e6", inkSoft: "#b4c4ad", inkMuted: "#7f8f78", faint: "#56654f",
    card: "#172017", cardAlt: "#1f2a1e", line: "#2a3826", divider: "#1b251a", track: "#33422e",
    accent: "#8c9f7c", accentDeep: "#6f8161", onAccent: "#f1f8ea",
  },
  port: {
    bg: "#1a1011", ink: "#f4eae9", inkSoft: "#cdb6b6", inkMuted: "#9b8282", faint: "#6e5454",
    card: "#241719", cardAlt: "#301f22", line: "#3e2a2d", divider: "#281a1c", track: "#4a3236",
    accent: "#bb8c91", accentDeep: "#9a6f74", onAccent: "#fdeff0",
  },
};

const SHARED_PALETTES: Palettes = { light: LIGHT_PRESETS, dark: DARK_PRESETS };

// Each template reuses the shared presets; only fonts + the default pair differ.
const EDITORIAL: TemplateTheme = {
  fonts: { serif: "newsreader", sans: "hanken" },
  defaultLight: "white",
  defaultDark: "black",
  palettes: SHARED_PALETTES,
};

const WARM_BENTO: TemplateTheme = {
  fonts: { serif: "newsreader", sans: "hanken" },
  defaultLight: "white",
  defaultDark: "black",
  palettes: SHARED_PALETTES,
};

const WARM_GUIDE: TemplateTheme = {
  fonts: { serif: "spectral", sans: "hanken" },
  defaultLight: "white",
  defaultDark: "black",
  palettes: SHARED_PALETTES,
};

const TEMPLATE_THEMES: Record<string, TemplateTheme> = {
  editorial: EDITORIAL,
  "warm-bento": WARM_BENTO,
  "warm-guide": WARM_GUIDE,
};
const DEFAULT_THEME = EDITORIAL;

/** Names of the available presets for a template (for the admin picker). */
export function listPalettes(templateKey: string): { light: string[]; dark: string[] } {
  const t = TEMPLATE_THEMES[templateKey] ?? DEFAULT_THEME;
  return { light: Object.keys(t.palettes.light), dark: Object.keys(t.palettes.dark) };
}

/** The accent each chosen (or default) palette contributes, ignoring any brand
 *  override — so the admin can show what accent a palette selection yields. */
export function paletteAccents(
  templateKey: string,
  paletteLight?: string,
  paletteDark?: string,
): { light: string; dark: string } {
  const base = TEMPLATE_THEMES[templateKey] ?? DEFAULT_THEME;
  const lightName = paletteLight && base.palettes.light[paletteLight] ? paletteLight : base.defaultLight;
  const darkName = paletteDark && base.palettes.dark[paletteDark] ? paletteDark : base.defaultDark;
  return { light: base.palettes.light[lightName].accent, dark: base.palettes.dark[darkName].accent };
}

/** A palette's key colors, for rendering a preview swatch in the admin picker. */
export interface PaletteSwatch {
  name: string;
  bg: string;
  card: string;
  ink: string;
  accent: string;
}

/** The available palettes for a mode as preview swatches (for the admin picker). */
export function listPaletteSwatches(templateKey: string, mode: "light" | "dark"): PaletteSwatch[] {
  const base = TEMPLATE_THEMES[templateKey] ?? DEFAULT_THEME;
  const presets = mode === "light" ? base.palettes.light : base.palettes.dark;
  return Object.entries(presets).map(([name, cs]) => ({
    name,
    bg: cs.bg,
    card: cs.card,
    ink: cs.ink,
    accent: cs.accent,
  }));
}

/** The default palette name per mode for a template. */
export function paletteDefaults(templateKey: string): { light: string; dark: string } {
  const base = TEMPLATE_THEMES[templateKey] ?? DEFAULT_THEME;
  return { light: base.defaultLight, dark: base.defaultDark };
}

export interface ResolvedTheme {
  fonts: ThemeFonts;
  light: ColorSet;
  dark: ColorSet;
}

/** Resolve a church's effective theme: pick presets → brand.accent seed →
 *  per-mode overrides. */
export function resolveTheme(config: ChurchConfig): ResolvedTheme {
  const base = TEMPLATE_THEMES[config.template] ?? DEFAULT_THEME;
  const fonts: ThemeFonts = { ...base.fonts, ...config.themeOverrides?.fonts };

  const lightName = config.palette?.light && base.palettes.light[config.palette.light]
    ? config.palette.light
    : base.defaultLight;
  const darkName = config.palette?.dark && base.palettes.dark[config.palette.dark]
    ? config.palette.dark
    : base.defaultDark;

  const light: ColorSet = { ...base.palettes.light[lightName] };
  const dark: ColorSet = { ...base.palettes.dark[darkName] };

  // Accent override: a per-mode value wins, else a single `accent` applies to
  // both. accentDeep (the focal-card shade) is derived from whichever wins.
  const lightSeed = config.brand?.accentLight ?? config.brand?.accent;
  const darkSeed = config.brand?.accentDark ?? config.brand?.accent;
  if (lightSeed) {
    light.accent = lightSeed;
    light.accentDeep = darken(lightSeed, 0.12);
  }
  if (darkSeed) {
    dark.accent = darkSeed;
    dark.accentDeep = darken(darkSeed, 0.12);
  }

  Object.assign(light, config.themeOverrides?.light);
  Object.assign(dark, config.themeOverrides?.dark);
  return { fonts, light, dark };
}

/** Turn a ColorSet + fonts into the CSS custom properties the templates read.
 *  Accent/accentDeep are emitted as "R G B" triples so utilities can apply
 *  opacity (rgb(var(--brand) / a)); the rest are hex. `--logo-filter` recolors
 *  an uploaded logo into a flat silhouette that matches the mode (black on
 *  light, white on dark) so it reads cleanly in either theme. */
export function themeToVars(cs: ColorSet, fonts: ThemeFonts, mode: "light" | "dark"): CSSProperties {
  return {
    "--paper": cs.bg,
    "--ink": cs.ink,
    "--ink-soft": cs.inkSoft,
    "--ink-muted": cs.inkMuted,
    "--faint": cs.faint,
    "--card": cs.card,
    "--card-2": cs.cardAlt,
    "--edge": cs.line,
    "--hairline": cs.line,
    "--hairline-soft": cs.divider,
    "--upcoming": cs.track,
    "--on-accent": cs.onAccent,
    "--brand": hexToTriple(cs.accent),
    "--brand-card": hexToTriple(cs.accentDeep),
    "--logo-filter": mode === "dark" ? "brightness(0) invert(1)" : "brightness(0)",
    "--ds-serif": SERIF_STACKS[fonts.serif],
    "--ds-sans": SANS_STACKS[fonts.sans],
    fontFamily: "var(--ds-sans)",
  } as CSSProperties;
}
