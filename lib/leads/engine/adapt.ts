/**
 * Project a full record OR a slim index row into the one `QuestionView` shape
 * `colorState` reads.
 *
 * WHY THIS MODULE EXISTS
 *
 * The list, the facet swatches and the histogram are drawn from the slim index;
 * the dossier is drawn from the full record. If those two project differently,
 * the same church paints one colour in the list and another in the dossier — the
 * exact incident the "one source of truth for (question, answer) -> colour" rule
 * was written for. So both go through here, and `golden.test.mts` runs the
 * fixture through BOTH projections and requires identical output.
 *
 * MEASURED, NOT ASSUMED. Folding `fixture/index.json` through `colorState`
 * against `golden-colors.json` gives 1,239 of 1,340 cells correct. Every miss is
 * q6 — 94 `external_handoff` and 7 `convenient` cells that should read good and
 * bad, arriving as `unk`. Cause: q6 is the ONLY question that reaches
 * `colorState`'s `opportunity` fallback, and the shipped index carries neither
 * `opportunity` nor `cell` for it.
 *
 * Checked across all ten questions in the fixture, so this is the whole gap and
 * not just the part that showed:
 *
 *   q1 q5 q7 q8   fully table-driven — COLOR_DEFAULTS hits before any fallback
 *   q2 q9 q10     band on `count`, which the index carries
 *   q3            two axes, `ss` + `cs`, both in the index
 *   q4            names its own `cell` — present on 134/134 records AND rows
 *   q6            reaches `opportunity`, which the index does not carry  ← the gap
 *
 * `docs/06-DATA-CONTRACT.md` shows `"q6": {"a":"external_handoff","cell":"good"}`
 * as though the index already carried it. It does not, in the shipped fixture.
 */

import type {
  ChurchRecord,
  IndexQuestion,
  IndexRow,
  QuestionKey,
  QuestionView,
  StepCategory,
  StepsSummary,
  VerdictState,
} from "./types.ts";
import { isVerdictState } from "./types.ts";
import { VOCAB } from "./vocab.generated.ts";
import { nextStepsSummary } from "./steps.ts";
import { platformLineFromIndex, platformLineFromRecord } from "./platform.ts";
import {
  countryFromIndex,
  countryFromRecord,
  subdivFromIndex,
  subdivFromRecord,
} from "./region.ts";

/**
 * q6 asks whether giving is a convenient built-in page or a hand-off to an
 * external platform, and it is read as an OPPORTUNITY: a church that hands off
 * lacks the thing we sell, so it is favourable; a church that already has
 * convenient giving is not a lead for it.
 *
 * In the fixture `q6.opportunity` is a pure function of the answer, 134/134:
 *
 *   external_handoff -> true    (94)
 *   convenient       -> false   (7)
 *   unknown          -> null    (33, and `unknown` never scores)
 *
 * So the index can reconstruct it exactly. This is a RECONSTRUCTION of a fact
 * the record already states, not a new inference — if a publish ever carries
 * `cell` or `op` for q6, that wins and this never runs.
 */
const Q6_OPPORTUNITY: Record<string, boolean> = {
  external_handoff: true,
  convenient: false,
};

/** The record is already the shape `colorState` wants. Pass it through unchanged. */
export function questionFromRecord(
  rec: ChurchRecord | null | undefined,
  key: QuestionKey,
): QuestionView | null {
  const q = rec?.[key];
  return q ? (q as QuestionView) : null;
}

/**
 * Rebuild a `QuestionView` from the slim index's short keys.
 *
 * Returns null when the row carries nothing for that question, so a caller can
 * tell "no data at all" from "an answer of unknown" — `colorState(k, null)` and
 * `colorState(k, {answer:"unknown"})` both yield `unk`, but only one of them
 * means the publish omitted the question.
 */
export function questionFromIndex(
  row: IndexRow | null | undefined,
  key: QuestionKey,
): QuestionView | null {
  const q = row?.[key as keyof IndexRow] as IndexQuestion | undefined;
  if (!q) return null;

  const view: QuestionView = {
    answer: q.a ?? null,
    count: q.c ?? null,
    count_is_floor: q.fl ?? false,
    steps_state: q.ss ?? null,
    conv_state: q.cs ?? null,
    cell: isVerdictState(q.cell) ? (q.cell as VerdictState) : null,
    platform: q.p ?? "",
    platform_key: q.pk ?? "",
    opportunity: q.op ?? null,
  };

  // The one reconstruction. Guarded so a publish that starts carrying the fact
  // outright takes precedence — this is a fallback, never an override.
  if (key === "q6" && view.cell == null && view.opportunity == null && q.a) {
    view.opportunity = Q6_OPPORTUNITY[q.a] ?? null;
  }

  return view;
}

/* --------------------------------------------------------------- next steps */

/** The 8-char `ns.s` alphabet: present / absent_looked / not_looked. */
const NS_CHAR = { p: "present", a: "absent_looked", n: "not_looked" } as const;

export type NsChar = keyof typeof NS_CHAR;

/**
 * Expand the index's packed next-steps string into per-category states, in
 * STEP_CATS order.
 *
 * `looked === false` is NOT the same as eight absent categories, and the caller
 * must keep them apart: the tile reads "not checked", never "0 of 8". Eight grey
 * dots and a zero look identical to a hurried reader, and the difference is the
 * difference between a fact about the church and a gap in our data.
 */
export function stepStatesFromIndex(row: IndexRow | null | undefined): {
  looked: boolean;
  states: (typeof NS_CHAR)[NsChar][];
} {
  const ns = row?.ns;
  const looked = !!ns?.l;
  const packed = ns?.s ?? "";
  const states = Array.from(packed, (ch) => NS_CHAR[ch as NsChar] ?? "not_looked");
  return { looked, states };
}

/**
 * Rebuild a `StepsSummary` from the index.
 *
 * The categories come back with their FIXED English labels and no evidence —
 * the index deliberately carries no quotes, no own_terms and no source URLs.
 * That is a real limit, not an oversight: the moment the UI wants to show a
 * church's own wording for a step, it must fetch the record.
 */
export function stepsFromIndex(row: IndexRow | null | undefined): StepsSummary {
  const { looked, states } = stepStatesFromIndex(row);
  const cats: StepCategory[] = VOCAB.STEP_CATS.map(([key, label], i) => ({
    key,
    label,
    state: states[i] ?? "not_looked",
  }));
  const present = cats.filter((c) => c.state === "present");
  return {
    looked,
    present,
    nPresent: present.length,
    nCats: cats.length,
    cats,
    pathway: "",
    source: "",
  };
}

/* -------------------------------------------------------------- ChurchView */

/**
 * One church, projected.
 *
 * Everything downstream — colours, favor, filters, sorts, facets — reads this
 * and never the raw shape, so the list (index-backed) and the dossier
 * (record-backed) cannot compute different answers for the same church. The
 * golden test runs the whole fixture through both constructors and requires
 * byte-identical output.
 */
export interface ChurchView {
  id: string;
  name: string;
  /** The projected question, or null when the source carries nothing for it. */
  q(key: QuestionKey): QuestionView | null;
  steps: StepsSummary;
  /** Region cascade + the `state` sort. The two sources spell these differently. */
  country: string;
  subdiv: string;
  network: string;
  /** `lang.facet`. "" when never screened — never a facet option. */
  lang: string;
  platformLine: string;
  /** The `scraped` sort. Unparseable sorts last, never in the middle. */
  fetchedLast: string;
}

export function churchFromRecord(rec: ChurchRecord): ChurchView {
  return {
    id: rec.org_id,
    name: rec.name ?? "",
    q: (key) => questionFromRecord(rec, key),
    steps: nextStepsSummary(rec),
    country: countryFromRecord(rec),
    subdiv: subdivFromRecord(rec),
    network: rec.network ?? "",
    lang: rec.lang?.facet ?? "",
    platformLine: platformLineFromRecord(rec),
    fetchedLast: rec.fetched_last ?? "",
  };
}

export function churchFromIndex(row: IndexRow): ChurchView {
  return {
    id: row.id,
    name: row.n ?? "",
    q: (key) => questionFromIndex(row, key),
    steps: stepsFromIndex(row),
    country: countryFromIndex(row),
    subdiv: subdivFromIndex(row),
    network: row.nw ?? "",
    lang: row.lg ?? "",
    platformLine: platformLineFromIndex(row),
    fetchedLast: row.ts ?? "",
  };
}
