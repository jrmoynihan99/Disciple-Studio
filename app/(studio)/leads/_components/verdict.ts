import type { VerdictState } from "@/lib/leads/engine/types";

/**
 * Verdict state -> Tailwind class. ONE mapping, so a cell, a chip, a facet
 * swatch, a tile rail and the legend can never paint the same state differently.
 *
 * Tailwind needs literal class names at build time, so these are spelled out
 * rather than interpolated.
 */

export const FILL: Record<VerdictState, string> = {
  good: "bg-lead-good",
  good2: "bg-lead-good2",
  warn: "bg-lead-warn",
  bad2: "bg-lead-bad2",
  bad: "bg-lead-bad",
  unk: "bg-lead-unk",
  unver: "bg-lead-unver",
};

/**
 * Chip fills. Three states use a contrast-nudged variant because the chips are
 * the only place a verdict hue carries 9px text. The LEGEND must use these too,
 * or the key lies about the table.
 */
export const CHIP_FILL: Record<VerdictState, string> = {
  ...FILL,
  bad: "bg-lead-bad-chip",
  unk: "bg-lead-unk-chip",
  unver: "bg-lead-unver-chip",
};

export const TEXT: Record<VerdictState, string> = {
  good: "text-lead-good",
  good2: "text-lead-good2",
  warn: "text-lead-warn",
  bad2: "text-lead-bad2",
  bad: "text-lead-bad",
  unk: "text-lead-unk",
  unver: "text-lead-unver",
};

export const BORDER_L: Record<VerdictState, string> = {
  good: "border-l-lead-good",
  good2: "border-l-lead-good2",
  warn: "border-l-lead-warn",
  bad2: "border-l-lead-bad2",
  bad: "border-l-lead-bad",
  unk: "border-l-lead-unk",
  unver: "border-l-lead-unver",
};

/**
 * `unver` carries a 45-degree hatch on top of its fill.
 *
 * NOT decoration. Slate and olive are close for the ~8% of men with red-green
 * colour vision deficiency, and the hatch is what carries "we have a signal we
 * cannot stand behind" apart from "we never measured this" for them.
 */
export function fillClass(state: VerdictState): string {
  return state === "unver" ? `${FILL[state]} lead-hatch` : FILL[state];
}

export function chipClass(state: VerdictState): string {
  return state === "unver" ? `${CHIP_FILL[state]} lead-hatch` : CHIP_FILL[state];
}
