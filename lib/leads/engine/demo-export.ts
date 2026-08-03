/**
 * A reviewed church, turned into the row `generateDemo` eats.
 *
 * WHY AN ADAPTER AND NOT A PASS-THROUGH.
 *
 * `RawChurch` is one element of the pilot `next_steps.json` that `/studio/import`
 * used to read off a folder. The lead corpus comes from the same upstream family
 * and its `next_steps[]` array is field-for-field identical to `RawNextStep` — but
 * everything around it is spelled differently, measured against a live record:
 * `name` not `church_title`, `church_url` not `website_url`, `contact` not
 * `contacts`, `logo_palette.theme_light` not `theme_light`. So there was never a
 * free pass-through to be had.
 *
 * WHICH IS FORTUNATE, BECAUSE THE RAW RECORD IS THE WRONG SOURCE ANYWAY.
 *
 * The point of the review page is that a person reads twenty churches and fixes
 * what is wrong before any of it is sent. Generating demos from the raw record
 * would throw that away — the corrections would sit in the batch, unused, while
 * the demo shipped whatever the pipeline originally said. So the reviewed content
 * comes from the `ResolvedCard`: the frozen snapshot with every edit folded in and
 * every struck-out item excluded, which is the only version of a church a human
 * has actually approved.
 *
 * The extras that a reviewer never sees — the colour ramp, the service time —
 * come from the live record instead, and are optional. A church that has left the
 * dataset simply has none, and its demo falls back to the template defaults.
 *
 * PURE, AND HERE RATHER THAN IN THE ROUTE, so the two rules below can be tested
 * against the real `generateDemo` rather than against a description of it.
 */

import type { RawChurch, RawDiscPathway, RawNextStep } from "@/lib/generateDemo";
import type { ResolvedCard } from "./group-types.ts";
import { exportContacts } from "./contacts.ts";

/**
 * The parts of a church a reviewer cannot see or correct, read off the live
 * record at export time. Every field is optional and every one degrades to a
 * template default.
 */
export interface DemoExtras {
  serviceTimes?: string;
  logoTheme?: string;
  themeLight?: Record<string, string>;
  themeDark?: Record<string, string>;
  accentLight?: string;
  accentDark?: string;
  bgSourceLight?: string;
  bgSourceDark?: string;
}

/** `q9.times` is already `"Sun 10:30 AM"`; the palette lives under `logo_palette`. */
export function extrasOf(record: unknown): DemoExtras {
  const r = (record ?? {}) as Record<string, unknown>;
  const q9 = (r.q9 ?? {}) as Record<string, unknown>;
  const p = (r.logo_palette ?? {}) as Record<string, unknown>;
  const bg = (p.theme_bg_source ?? {}) as Record<string, unknown>;
  const brand = (r.brand ?? {}) as Record<string, unknown>;

  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  const ramp = (v: unknown): Record<string, string> | undefined =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : undefined;

  return {
    serviceTimes: str(q9.times),
    logoTheme: str(brand.logo_theme) ?? str(p.logo_theme),
    themeLight: ramp(p.theme_light),
    themeDark: ramp(p.theme_dark),
    accentLight: str(p.accent_light),
    accentDark: str(p.accent_dark),
    bgSourceLight: str(bg.light),
    bgSourceDark: str(bg.dark),
  };
}

/**
 * The colour half of a `RawChurch`, alone.
 *
 * SPLIT OUT BECAUSE TWO CALLERS NEED IT AND ONLY ONE OF THEM IS THE EXPORT. The
 * review page shows each church in the colours its demo will use, and it has to
 * ask the question BEFORE the demo exists — before there is a `church_title` to
 * require or a step list to fail on. It builds these six fields, hands them to
 * `mapTheme`, and gets the same answer the exporter will get, because it is the
 * same six fields spread into the same function.
 *
 * Written out rather than inlined twice: the mapping from `extras` to these keys
 * is where a preview would silently start lying — read `accentLight` into
 * `logo_accent_dark` once and the swatch is simply wrong, with nothing failing.
 */
export function paletteFieldsOf(
  extras: DemoExtras,
): Pick<
  RawChurch,
  | "theme_light"
  | "theme_dark"
  | "logo_accent_light"
  | "logo_accent_dark"
  | "logo_bg_source_light"
  | "logo_bg_source_dark"
> {
  return {
    theme_light: extras.themeLight,
    theme_dark: extras.themeDark,
    logo_accent_light: extras.accentLight,
    logo_accent_dark: extras.accentDark,
    logo_bg_source_light: extras.bgSourceLight,
    logo_bg_source_dark: extras.bgSourceDark,
  };
}

/**
 * A rating `generateDemo`'s `pass()` accepts. Only `medium`/`high` pass.
 *
 * Used to say "a person approved this", which is a stronger warrant than the
 * pipeline's own confidence score — and the only way to say it in a vocabulary
 * `generateDemo` already understands.
 */
const APPROVED = "high" as const;

/**
 * THE TITLE THE REVIEWER SETTLED ON MUST SURVIVE.
 *
 * `generateDemo` re-decides it: `pass()` picks a step's `name` over its
 * `final_name` when `name_confidence` AND `name_fit` are both medium-or-high.
 * That rule is correct upstream, where nobody has looked at the step yet. Here it
 * is actively wrong — the title on the card is the one a person read, possibly
 * typed themselves, and re-deriving it would silently ship a different word.
 *
 * Writing the reviewed title as `final_name` with `name: ""` makes the rule
 * unable to fire: with no `name` to prefer, the label falls through to
 * `final_name`. A test asserts this end-to-end through the real `generateDemo`
 * rather than trusting the reading.
 */
function stepOf(label: string, quote: string, category: string): RawNextStep {
  const hasQuote = !!quote.trim();
  return {
    category: category || "none",
    name: "",
    final_name: label,
    quote: quote.trim(),
    /**
     * BOTH QUOTE AUDITS PASS ONLY WHEN THERE IS A QUOTE.
     *
     * `generateDemo` uses a step's own quote as its description when the audits
     * pass and its static per-category prose otherwise. A reviewer who kept a
     * quote has vouched for it, so it passes; a step with none must fall through
     * to the generic copy rather than shipping an empty description.
     */
    quote_confidence: hasQuote ? APPROVED : "",
    quote_category_fit: hasQuote ? APPROVED : "",
    /**
     * DELIBERATELY BLANK, and this is the load-bearing half of the rule above.
     * Any passing value here would let `name` win — and `name` is empty.
     */
    name_confidence: "",
    name_fit: "",
  };
}

/**
 * A `misc` step needs all four audits to pass or `generateDemo` drops it. A
 * reviewer who left it on the card has decided it ships, so `misc` is the one
 * category where the name audits are allowed to pass — and it is safe, because
 * `name` is still empty, so `final_name` still wins the label.
 */
function keepMisc(step: RawNextStep): RawNextStep {
  return step.category === "misc"
    ? { ...step, name_confidence: APPROVED, name_fit: APPROVED }
    : step;
}

export interface RawChurchResult {
  church: RawChurch | null;
  /** Why it cannot be generated, for the reviewer rather than for a log. */
  reason: string;
}

/**
 * The reviewed card, as `generateDemo` wants it.
 *
 * Returns a reason instead of throwing: the caller reports per-church outcomes to
 * a progress list, and one unnameable church must not take the other nineteen
 * down with it.
 */
export function toRawChurch(card: ResolvedCard, extras: DemoExtras = {}): RawChurchResult {
  const churchTitle = card.name.text.trim();
  // The one field the demo API hard-requires — and a demo headed "(no name)" is
  // not something to send a congregation regardless.
  if (!churchTitle) return { church: null, reason: "no church name" };

  const live = card.steps.filter((s) => !s.suppressed);
  const nextSteps = live.map((s) =>
    keepMisc(stepOf(s.label.text.trim(), s.quote?.text ?? "", s.key)),
  );

  const pathwaySteps = card.pathway.steps
    .filter((s) => !s.suppressed)
    .map((s, i) => ({
      order: i + 1,
      name: s.label.text.trim(),
      category: "none",
      quote: s.quote?.text.trim() ?? "",
    }))
    .filter((s) => s.name);

  /**
   * The pathway ships only when it has steps. `generateDemo` makes it the FOCAL
   * list when present, so an empty one would demote the church's real next steps
   * to a secondary block under an empty heading.
   */
  const pathway: RawDiscPathway | null = pathwaySteps.length
    ? {
        name: card.pathway.name.trim() || undefined,
        // Passing lets the pathway's own name become the track label instead of
        // the generic "Your discipleship pathway" — again, a reviewer saw it.
        name_confidence: card.pathway.name.trim() ? APPROVED : "",
        ordered: card.pathway.numbered,
        steps: pathwaySteps,
      }
    : null;

  if (!nextSteps.length && !pathwaySteps.length) {
    return { church: null, reason: "every step was struck out" };
  }

  return {
    church: {
      org_id: card.orgId,
      church_title: churchTitle,
      slogan: card.slogan.kind === "slogan" ? card.slogan.voice.text.trim() : undefined,
      website_url: card.churchUrl || undefined,
      service_times: extras.serviceTimes,
      logo_theme: extras.logoTheme ?? card.logo?.theme,
      contacts: contactsOf(card),
      discipleship_pathway: pathway,
      next_steps: nextSteps,
      // Spread, not restated — see `paletteFieldsOf`. The swatches on the review
      // card are built from this same call, so what a reviewer approved is what
      // the demo is painted with.
      ...paletteFieldsOf(extras),
    },
    reason: "",
  };
}

/**
 * Contacts in the shape the demo side reads.
 *
 * THROUGH `exportContacts`, NOT THE RAW LIST. That function is already the single
 * rule for "which four contacts ship, in what order", shared by the review card so
 * a reviewer sees exactly the ones that go out. Reading `card.contacts` directly
 * here would reintroduce the drift it exists to prevent — a demo naming somebody
 * the reviewer never saw.
 *
 * `rank` is what `demoFirstName` sorts on to pick the demo member's given name,
 * and `people[].email` is what the group page shows beside each row.
 */
function contactsOf(card: ResolvedCard): {
  people: { name: string; rank: number; email: string; title: string }[];
  church_emails: string[];
  phone: string;
} {
  const shipping = exportContacts(card.contacts).filter((r) => r.rank !== null);
  const people = shipping
    .filter((r) => r.contact.kind === "person")
    .map((r) => ({
      name: r.contact.name,
      rank: r.rank as number,
      email: r.contact.email,
      title: r.contact.title,
    }));
  const churchEmails = shipping
    .filter((r) => r.contact.kind === "churchEmail")
    .map((r) => r.contact.email)
    .filter(Boolean);
  const phone = shipping.find((r) => r.contact.kind === "phone")?.contact.value ?? "";
  return { people, church_emails: churchEmails, phone };
}
