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

  /**
   * THE SECOND REPAIR — `q5: custom_candidate`, 22 of 134 churches (16%).
   *
   * It read "Possible custom login (needs check)". The pipeline has since
   * confirmed that the confirming step WAS RETIRED: pages are not rendered to
   * resolve a login candidate, now or at full scale, because the proxy bills per
   * megabyte and it would be ~1,070 churches. `custom_candidate` is terminal and
   * will never become `custom_confirmed`.
   *
   * So "(needs check)" asked a salesperson for work nobody will ever do, on one
   * church in six. The fact did not change — we still cannot stand behind the
   * signal, which is why the state stays `unver` and keeps its hatch. What
   * changed is that the uncertainty is now permanent, and the label has to say
   * the permanent thing.
   */
  q5: { custom_candidate: "Possible custom login — unconfirmable" },
};

/** Plain English for a raw answer enum. Anything unmapped falls back to the value. */
export function answerLabel(k: QuestionKey | string, v: string): string {
  return ANSWER_LABEL_PATCH[k]?.[v] ?? ANSWER_LABEL[k]?.[v] ?? v;
}

/**
 * The per-church `label` a record carries, made safe to render.
 *
 * THE SECOND REPAIR. 28 of 134 q1 labels end "… See Q3 for details." — the
 * pipeline's own cross-reference, written when q3 was a rendered question. It
 * breaks two rules at once now:
 *
 *  · No "Q1".."Q10" string may appear anywhere in the UI. That rule exists
 *    because the same question once read as "Q11" in the grid and "Q5" in the
 *    dossier, colliding with the real q5. This label is a literal question
 *    number shown to a salesperson.
 *  · q3 is RETIRED. It renders nowhere, so the pointer leads to a question the
 *    reader cannot find — worse than no pointer at all.
 *
 * The sentence is dropped, not rewritten. Everything before it is the
 * pipeline's own finding and is left untouched; inventing a replacement clause
 * would be putting words about a real church into its record.
 */
const DANGLING_XREF = /\s*See\s+Q\d+\s+for\s+details\.?\s*$/i;

/**
 * THE THIRD REPAIR — a retired instruction, 22 of 134.
 *
 * Every `q5: custom_candidate` record labels itself
 * "Possible custom login — needs a render check". The render check is not run,
 * now or at full scale: it costs a page render per church and it would be ~1,070
 * of them. The state is terminal.
 *
 * The trailing clause is dropped and the finding kept, because "Possible custom
 * login" is the whole fact — the clause was only ever describing how the
 * uncertainty *would* be resolved, and that route is closed.
 *
 * Not folded into `ANSWER_LABEL_PATCH`: that table is the fallback for when a
 * record has no label of its own, and these records all have one. A per-church
 * label wins over the table, so a repair aimed at the table would have silently
 * done nothing here — which is exactly what happened on the first attempt.
 */
const RETIRED_INSTRUCTION = /\s*[—–-]\s*needs? (?:a )?(?:render )?check.*$/i;

export function recordLabel(label: unknown): string {
  return String(label ?? "")
    .replace(DANGLING_XREF, "")
    .replace(RETIRED_INSTRUCTION, "")
    .trim();
}

/**
 * THE FOURTH REPAIR — the evidence paragraph, `q5: custom_candidate`, 22 of 134.
 *
 * The pipeline writes, verbatim and identically apart from the domain:
 *
 *   "The homepage sign-in link points to the church's own domain (flintbc.net),
 *    not churchcenter.com — a candidate for a custom login/portal. We have not
 *    opened the page to confirm it is a bespoke tracked system."
 *
 * Two problems, and both are about what a salesperson would repeat out loud.
 *
 * NAMING ONE COMPETITOR. "not churchcenter.com" describes how the detector
 * happened to be written, not anything about this church. The church's own
 * domain stays — that IS the finding, and it is the part worth quoting.
 *
 * AN ADMIN LOGIN LOOKS EXACTLY LIKE A MEMBER LOGIN from the outside. A staff
 * back-office sign-in on the church's own domain trips this detector, and a
 * church whose only "custom login" is its own admin panel has no member portal
 * at all — which flips it from a poor lead to a good one. That is the single
 * most consequential way this finding is wrong, and the record never said so.
 *
 * DONE HERE, NOT IN THE DATA. Editing the 22 fixture records would be undone by
 * the next pipeline drop; this is the same reasoning that put the two label
 * repairs above in code.
 *
 * The strip is scoped to the exact clause. A blanket removal of the domain would
 * mangle the `generic_cc` records, which name their provider ("…points to
 * ccaspen.breezechms.com (Breeze), a rigid generic third-party portal…") as the
 * substance of the finding rather than as an aside.
 */
const COMPETITOR_ASIDE = /,\s*not\s+churchcenter\.com\b/gi;

const ADMIN_LOGIN_CAVEAT =
  "Note that it's possible that an admin login system (rather than a per-member " +
  "login system) might have been detected instead, in which case, the church " +
  "should be manually evaluated as having no custom login system.";

/** The evidence paragraph a reader may be shown, repaired per question. */
export function evidenceText(k: QuestionKey | string, q: unknown): string {
  const o = (q ?? {}) as { evidence?: unknown; answer?: unknown };
  const text = String(o.evidence ?? "").replace(COMPETITOR_ASIDE, "").trim();
  if (!text) return "";
  // Scoped to the one answer the caveat is about. Appending it to a confirmed
  // custom login would be hedging a finding we actually stand behind.
  if (k === "q5" && o.answer === "custom_candidate") return `${text} ${ADMIN_LOGIN_CAVEAT}`;
  return text;
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
/**
 * Per-question overrides for the verdict word.
 *
 * `q5.unver` is the reason this table cannot be collapsed into `VERDICT_WORD`.
 * Both q1 and q5 reach `unver`, and the state means the same thing in both —
 * "we have a signal we cannot stand behind" — but the READER'S NEXT MOVE is
 * opposite:
 *
 *   q1 `unverified`      the model claimed text that is not on the page. Opening
 *                        the page RESOLVES it. "Needs a check" is an instruction.
 *   q5 `custom_candidate` the confirming step was retired upstream. Opening the
 *                        page resolves NOTHING we will ever record. It is a
 *                        permanent state, and telling someone to check it wastes
 *                        their time on one church in six.
 *
 * A shared word cannot say both. Do not "simplify" this away.
 */
export const VERDICT_WORD_BY_Q: Partial<Record<QuestionKey, Partial<Record<VerdictState, string>>>> =
  {
    q2: { warn: "Not a good fit" },
    q5: { unver: "Can't confirm" },
  };

export function verdictWord(state: VerdictState, k?: QuestionKey): string {
  return (k && VERDICT_WORD_BY_Q[k]?.[state]) || VERDICT_WORD[state];
}

/** Short forms for the login tile. */
export const LOGIN_SHORT: Record<string, string> = {
  custom_confirmed: "Custom ✓",
  // "Possible", not "Custom?". The question mark read as "is it custom?" when
  // the finding is "there is possibly a custom login" — and it sat next to the
  // one tile whose colour now says likely-bad, so a reader had to resolve a
  // punctuation mark against a colour to get the meaning.
  custom_candidate: "Possible",
  generic_cc: "Generic",
  no_login_link: "None",
  // A word, not a dash. An em dash in a value slot reads as "nothing here",
  // which is indistinguishable from a rendering bug — and the thing it is
  // actually reporting, that we could not measure this, is a fact worth stating.
  unknown: "Unknown",
};

/** What that country calls its subdivision. The dropdown must not offer Canadians a "state". */
const SUBDIV_LABEL = VOCAB.SUBDIV_LABEL as Record<string, string>;

export function subdivLabel(country: string | undefined | null): string {
  return SUBDIV_LABEL[country ?? ""] ?? "region";
}

export const SORT_OPTS = VOCAB.SORT_OPTS;
