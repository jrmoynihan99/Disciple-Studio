/**
 * REVIEW-PASS-TEMP — three treatments of the evidence, switchable in place.
 *
 * The language is settled (the console's). What is still open is the SHAPE of
 * the three fields a reviewer actually reads: next steps, discipleship,
 * contacts. All three passes agree on what the first look established —
 *
 *   · the title is big and in brand ink, so a list has an entry point;
 *   · the quote sits to the RIGHT of its title, not underneath it, so the
 *     titles form one column you can run your eye down and the quotes form
 *     another you only enter when a title makes you want to;
 *   · a contact's email sits to the right of their name for the same reason.
 *
 * — and disagree on how hard that split is drawn. That is the whole question,
 * and it is a real one, because the split is what makes the page skimmable and
 * also what makes it feel like a table if you overdo it.
 *
 *   a · Ledger   ONE grid for the whole field, so every title in every item
 *                starts at the same x and every quote does too. Alignment is
 *                absolute; a long title cannot push its quote out of column.
 *                Densest. Closest to a table, deliberately — the question is
 *                whether that is a cost or the point.
 *   b · Panel    Each item is its own bordered block with a tinted title cell.
 *                Alignment holds inside an item, not across them. An item reads
 *                as a unit you can strike or keep, which is the actual verb.
 *   c · Rule     No boxes and no grid — the title is a run-in against a brand
 *                rule and the quote follows in a wide gap. Nothing lines up
 *                between items except the rule. Airiest; most like reading.
 *
 * When one is chosen: `grep -rn "REVIEW-PASS-TEMP" app lib` is the complete
 * list, and the winner's strings get inlined into `skin.ts`.
 */

export type Pass = "a" | "b" | "c";

export interface PassSkin {
  id: Pass;
  title: string;
  /** One line in the switch's tooltip. No premise, no manifesto. */
  hint: string;

  /** Wraps all the items in one field. */
  list: string;
  /** The suppress shell — the thing struck out, and the thing hovered. */
  shell: string;
  shellStruck: string;
  /** The two cells. */
  row: string;
  left: string;
  right: string;
  /** Type. */
  itemTitle: string;
  quote: string;
  contactName: string;
}

/* ── a · Ledger ─────────────────────────────────────────────────────────── */
const LEDGER: PassSkin = {
  id: "a",
  title: "Ledger",
  hint: "One grid per field — every title and every quote starts at the same x.",
  list: "divide-y divide-lead-line/60",
  shell: "group/item relative py-2 pr-8 hover:bg-lead-bg/40",
  shellStruck: "group/item relative py-2 pr-8 bg-lead-bad/[0.06]",
  row: "grid grid-cols-[minmax(150px,230px)_1fr] items-baseline gap-x-6 max-[900px]:grid-cols-1 max-[900px]:gap-y-1",
  left: "min-w-0",
  right: "min-w-0",
  itemTitle: "text-[16px] leading-snug font-semibold text-lead-brand",
  quote: "font-serif text-[14px] leading-relaxed text-lead-ink",
  contactName: "text-[16px] leading-snug font-semibold text-lead-brand",
};

/* ── b · Panel ──────────────────────────────────────────────────────────── */
const PANEL: PassSkin = {
  id: "b",
  title: "Panel",
  hint: "Each item its own block, title cell tinted — an item reads as a unit.",
  list: "space-y-2",
  shell:
    "group/item relative overflow-hidden rounded-lg border border-lead-line bg-lead-bg/40 pr-8",
  shellStruck:
    "group/item relative overflow-hidden rounded-lg border border-lead-bad/40 bg-lead-bad/[0.06] pr-8",
  row: "grid grid-cols-[minmax(150px,230px)_1fr] max-[900px]:grid-cols-1",
  left: "min-w-0 bg-lead-panel2/60 px-3 py-2.5 max-[900px]:pb-1.5",
  right: "min-w-0 px-3.5 py-2.5 max-[900px]:pt-0",
  itemTitle: "text-[16px] leading-snug font-semibold text-lead-brand",
  quote: "font-serif text-[14px] leading-relaxed text-lead-ink",
  contactName: "text-[16px] leading-snug font-semibold text-lead-brand",
};

/* ── c · Rule ───────────────────────────────────────────────────────────── */
const RULE: PassSkin = {
  id: "c",
  title: "Rule",
  hint: "No boxes — a brand rule, a big title, and the quote in a wide gap.",
  list: "space-y-3.5",
  shell: "group/item relative border-l-[3px] border-lead-brand/50 py-1 pr-8 pl-3.5",
  shellStruck: "group/item relative border-l-[3px] border-lead-bad py-1 pr-8 pl-3.5",
  row: "flex flex-wrap items-baseline gap-x-8 gap-y-1",
  left: "min-w-0 shrink-0 basis-[210px] max-[900px]:basis-full",
  right: "min-w-0 flex-1 basis-[280px]",
  itemTitle: "text-[17px] leading-snug font-semibold text-lead-brand",
  quote: "font-serif text-[14.5px] leading-relaxed text-lead-ink2",
  contactName: "text-[17px] leading-snug font-semibold text-lead-brand",
};

export const PASSES: Record<Pass, PassSkin> = { a: LEDGER, b: PANEL, c: RULE };
export const PASS_ORDER: readonly Pass[] = ["a", "b", "c"];
