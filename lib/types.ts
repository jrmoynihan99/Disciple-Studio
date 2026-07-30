/**
 * The church demo data contract.
 *
 * One `ChurchConfig` object fully describes a single personalized lead-magnet
 * demo. Every template and the member dropdown consume ONLY this object — there
 * is no Firebase / CCB / Sanity at runtime. To create a new church demo you
 * write one config file in `src/churches/` (or generate it from /admin) and the
 * `/c/<slug>` route renders it.
 *
 * Design goals:
 *  - Mirror the SHAPE of the real product (a Discipleship Track + Next Steps
 *    list + a logged-in member with progress) so the demo reads as authentic.
 *  - Be 100% static and human-fillable in a few minutes per church.
 */

/** Lucide icon names allowed for a step. Keep this list in sync with ICON_MAP
 *  in `src/lib/icons.tsx`. */
export type IconName =
  | "heart"
  | "droplets"
  | "users"
  | "book-open"
  | "hand-helping"
  | "hand-heart"
  | "church"
  | "music"
  | "globe"
  | "sparkles"
  | "flame"
  | "graduation-cap"
  | "compass"
  | "star";

/** The demo member's progress on a single step. */
export type StepStatus = "complete" | "in-progress" | "not-started";

/**
 * One step in a church's pathway. Definitions are church-wide (the same for
 * every member); a member's personal progress is recorded separately in
 * `DemoMember.steps`, keyed by `key`.
 */
export interface PathwayStep {
  /** Stable identifier, referenced by DemoMember.steps. e.g. "baptism". */
  key: string;
  /** Display label, e.g. "Get Baptized". */
  label: string;
  /** Optional longer copy — shown in dashboard templates' focal step card. */
  description?: string;
  /** CTA label for this step's action, e.g. "Browse community groups". */
  ctaLabel?: string;
  /** Small meta line, e.g. "4 groups near you · ~2 min" or "Completed · 2023". */
  meta?: string;
  /** Icon shown next to the step. */
  icon?: IconName;
  /** Optional in-demo destination. Usually "#" or a section anchor. */
  href?: string;
  /** Sequence across the whole pathway. Lower = earlier. */
  order: number;
}

/** A single step's status for the demo member. References PathwayStep.key. */
export interface MemberStepState {
  key: string;
  status: StepStatus;
}

/**
 * The fake "logged-in" member used for the reveal. No real auth — clicking
 * "Sign in" in the demo simply flips to this person and lights up their track.
 */
export interface DemoMember {
  firstName: string;
  lastName: string;
  email: string;
  /** Optional campus label shown in the menu/profile. */
  campus?: string;
  /** Optional avatar; falls back to initials when absent. */
  avatarUrl?: string;
  /** e.g. "Member since 2023" — shown next to the member's name. */
  memberSince?: string;
  /** This member's progress across the church's pathway, keyed by step key. */
  steps: MemberStepState[];
}

/** A member's community group, shown on dashboard templates. */
export interface GroupInfo {
  name: string;
  host?: string;
  location?: string;
  nextMeeting?: string;
  /** Defaults to true (shows an "Active" badge). */
  active?: boolean;
}

/** A member's giving summary, shown on dashboard templates. */
export interface GivingInfo {
  /** Year label, e.g. "2026". */
  year?: string;
  /** Pre-formatted amount, e.g. "$1,240". */
  amount: string;
  /** Number of gifts. */
  gifts?: number;
  /** A warm one-line thank-you. */
  gratitude?: string;
}

/** Brand colors — an OPTIONAL accent override. When omitted, the accent comes
 *  from the selected palette (each light/dark preset ships an accent tuned to
 *  match it). When set, `accent` overrides that in BOTH modes; per-mode accents
 *  can still be set individually via `themeOverrides.{light,dark}.accent`. */
export interface BrandColors {
  /** Optional accent override for BOTH modes, e.g. "#8a3441". Omit to use the
   *  palette's accent. The per-mode overrides below take precedence when set. */
  accent?: string;
  /** Optional light-mode accent override (falls back to `accent`, then palette). */
  accentLight?: string;
  /** Optional dark-mode accent override (falls back to `accent`, then palette). */
  accentDark?: string;
}

/**
 * The semantic color palette — one set per mode (light / dark). Every color on
 * a template maps to one of these (decorative tints derive from them via
 * opacity). All hex. A template ships defaults for both modes; a church can
 * override any token per mode in `themeOverrides`.
 */
export interface ColorSet {
  /** Page background. */
  bg: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  inkSoft: string;
  /** Tertiary text. */
  inkMuted: string;
  /** Eyebrows / faint labels. */
  faint: string;
  /** Raised card/tile surface. */
  card: string;
  /** Warm inset surface (logo text on accent, buttons on colored tiles). */
  cardAlt: string;
  /** Card borders. */
  line: string;
  /** Subtle inner dividers. */
  divider: string;
  /** Incomplete-step rings / connectors (inactive track). */
  track: string;
  /** Brand accent. */
  accent: string;
  /** Darker accent — the colored tile / focal card background. */
  accentDeep: string;
  /** Text/icon color on top of accent surfaces. */
  onAccent: string;
}

/** Curated font choices, mapped to loaded families in `lib/themes.ts`. */
export type SerifFont = "newsreader" | "spectral";
export type SansFont = "hanken";

export interface ThemeFonts {
  serif: SerifFont;
  sans: SansFont;
}

/** Per-church theme overrides, merged onto the template's defaults. */
export interface ThemeOverrides {
  fonts?: Partial<ThemeFonts>;
  light?: Partial<ColorSet>;
  dark?: Partial<ColorSet>;
}

/** Optional homepage-ish hero band above the pathway. */
export interface HeroContent {
  heading: string;
  subheading?: string;
  /** Background photo URL (scraped from their site or a stock CDN). */
  backgroundImageUrl?: string;
}

/**
 * The complete configuration for one church's demo.
 */
export interface ChurchConfig {
  // ── Identity & isolation ───────────────────────────────────────────────
  /** Unguessable URL slug, e.g. "grace-community-a7f3c1". This IS the access
   *  control: only configs that exist are routable; everything else 404s. */
  slug: string;
  /** Display name, e.g. "Grace Community Church". */
  churchName: string;
  /** Optional short tagline. */
  tagline?: string;

  // ── Branding ───────────────────────────────────────────────────────────
  /** Logo URL (optional; falls back to the church name as text). */
  logoUrl?: string;
  /** True per mode when that mode's `bg` IS the logo's opaque plate colour
   *  (`logo_bg_source_* === "logo_plate"`). DemoChrome suppresses the ambient
   *  brand glow (`--glow: 0`) for such modes so the opaque plate blends into a
   *  flat surround instead of showing a faint tinted edge against the gradient. */
  logoPlate?: { light?: boolean; dark?: boolean };
  /** Optional accent override. Omit to inherit the selected palette's accent. */
  brand?: BrandColors;
  /** Which predetermined palette to use per mode (each template ships 2 light +
   *  2 dark). Omit to use the template defaults. See `lib/themes.ts`. */
  palette?: { light?: string; dark?: string };
  /** Per-mode color + font overrides on top of the selected palette. The
   *  viewer's system preference picks the active mode (with a manual toggle). */
  themeOverrides?: ThemeOverrides;
  /** @deprecated Light/dark is now automatic (system pref + toggle). Ignored. */
  theme?: "dark" | "light";
  /** Opening light/dark mode for the demo. Set by the importer from the church's
   *  `logo_theme`; undefined ⇒ follow the viewer's OS preference. The viewer can
   *  still toggle after load. */
  initialMode?: "light" | "dark";

  // ── Template selection ─────────────────────────────────────────────────
  /** Which template design renders FIRST in the demo. Key into the template
   *  registry in `src/components/templates/index.ts`. Falls back to the default.
   *  Should be a member of `templates`. */
  template: string;
  /** Which template designs are published — the set the viewer can switch
   *  between via the demo bar (only these go live). When omitted, every
   *  registered template is published (preserves older demos saved before this
   *  field existed). With a single entry the demo bar's switcher is hidden. */
  templates?: string[];

  // ── Content ────────────────────────────────────────────────────────────
  hero?: HeroContent;
  /** Header for the primary (focal) step list — e.g. "Your Growth Track" or
   *  "Your next steps". Set by the importer per the church's pathway data;
   *  undefined ⇒ each template's default ("Your discipleship pathway" etc.). */
  trackLabel?: string;
  /** A personal welcome line under the greeting (dashboard templates). */
  welcomeLine?: string;
  /** The formal discipleship track (baptism → membership → etc.). */
  discipleshipTrack: PathwayStep[];
  /** Lighter "next steps" list (serve, give, join a group, etc.). */
  nextSteps: PathwayStep[];
  /** The fake member revealed on sign-in — the climax of the demo. */
  demoMember: DemoMember;
  /** Optional community group card (dashboard templates). */
  group?: GroupInfo;
  /** Optional giving summary card (dashboard templates). */
  giving?: GivingInfo;

  // ── Outreach metadata (optional, never rendered) ───────────────────────
  meta?: {
    /** Pastor / contact name, for your own reference. */
    contactName?: string;
    /** Free-form note, e.g. source URL the assets were scraped from. */
    note?: string;
  };
}
