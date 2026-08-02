/**
 * (question, answer) -> verdict state. Ported verbatim from `core.js`, including
 * its precedence order, which is subtle. Do not restructure.
 *
 * Traffic light keyed to the SELLER's benefit: green = favorable, red = not,
 * grey = unknown. What "favorable" means depends on the question — q1 is a fit
 * signal PRESENT, q2 is size in the sweet spot, and the rest are OPPORTUNITIES
 * (the church lacks a Disciple Studio feature, so there is something to sell).
 *
 * A church with no member login is GREEN. A church with a modern website is RED.
 * Reading these as quality ratings and "fixing" them inverts the product.
 */

import type {
  ColorOverrides,
  EngineCtx,
  QuestionKey,
  QuestionView,
  SubSignal,
  VerdictState,
} from "./types.ts";
import { VOCAB } from "./vocab.generated.ts";
import { staffCountState } from "./staff.ts";

/** The static (question, answer) table. Questions marked null are computed below. */
const COLOR_DEFAULTS = VOCAB.COLOR_DEFAULTS as Record<
  string,
  Record<string, VerdictState> | null
>;

/** Plain-English phrase per state, so a multi-factor rating is never a black box. */
export const STATE_PHRASE = VOCAB.STATE_PHRASE as Record<VerdictState, string>;

function ruleState(k: string, a: string): VerdictState | null {
  const r = COLOR_DEFAULTS[k];
  return (r && r[a]) || null;
}

/**
 * OWNER DECISIONS THAT DELIBERATELY DIVERGE FROM THE GENERATED TABLE.
 *
 * `COLOR_DEFAULTS` comes out of `vocab.generated.ts`, which is written by
 * `scripts/leads-gen-vocab.mts` from the pipeline's own vocab — editing it by
 * hand would be overwritten by the next regeneration, and worse, it would make
 * `golden-colors.json` lie: that table is the M0 gate proving this port
 * reproduces the reference `core.js`, so a hand-edit there stops being evidence
 * of anything.
 *
 * A patch layer keeps the two claims apart. The generated table says what the
 * reference does; this says where we have since decided otherwise, and why.
 * `golden.test.mts` carries its own independent copy of this list, so changing
 * one without the other fails the build.
 *
 * Same shape and same reasoning as `ANSWER_LABEL_PATCH` in `labels.ts`.
 */
export const COLOR_PATCH: Record<string, Record<string, VerdictState>> = {
  // A CONFIRMED custom login is already `bad`. A possible one is therefore the
  // "likely" grade of the same finding — not an unverified signal that someone
  // could go and resolve. It was `unver`, whose own verdict word for this
  // question is "Can't confirm", because the confirming step was retired
  // upstream: slate promised a check that nobody can perform.
  q5: { custom_candidate: "bad2" },
};

function patchState(k: string, a: string): VerdictState | null {
  return COLOR_PATCH[k]?.[a] ?? null;
}

/**
 * The user's own mapping for this (question, answer) pair.
 *
 * Lives in its own layer consulted FIRST — not merged into COLOR_DEFAULTS —
 * because a user may recolour any option, including the questions whose default
 * colour is COMPUTED from more than the answer (q2's staff band, q3's two axes,
 * q4's explicit cell). Those cannot live in a table keyed by answer alone.
 * Clearing an override falls straight back to the built-in logic.
 */
function userColor(
  overrides: ColorOverrides,
  k: string,
  a: string,
): VerdictState | null {
  const m = overrides[k];
  return (m && m[a]) || null;
}

/**
 * Roll several coloured sub-signals up to one cell colour: none decisive -> unk;
 * all agree -> that colour; any disagreement, INCLUDING a mix that contains
 * green -> warn (partial).
 */
export function rollup(subs: SubSignal[] | null | undefined): VerdictState {
  const s = (subs ?? []).map((x) => x.state).filter((x): x is VerdictState => !!x && x !== "unk");
  if (!s.length) return "unk";
  return s.every((x) => x === s[0]) ? s[0] : "warn";
}

/** Plain-English reason for the rolled-up colour. */
export function rollupWhy(subs: SubSignal[] | null | undefined): string {
  const all = subs ?? [];
  const known = all.filter((x) => x.state && x.state !== "unk");
  const nUnk = all.length - known.length;
  const tail = nUnk ? ` (${nUnk} sub-signal${nUnk > 1 ? "s" : ""} unmeasured, not counted)` : "";
  if (!known.length) return "grey — every sub-signal is unmeasured";
  const col = rollup(all);
  const parts = known.map((x) => `${x.label} is ${STATE_PHRASE[x.state as VerdictState]}`);
  if (col === "warn" && !known.every((x) => x.state === known[0].state))
    return `${STATE_PHRASE[col]} — the sub-signals disagree: ${parts.join("; ")}${tail}`;
  return `${STATE_PHRASE[col]} — ${
    known.length > 1 ? "all measured sub-signals agree" : "the one measured sub-signal says"
  }: ${parts.join("; ")}${tail}`;
}

/**
 * THE precedence order. Every step earns its place; reordering them changes what
 * churches a salesperson calls.
 */
export function colorState(
  k: QuestionKey,
  q: QuestionView | null | undefined,
  ctx: EngineCtx,
): VerdictState {
  if (!q) return "unk";
  const a = q.answer;

  // 1. The user's own mapping wins over everything, so a recolour propagates to
  //    cells, chips, meter, tiles, dossier and histogram at once.
  const uc = a != null && userColor(ctx.overrides, k, a);
  if (uc) return uc;
  if (a == null) return "unk";

  // 2. Our own decisions, ABOVE the generated table and BELOW the user's. A
  //    recolour in the rail must still be able to clear one, or a product
  //    decision becomes something nobody on the team can disagree with.
  const patched = patchState(k, a);
  if (patched) return patched;

  // 3. The static table. q1, q5, q7, q8 are fully table-driven.
  const fixed = ruleState(k, a);
  if (fixed) return fixed;

  if (a === "unknown") return "unk";

  // 4. q3 combines TWO axes: concrete next steps (a FIT signal) and a convenient
  //    way to act (an OPPORTUNITY signal). Both must look good for the cell to
  //    read green — many steps AND no way to act is the best lead; no steps AND
  //    a form is no lead at all.
  //    (q3 is retired from display. The logic stays: it is golden-tested, and it
  //    is what proves the port is faithful.)
  if (k === "q3") {
    if (a === "unknown") return "unk";
    const V: Record<string, number> = { good: 2, good2: 1, warn: 0.5, bad: 0 };
    const s = q.steps_state != null ? V[q.steps_state] : undefined;
    const c = q.conv_state != null ? V[q.conv_state] : undefined;
    if (s == null || c == null) return "unk";
    const t = s + c; // 0 .. 4
    return t >= 3.5 ? "good" : t >= 2.5 ? "good2" : t >= 1.5 ? "warn" : "bad";
  }

  // 5. A record may NAME its own cell, and that ALWAYS wins over an inference
  //    drawn from `opportunity` or a sub-signal rollup. q4/q6 use it for the
  //    confirmed Church-Center-module case: the module being enabled is a known
  //    fact, so the church has that feature, even though the page was never
  //    rendered. A genuine unknown (q8 `likely_yes`) keeps the slate `unver`
  //    "needs a check". q5 `custom_candidate` used to as well; it is now
  //    patched to `bad2` above, because its check cannot be performed.
  //
  //    This is why `cell` is in the slim index: omit it and the list paints a
  //    different colour from the dossier for the same church.
  if (q.cell) return q.cell;

  if (k === "q4" || k === "q12") {
    if (q.subsignals && q.subsignals.length) return rollup(q.subsignals);
  }

  if (k === "q2") {
    if (a !== "counted" || q.count == null) return "unk";
    return staffCountState(q.count, ctx.favor);
  }

  // 6. q9/q10 band on the COUNT, not on how well we knew the answer. They used
  //    to be green for "cited", which scored a church for publishing its service
  //    times rather than for being big. A bigger operation is more favor.
  if (k === "q9") {
    // A published page with no countable weekly service is neutral too — we read
    // it and could not count, which is not the same as counting zero.
    if (a === "published") return (q.count ?? 0) >= 3 ? "good" : q.count === 2 ? "good2" : "warn";
    if (a === "not_published") return "warn";
    return "unk";
  }
  if (k === "q10") {
    // A multisite verdict whose count never resolved still means at least two
    // places, so it earns the soft favor and no more.
    if (a === "multisite") return (q.count ?? 0) >= 3 ? "good" : "good2";
    if (a === "single_site") return "warn";
    return "unk";
  }

  // 7. Fallback. In practice only q6 reaches this — see `adapt.ts`.
  if (q.opportunity === true) return "good"; // lacks the feature = something to sell
  if (q.opportunity === false) return "bad"; // already has it = not a lead
  return "unk";
}

/** Does this (question, answer) pair currently carry a user override? */
export function hasUserColor(overrides: ColorOverrides, k: string, a: string): boolean {
  return !!userColor(overrides, k, a);
}
