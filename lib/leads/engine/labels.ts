/**
 * Human wording for machine values. Ported from `core.js`, plus one documented
 * repair.
 */

import type { QuestionKey, VerdictState } from "./types.ts";
import { VOCAB } from "./vocab.generated.ts";

const ANSWER_LABEL = VOCAB.ANSWER_LABEL as Record<string, Record<string, string>>;

/**
 * THE ONE REPAIR, and it is deliberate.
 *
 * `q1: implicit_uncited` has a colour rule in COLOR_DEFAULTS (`warn`) but NO
 * `ANSWER_LABEL` entry, so the reference build renders the raw machine string
 * `implicit_uncited` in the facet list and the cell tooltip — to a salesperson,
 * for 24 of 134 churches (~18%).
 *
 * It means: the page names 3+ discipleship topics but states no quotable pathway
 * statement. A real signal, and an uncitable one.
 *
 * This lives here rather than in `vocab.generated.ts` on purpose. The generated
 * file must stay a faithful transcription of what `core.js` emitted — a repair
 * folded into it would be indistinguishable from the source, which is the exact
 * "second, drifting copy" the one-source-of-truth rule forbids. A named overlay
 * is visible in review and survives regeneration.
 */
const ANSWER_LABEL_PATCH: Record<string, Record<string, string>> = {
  q1: { implicit_uncited: "Topics named, no quotable pathway" },
};

/** Plain English for a raw answer enum. Anything unmapped falls back to the value. */
export function answerLabel(k: QuestionKey | string, v: string): string {
  return ANSWER_LABEL_PATCH[k]?.[v] ?? ANSWER_LABEL[k]?.[v] ?? v;
}

/** Is this answer's wording a real label, or are we echoing the machine value? */
export function hasAnswerLabel(k: QuestionKey | string, v: string): boolean {
  return !!(ANSWER_LABEL_PATCH[k]?.[v] ?? ANSWER_LABEL[k]?.[v]);
}

/** One-word column names. "Q7" tells a salesperson nothing; "Website" does. */
export const QSHORT = VOCAB.QSHORT as Record<string, string>;

/** The full descriptive titles, from QMETA. */
export const QTITLE: Record<string, string> = Object.fromEntries(
  VOCAB.QMETA.map(([k, , title]) => [k, title]),
);

/**
 * The verdict vocabulary. These exact words are the legend, and the legend's
 * swatches must be the colours the chips actually are or the key lies about the
 * table.
 */
export const VERDICT_WORD: Record<VerdictState, string> = {
  good: "Good fit",
  good2: "Likely good fit",
  warn: "Neutral",
  bad2: "Likely bad fit",
  bad: "Bad fit",
  unk: "Unknown",
  unver: "Needs a check",
};

/**
 * q2 overrides the verdict wording: its orange means a SIZE MISMATCH, not "they
 * already have it". Calling a mid-size miss "Bad fit" would read as an error,
 * and red is reserved for the issue flag.
 */
export const VERDICT_WORD_BY_Q: Partial<Record<QuestionKey, Partial<Record<VerdictState, string>>>> =
  {
    q2: { warn: "Not a good fit" },
  };

export function verdictWord(state: VerdictState, k?: QuestionKey): string {
  return (k && VERDICT_WORD_BY_Q[k]?.[state]) || VERDICT_WORD[state];
}

/** Short forms for the login tile. */
export const LOGIN_SHORT: Record<string, string> = {
  custom_confirmed: "Custom ✓",
  custom_candidate: "Custom?",
  generic_cc: "Generic",
  no_login_link: "None",
  generic_login: "Generic",
  unknown: "—",
};

/** What that country calls its subdivision. The dropdown must not offer Canadians a "state". */
const SUBDIV_LABEL = VOCAB.SUBDIV_LABEL as Record<string, string>;

export function subdivLabel(country: string | undefined | null): string {
  return SUBDIV_LABEL[country ?? ""] ?? "region";
}

export const SORT_OPTS = VOCAB.SORT_OPTS;
