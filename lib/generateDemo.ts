import type { ChurchConfig, IconName, PathwayStep, StepStatus } from "@/lib/types";
import { TEMPLATES } from "@/components/templates";

/**
 * Turns one church row from `pilot-100/next_steps.json` into a full
 * `ChurchConfig`, identical in shape to what the /admin form builds — so a
 * generated demo renders exactly like a hand-authored one.
 *
 * The mapping is deliberately faithful to the research data:
 *  - Step LABELS are the church's own verbatim `name`.
 *  - Step DESCRIPTIONS are static, generic prose keyed by `tier` (the raw
 *    `quote` citations are too noisy to show — see the import plan).
 *  - `niche_other` steps are dropped; the 8 lowest-rank of the rest are kept.
 *  - A synthetic "Attend a Sunday gathering" step leads the track, carrying the
 *    church's `service_times` as its meta line.
 */

/** The step tiers present in the pilot data. */
export type Tier =
  | "form"
  | "baptism"
  | "starting_class"
  | "group"
  | "serve"
  | "advanced_class"
  | "giving"
  | "membership"
  | "niche_other"
  | "other";

/** One next-step from the pilot JSON (only the fields we consume are typed). */
export interface RawStep {
  rank: number;
  tier: Tier;
  category?: string;
  name: string;
  variants?: string[];
  quote?: string;
  source_url?: string;
  verified?: string;
}

/** One church row from the pilot JSON (only the fields we consume are typed). */
export interface RawChurch {
  org_id: string | number;
  church_title: string;
  slogan?: string;
  logo_local?: string;
  logo_url?: string;
  city_region?: string;
  platform?: string;
  service_times?: string;
  website_url?: string;
  church_center_url?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_how?: string;
  next_steps?: RawStep[];
  no_next_steps_found?: boolean;
}

/** Icon per tier. Every value is a member of the `IconName` union. */
const ICON_BY_TIER: Record<Tier, IconName> = {
  form: "compass",
  baptism: "droplets",
  starting_class: "graduation-cap",
  group: "users",
  serve: "hand-heart",
  advanced_class: "book-open",
  giving: "sparkles",
  membership: "heart",
  niche_other: "star", // dropped before render; here only for exhaustiveness
  other: "star",
};

/** The synthetic leading step's icon. */
const SUNDAY_ICON: IconName = "church";

/** Static, generic step copy keyed by tier (plus the synthetic "sunday"). */
const PROSE_BY_TIER: Record<Tier | "sunday", string> = {
  sunday:
    "You showed up — that's where it all starts. Worship together, hear the Word, and meet the family you're now part of.",
  form: "Say hello and let us know you're here. A quick note is all it takes for us to reach back out and help you find your footing.",
  baptism:
    "A public yes to following Jesus. Go under the water and come up new — with the whole church celebrating alongside you.",
  starting_class:
    "Get oriented. A short, friendly starting point to learn the ropes and take your first intentional step forward.",
  group:
    "Faith grows best in circles, not rows. Find a handful of people to share life, prayer, and a regular table with.",
  serve:
    "You were made to give, not just receive. Use your gifts to make a Sunday — and someone's week — better.",
  advanced_class:
    "Go deeper. Dig into Scripture and grow the roots that carry your faith for the long haul.",
  giving:
    "Generosity becomes a rhythm when it's automatic. Partner with what God is doing here, one gift at a time.",
  membership:
    "Make it official. Learn who we are, what we believe, and how you fit into the mission of this church.",
  niche_other:
    "One more way to get involved and keep taking steps forward with this community.",
  other:
    "One more way to get involved and keep taking steps forward with this community.",
};

/** The demo member's fixed fields (mirrors /admin's DEMO_MEMBER). */
const DEMO_MEMBER = {
  firstName: "Sarah",
  lastName: "Thompson",
  email: "sarah.t@example.com",
  campus: "Downtown",
  memberSince: "Member since 2023",
};

const DEFAULT_WELCOME_LINE =
  "We're so glad you're here — here are your next steps, your group, your giving, and more";

/** Max church steps kept per demo (after dropping `niche_other`). */
const MAX_STEPS = 8;

/** Slug from a display name — must match /admin's `slugify` exactly so keys and
 *  routes line up with hand-built demos. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A handful of `form`-tier rows carry the scraper's DESCRIPTION of the form
 *  ("on-page connect form (3 fields)", "Jotform (embedded form)") rather than
 *  the church's own words, and have no cleaner `variants`. Those read badly as a
 *  step label, so we substitute a sensible generic. Everything else is verbatim. */
const SCRAPER_FORM_RE = /^on-page .*form|\(embedded form\)|\(\d+ fields?\)/i;
function displayLabel(tier: Tier, name: string): string {
  if (tier === "form" && SCRAPER_FORM_RE.test(name)) return "Fill out a connect card";
  return name;
}

/** The church's selected steps, in render order: `niche_other` dropped, sorted
 *  by rank, capped at MAX_STEPS. Exposed so callers can detect empty results. */
export function selectSteps(church: RawChurch): RawStep[] {
  return (church.next_steps ?? [])
    .filter((s) => s.tier !== "niche_other")
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_STEPS);
}

/** Base slug for a church (no collision handling — the caller resolves those). */
export function baseSlugFor(church: RawChurch): string {
  return slugify(church.church_title) || `church-${church.org_id}`;
}

export interface GenerateOptions {
  /** Resolved logo URL (uploaded asset path or remote URL). Omit → initial. */
  logoUrl?: string;
  /** Slug override (e.g. collision-resolved). Defaults to `baseSlugFor`. */
  slug?: string;
}

/**
 * Build a `ChurchConfig` from one pilot church row. Returns `null` when the
 * church has no usable steps (all `niche_other` or none) — the caller reports
 * these as skipped.
 */
export function generateDemo(church: RawChurch, opts: GenerateOptions = {}): ChurchConfig | null {
  const selected = selectSteps(church);
  if (selected.length === 0) return null;

  const slug = opts.slug ?? baseSlugFor(church);

  // Unique step keys within this demo (duplicate labels → suffix the index) so
  // member-step statuses bind 1:1.
  const seen = new Set<string>();
  const keyOf = (label: string, i: number): string => {
    let base = slugify(label) || `step-${i}`;
    if (seen.has(base)) base = `${base}-${i}`;
    seen.add(base);
    return base;
  };

  const serviceTimes = (church.service_times ?? "").trim();

  // Track = synthetic Sunday step first, then the church's own steps, all in one
  // list ordered 10, 20, 30, … (mirrors /admin's buildConfig order scheme).
  const drafts: Array<{ label: string; description: string; icon: IconName; status: StepStatus }> = [
    {
      label: "Attend a Sunday gathering",
      description: PROSE_BY_TIER.sunday,
      icon: SUNDAY_ICON,
      status: "complete",
    },
    ...selected.map((s, idx) => ({
      label: displayLabel(s.tier, s.name),
      description: PROSE_BY_TIER[s.tier] ?? PROSE_BY_TIER.other,
      icon: ICON_BY_TIER[s.tier] ?? "star",
      // First church step in progress, the rest not started (natural progress bar).
      status: (idx === 0 ? "in-progress" : "not-started") as StepStatus,
    })),
  ];

  const discipleshipTrack: PathwayStep[] = drafts.map((d, i) => {
    const key = keyOf(d.label, i);
    // Only the synthetic Sunday step carries a meta line (service times).
    const meta = i === 0 && serviceTimes ? serviceTimes : undefined;
    return {
      key,
      label: d.label,
      description: d.description,
      meta,
      icon: d.icon,
      order: 10 + i * 10,
    };
  });

  // Member step statuses, keyed to match (regenerate keys in the same order).
  const seen2 = new Set<string>();
  const keyOf2 = (label: string, i: number): string => {
    let base = slugify(label) || `step-${i}`;
    if (seen2.has(base)) base = `${base}-${i}`;
    seen2.add(base);
    return base;
  };
  const memberSteps = drafts.map((d, i) => ({ key: keyOf2(d.label, i), status: d.status }));

  const tagline = (church.slogan ?? "").trim() || undefined;

  return {
    slug,
    churchName: church.church_title,
    tagline,
    logoUrl: opts.logoUrl || church.logo_url || undefined,
    template: "editorial",
    templates: Object.keys(TEMPLATES),
    welcomeLine: DEFAULT_WELCOME_LINE,
    discipleshipTrack,
    nextSteps: [],
    demoMember: {
      ...DEMO_MEMBER,
      steps: memberSteps,
    },
    meta: {
      contactName: (church.contact_name ?? "").trim() || undefined,
      note: church.website_url || undefined,
    },
  };
}
