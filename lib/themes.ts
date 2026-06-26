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
 * Each template ships TWO light + TWO dark predetermined palettes (semantic
 * ColorSets). The first light/dark preset matches the original Claude Design
 * mock. A church selects a preset per mode via `config.palette`, can still
 * override any token via `config.themeOverrides`, and `config.brand.accent`
 * seeds the accent in both modes.
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

// ── Editorial ──────────────────────────────────────────────────────────────
const EDITORIAL: TemplateTheme = {
  fonts: { serif: "newsreader", sans: "hanken" },
  defaultLight: "warm-paper",
  defaultDark: "espresso",
  palettes: {
    light: {
      "warm-paper": {
        bg: "#f4efe6", ink: "#211c16", inkSoft: "#6b6157", inkMuted: "#837a6c", faint: "#a9a08f",
        card: "#fffefb", cardAlt: "#fdf3ef", line: "#e6ded0", divider: "#f0e8da", track: "#e1d8c8",
        accent: "#8a3441", accentDeep: "#7a2e3a", onAccent: "#f6e7e2",
      },
      ivory: {
        bg: "#f3f1ec", ink: "#1c1a17", inkSoft: "#5f5950", inkMuted: "#837c70", faint: "#aaa298",
        card: "#ffffff", cardAlt: "#f6f1ea", line: "#e7e2d8", divider: "#efeae0", track: "#ddd6c8",
        accent: "#8a3441", accentDeep: "#722a36", onAccent: "#f7e8e3",
      },
    },
    dark: {
      espresso: {
        bg: "#17130f", ink: "#f2ece1", inkSoft: "#cdc3b4", inkMuted: "#9d927f", faint: "#6f6557",
        card: "#211b16", cardAlt: "#2a221b", line: "#352d24", divider: "#2b231c", track: "#43392e",
        accent: "#c96b76", accentDeep: "#6f2a35", onAccent: "#f6e7e2",
      },
      plum: {
        bg: "#161219", ink: "#efe9ef", inkSoft: "#c5bcc6", inkMuted: "#948b97", faint: "#675f6a",
        card: "#1f1a24", cardAlt: "#271f2d", line: "#342b3a", divider: "#271f2d", track: "#41374a",
        accent: "#cf7088", accentDeep: "#5e2540", onAccent: "#f7e6ee",
      },
    },
  },
};

// ── Warm Bento ─────────────────────────────────────────────────────────────
const WARM_BENTO: TemplateTheme = {
  fonts: { serif: "newsreader", sans: "hanken" },
  defaultLight: "sand",
  defaultDark: "umber",
  palettes: {
    light: {
      sand: {
        bg: "#f6eee0", ink: "#2a2117", inkSoft: "#877460", inkMuted: "#877460", faint: "#b4a48f",
        card: "#fffdf6", cardAlt: "#fdeee6", line: "#ece1cd", divider: "#f0e6d6", track: "#e6d3bd",
        accent: "#c0512e", accentDeep: "#a23e1f", onAccent: "#fdeee6",
      },
      linen: {
        bg: "#f4f0e9", ink: "#271f17", inkSoft: "#7d6f5d", inkMuted: "#968976", faint: "#b3a994",
        card: "#fffdf9", cardAlt: "#f6ece0", line: "#e7e0d2", divider: "#efe8da", track: "#e0d4c2",
        accent: "#c0512e", accentDeep: "#9c3a1c", onAccent: "#fdeee6",
      },
    },
    dark: {
      umber: {
        bg: "#18120d", ink: "#f5ecdf", inkSoft: "#c2b29c", inkMuted: "#9c8c76", faint: "#6e604e",
        card: "#221a12", cardAlt: "#2b2118", line: "#362a1d", divider: "#2c2117", track: "#45382a",
        accent: "#e0734f", accentDeep: "#8f3a1d", onAccent: "#fdeee6",
      },
      char: {
        bg: "#15130f", ink: "#f3ede2", inkSoft: "#c0b6a4", inkMuted: "#968c79", faint: "#695f4f",
        card: "#1e1b15", cardAlt: "#25211a", line: "#322c22", divider: "#25211a", track: "#41392c",
        accent: "#e0734f", accentDeep: "#8a3a1f", onAccent: "#fdeee6",
      },
    },
  },
};

// ── Warm Guide ─────────────────────────────────────────────────────────────
const WARM_GUIDE: TemplateTheme = {
  fonts: { serif: "spectral", sans: "hanken" },
  defaultLight: "clay",
  defaultDark: "cocoa",
  palettes: {
    light: {
      clay: {
        bg: "#f3ebe2", ink: "#2b211b", inkSoft: "#7c6c5d", inkMuted: "#8c7a6c", faint: "#b6a797",
        card: "#fffaf4", cardAlt: "#fcefe9", line: "#e9ddcf", divider: "#efe2d4", track: "#e3d2c0",
        accent: "#b15741", accentDeep: "#8f4029", onAccent: "#fcefe9",
      },
      oat: {
        bg: "#f5f1e9", ink: "#261e18", inkSoft: "#786a5c", inkMuted: "#8c8071", faint: "#b4a994",
        card: "#fffdf8", cardAlt: "#f6ede3", line: "#e8e0d2", divider: "#efe8db", track: "#e1d6c4",
        accent: "#b15741", accentDeep: "#8a3c26", onAccent: "#fcefe9",
      },
    },
    dark: {
      cocoa: {
        bg: "#18120e", ink: "#f4ece4", inkSoft: "#c5b6a6", inkMuted: "#9b8a7b", faint: "#6d5f51",
        card: "#221b15", cardAlt: "#2b221b", line: "#36291f", divider: "#2c2219", track: "#443629",
        accent: "#cf7058", accentDeep: "#7e3522", onAccent: "#fcefe9",
      },
      "warm-slate": {
        bg: "#14130f", ink: "#f1ece4", inkSoft: "#c0b5a7", inkMuted: "#978c7d", faint: "#685f52",
        card: "#1d1b16", cardAlt: "#24211b", line: "#312b22", divider: "#24211b", track: "#3f392d",
        accent: "#d3735b", accentDeep: "#7a3522", onAccent: "#fcefe9",
      },
    },
  },
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

  const seed = config.brand?.accent;
  if (seed) {
    light.accent = seed;
    light.accentDeep = darken(seed, 0.12);
    dark.accent = seed;
    dark.accentDeep = darken(seed, 0.12);
  }

  Object.assign(light, config.themeOverrides?.light);
  Object.assign(dark, config.themeOverrides?.dark);
  return { fonts, light, dark };
}

/** Turn a ColorSet + fonts into the CSS custom properties the templates read.
 *  Accent/accentDeep are emitted as "R G B" triples so utilities can apply
 *  opacity (rgb(var(--brand) / a)); the rest are hex. */
export function themeToVars(cs: ColorSet, fonts: ThemeFonts): CSSProperties {
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
    "--ds-serif": SERIF_STACKS[fonts.serif],
    "--ds-sans": SANS_STACKS[fonts.sans],
    fontFamily: "var(--ds-sans)",
  } as CSSProperties;
}
