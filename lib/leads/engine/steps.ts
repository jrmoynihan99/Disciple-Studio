/**
 * Next steps by category. Ported verbatim from `core.js`.
 *
 * `r.next_steps_by_category = {looked, source, pathway_name, categories:[...]}`
 * where each category's state is one of three DIFFERENT FACTS:
 *
 *   present        >=1 verified named option — the church offers this, in its own words
 *   absent_looked  pages were read, category not named -> an honest "not mentioned"
 *   not_looked     no next-step pages were read -> grey, NEVER asserted absent
 *
 * The count of PRESENT categories is a fit signal shown as x/8. It is a
 * different measurement from q3, which asked whether the site names concrete
 * next steps AND offers a convenient way to act — q3 is retired and this is not.
 */

import type { ChurchRecord, StepCategory, StepsSummary, VerdictState } from "./types.ts";

export function nextStepsSummary(r: ChurchRecord | null | undefined): StepsSummary {
  const ns = r?.next_steps_by_category ?? {};
  const cats: StepCategory[] = ns.categories ?? [];
  const present = cats.filter((c) => c.state === "present");
  return {
    looked: !!ns.looked,
    present,
    nPresent: present.length,
    nCats: cats.length,
    cats,
    pathway: ns.pathway_name ?? "",
    source: ns.source ?? "",
  };
}

/**
 * The colour the next-steps tile paints.
 *
 * Unlooked returns `unk`, NOT `bad`. "We never opened a next-step page" and "we
 * read them and the church offers nothing" are different facts and must not
 * share a colour.
 */
export function nextStepsState(r: ChurchRecord | null | undefined): VerdictState {
  return stepsSummaryState(nextStepsSummary(r));
}

/**
 * The same rule over an already-built summary — what the UI has, since a
 * `ChurchView` carries its summary rather than the raw record.
 */
export function stepsSummaryState(s: StepsSummary): VerdictState {
  if (!s.looked) return "unk";
  const n = s.nPresent; // out of 8 categories
  return n >= 5 ? "good" : n >= 3 ? "good2" : n >= 1 ? "warn" : "bad";
}

/** Same thresholds as `nextStepsState`, for a bare count (the facet options). */
export function stepsCountState(n: number): VerdictState {
  return n >= 5 ? "good" : n >= 3 ? "good2" : n >= 1 ? "warn" : "bad";
}

/**
 * The count a HUMAN may be shown — `null` when no next-step page was read.
 *
 * `summary.nPresent` is 0 in that case, and 0 is a lie: it says the church
 * offers none of the eight, when what happened is that we never looked. The tile
 * must read "not checked" and never "0 of 8" — eight grey dots and a zero are
 * visually identical to a hurried reader, and the difference is the difference
 * between a fact about the church and a gap in our data.
 *
 * `golden-colors.json` encodes the same rule: its `steps` field is null for the
 * two fixture churches with `looked: false`. Returning `number | null` makes the
 * caller handle it rather than remember it.
 */
export function stepsDisplayCount(summary: StepsSummary): number | null {
  return summary.looked ? summary.nPresent : null;
}
