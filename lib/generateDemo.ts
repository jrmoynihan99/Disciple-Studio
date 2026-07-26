import type { ChurchConfig, IconName, PathwayStep, StepStatus } from "@/lib/types";
import { TEMPLATES } from "@/components/templates";

/**
 * Turns one church row from the pilot `next_steps.json` into a full
 * `ChurchConfig`, identical in shape to what the /admin form builds — so a
 * generated demo renders exactly like a hand-authored one.
 *
 * The mapping is deliberately faithful to the research data:
 *  - Step LABELS come from `final_name` — the value the research pass decided a
 *    demo should DISPLAY (six tiers are standardized, e.g. giving→"Give"; the
 *    rest keep the church's own wording). `name` is retained evidence, not shown.
 *  - Step DESCRIPTIONS are static, generic prose keyed by `tier` (the raw
 *    `quote` citations are too noisy to show — see the import plan).
 *  - EVERY step is shown, in the given (pre-sorted by rank, name) order — no
 *    cap, no re-sort. `niche_other`/`other` never appear in the deliverable but
 *    are dropped defensively.
 *  - The leading `attend` step (synthesized by the research pass for ~every
 *    church) carries the church's `service_times` as its meta line.
 */

/** The step tiers in the pilot data (ordered by how universal the step is).
 *  `niche_other`/`other` never appear in the deliverable but are kept for
 *  exhaustiveness. */
export type Tier =
  | "attend"
  | "form"
  | "baptism_class"
  | "baptism"
  | "study"
  | "starting_class"
  | "intermediate_class"
  | "group"
  | "serve"
  | "giving"
  | "advanced_class"
  | "membership"
  | "niche_other"
  | "other";

/** One next-step from the pilot JSON (only the fields we consume are typed). */
export interface RawStep {
  rank: number;
  tier: Tier;
  category?: string;
  /** The church's own verbatim wording — retained as evidence, not displayed. */
  name: string;
  /** What a demo should DISPLAY (standardized for six tiers, verbatim otherwise). */
  final_name: string;
  /** "found" (has quote + source_url) or "added" (synthesized; only `attend`). */
  origin?: "found" | "added";
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
  attend: "church",
  form: "compass",
  baptism_class: "droplets",
  baptism: "droplets",
  study: "book-open",
  starting_class: "graduation-cap",
  intermediate_class: "graduation-cap",
  group: "users",
  serve: "hand-heart",
  giving: "sparkles",
  advanced_class: "graduation-cap",
  membership: "heart",
  niche_other: "star", // never appears; here for exhaustiveness
  other: "star",
};

/** Static, generic step copy keyed by tier. */
const PROSE_BY_TIER: Record<Tier, string> = {
  attend:
    "You showed up — that's where it all starts. Worship together, hear the Word, and meet the family you're now part of.",
  form: "Say hello and let us know you're here. A quick note is all it takes for us to reach back out and help you find your footing.",
  baptism_class:
    "Thinking about baptism? This short class walks you through what it means and what to expect before you take the step.",
  baptism:
    "A public yes to following Jesus. Go under the water and come up new — with the whole church celebrating alongside you.",
  study:
    "Dig into Scripture alongside others. A regular rhythm of study that helps the Bible make sense and stick.",
  starting_class:
    "Get oriented. A short, friendly starting point to learn the ropes and take your first intentional step forward.",
  intermediate_class:
    "Keep going. The next class builds on the basics and takes you deeper into the life of the church.",
  group:
    "Faith grows best in circles, not rows. Find a handful of people to share life, prayer, and a regular table with.",
  serve:
    "You were made to give, not just receive. Use your gifts to make a Sunday — and someone's week — better.",
  giving:
    "Generosity becomes a rhythm when it's automatic. Partner with what God is doing here, one gift at a time.",
  advanced_class:
    "Go deeper. Dig into Scripture and grow the roots that carry your faith for the long haul.",
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

/** Slug from a display name — must match /admin's `slugify` exactly so keys and
 *  routes line up with hand-built demos. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every step to render, in the given (pre-sorted by rank, name) order. Only
 *  `niche_other`/`other` are dropped, defensively — they never appear in the
 *  deliverable. No cap, no re-sort. Exposed so callers can detect empty results. */
export function selectSteps(church: RawChurch): RawStep[] {
  return (church.next_steps ?? []).filter(
    (s) => s.tier !== "niche_other" && s.tier !== "other",
  );
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
 * church has no usable steps — the caller reports these as skipped. (With the
 * synthesized `attend` step this effectively never fires, but it's kept as a
 * guard against malformed rows.)
 */
export function generateDemo(church: RawChurch, opts: GenerateOptions = {}): ChurchConfig | null {
  const selected = selectSteps(church);
  if (selected.length === 0) return null;

  const slug = opts.slug ?? baseSlugFor(church);
  const serviceTimes = (church.service_times ?? "").trim();

  // Unique step keys within this demo (duplicate labels → suffix the index) so
  // member-step statuses bind 1:1. Ranks are NOT unique, so never key on rank.
  const makeKeyer = () => {
    const seen = new Set<string>();
    return (label: string, i: number): string => {
      let base = slugify(label) || `step-${i}`;
      if (seen.has(base)) base = `${base}-${i}`;
      seen.add(base);
      return base;
    };
  };

  // One ordered list, in the data's given order. The `attend` step (always
  // first) carries service_times; the member has "completed" it, is mid the
  // next step, and hasn't started the rest — a natural-looking progress bar.
  const drafts = selected.map((s, idx) => ({
    label: s.final_name || s.name,
    description: PROSE_BY_TIER[s.tier] ?? PROSE_BY_TIER.other,
    icon: ICON_BY_TIER[s.tier] ?? "star",
    meta: s.tier === "attend" && serviceTimes ? serviceTimes : undefined,
    status: (idx === 0 ? "complete" : idx === 1 ? "in-progress" : "not-started") as StepStatus,
  }));

  const keyOf = makeKeyer();
  const discipleshipTrack: PathwayStep[] = drafts.map((d, i) => ({
    key: keyOf(d.label, i),
    label: d.label,
    description: d.description,
    meta: d.meta,
    icon: d.icon,
    order: 10 + i * 10,
  }));

  // Member step statuses, keyed to match (regenerate keys in the same order).
  const keyOf2 = makeKeyer();
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
