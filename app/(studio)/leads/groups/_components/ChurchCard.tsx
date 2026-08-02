"use client";

import { memo, useState } from "react";
import { logoPlate, PLATE_CLASS } from "@/lib/leads/engine/logo";
import { hostOf } from "@/lib/leads/engine/url";
import { cardFlags, type CardFlag } from "@/lib/leads/engine/group";
import { exportContacts } from "@/lib/leads/engine/contacts";
import { PATH } from "@/lib/leads/engine/group-types";
import type {
  GroupOp,
  ResolvedCard,
  ResolvedPathwayStep,
  ResolvedStep,
  Voice,
} from "@/lib/leads/engine/group-types";
import { newAddedId } from "@/lib/leads/client/useGroups";
import { chipClass } from "../../_components/verdict";
import { SafeLink } from "../../_components/SafeLink";
import { AttributionLine } from "./Attribution";
import { EditableText } from "./EditableText";

/**
 * One church, across the page rather than down it.
 *
 * This used to be a tall card in an 880px column — one church was a screen and
 * a half, and reviewing twenty meant thirty screens of scrolling. The job is to
 * skim twenty and notice the one that is wrong, and a stack of tall cards is the
 * worst possible shape for that: every card puts the slogan at a different
 * height, so the eye has to re-find each field before it can judge it.
 *
 * Four aligned columns fix that. Every slogan lands in one vertical strip and
 * every quote block in another, so a bad one stops being something you have to
 * read for and becomes something that looks different from its neighbours.
 *
 * It is still not a console row. The console is built for scanning fourteen
 * thousand churches at a glance; this is built for reading twenty carefully, so
 * the church's own voice keeps its serif and every claim keeps the provenance
 * line under it. Only the arrangement changed.
 */

interface Props {
  card: ResolvedCard;
  /** 1-based, so a reviewer can say "the sixth one is wrong". */
  index: number;
  stale: boolean;
  departed: boolean;
  /**
   * The ONLY callback. It used to take an `onRemoveChurch` beside this, which
   * every caller supplied as a fresh inline closure — enough on its own to make
   * the `memo()` below do nothing. The card already knows its own `orgId`.
   */
  onOp: (op: GroupOp) => void;
}

const H = "font-mono text-[10px] font-bold tracking-[0.14em] text-lead-ink2 uppercase";

/**
 * A MISSING NAME OR SLOGAN IS THE REVIEWER'S JOB, so it is styled as work to do
 * rather than as an absence to accept.
 *
 * Colour alone was not enough: twenty churches in a vertical strip, and orange
 * italic text at 13px is something the eye slides past. A wash plus a ring gives
 * the empty cell a SHAPE, which is what makes it findable while scrolling.
 *
 * `--lead-warn-ink`, not `--lead-warn` — the verdict hue fails contrast as text
 * on the light theme, and re-tinting it would move a colour that means something
 * about a church. See `leads-theme.css`.
 *
 * Every other empty field on the card keeps the muted default. If everything
 * shouted, nothing would.
 */
const EMPTY_VALUE =
  "rounded-lg bg-lead-warn/[0.08] " +
  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--lead-warn)_35%,transparent)]";
const EMPTY_TEXT = "text-lead-warn-ink not-italic";

/* REVIEW-DESIGN-TEMP — the handful of values the three candidate designs differ
   on. Each reads a `--rv-*` custom property set by `[data-review-design]` in
   `leads-theme.css`, with a fallback so the card renders correctly outside the
   comparison. When a design is chosen, inline the winner's numbers and delete
   these four constants along with the CSS block and `DesignSwitch.tsx`. */
const LOGO_SIZE = "h-[var(--rv-logo,48px)] w-[var(--rv-logo,48px)]";
const NAME_SIZE = "text-[length:var(--rv-name,17px)]";
const CARD_RADIUS = "rounded-[var(--rv-radius,0.75rem)]";
const COL_PAD = "px-[var(--rv-pad-x,0.875rem)] py-[var(--rv-pad-y,0.75rem)]";

/**
 * A church's initials, for the logo plate when there is no logo.
 *
 * Skips the words that every third church shares — "The First Baptist Church of
 * Springfield" reading "TFBCOS" is worse than useless, because it looks the same
 * as its neighbours. Two letters, so it stays a mark rather than a word.
 */
const SKIP = new Set(["the", "of", "at", "a", "and", "church", "chapel", "ministries"]);

function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !SKIP.has(w.toLowerCase()));
  const from = words.length ? words : name.split(/\s+/).filter(Boolean);
  return from
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The sheet's grid, exported so the column headers in `GroupReview` are built
 * from the same string. Two copies of a four-track template drift the first time
 * one is tuned, and a header that has drifted from its columns is worse than no
 * header — it mislabels rather than fails.
 *
 * `gap-px` over a `bg-lead-line` parent draws the dividers. Per-column borders
 * would have to be turned off and back on at each breakpoint, and would draw the
 * wrong edges once the tracks wrap; a background showing through a one-pixel gap
 * is correct in every configuration by construction.
 */
export const SHEET_COLS =
  "grid gap-px bg-lead-line" +
  // WEIGHTED FOR PARITY BETWEEN THE TWO VOICE COLUMNS, and that is a change.
  //
  // These used to be weighted by MEASURED content — next steps ran 700–1200px of
  // text and discipleship ~120px, so next steps got 1.8fr and discipleship 0.85.
  // The cost was that the two columns a reviewer compares directly could not
  // look alike: the same `Claim` at 291px and at 615px wraps its quotes at
  // different points and breaks its chip rows differently, which reads as two
  // different components rather than one.
  //
  // So they are equal now. It is a real trade: only ~4% of churches publish a
  // pathway, so this spends ~240px on a column that is usually empty. Parity
  // between the two won, because comparing them is the job. Reverting is one
  // string, and changes nothing else.
  " grid-cols-[minmax(272px,0.9fr)_minmax(300px,1.55fr)_minmax(300px,1.55fr)_minmax(230px,1fr)]" +
  // The four minimums sum to 1105px + 3 dividers. Keep this breakpoint above
  // that or the sheet overflows in the gap between them.
  " max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1";

/**
 * A column of the sheet. The `bg-lead-panel` on a `gap-px` parent is what leaves
 * the hairline.
 *
 * NO REPEATED COLUMN LABEL. The sticky strip at the top of the page names the
 * four columns once; printing "NEXT STEPS" again in all twenty rows would spend
 * three lines per row saying something position already says, in a layout whose
 * entire purpose is to fit more churches on a screen. What does earn its space
 * is the count — it differs per church, and "0" is a thing you want to catch
 * while skimming.
 */
function Col({
  label,
  count,
  addLabel,
  onAdd,
  className = "",
  children,
}: {
  label: string;
  count?: number;
  addLabel: string;
  onAdd: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-lead-panel ${COL_PAD} ${className}`}>
      <div className="mb-1.5 flex items-baseline gap-2">
        {/* Only below 720px, where the tracks stack and the sticky strip's
            positions stop mapping to anything. Above it the strip names them. */}
        <h3 className={`hidden max-[720px]:block ${H}`}>{label}</h3>
        <span className="font-mono text-[10px] text-lead-ink2 tabular-nums">
          {count == null ? "" : count}
        </span>
        {/* Revealed on row hover. Twenty always-visible "+ add" links read as a
            form to fill in; the page is a proof sheet to check. */}
        <button
          type="button"
          onClick={onAdd}
          className={`ml-auto ${ADD_LINK} opacity-0 transition-opacity group-hover/card:opacity-100 focus:opacity-100`}
        >
          {addLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

/**
 * Flag tones come from the console's one verdict→class mapping, so a flag and a
 * cell painting the same state cannot disagree. `unver` picks up its hatch from
 * `chipClass` automatically — that hatch is the colour-blind carrier, not
 * decoration, and re-spelling the class here is how it would get dropped.
 */
const FLAG_TONE: Record<CardFlag["tone"], string> = {
  unk: `${chipClass("unk")} text-lead-bg`,
  unver: `${chipClass("unver")} text-lead-bg`,
  plain: "border border-lead-line text-lead-ink2",
};

/**
 * Where to look first. Never "this is wrong" — see `cardFlags`, which owns the
 * rule and is tested against it.
 */
function Flags({ flags }: { flags: CardFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {flags.map((f) => (
        <span
          key={f.key}
          data-flag={f.key}
          title={f.title}
          className={`rounded px-1.5 py-px font-mono text-[9px] leading-[15px] ${FLAG_TONE[f.tone]}`}
        >
          {f.label}
        </span>
      ))}
    </div>
  );
}

/** Struck out, not gone: a suppression is a judgement someone can revisit. */
function SuppressShell({
  suppressed,
  provenance,
  onSuppress,
  onRestore,
  onDelete,
  children,
}: {
  suppressed: boolean;
  provenance: "source" | "user";
  onSuppress: () => void;
  onRestore: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-provenance={provenance}
      data-suppressed={suppressed ? "true" : "false"}
      className={`group/item relative rounded-lg border px-2 py-1.5 ${
        suppressed
          ? "border-lead-bad/40 bg-lead-bad/[0.06]"
          : "border-transparent hover:border-lead-line"
      }`}
    >
      <div
        className={
          suppressed
            ? // The red is what says "removed"; the strike is what says it for
              // anyone who cannot see the red.
              "pointer-events-none opacity-45 [text-decoration-line:line-through] [text-decoration-color:var(--lead-bad)]"
            : ""
        }
      >
        {children}
      </div>

      <div className="absolute top-1 right-1 flex items-center gap-2 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
        {suppressed ? (
          // KEEPS ITS WORDS. Everything else here shrank to a glyph for the
          // narrow columns, but this is the way back from a destructive-looking
          // action and it has to be readable without hovering to find out.
          <button
            type="button"
            onClick={onRestore}
            className="rounded border border-lead-line bg-lead-panel px-1.5 py-0.5 font-mono text-[10px] text-lead-ink"
          >
            put back
          </button>
        ) : provenance === "source" ? (
          <button
            type="button"
            onClick={onSuppress}
            aria-label="Remove"
            title="Strike this out. It stays here so you can put it back."
            className="rounded border border-lead-line bg-lead-panel px-1 leading-[14px] font-mono text-[11px] text-lead-ink2 hover:text-lead-bad"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            title="Delete. You wrote this, so there is nothing to put back."
            className="rounded border border-lead-line bg-lead-panel px-1 leading-[14px] font-mono text-[11px] text-lead-ink2 hover:text-lead-bad"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A quotation, with the claim it is allowed to make printed underneath.
 *
 * The DOM shape is a contract: `[data-quote]` inside this block, with the
 * attribution as a sibling of that block. The audit walks exactly that
 * relationship to prove no quote ships unattributed, so the nesting here is not
 * free to change even though it looks like plain markup.
 */
function Quote({
  voice,
  ariaLabel,
  onCommit,
  onRevert,
}: {
  voice: Voice;
  ariaLabel: string;
  onCommit: (next: string) => void;
  onRevert: () => void;
}) {
  return (
    <div className="mt-1 border-l-2 border-lead-line pl-2">
      <div data-quote className="font-serif text-[12.5px] leading-snug italic text-lead-ink">
        <EditableText value={voice.text} onCommit={onCommit} multiline ariaLabel={ariaLabel} />
      </div>
      <AttributionLine
        attribution={voice.attribution}
        onRevert={voice.attribution.kind === "edited" ? onRevert : undefined}
      />
    </div>
  );
}

/**
 * ONE CLAIM ABOUT A CHURCH — a named thing, optionally numbered, optionally in
 * the church's own words, optionally quoted.
 *
 * BOTH EVIDENCE COLUMNS RENDER THROUGH THIS, and that is the point. They used to
 * be written twice: a next step was a label with own-term chips and a quote,
 * while a pathway step was an ordinal and a label in an `<ol>`, with the
 * discipleship finding floating above as a bare quote in no container at all.
 * Same kind of assertion, three different shapes, side by side in adjacent
 * columns — so a reviewer comparing "what they offer" against "the order they
 * put it in" had to learn two layouts to read one row.
 *
 * THE ORDINAL IS NOT AN INDEX. It is printed only when the church's own page put
 * a number there; DOM order is not a sequence, and `resolvePathwaySteps` owns
 * that rule. Next steps pass `null` and always will — a category list has no
 * first.
 *
 * THE LABEL'S ATTRIBUTION IS RENDERED ONLY WHEN IT SAYS SOMETHING. An unedited
 * next-step label is `uncited` by construction ("our category") and an unedited
 * pathway label is usually `cited`; printing the former under all eight steps of
 * twenty churches is 160 lines of the same sentence. `cited`, `edited` and
 * `user` always render — those vary per church and are the reason the line
 * exists. Quotes are exempt from this entirely and always carry theirs.
 */
function Claim({
  ordinal,
  label,
  terms,
  quote,
  labelAriaLabel,
  quoteAriaLabel,
  onLabelCommit,
  onLabelRevert,
  onQuoteCommit,
  onQuoteRevert,
}: {
  ordinal: number | null;
  label: Voice;
  terms: readonly string[];
  quote: Voice | null;
  labelAriaLabel: string;
  quoteAriaLabel: string;
  onLabelCommit: (next: string) => void;
  onLabelRevert: () => void;
  onQuoteCommit: (next: string) => void;
  onQuoteRevert: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-1.5 pr-6">
        {ordinal != null && (
          <span className="shrink-0 font-mono text-[11px] text-lead-brand tabular-nums">
            {ordinal}.
          </span>
        )}
        <div className="min-w-0 flex-1 text-[13px] font-medium text-lead-ink">
          <EditableText value={label.text} onCommit={onLabelCommit} ariaLabel={labelAriaLabel} />
        </div>
        {terms.map((t) => (
          // Their words, verbatim and read-only. Editing these would be editing
          // a quotation without the affordances of one.
          <span
            key={t}
            title="the church's own wording"
            className="rounded-full border border-lead-line px-1.5 py-px font-mono text-[9px] text-lead-ink2"
          >
            {t}
          </span>
        ))}
      </div>

      {label.attribution.kind !== "uncited" && (
        <AttributionLine
          attribution={label.attribution}
          onRevert={label.attribution.kind === "edited" ? onLabelRevert : undefined}
        />
      )}

      {quote && (
        <Quote
          voice={quote}
          ariaLabel={quoteAriaLabel}
          onCommit={onQuoteCommit}
          onRevert={onQuoteRevert}
        />
      )}
    </>
  );
}

/**
 * `<ol>` ONLY WHEN THE SOURCE LICENSED A SEQUENCE.
 *
 * To anyone looking at the screen these render identically — the ordinals are
 * printed by `Claim`, not by list markers. To a screen reader they are different
 * claims: "ordered list of 4" says these steps have an order, and where the
 * pathway's basis was page position rather than the church's own numbering, that
 * is a claim we are not entitled to make. `resolvePathwaySteps` decides; this
 * only obeys.
 */
function Numbered({
  numbered,
  className,
  children,
}: {
  numbered: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return numbered ? (
    <ol className={className}>{children}</ol>
  ) : (
    <ul className={className}>{children}</ul>
  );
}

const ADD_LINK =
  "font-mono text-[10px] text-lead-ink2 underline underline-offset-2 hover:text-lead-brand";

/** Absent-not-empty. The prose these carry is the point; do not shorten it. */
function Absent({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10.5px] leading-relaxed text-lead-ink2">{children}</p>;
}

function ChurchCardInner({ card, index, stale, departed, onOp }: Props) {
  const [addingStep, setAddingStep] = useState(false);
  const [addingPathway, setAddingPathway] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  const set = (path: string, base: string) => (value: string) =>
    onOp({ op: "field.set", orgId: card.orgId, path, value, base });
  const revert = (path: string) => () => onOp({ op: "field.revert", orgId: card.orgId, path });
  const suppress = (itemId: string) => () => onOp({ op: "item.suppress", orgId: card.orgId, itemId });
  const restore = (itemId: string) => () => onOp({ op: "item.restore", orgId: card.orgId, itemId });
  const del = (itemId: string) => () => onOp({ op: "item.remove", orgId: card.orgId, itemId });

  const plate = PLATE_CLASS[logoPlate(card.logo?.theme)];
  const touched = card.editedCount > 0 || card.suppressedCount > 0;
  const liveSteps = card.steps.filter((s) => !s.suppressed).length;
  /**
   * WHAT SHIPS, NOT WHAT WE HOLD.
   *
   * The exported package carries at most four contacts, chosen by one channel.
   * Rendering everything the snapshot happens to hold meant a reviewer read six
   * social profiles that would never be sent, and could miss the address that
   * would. `exportContacts` is the single rule both this card and the exporter
   * read — see `lib/leads/engine/contacts.ts`.
   *
   * The count beside the column head is the SHIPPING count for the same reason.
   */
  const shipping = exportContacts(card.contacts);
  const liveContacts = shipping.filter((r) => r.rank !== null).length;

  return (
    <article
      data-church={card.orgId}
      className={`group/card relative mb-3 overflow-hidden border border-lead-line ${CARD_RADIUS} shadow-[var(--rv-card-shadow,none)]`}
    >
      {/* The status rail. Untouched cards look untouched, so what you have
          already been through is visible without reading any of it again. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 z-[1] w-[3px] ${
          card.suppressedCount ? "bg-lead-bad" : touched ? "bg-lead-brand" : "bg-transparent"
        }`}
      />

      {/* The index, in the rail rather than in the grid. Absolute, so it adds no
          grid child and `[data-church] > .grid` still resolves to four tracks —
          which `/leads/audit` asserts. It also now sits at the same y on every
          card instead of drifting with the logo. */}
      <span className="absolute top-3.5 left-1.5 z-[2] font-mono text-[10px] text-lead-ink2 tabular-nums">
        {String(index).padStart(2, "0")}
      </span>

      <button
        type="button"
        onClick={() => onOp({ op: "church.remove", orgId: card.orgId })}
        title="Remove this church from the batch"
        className="absolute top-1.5 right-1.5 z-[2] rounded-md border border-lead-line bg-lead-panel px-2 py-0.5 font-mono text-[10px] text-lead-ink2 opacity-0 transition-opacity group-hover/card:opacity-100 focus:opacity-100 hover:border-lead-bad hover:text-lead-bad"
      >
        remove church
      </button>

      {(stale || departed) && (
        <p className="border-b border-lead-line bg-lead-unk/10 px-4 py-2 pl-5 font-mono text-[10px] leading-relaxed text-lead-ink">
          {departed
            ? "This church is no longer in the dataset. The card below is the only copy we hold, and there is nothing left to re-pull from."
            : "The source record has changed since this was added. The card below is what you froze — it is not being updated."}
        </p>
      )}

      <div className={SHEET_COLS}>
        {/* ── identity ──
            THE LOGO GETS ITS OWN LINE. It used to sit in a flex row beside the
            index and the name, which left the name about 150px of a 272px track
            — and that, not a type decision, is why the church's name was 17px on
            a page whose entire subject is churches. On its own line it has the
            full column.

            The index moved into the absolute status rail. It is two characters
            that were costing ~26px of the narrowest track, it is not a grid
            child there (so `[data-church] > .grid` still resolves to four
            tracks, which the audit asserts), and it now sits in the same place
            on every card rather than drifting with the logo. */}
        <div data-identity className={`bg-lead-panel pl-6 ${COL_PAD}`}>
          <div
            className={`grid ${LOGO_SIZE} place-items-center overflow-hidden rounded-xl ${plate}`}
          >
            {card.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/leads/asset/logos-thumb/${card.logo.sha}.webp`}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              /* INITIALS, NOT A 7px EXPLANATION. The reason used to be printed
                 inside the plate at `text-[7px]`, which is not a readable size —
                 it was there to preserve a real distinction ("none found" vs
                 "found one and rejected it"), but nobody can read it. The
                 distinction now rides on the flag chip below, where it is legible,
                 and the plate shows the church's initials like every other
                 avatar. */
              <span className="font-serif text-[17px] leading-none text-lead-ink2">
                {initialsOf(card.name.text)}
              </span>
            )}
          </div>

          {/* `min-h-[2lh]` on both, so the slogan starts at the same y on every
              card whether the name ran to one line or two. THIS is what keeps
              the columns comparable while the type gets bigger — alignment is a
              claim about where things sit, not about point size, and the old
              layout did not hold it. */}
          <div className="mt-3 min-w-0">
            <div
              className={`min-h-[2lh] font-serif ${NAME_SIZE} leading-tight font-semibold tracking-tight text-lead-ink ${
                card.name.text ? "" : EMPTY_VALUE
              }`}
            >
              <EditableText
                value={card.name.text}
                onCommit={set(PATH.name, card.name.text)}
                ariaLabel="church name"
                placeholder="Couldn't find name"
                emptyClassName={EMPTY_TEXT}
              />
            </div>
            {/* AMBIENT ATTRIBUTIONS ARE NOT RENDERED. An unedited name is
                `uncited` by construction and reads "as published" — the same
                four words under all twenty churches, every time, describing the
                pipeline rather than this church. A constant is not information.

                `cited`, `edited` and `user` always render: those vary per
                church and are the entire reason the line exists. Quotes are
                exempt from this rule and always carry theirs — see `Claim`. */}
            {card.name.attribution.kind !== "uncited" && (
              <AttributionLine
                attribution={card.name.attribution}
                onRevert={card.name.attribution.kind === "edited" ? revert(PATH.name) : undefined}
              />
            )}

            {card.nameOriginal && card.nameOriginal !== card.name.text && (
              // Inline, not its own row. It is a four-word aside about a repair
              // we already made, and it was costing a full line on every card
              // that had one.
              <p className="px-2 font-mono text-[10px] text-lead-ink2">
                was “{card.nameOriginal}”
              </p>
            )}
          </div>

          {/* ── slogan ──
              THE DATA STILL HAS THREE STATES; THE UI NOW SHOWS TWO. `slogan.kind`
              still separates `homepage_only` from `none`, and `resolveSlogan`
              and its tests still defend it — but both absences now read the
              same to the reviewer. "Inner pages were never read" describes our
              crawler, not the church, and this card is what somebody reads
              before writing to them. Owner's call.

              A REAL SLOGAN IS NOT MUTED. It used to render in `text-lead-ink2`
              italic — the same ink as every secondary label on the card — so
              the church's own voice looked like chrome. It is one of the three
              things worth reading here, and it is styled like it. */}
          <div className="mt-2">
            {card.slogan.kind === "slogan" ? (
              <>
                <div className="rv-slogan min-h-[2lh] font-serif leading-snug text-lead-ink">
                  <EditableText
                    value={card.slogan.voice.text}
                    onCommit={set(PATH.slogan, card.slogan.voice.text)}
                    ariaLabel="slogan"
                    multiline
                  />
                </div>
                {/* Same rule: an unedited slogan says "from the site's title"
                    on every card that has one. */}
                {card.slogan.voice.attribution.kind !== "uncited" && (
                  <AttributionLine
                    attribution={card.slogan.voice.attribution}
                    onRevert={
                      card.slogan.voice.attribution.kind === "edited"
                        ? revert(PATH.slogan)
                        : undefined
                    }
                  />
                )}
              </>
            ) : (
              <div className={EMPTY_VALUE}>
                <EditableText
                  value=""
                  onCommit={set(PATH.slogan, "")}
                  ariaLabel="slogan"
                  placeholder="Couldn't find slogan"
                  emptyClassName={EMPTY_TEXT}
                />
              </div>
            )}
          </div>

          {card.churchUrl && (
            <SafeLink
              href={card.churchUrl}
              className="mt-1.5 inline-block px-2 font-mono text-[10.5px] text-lead-link underline underline-offset-2"
            >
              {hostOf(card.churchUrl) || card.churchUrl}
            </SafeLink>
          )}

          <Flags flags={cardFlags(card)} />
        </div>

        {/* ── next steps ── */}
        <Col
          label="Next steps"
          count={card.stepsLooked ? liveSteps : undefined}
          addLabel="+ step"
          onAdd={() => setAddingStep(true)}
        >
          {!card.stepsLooked && (
            <Absent>
              Next-step pages were never read for this church. This is not a list of
              what they lack.
            </Absent>
          )}
          {card.stepsLooked && card.steps.length === 0 && (
            <Absent>We read their next-step pages and found none named.</Absent>
          )}

          <div className="space-y-0.5">
            {card.steps.map((s: ResolvedStep) => (
              <SuppressShell
                key={s.id}
                suppressed={s.suppressed}
                provenance={s.provenance}
                onSuppress={suppress(s.id)}
                onRestore={restore(s.id)}
                onDelete={del(s.id)}
              >
                {/* A category list has no first, so no ordinal — see `Claim`. */}
                <Claim
                  ordinal={null}
                  label={s.label}
                  terms={s.ownTerms}
                  quote={s.quote}
                  labelAriaLabel="step name"
                  quoteAriaLabel="step quote"
                  onLabelCommit={set(PATH.step(s.id, "label"), s.label.text)}
                  onLabelRevert={revert(PATH.step(s.id, "label"))}
                  onQuoteCommit={set(PATH.step(s.id, "quote"), s.quote?.text ?? "")}
                  onQuoteRevert={revert(PATH.step(s.id, "quote"))}
                />
              </SuppressShell>
            ))}
          </div>

          {addingStep && (
            <AddForm
              fields={[
                { key: "label", label: "Step name" },
                { key: "quote", label: "Quote (optional)" },
              ]}
              onCancel={() => setAddingStep(false)}
              onSave={(v) => {
                setAddingStep(false);
                onOp({
                  op: "item.add",
                  orgId: card.orgId,
                  item: {
                    id: newAddedId(),
                    at: Date.now(),
                    kind: "step",
                    label: v.label,
                    quote: v.quote,
                  },
                });
              }}
            />
          )}
        </Col>

        {/* ── discipleship ── */}
        <Col
          label="Discipleship"
          count={card.pathway.steps.length || undefined}
          addLabel="+ step"
          onAdd={() => setAddingPathway(true)}
        >
          {/* THE FINDING IS A CLAIM LIKE ANY OTHER. It used to float above the
              list as a bare quote in no container, with the pathway's name in a
              prose sentence ("The site uses the phrase …") above that — two
              shapes this column had and the next-steps column did not, which is
              most of why the two never looked alike. The name is now the
              column's note, and the finding gets the same box as every step. */}
          {card.pathway.finding && (
            <div className="mb-1">
              <Claim
                ordinal={null}
                label={{ text: card.pathway.name, attribution: { kind: "uncited", note: "" } }}
                terms={[]}
                quote={card.pathway.finding}
                labelAriaLabel="pathway name"
                quoteAriaLabel="discipleship finding"
                onLabelCommit={set(PATH.finding("label"), card.pathway.name)}
                onLabelRevert={revert(PATH.finding("label"))}
                onQuoteCommit={set(PATH.finding("quote"), card.pathway.finding.text)}
                onQuoteRevert={revert(PATH.finding("quote"))}
              />
            </div>
          )}

          {!card.pathway.finding && !card.pathway.name && (
            <Absent>Nothing quotable about discipleship was found on the pages we read.</Absent>
          )}
          {card.pathway.name && card.pathway.steps.length === 0 && (
            <Absent>They name a pathway, but no ordered steps were captured.</Absent>
          )}

          {card.pathway.steps.length > 0 && (
            // `<ol>` only when the source licensed a sequence. To a reader the
            // two render identically; to a screen reader "list of 4" and
            // "ordered list of 4" are different claims, and only one of them is
            // ours to make.
            <Numbered numbered={card.pathway.numbered} className="mt-2 space-y-0.5">
              {card.pathway.steps.map((s: ResolvedPathwayStep) => (
                <li key={s.id}>
                  <SuppressShell
                    suppressed={s.suppressed}
                    provenance={s.provenance}
                    onSuppress={suppress(s.id)}
                    onRestore={restore(s.id)}
                    onDelete={del(s.id)}
                  >
                    <Claim
                      ordinal={s.ordinal}
                      label={s.label}
                      terms={s.ownTerms}
                      quote={s.quote}
                      labelAriaLabel="pathway step"
                      quoteAriaLabel="pathway step quote"
                      onLabelCommit={set(PATH.pathwayStep(s.id, "label"), s.label.text)}
                      onLabelRevert={revert(PATH.pathwayStep(s.id, "label"))}
                      onQuoteCommit={set(PATH.pathwayStep(s.id, "quote"), s.quote?.text ?? "")}
                      onQuoteRevert={revert(PATH.pathwayStep(s.id, "quote"))}
                    />
                  </SuppressShell>
                </li>
              ))}
            </Numbered>
          )}

          {addingPathway && (
            <AddForm
              fields={[
                { key: "label", label: "Step name" },
                { key: "blurb", label: "Note (optional)" },
              ]}
              onCancel={() => setAddingPathway(false)}
              onSave={(v) => {
                setAddingPathway(false);
                onOp({
                  op: "item.add",
                  orgId: card.orgId,
                  item: {
                    id: newAddedId(),
                    at: Date.now(),
                    kind: "pathwayStep",
                    label: v.label,
                    blurb: v.blurb,
                  },
                });
              }}
            />
          )}
        </Col>

        {/* ── contacts ── */}
        <Col
          label="Contacts"
          count={liveContacts}
          addLabel="+ contact"
          onAdd={() => setAddingContact(true)}
        >
          {card.contactNote && (
            <p className="mb-1.5 text-[12.5px] leading-snug text-lead-ink2">{card.contactNote}</p>
          )}
          {shipping.length === 0 && <Absent>No contact details found.</Absent>}

          <div className="space-y-0.5">
            {shipping.map(({ contact: c, rank }) => (
              <SuppressShell
                key={c.id}
                suppressed={c.suppressed}
                provenance={c.provenance}
                onSuppress={suppress(c.id)}
                onRestore={restore(c.id)}
                onDelete={del(c.id)}
              >
                {/* THE ORDER IS THE POINT, so it is on screen rather than
                    implied by position. `rank` is renumbered over the contacts
                    that survived, so the first line always reads 1 — a reviewer
                    should never have to reason about the ones filtered out
                    above it. Rank 1 is the one that gets written to first, and
                    it is the only one drawn in brand ink. */}
                <span
                  aria-hidden="true"
                  title={
                    rank === null
                      ? "struck out — will not be sent"
                      : rank === 1
                        ? "first to contact"
                        : `contact ${rank}`
                  }
                  className={`float-left mt-[3px] mr-1.5 w-4 shrink-0 font-mono text-[10px] tabular-nums ${
                    rank === 1 ? "font-bold text-lead-brand" : "text-lead-ink2"
                  }`}
                >
                  {rank ?? "–"}
                </span>
                {/* THREE SHAPES, NOT TWO.
                    A church address has no name and no job title — it is an
                    address. Giving it the person layout printed "(church
                    address)" and "(no title)" as two empty rows apiece, and a
                    church with six of them spent three hundred pixels saying
                    nothing. It gets the one-line treatment phones already had.

                    A person keeps every field, but name and title share a line:
                    "Jane Doe · Lead Pastor" is one fact about one person, and
                    stacking them cost a row per contact. */}
                {c.kind === "phone" || c.kind === "social" || c.kind === "churchEmail" ? (
                  <div className="flex flex-wrap items-baseline pr-6">
                    <span className={`${H} mr-2 shrink-0`}>
                      {c.kind === "churchEmail" ? "church" : c.network || "phone"}
                    </span>
                    <div
                      className={`min-w-0 flex-1 ${
                        c.kind === "churchEmail"
                          ? "font-mono text-[11.5px] break-all text-lead-link"
                          : "text-[12.5px] text-lead-ink"
                      }`}
                    >
                      <EditableText
                        value={c.kind === "churchEmail" ? c.email : c.value}
                        onCommit={set(
                          PATH.contact(c.id, c.kind === "churchEmail" ? "email" : "value"),
                          c.kind === "churchEmail" ? c.email : c.value,
                        )}
                        ariaLabel={c.kind === "churchEmail" ? "church address" : c.network || "phone"}
                        placeholder={c.kind === "churchEmail" ? "(no address)" : undefined}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pr-6">
                    <div className="flex flex-wrap items-baseline gap-x-1">
                      <div className="text-[13px] font-medium text-lead-ink">
                        <EditableText
                          value={c.name}
                          onCommit={set(PATH.contact(c.id, "name"), c.name)}
                          ariaLabel="contact name"
                          placeholder="(no name)"
                        />
                      </div>
                      <div className="min-w-0 text-[11.5px] text-lead-ink2">
                        <EditableText
                          value={c.title}
                          onCommit={set(PATH.contact(c.id, "title"), c.title)}
                          ariaLabel="contact title"
                          placeholder="(no title)"
                        />
                      </div>
                    </div>
                    <div className="font-mono text-[11.5px] break-all text-lead-link">
                      <EditableText
                        value={c.email}
                        onCommit={set(PATH.contact(c.id, "email"), c.email)}
                        ariaLabel="contact email"
                        placeholder="(no email)"
                      />
                    </div>
                  </div>
                )}
                {c.provenance === "user" ? (
                  <AttributionLine attribution={{ kind: "user" }} />
                ) : c.edited ? (
                  <AttributionLine attribution={{ kind: "edited", wasVerbatim: "" }} />
                ) : null}
              </SuppressShell>
            ))}
          </div>

          {addingContact && (
            <AddForm
              fields={[
                { key: "name", label: "Name" },
                { key: "title", label: "Title" },
                { key: "email", label: "Email" },
              ]}
              onCancel={() => setAddingContact(false)}
              onSave={(v) => {
                setAddingContact(false);
                onOp({
                  op: "item.add",
                  orgId: card.orgId,
                  item: {
                    id: newAddedId(),
                    at: Date.now(),
                    kind: "contact",
                    name: v.name,
                    title: v.title,
                    email: v.email,
                  },
                });
              }}
            />
          )}
        </Col>
      </div>
    </article>
  );
}

/**
 * Every committed keystroke replaces the whole group object, so `GroupReview`
 * re-`resolve()`s all twenty cards. Without this, fixing one typo re-renders
 * nineteen churches that did not change.
 */
export const ChurchCard = memo(ChurchCardInner);

function AddForm({
  fields,
  onSave,
  onCancel,
}: {
  fields: { key: string; label: string }[];
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const filled = (k: string) => values[k] ?? "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!filled(fields[0].key).trim()) return;
        onSave(Object.fromEntries(fields.map((f) => [f.key, filled(f.key)])));
      }}
      className="mt-2 rounded-lg border border-dashed border-lead-brand/60 p-2"
    >
      <div className="space-y-1.5">
        {fields.map((f, i) => (
          <input
            key={f.key}
            autoFocus={i === 0}
            value={filled(f.key)}
            placeholder={f.label}
            aria-label={f.label}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="w-full rounded-md border border-lead-line bg-lead-bg px-2 py-1 text-[12.5px] text-lead-ink"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-lead-brand px-2.5 py-1 font-mono text-[11px] text-white"
        >
          add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-[11px] text-lead-ink2 hover:text-lead-ink"
        >
          cancel
        </button>
        <span className="ml-auto font-mono text-[10px] text-lead-brand">
          will be marked as added by you
        </span>
      </div>
    </form>
  );
}
