import { chipClass } from "../../../_components/verdict";
import type { CardFlagTone } from "@/lib/leads/engine/group";

/**
 * The review card's class strings, in one place.
 *
 * The console's language, chosen against a real batch over an `/studio/import`
 * one and a marketing-site one. What survived from that comparison is the label
 * gutter, the system serif for the church's own voice, the verdict hues and the
 * light/dark toggle; the two losers are gone along with the switch that carried
 * them.
 *
 * WHAT CHANGED AFTER THE FIRST LOOK, AND WHY, because most of it reverses a
 * decision the old card made on purpose:
 *
 *  · CONTROLS ARE ALWAYS VISIBLE. `remove church`, `+ step` and `+ contact` used
 *    to appear on hover, on the theory that twenty always-on "+ add" links read
 *    as a form to fill in. In practice a control you cannot see is a control
 *    nobody uses, and a reviewer who wants to strike a church should not have to
 *    discover that the button exists. They are real bordered buttons now.
 *  · THE IDENTITY IS A HEADER, NOT TWO ROWS. Logo at 72px, the name large, the
 *    slogan in quotation marks inside its own block, and the Visit button — the
 *    console's exact control — pinned right. That band is what you land on.
 *  · TITLES ARE BIG AND IN BRAND INK. Step and contact names carried the same
 *    13px as everything around them, so a list of eight steps was one grey
 *    mass with no entry point.
 *  · NO PER-QUOTE CITATION. See `parts.tsx` — that one is a real trade and it is
 *    written down there rather than here.
 */

export const H = "font-mono text-[10px] font-bold tracking-[0.14em] text-lead-ink2 uppercase";

/**
 * A MISSING NAME OR SLOGAN IS THE REVIEWER'S JOB, so it is styled as work to do
 * rather than as an absence to accept.
 *
 * Colour alone was not enough: twenty churches deep, amber italic at 13px is
 * something the eye slides past. A wash plus a ring gives the empty value a
 * SHAPE, which is what makes it findable while scrolling.
 *
 * `--lead-warn-ink`, not `--lead-warn` — the verdict hue fails contrast as text
 * on the light theme, and re-tinting it would move a colour that means something
 * about a church. See `leads-theme.css`.
 *
 * Every other empty field keeps the muted default. If everything shouted,
 * nothing would.
 */
export const EMPTY_VALUE =
  "rounded-lg bg-lead-warn/[0.08] " +
  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--lead-warn)_35%,transparent)]";
export const EMPTY_TEXT = "text-lead-warn-ink not-italic";

export const SKIN = {
  /* ── page shell ── */
  page: "mx-auto max-w-[1180px] px-6 pt-6 pb-32",
  nav: "mb-5 flex items-center gap-2 font-mono text-[11px] text-lead-ink2",
  /**
   * A BUTTON, NOT UNDERLINED TEXT.
   *
   * `← Console` and `All groups` are how you get out of a batch, and they were
   * 11px of underlined mono in the same ink as the save-state line beside them —
   * indistinguishable from the page's chrome at a glance. They are the only
   * navigation on the page; they get a target.
   *
   * `metaLink` below stays underlined on purpose: "finish collecting" is a
   * sentence with a verb in it, not a place to go.
   */
  navLink:
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-lead-line bg-lead-panel px-3 " +
    "font-mono text-[11px] text-lead-ink transition-colors hover:border-lead-brand hover:text-lead-brand",
  h1: "font-serif text-[32px] leading-tight font-semibold tracking-tight text-lead-ink",
  meta: "mt-1.5 font-mono text-[11px] text-lead-ink2",
  metaLink: "underline underline-offset-2 hover:text-lead-ink",
  pillOpen: "rounded-full bg-lead-good/20 px-2 py-0.5 font-mono text-[10px] text-lead-good",
  pillClosed: "rounded-full border border-lead-line px-2 py-0.5 font-mono text-[10px] text-lead-ink2",
  pillSent: "rounded-full bg-lead-dl/20 px-2 py-0.5 font-mono text-[10px] text-lead-dl",
  warnBox:
    "mb-6 w-fit max-w-[78ch] rounded-xl border border-lead-warn/50 bg-lead-warn/[0.07] px-5 py-4",
  warnTitle: "font-serif text-[17px] font-semibold text-lead-ink",
  warnBody: "mt-2 text-[13.5px] leading-relaxed text-lead-ink2",
  /**
   * The sent-batch notice.
   *
   * DELIBERATELY NOT `warnBox`'s amber. That colour means "check this before you
   * send"; there is nothing left to check and nothing left to send. This is a
   * statement of fact about a batch that is finished, so it takes the same slate
   * as the `sent` pill it agrees with.
   */
  frozenBox:
    "mb-6 w-fit max-w-[78ch] rounded-xl border border-lead-dl/50 bg-lead-dl/[0.07] px-5 py-4",
  frozenBody: "text-[13.5px] leading-relaxed text-lead-ink2",
  emptyBatch: "py-16 text-center font-serif text-[17px] italic text-lead-ink2",
  skeleton: "animate-pulse rounded-lg bg-lead-panel",

  /* ── one church ── */
  card: "group/card relative mb-5 overflow-hidden rounded-xl border border-lead-line bg-lead-panel",
  /** The card's own chevron, rotating off `[open]` on the `group/church` marker. */
  cardChevron: "ml-1 shrink-0 self-center text-lead-ink2 transition-transform group-open/church:rotate-180",
  railStruck: "bg-lead-bad",
  railEdited: "bg-lead-brand",
  banner:
    "border-b border-lead-line bg-lead-unk/10 px-6 py-2 font-mono text-[10px] leading-relaxed text-lead-ink",

  /* ── the identity band ── */
  /**
   * `list-none` and the webkit reset because this is a `<summary>` now — without
   * them the browser draws its own disclosure triangle beside the index number,
   * which is a second, uglier chevron saying the same thing.
   *
   * `cursor-pointer`, because the whole band toggles the card.
   */
  head:
    "flex cursor-pointer list-none flex-wrap items-start gap-x-5 gap-y-3 border-b border-lead-line " +
    "bg-lead-panel2/40 py-4 pr-4 pl-6 [&::-webkit-details-marker]:hidden",
  index: "font-mono text-[11px] text-lead-ink2 tabular-nums",
  logoBox: "grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-xl",
  logoInitials: "font-serif text-[26px] leading-none text-lead-ink2",
  name: "font-serif text-[26px] leading-tight font-semibold tracking-tight text-lead-ink",

  /**
   * QUOTATION MARKS AND A BLOCK, NOT ITALICS.
   *
   * The slogan is the church's own sentence, and italics were carrying that
   * claim on their own — which reads as emphasis rather than as attribution, and
   * at 15px in a warm serif it mostly just read as decoration. Quote marks say
   * "these are their words" literally, and the tinted block with a brand rule
   * gives the line a shape you can find without reading it.
   */
  sloganBox: "rounded-lg border-l-[3px] border-lead-brand bg-lead-bg/60 py-1.5 pr-3 pl-3",
  slogan: "font-serif text-[17px] leading-snug text-lead-ink",

  /** The console's own control, character for character — see VisitButton.tsx. */
  visit:
    "inline-flex h-9 max-w-full items-center gap-2 rounded-lg bg-lead-brand pr-4 pl-3.5 " +
    "text-[13px] font-semibold text-white transition-opacity hover:opacity-90",
  visitAbsent:
    "inline-flex h-9 items-center rounded-lg border border-dashed border-lead-line px-3 font-mono text-[11px] text-lead-ink2",

  /* ── the demo palette ──
     A BLOCK ON THE CARD, NOT A FIELD. It sits between the identity band and the
     five review fields and deliberately carries no `data-field`: `REVIEW_FIELDS`
     is the list of things a reviewer must READ AND CORRECT, `/leads/audit`
     asserts the rendered set against it, and colour is neither read nor
     correctable here. Adding a sixth `data-field` would have made the audit's
     order check fail for a block that answers a different question.

     Never collapsed. It is four lines tall and it is the only thing on the page
     that says what the church will actually receive. */
  paletteBox: "border-t border-lead-line px-6 py-3.5",
  paletteMode: "font-mono text-[9.5px] tracking-[0.14em] text-lead-ink2 uppercase",
  /** The ring, not a border: the tile's own background is the church's `bg`, and
   *  a near-white one needs an edge that is not itself part of the preview. */
  paletteTile:
    "mt-1 overflow-hidden rounded-lg p-2 ring-1 ring-lead-line ring-inset",
  paletteSwatch: "size-3.5 rounded-sm ring-1 ring-lead-line/70 ring-inset",

  /* ── controls: visible, always ── */
  btn:
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-lead-line bg-lead-panel px-3 " +
    "font-mono text-[11px] text-lead-ink2 transition-colors hover:border-lead-ink2 hover:text-lead-ink",
  /**
   * RED AT REST, not on hover.
   *
   * Removing a church from a batch is the one irreversible thing on this page —
   * there is no `put back` for it — and it was drawn in the same muted ink as
   * every other control, turning red only once the pointer was already on it. A
   * warning you only get after you have committed to the gesture is not a
   * warning.
   */
  btnDanger:
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-lead-bad/60 bg-lead-bad/[0.07] px-3 " +
    "font-mono text-[11px] text-lead-bad transition-colors hover:border-lead-bad hover:bg-lead-bad/[0.14]",
  btnSmall:
    "inline-flex h-7 items-center gap-1 rounded-md border border-lead-line bg-lead-panel px-2 " +
    "font-mono text-[10.5px] text-lead-ink2 transition-colors hover:border-lead-ink2 hover:text-lead-ink",
  /** The per-item ✕. Same footprint as `btnSmall`, so nothing reflows on hover. */
  btnSmallDanger:
    "inline-flex h-7 items-center gap-1 rounded-md border border-lead-bad/60 bg-lead-bad/[0.10] px-2 " +
    "font-mono text-[10.5px] text-lead-bad transition-colors hover:border-lead-bad hover:bg-lead-bad/20",

  /* ── one field ──
     THE LABEL IS A HEADER NOW, NOT A GUTTER. It used to sit in a 124px left
     track, which spent an eighth of the card's width on five words that never
     change and pushed every value inward. As a header it costs one line and the
     value gets the full measure.

     `<details>` rather than state: it collapses with the keyboard for free, and
     `open` is the default because the page's whole premise is that nobody gets
     to skip a church by not expanding it. */
  // `group/field` so the chevron can rotate off `[open]` without any state, and
  // NAMED so it cannot collide with `group/card` (the always-visible-controls
  // group) or `group/item` (the per-item ✕).
  field: "group/field border-t border-lead-line px-6 py-3.5",
  summary:
    "flex cursor-pointer list-none items-center gap-2 py-0.5 " +
    "[&::-webkit-details-marker]:hidden",
  chevron: "ml-auto text-lead-ink2 transition-transform group-open/field:rotate-180",
  label: H,
  value: "mt-2.5 min-w-0",
  count:
    "rounded-full border border-lead-line px-1.5 py-px font-mono text-[10px] text-lead-ink2 tabular-nums",
  absent: "font-mono text-[11px] leading-relaxed text-lead-ink2",

  /* ── one item ──
     Pass B, "Panel": each item is its own bordered block with a tinted title
     cell on the left and the quote to the right. Alignment holds inside an item
     rather than across them, which is what makes an item read as a unit you can
     strike or keep — the actual verb on this page. */
  list: "space-y-2",
  itemShell:
    "group/item relative overflow-hidden rounded-lg border border-lead-line bg-lead-bg/40 pr-8",
  itemShellStruck:
    "group/item relative overflow-hidden rounded-lg border border-lead-bad/40 bg-lead-bad/[0.06] pr-8",
  itemRow: "grid grid-cols-[minmax(150px,240px)_1fr] max-[900px]:grid-cols-1",
  itemLeft: "min-w-0 bg-lead-panel2/60 px-3 py-2.5 max-[900px]:pb-1.5",
  itemRight: "min-w-0 px-3.5 py-2.5 max-[900px]:pt-0",
  itemTitle: "text-[16px] leading-snug font-semibold text-lead-brand",
  quote: "font-serif text-[14px] leading-relaxed text-lead-ink",
  /**
   * The prompt shown where no quotation was captured.
   *
   * Deliberately NOT `EMPTY_TEXT`'s amber-and-ring treatment, which means "the
   * reviewer has to fill this in". A missing quote is a measured absence, not an
   * assignment — most steps will never have one and never need one. It reads as
   * quiet mono prose exactly as it did when it was a dead `<p>`; the only thing
   * that changed is that you can now click it.
   */
  quoteEmpty: "font-mono text-[11px] leading-relaxed text-lead-ink2 not-italic",

  /**
   * The connector between two items, in BOTH evidence lists.
   *
   * IT NO LONGER CLAIMS THE CHURCH CHOSE THE ORDER, and that is the whole reason
   * it may now be drawn everywhere. It used to appear only where
   * `pathwayIsOrdered(orderBasis)` held, because an arrow made the same assertion
   * a step number makes — "they said do this one first" — and next steps got none
   * at all, a category list having no first. The effect on screen was arrows that
   * came and went between churches for a reason no reviewer could see, which is
   * how it read: as a rendering fault.
   *
   * Owner's call, and the trade is explicit. The arrow is now punctuation — read
   * downward, these belong to one list — drawn `aria-hidden` so it says nothing to
   * a screen reader. THE ORDER CLAIM DID NOT MOVE HERE; it lives where it can
   * still be checked, in `<ol>` vs `<ul>` (see `Numbered` in `parts.tsx`), which
   * is the one carrier that survives restyling.
   */
  arrow: "flex justify-center py-1 font-mono text-[13px] leading-none text-lead-brand/45",

  /**
   * ── the discipleship programme header ──
   *
   * NOT AN ITEM. The pathway's name and the sentence describing it used to render
   * through `Claim` inside an `itemShell`, which made the programme look like a
   * ninth step sitting above the eight real ones — same border, same two-column
   * split, same brand-ink title. A reviewer skimming could not tell the container
   * from its contents.
   *
   * So it is built the other way round from a step on every axis that carries: it
   * runs the FULL WIDTH rather than splitting into title/quote columns, the name
   * is the church's own in serif INK rather than a 16px brand-blue label, and the
   * block is brand-tinted where a step is a plain panel. The steps below it keep
   * matching next steps exactly, which is still right — those two ARE comparable
   * lists, and that was never the thing that read wrong.
   */
  pathwayHead:
    "rounded-lg border border-lead-brand/35 bg-lead-brand/[0.05] px-4 py-3",
  pathwayCaption: "font-mono text-[10px] font-bold tracking-[0.14em] text-lead-brand uppercase",
  pathwayName: "mt-1 font-serif text-[21px] leading-snug font-semibold text-lead-ink",
  pathwayFinding: "font-serif text-[15px] leading-relaxed text-lead-ink",

  /* ── shared item bits ── */
  rank: "font-mono text-[11px] text-lead-ink2 tabular-nums",
  rankFirst: "font-mono text-[11px] font-bold text-lead-brand tabular-nums",
  kindLabel: H,
  contactName: "text-[16px] leading-snug font-semibold text-lead-brand",
  contactTitle: "text-[12.5px] text-lead-ink2",
  contactEmail: "font-mono text-[13px] break-all text-lead-link",
  contactValue: "text-[14px] text-lead-ink",

  /* ── flags ── */
  flagChip: "rounded px-1.5 py-px font-mono text-[9px] leading-[15px]",
  flagTone: {
    // Through `chipClass`, not hand-spelled. It appends the 45° hatch for
    // `unver` — the colour-blind carrier that distinguishes "we have a signal we
    // cannot stand behind" from "we never measured this", since slate and olive
    // are close for the ~8% of men with red-green CVD.
    unk: `${chipClass("unk")} text-lead-bg`,
    unver: `${chipClass("unver")} text-lead-bg`,
    plain: "border border-lead-line text-lead-ink2",
  } as Record<CardFlagTone, string>,

  /* ── add form ── */
  addForm: "mt-3 rounded-lg border border-dashed border-lead-brand/60 p-3",
  addInput:
    "w-full rounded-md border border-lead-line bg-lead-bg px-2.5 py-1.5 text-[13px] text-lead-ink",
  addSubmit: "rounded-md bg-lead-brand px-3 py-1.5 font-mono text-[11px] font-semibold text-white",
  addCancel: "font-mono text-[11px] text-lead-ink2 hover:text-lead-ink",
  addNote: "ml-auto font-mono text-[10px] text-lead-brand",

  /* ── EditableText ── */
  editEditing: "rounded-md border border-lead-brand bg-lead-bg text-lead-ink",
  editResting: "hover:bg-lead-panel2",

  /* ── attribution ──
     Only `edited` and `user` ever render now; see `parts.tsx`. */
  attribution: {
    base: "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 font-mono text-[10px]",
    cited: "text-lead-ink2",
    uncited: "text-lead-ink2 opacity-70",
    edited: "text-lead-warn-ink",
    user: "text-lead-brand",
    generated: "text-lead-warn-ink",
    verified: "rounded bg-lead-panel2 px-1.5 py-px",
    link: "underline decoration-dotted underline-offset-2 hover:text-lead-link",
    revert: "underline underline-offset-2 hover:text-lead-ink",
  },

  exportBar: {
    box: "mt-10 rounded-xl border border-lead-line bg-lead-panel px-5 py-4",
    label: "flex cursor-pointer items-start gap-2.5 text-[13px] text-lead-ink",
    accent: "accent-[var(--lead-brand)]",
    button: "rounded-md bg-lead-brand px-4 py-2 font-mono text-xs text-white",
    note: "font-mono text-[10px] leading-relaxed text-lead-ink2",
  },
};

export type Skin = typeof SKIN;
