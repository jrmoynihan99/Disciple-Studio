import type { ChurchConfig, IconName, PathwayStep, StepStatus } from "@/lib/types";
import { TEMPLATES } from "@/components/templates";

/**
 * Turns one church row from the pilot `next_steps.json` into a full
 * `ChurchConfig`, identical in shape to what the /admin form builds — so a
 * generated demo renders exactly like a hand-authored one.
 *
 * The pilot-5 data has TWO pathways per church:
 *  - `discipleship_pathway` (an object with its own `name` + ordered `steps`)
 *  - `next_steps` (an array with per-step confidence/fit audits)
 * A church may have one or both. Whichever is the church's "primary" pathway
 * (discipleship if present, else next steps) becomes the focal, interactive list
 * that carries the member's progress; a present second list renders below it.
 *
 * Naming/description follow the research audits:
 *  - Discipleship step: label = its `name`; description = its `quote`, or EMPTY
 *    when there's no quote (never a default).
 *  - Next step: label = `name` when both name audits pass (medium/high), else the
 *    standardized `final_name`; description = `quote` when both quote audits pass,
 *    else static per-category prose. `misc` steps are dropped unless all four
 *    audits pass.
 */

/** Step categories across both pathways (13 total; not all appear in every file). */
export type Category =
  | "attend"
  | "connect"
  | "baptism"
  | "class"
  | "classes"
  | "study"
  | "group"
  | "serve"
  | "giving"
  | "membership"
  | "misc"
  | "none";

type Rating = "high" | "medium" | "low" | "none" | "";

/** One next-step from the pilot JSON (only the fields we consume are typed). */
export interface RawNextStep {
  rank?: number;
  tier?: string;
  category: string;
  name?: string;
  final_name?: string;
  origin?: "found" | "added";
  quote?: string;
  source_url?: string;
  quote_confidence?: Rating;
  quote_category_fit?: Rating;
  name_fit?: Rating;
  name_confidence?: Rating;
  flags?: string[];
}

/** One step inside `discipleship_pathway.steps`. */
export interface RawDiscStep {
  order?: number;
  name: string;
  kind?: string;
  category: string;
  quote?: string;
  source_url?: string;
}

/** The `discipleship_pathway` object. */
export interface RawDiscPathway {
  name?: string;
  name_confidence?: Rating;
  declaration_quote?: string;
  purpose?: string;
  ordered?: boolean;
  source_url?: string;
  steps?: RawDiscStep[];
}

/** One church row from the pilot JSON (only the fields we consume are typed). */
export interface RawChurch {
  org_id: string | number;
  church_title: string;
  slogan?: string;
  logo_local?: string;
  logo_url?: string;
  logo_theme?: string;
  service_times?: string;
  website_url?: string;
  contacts?: unknown;
  discipleship_pathway?: RawDiscPathway | null;
  next_steps?: RawNextStep[];
}

/** Icon per category. Every value is a member of the `IconName` union. */
const ICON_BY_CATEGORY: Record<string, IconName> = {
  attend: "church",
  connect: "compass",
  baptism: "droplets",
  class: "graduation-cap",
  classes: "graduation-cap",
  study: "book-open",
  group: "users",
  serve: "hand-heart",
  giving: "sparkles",
  membership: "heart",
  misc: "star",
  none: "star",
};

/** Static, generic step copy keyed by category — the DEFAULT next-step
 *  description used when a step's own quote doesn't pass the audits. */
const PROSE_BY_CATEGORY: Record<string, string> = {
  attend:
    "You showed up — that's where it all starts. Worship together, hear the Word, and meet the family you're now part of.",
  connect:
    "Say hello and let us know you're here. A quick note is all it takes for us to reach back out and help you find your footing.",
  baptism:
    "A public yes to following Jesus. Go under the water and come up new — with the whole church celebrating alongside you.",
  class:
    "Get oriented. A short, friendly starting point to learn the ropes and take your next intentional step forward.",
  classes:
    "Get oriented. A short, friendly starting point to learn the ropes and take your next intentional step forward.",
  study:
    "Dig into Scripture alongside others. A regular rhythm of study that helps the Bible make sense and stick.",
  group:
    "Faith grows best in circles, not rows. Find a handful of people to share life, prayer, and a regular table with.",
  serve:
    "You were made to give, not just receive. Use your gifts to make a Sunday — and someone's week — better.",
  giving:
    "Generosity becomes a rhythm when it's automatic. Partner with what God is doing here, one gift at a time.",
  membership:
    "Make it official. Learn who we are, what we believe, and how you fit into the mission of this church.",
  misc: "One more way to get involved and keep taking steps forward with this community.",
  none: "One more way to get involved and keep taking steps forward with this community.",
};

const DEFAULT_PROSE = "One more way to get involved and keep taking steps forward with this community.";

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

/** A rating "passes" only when it's medium or high (blank/none/low all fail). */
const pass = (v?: Rating): boolean => v === "medium" || v === "high";

/** Slug from a display name — must match /admin's `slugify` exactly so keys and
 *  routes line up with hand-built demos. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const iconFor = (category: string): IconName => ICON_BY_CATEGORY[category] ?? "star";
const proseFor = (category: string): string => PROSE_BY_CATEGORY[category] ?? DEFAULT_PROSE;

/** A step ready to become a PathwayStep (before keys/order are assigned). */
interface Draft {
  label: string;
  description?: string;
  icon: IconName;
  meta?: string;
  status: StepStatus;
}

/** Map the discipleship pathway's steps. Description = quote or EMPTY (no default). */
function mapDiscipleship(dp: RawDiscPathway | null | undefined): Draft[] {
  if (!dp?.steps?.length) return [];
  return dp.steps
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => ({
      label: s.name,
      description: (s.quote ?? "").trim() || undefined,
      icon: iconFor(s.category),
      status: "not-started" as StepStatus,
    }));
}

/** Map next steps: drop failing misc; resolve name/description via the audits. */
function mapNextSteps(steps: RawNextStep[] | undefined, serviceTimes: string): Draft[] {
  if (!steps?.length) return [];
  const out: Draft[] = [];
  for (const s of steps) {
    if (s.category === "misc") {
      const ok = pass(s.quote_confidence) && pass(s.quote_category_fit) && pass(s.name_fit) && pass(s.name_confidence);
      if (!ok) continue;
    }
    const nameOk = pass(s.name_confidence) && pass(s.name_fit);
    const label = (nameOk && (s.name ?? "").trim() ? s.name! : s.final_name || s.name || "Next step").trim();

    const quote = (s.quote ?? "").trim();
    const quoteOk = !!quote && pass(s.quote_confidence) && pass(s.quote_category_fit);
    const description = quoteOk ? quote : proseFor(s.category);

    out.push({
      label,
      description,
      icon: iconFor(s.category),
      meta: s.category === "attend" && serviceTimes ? serviceTimes : undefined,
      status: "not-started",
    });
  }
  return out;
}

/**
 * Apply the "You're here" progression IN PLACE: position (1-based) = floor(N/2)+1
 * (N=4→3, N=9→5, N=10→6), capped so at least one step stays "coming up"
 * (N=2→1). Steps before it → complete, that one → in-progress, rest → not-started.
 */
function applyProgression(list: Draft[]): void {
  const n = list.length;
  if (n === 0) return;
  const mid = n <= 1 ? 0 : Math.min(Math.floor(n / 2), n - 2);
  list.forEach((d, i) => {
    d.status = i < mid ? "complete" : i === mid ? "in-progress" : "not-started";
  });
}

/** The primary list header. Uses the church's pathway name VERBATIM when its
 *  confidence passes (e.g. "The King's Park Discipleship Path"), else the generic
 *  "Your discipleship pathway". */
function discLabel(dp: RawDiscPathway | null | undefined): string {
  const name = (dp?.name ?? "").trim();
  return name && pass(dp?.name_confidence) ? name : "Your discipleship pathway";
}

/** Base slug for a church (no collision handling — the caller resolves those). */
export function baseSlugFor(church: RawChurch): string {
  return slugify(church.church_title) || `church-${church.org_id}`;
}

/** The template pool an imported demo draws from (registry order). Bento and
 *  Workspace are intentionally excluded from imports; all 6 stay registered so
 *  /admin and older saved demos still resolve. */
const IMPORT_TEMPLATES = (["editorial", "warm-guide", "stream", "orbit"] as string[]).filter(
  (k) => k in TEMPLATES,
);

/** Pick 2 distinct templates from the import pool and a page-load default among
 *  them: returns `{ templates: [a, b], template }`. Each import gets its own two
 *  options and lands on a random one. */
function pickImportTemplates(): { templates: string[]; template: string } {
  const pool = IMPORT_TEMPLATES.slice();
  // Fisher–Yates the pool, take the first two (order-preserving display handled
  // by DemoExperience, which re-sorts to registry order).
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const templates = pool.slice(0, 2);
  const template = templates[Math.floor(Math.random() * templates.length)] ?? templates[0] ?? "editorial";
  return { templates, template };
}

export interface GenerateOptions {
  /** Resolved logo URL (uploaded asset path or remote URL). Omit → initial. */
  logoUrl?: string;
  /** Slug override (e.g. collision-resolved). Defaults to `baseSlugFor`. */
  slug?: string;
}

/**
 * Build a `ChurchConfig` from one pilot church row. Returns `null` when the
 * church has no usable steps in either pathway.
 */
export function generateDemo(church: RawChurch, opts: GenerateOptions = {}): ChurchConfig | null {
  const serviceTimes = (church.service_times ?? "").trim();
  const disc = mapDiscipleship(church.discipleship_pathway);
  const next = mapNextSteps(church.next_steps, serviceTimes);
  if (disc.length === 0 && next.length === 0) return null;

  // Choose the primary (focal, progress-bearing) list. When a discipleship
  // pathway exists it leads and every next-step reads as "coming up"; otherwise
  // the next-steps list is the primary.
  let track: Draft[];
  let nextList: Draft[];
  let trackLabel: string;
  if (disc.length > 0) {
    track = disc;
    nextList = next; // all left as not-started ("coming up")
    trackLabel = discLabel(church.discipleship_pathway);
  } else {
    track = next;
    nextList = [];
    trackLabel = "Your next steps";
  }
  applyProgression(track);

  const slug = opts.slug ?? baseSlugFor(church);

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

  // Order runs continuously across both lists (10, 20, …) so the focal "next
  // step" picks correctly across the whole pathway.
  const toSteps = (drafts: Draft[], startOrder: number, keyOf: (l: string, i: number) => string): PathwayStep[] =>
    drafts.map((d, i) => ({
      key: keyOf(d.label, i),
      label: d.label,
      description: d.description,
      meta: d.meta,
      icon: d.icon,
      order: startOrder + i * 10,
    }));

  const keyOfTrack = makeKeyer();
  const discipleshipTrack = toSteps(track, 10, keyOfTrack);
  const nextSteps = toSteps(nextList, 10 + track.length * 10, keyOfTrack);

  // Member statuses, keyed to match (regenerate keys in the same order).
  const keyOfMember = makeKeyer();
  const memberSteps = [
    ...track.map((d, i) => ({ key: keyOfMember(d.label, i), status: d.status })),
    ...nextList.map((d, i) => ({ key: keyOfMember(d.label, track.length + i), status: d.status })),
  ];

  // Open in light mode only for light-themed logos; dark otherwise (default look).
  const initialMode: "light" | "dark" =
    (church.logo_theme ?? "").trim().toLowerCase() === "light" ? "light" : "dark";

  const tagline = (church.slogan ?? "").trim() || undefined;

  const { templates, template } = pickImportTemplates();

  return {
    slug,
    churchName: church.church_title,
    tagline,
    initialMode,
    logoUrl: opts.logoUrl || church.logo_url || undefined,
    template,
    templates,
    trackLabel,
    welcomeLine: DEFAULT_WELCOME_LINE,
    discipleshipTrack,
    nextSteps,
    demoMember: {
      ...DEMO_MEMBER,
      steps: memberSteps,
    },
    meta: {
      note: church.website_url || undefined,
    },
  };
}
