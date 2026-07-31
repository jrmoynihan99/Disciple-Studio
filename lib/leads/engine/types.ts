/**
 * Types for the Lead Console engine.
 *
 * The verdict states and question keys are DERIVED from the generated vocabulary
 * rather than restated, so there is no second list to drift.
 */

import { VOCAB } from "./vocab.generated.ts";

/* ------------------------------------------------------------------ verdicts */

/** The seven states. `unk` (olive) and `unver` (slate + hatch) are NOT the same. */
export type VerdictState = (typeof VOCAB.VALID_STATES)[number];

export const VALID_STATES = VOCAB.VALID_STATES;

export function isVerdictState(v: unknown): v is VerdictState {
  return typeof v === "string" && (VALID_STATES as readonly string[]).includes(v);
}

/* ----------------------------------------------------------------- questions */

/** Every question the pipeline produces, including the retired ones. */
export type QuestionKey =
  | "q1" | "q2" | "q3" | "q4" | "q5"
  | "q6" | "q7" | "q8" | "q9" | "q10" | "q12";

/** Question keys in canonical order, as `core.js` QMETA has them. */
export const QMETA = VOCAB.QMETA;

/**
 * The questions that RENDER, in order.
 *
 * Excluded, and each for its own reason:
 *   q3  (Concrete Next Steps) — retired by owner decision. Its data still ships
 *       in the record and its colour logic is still ported and golden-tested,
 *       exactly as q12 is; it simply has no surface. Note the Next Steps tile,
 *       the 8-dot grid and the next-step favor points come from
 *       `next_steps_by_category`, a DIFFERENT structure, and are unaffected.
 *   q12 (Technological Friendliness) — retired from the console earlier, still
 *       built. In the record, out of the index.
 */
export const DISPLAY_KEYS = [
  "q1", "q2", "q4", "q5", "q6", "q7", "q8", "q9", "q10",
] as const satisfies readonly QuestionKey[];

export type DisplayKey = (typeof DISPLAY_KEYS)[number];

/**
 * KEY FINDINGS — the crucial fields, highest scrutiny. Next steps sits between
 * q2 and q5 on the card but is not a question key; it comes from
 * `next_steps_by_category`.
 */
export const CRUCIAL_KEYS = ["q2", "q5"] as const;

/** Their own section: App first, then Website. */
export const APP_WEB_KEYS = ["q8", "q7"] as const;

/**
 * THE REST — LIGHTER-TOUCH SIGNALS, scored x/5.
 *
 * Pathway (q1) leads this section following the owner's decision to surface it —
 * it renders nowhere in the reference build. Note it reads OPPOSITE to its four
 * neighbours: they are all "the church lacks it, so there is something to sell",
 * where a green Pathway means the church ALREADY has an organized pathway, which
 * is favourable because it signals fit. Same green, different reason.
 */
export const REST_KEYS = ["q1", "q4", "q6", "q9", "q10"] as const;

export type RestKey = (typeof REST_KEYS)[number];

/* ------------------------------------------------------- the question object */

/** A q4/q12 sub-signal. Carries a quote but NO source_url of its own. */
export interface SubSignal {
  state?: VerdictState | "" | null;
  label?: string;
  value?: string;
  quote?: string;
  /**
   * Absent in every one of the 30 sub-signal quotes in the fixture — the URL
   * lives on the PARENT question. A renderer that draws one of these without
   * inheriting the parent's URL ships an unattributed quote.
   */
  source_url?: string;
}

/**
 * The normalised shape `colorState` reads. Both a full record and a slim index
 * row are projected into this by `adapt.ts`, which is what lets one colour
 * function serve the list, the facets, the histogram and the dossier.
 */
export interface QuestionView {
  answer?: string | null;
  count?: number | null;
  /** true → render `12+`. We proved 12 roles verbatim and could not prove the total. */
  count_is_floor?: boolean;
  /** true → render `12?`. We counted rows; no title was verified. */
  count_is_uncited?: boolean;
  /** The record naming its own colour. ALWAYS wins over an inference. */
  cell?: VerdictState | null;
  /** q3 axis 1 — how many concrete next steps. */
  steps_state?: string | null;
  /** q3 axis 2 — is there a convenient way to act. */
  conv_state?: string | null;
  /** Fallback only, and in practice only q6 reaches it. */
  opportunity?: boolean | null;
  subsignals?: SubSignal[];
  /** q7/q8 display label, e.g. "Squarespace". */
  platform?: string;
  /** q7/q8 filter key — a SEPARATE facet from the verdict. */
  platform_key?: string;
  label?: string;
}

/* ---------------------------------------------------------------- next steps */

export type StepState = "present" | "absent_looked" | "not_looked";

export interface StepCategory {
  key: string;
  label: string;
  state: StepState;
  /** THE CHURCH'S OWN WORDS. Verbatim — never normalised or title-cased. */
  own_terms?: string[];
  quote?: string;
  verified?: "exact" | "approx" | "";
  /** Whether the quote is ABOUT this category — a DIFFERENT axis from `verified`. */
  quote_confidence?: string;
  source_url?: string;
}

export interface NextStepsByCategory {
  /** false → "not checked". NEVER "0 of 8". */
  looked?: boolean;
  source?: string;
  /**
   * A scalar observation, NOT proof of a pathway. A pathway section must be
   * rendered only from the adjudicated `discipleship_pathway` object.
   */
  pathway_name?: string;
  categories?: StepCategory[];
}

export interface StepsSummary {
  looked: boolean;
  present: StepCategory[];
  nPresent: number;
  nCats: number;
  cats: StepCategory[];
  pathway: string;
  source: string;
}

/* --------------------------------------------------------------- favor model */

/** `hi: null` means no upper cap. */
export interface StaffTier {
  lo: number;
  hi: number | null;
  pts: number;
}

export interface FavorModel {
  /**
   * NON-MONOTONIC ON PURPOSE: mid-size churches earn the most, tiny and mega
   * churches earn nothing. The user may add, remove and re-point tiers at
   * runtime — do not hard-code five.
   */
  staffTiers: StaffTier[];
  loginPts: number;
  websitePts: number;
  appPts: number;
  /** One weight per next-step category. */
  stepCat: Record<string, number>;
}

/** The user's own (question, answer) -> state mapping. Consulted FIRST. */
export type ColorOverrides = Partial<Record<string, Record<string, VerdictState>>>;

/**
 * `core.js` read module-level mutables (DATA, USER_COLORS, FAVOR_MODEL). Those
 * cannot survive React state or a server render, so every ported function takes
 * this explicitly — and takes it REQUIRED, so a missed call site is a type error
 * rather than a silent fall back to default colours.
 */
export interface EngineCtx {
  overrides: ColorOverrides;
  favor: FavorModel;
  /** The corpus, for facet counts and option colours. */
  rows: readonly IndexRow[];
}

/* ------------------------------------------------------------- the slim index */

export interface IndexContact {
  /** email */ e: string;
  /** role_label */ r?: string;
  /** name/label */ l?: string;
}

export interface IndexQuestion {
  /** answer */ a?: string;
  /** count — q2 paid staff · q9 services · q10 campuses */ c?: number;
  /** count_is_floor */ fl?: boolean;
  /** q3 steps_state */ ss?: string;
  /** q3 conv_state */ cs?: string;
  /** q3 steps_n */ sn?: number;
  /** the record naming its own colour */ cell?: VerdictState;
  /** q7/q8 platform label */ p?: string;
  /** q7/q8 platform key — a separate facet */ pk?: string;
  /** opportunity, when a publish chooses to carry it (see adapt.ts) */ op?: boolean;
}

/**
 * One row per church. Every field here is rendered on a row or read by a filter,
 * facet, sort or the favor engine — nothing else. Empty values are OMITTED, not
 * emitted as "": an empty `lg` would build a facet option for "" and offer a
 * filter that means nothing.
 *
 * The index carries NO quotes and NO source URLs, so it must never assert an
 * answer to a human beyond a colour and a label. The moment the UI wants to show
 * *why*, it fetches the record.
 */
export interface IndexRow {
  /** org_id — THE join key for all state, stable forever. */
  id: string;
  /** name */ n: string;
  /** city */ ct?: string;
  /** region, e.g. "NC, USA" */ rg?: string;
  /** country */ co?: string;
  /** network */ nw?: string;
  /** platform key */ pf?: string;
  /** own_url */ u?: string;
  /** church_url */ cu?: string;
  /** fetched_last, e.g. "Jul 22, 2026" */ ts?: string;
  /** lang.facet — ABSENT when never screened, never "" */ lg?: string;
  /**
   * Whether the church has Church Center apps enabled. NOT in the shipped
   * fixture index; honoured when a publish carries it. See
   * `platformLineFromIndex` for the one case this affects.
   */
  ap?: boolean;

  q1?: IndexQuestion;
  q2?: IndexQuestion;
  q3?: IndexQuestion;
  q4?: IndexQuestion;
  q5?: IndexQuestion;
  q6?: IndexQuestion;
  q7?: IndexQuestion;
  q8?: IndexQuestion;
  q9?: IndexQuestion;
  q10?: IndexQuestion;

  /** next steps: looked + 8 chars in STEP_CATS order (p/a/n). */
  ns?: { l?: boolean; s?: string };

  /** logo sha */ lo?: string;
  /** logo ext */ lx?: string;
  /** logo_theme */ lt?: string;
  /** why there is no logo, when there isn't one */ lr?: string;
  /** <=3 contacts */ em?: IndexContact[];
  /** phone */ ph?: string;
  /** socials — ONLY when `em` is empty */ so?: Record<string, string>;
  /** sha256 of the full record -> the lazy-fetch key */ rec?: string;
}

/* ------------------------------------------------------------- the full record */

export interface ChurchRecord {
  org_id: string;
  name?: string;
  city?: string;
  region?: string;
  country?: string;
  network?: string;
  platform?: string;
  own_url?: string;
  church_url?: string;
  fetched?: Record<string, string>;
  fetched_last?: string;
  apps?: unknown[];
  lang?: { facet?: string; name?: string };

  q1?: QuestionView & Record<string, unknown>;
  q2?: QuestionView & Record<string, unknown>;
  q3?: QuestionView & Record<string, unknown>;
  q4?: QuestionView & Record<string, unknown>;
  q5?: QuestionView & Record<string, unknown>;
  q6?: QuestionView & Record<string, unknown>;
  q7?: QuestionView & Record<string, unknown>;
  q8?: QuestionView & Record<string, unknown>;
  q9?: QuestionView & Record<string, unknown>;
  q10?: QuestionView & Record<string, unknown>;
  q12?: QuestionView & Record<string, unknown>;

  next_steps_by_category?: NextStepsByCategory;
  brand?: Record<string, unknown>;
  logo_palette?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  misc?: Record<string, unknown>;

  /** Present ONLY on the 10 fabricated edge-case records. Never publish these. */
  _synthetic?: string;
}
