"use client";

import { memo } from "react";
import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { EngineCtx, IndexRow } from "@/lib/leads/engine/types";
import { favFmt } from "@/lib/leads/engine/favor";
import { decodeEntities } from "@/lib/leads/engine/text";
import type { MarkKind, RowTint } from "@/lib/leads/client/state";
import type { MembershipRef } from "@/lib/leads/engine/group-types";
import { LogoTile } from "./LogoTile";
import { CrucialTiles } from "./CrucialTiles";
import { ContactRow } from "./ContactRow";
import { VisitButton } from "./VisitButton";

const TINT_CLASS: Record<RowTint, string> = {
  issue: "lead-tint-issue",
  // Renamed, not restyled. The wash still runs ~2x the others for the reason the
  // CSS gives: it is the queue, and "which ones did I pick?" has to be
  // answerable from across the room. The difference now is that the queue is real.
  collecting: "lead-tint-goodlead",
  exported: "lead-tint-exported",
  star: "lead-tint-star",
};

/**
 * The edge rail's band per state — SOLID, where the wash is 13–26%.
 *
 * The wash has to sit under 14px text and stay readable, which is what keeps it
 * pale; a 4px band carries no text and can therefore be the actual colour. That
 * is the whole reason a second channel exists rather than the row simply blending
 * its washes: three transparent washes stacked average out to a muddy brown that
 * names none of the three.
 */
const BAND_CLASS: Record<RowTint, string> = {
  issue: "bg-lead-bad",
  collecting: "bg-lead-good",
  exported: "bg-lead-dl",
  star: "bg-lead-warn",
};

const BAND_LABEL: Record<RowTint, string> = {
  issue: "issue flagged",
  collecting: "in this batch",
  exported: "already sent",
  star: "starred",
};

/**
 * One band per state the row is in, stacked down the left edge.
 *
 * `title` rather than a legend: four colours is under the count where a key would
 * earn its space, and the bands sit beside the very controls that set them — the
 * ★ that made the amber one is 6px to the right of it.
 */
function TintRail({ tintKey }: { tintKey: string }) {
  const tints = tintKey ? (tintKey.split(" ") as RowTint[]) : [];
  if (tints.length === 0) return null;
  return (
    <span
      aria-hidden
      title={tints.map((t) => BAND_LABEL[t]).join(" · ")}
      // Inside the row's own 14px left padding, so it never crowds the ★/🐞 rail,
      // and radius-matched to `ROW_CLASS`'s `rounded-lg` so it does not square off
      // a rounded corner.
      className="absolute inset-y-0 left-0 z-[1] flex w-[4px] flex-col overflow-hidden rounded-l-lg"
    >
      {tints.map((t) => (
        <span key={t} className={`flex-1 ${BAND_CLASS[t]}`} />
      ))}
    </span>
  );
}

interface Props {
  row: IndexRow;
  view: ChurchView;
  ctx: EngineCtx;
  score: number;
  base: number;
  /** The dominant state — the row's background wash. `rowTints()[0]`. */
  tint: RowTint | null;
  /**
   * EVERY state the row is in, drawn as bands down the left edge. `tint` alone
   * could not say "starred AND flagged", and a click that changes nothing on
   * screen reads as a click that was lost.
   *
   * A SPACE-JOINED STRING, NOT AN ARRAY, and that is about `memo()` rather than
   * about taste. A fresh array every render compares unequal by identity, so it
   * defeated the memo on all ~120 visible rows — one star click re-rendered every
   * logo tile, verdict grid and contact row on screen. A string compares by value.
   */
  tintKey: string;
  /** Primitives for the same reason — an object literal is a new object. */
  star: boolean;
  issue: boolean;
  downloaded: boolean;
  /** In the batch currently being collected into. */
  collecting: boolean;
  /** Its name, for the ✆ tooltip. */
  batchName: string;
  /** Batches OTHER than the open one — "collected Aug 1". */
  earlier: readonly MembershipRef[];
  onOpen: (id: string) => void;
  onToggleMark: (kind: MarkKind, id: string) => void;
  onToggleCollect: (id: string) => void;
}

function MarkButton({
  glyph,
  on,
  label,
  onClick,
  activeClass,
  size,
  font = "lead-glyph",
}: {
  glyph: string;
  on: boolean;
  label: string;
  onClick: () => void;
  activeClass: string;
  size: string;
  font?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      // Unset marks are drawn in muted INK, not in the line colour. The line
      // colour is near-invisible against the panel for a thin-stroke glyph —
      // ★ survives it because it is a filled shape, ✆ does not — and a control
      // nobody can see is a control nobody clicks.
      className={`${font} leading-none transition-opacity ${size} ${
        on ? `${activeClass} opacity-100` : "text-lead-ink2 opacity-45 hover:opacity-100"
      }`}
    >
      {glyph}
    </button>
  );
}

/**
 * The row's own classes, exported so `/leads/audit` can assert on the string
 * that actually ships rather than on a copy of it.
 *
 * HOVER DRAWS A BORDER AND NOTHING ELSE.
 *
 * It used to end `hover:bg-lead-panel`, which repainted the row background — so
 * pointing at a good lead ERASED the green wash that said it was one. The tints
 * are the only thing on the row carrying mark state, and a hover affordance may
 * not be allowed to overwrite state. An inset outline changes no colour and
 * reserves no space, so nothing reflows either.
 */
export const ROW_CLASS =
  "relative grid cursor-pointer grid-cols-[44px_1fr_minmax(240px,380px)] items-center gap-4" +
  " rounded-lg border-b border-lead-line py-3 pr-[30px] pl-3.5" +
  " outline-offset-[-2px] outline-transparent transition-[outline-color]" +
  " hover:outline-2 hover:outline-lead-brand max-[620px]:grid-cols-[44px_1fr]";

/**
 * The slogan line, and the two ways it can be absent.
 *
 * Same three-way split the dossier makes, so the list and the dossier cannot
 * tell a reader different things about the same church.
 */
function Slogan({ row }: { row: IndexRow }) {
  const slogan = decodeEntities(row.sl ?? "").trim();

  if (slogan) {
    return (
      <p className="mt-1.5 truncate text-[13px] leading-tight italic text-lead-ink2">
        “{slogan}”
      </p>
    );
  }

  return (
    <p className="mt-1.5 truncate text-[12.5px] leading-tight text-lead-ink2 opacity-60">
      Couldn&rsquo;t find slogan
    </p>
  );
}

function LeadRowInner({
  row,
  view,
  ctx,
  score,
  base,
  tint,
  tintKey,
  star,
  issue,
  downloaded,
  collecting,
  batchName,
  earlier,
  onOpen,
  onToggleMark,
  onToggleCollect,
}: Props) {
  const sub = [row.rg, view.platformLine, row.ts && `scraped ${row.ts}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={() => onOpen(row.id)}
      className={`${ROW_CLASS} ${tint ? TINT_CLASS[tint] : ""}`}
    >
      <TintRail tintKey={tintKey} />
      {/* ── marks ──
          Star and issue in a boxed rail; the green telephone BELOW the box in
          its own control, deliberately separated because it is the one mark
          that DOES something — it is the export queue. Text glyphs, never
          emoji images: an emoji carries baked-in colour and can neither turn
          green when set nor grey out when unset. */}
      <div className="flex flex-col items-stretch gap-[7px]">
        <div className="flex flex-col items-center gap-2.5 rounded-xl border border-lead-line bg-lead-panel px-[5px] py-2.5">
          <MarkButton
            glyph="★"
            on={star}
            label={star ? "Starred" : "Star this church"}
            onClick={() => onToggleMark("star", row.id)}
            activeClass="text-lead-warn"
            size="text-[22px]"
          />
          <MarkButton
            glyph="🐞"
            on={issue}
            label={issue ? "Issue flagged" : "Flag a data issue"}
            onClick={() => onToggleMark("issue", row.id)}
            // Muted by OPACITY, not by `grayscale`. Every other mark is muted by
            // ink colour, which a colour emoji cannot take — and greyscaling it
            // made the one red control on the row read as a dead grey blob. A
            // dimmed red bug still says "bug"; a grey one says "disabled".
            //
            // NO BOX ON THE SET STATE. It used to take `bg-lead-bad/20` plus
            // `rounded-md px-1`, which materialised a red rectangle out of
            // nothing — wider than tall, with horizontal-only padding, hugging
            // the glyph. The star sets no box because it only changes ink; ✆
            // reads fine because it is ALWAYS a box and pressing it merely
            // recolours one. This was the only control that conjured a box, and
            // it looked like a rendering fault.
            //
            // The signal did not need it: a flagged row already takes
            // `lead-tint-issue`, a red wash across its full width (see
            // TINT_CLASS above). The button going from dim to vivid on a row
            // that has just turned red is not a subtle difference.
            activeClass="opacity-100"
            size="text-[19px]"
            // The ONE mark that must not use `lead-glyph`: that stack reaches
            // Segoe UI Symbol's monochrome U+1F41E and the bug came out white.
            font="lead-emoji"
          />
        </div>
        {/* ── ✆ collect ──
            The one control that DOES something, and now it finally does: it puts
            the church in the open batch. It used to write a `goodlead` mark
            described as "the export queue" — but nothing ever wrote the export
            log, so that queue was a mark pretending to be a destination.

            ONE CLICK, ONE CHURCH. It briefly carried a shift-click range as well,
            which is why the checkbox went; the range is gone now too, by owner's
            decision — see `onToggleCollect` in `LeadConsole`. There is still only
            one control here, and now it does only one thing. */}
        <button
          type="button"
          title={
            collecting
              ? `In ${batchName || "this batch"} — click to take it out`
              : "Collect into the current batch"
          }
          aria-label={collecting ? "Remove from the batch" : "Collect into the batch"}
          aria-pressed={collecting}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollect(row.id);
          }}
          className={`lead-glyph flex items-center justify-center rounded-xl border px-1 py-1.5 text-2xl leading-none transition-colors ${
            collecting
              ? "border-lead-good bg-lead-good/20 text-lead-good opacity-100"
              : "border-lead-line bg-lead-panel text-lead-ink2 opacity-50 hover:text-lead-good hover:opacity-100"
          }`}
        >
          ✆
        </button>
      </div>

      {/* ── who ── */}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <LogoTile row={row} />
          <div className="truncate font-serif text-[19px] leading-tight font-semibold tracking-tight text-lead-ink">
            {/* 3 of 134 churches have no resolved name. The row still renders
                completely — hiding it would turn a small gap in our data into
                an invisible church. */}
            {row.n || "(unnamed)"}
            {row.nw && (
              <span className="ml-2 align-[2px] rounded-full border border-lead-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wide text-lead-brand uppercase">
                {row.nw}
              </span>
            )}
          </div>
          <span
            title="favor score — the sum of your tuned points, over the smart baseline"
            className="ml-auto shrink-0 rounded-md border border-lead-line bg-lead-panel2 px-2 py-0.5 font-mono text-sm leading-snug font-bold text-lead-ink"
          >
            {favFmt(score)}
            <i className="text-[11px] font-medium not-italic text-lead-ink2">/{favFmt(base)}</i>
          </span>
        </div>
        {/* ── slogan ──
            ONE ABSENT STATE IN THE UI, TWO IN THE DATA. The record still
            distinguishes "we read the site and there is none" from "we only
            read the homepage" (`slogan.ss`), and the engine and its tests still
            defend that distinction — but the console no longer surfaces it.
            Owner's call: "inner pages never read" is pipeline vocabulary, and a
            rep reading a church card has no use for it.

            It renders even when empty, in muted ink, because a church with no
            slogan should stay visible while scanning rather than leaving a hole
            where every other row has a line. */}
        <Slogan row={row} />

        {sub && (
          <div className="mt-2 truncate font-mono text-[11px] text-lead-ink2">{sub}</div>
        )}

        {/* ── already collected ──
            The console could not tell you this at all, which is how the same
            church ended up in a second batch a week later. It is deliberately
            quiet and never hides the row: these churches sort to the bottom, and
            a sorted-last row is findable in a way a filtered-out one is not. */}
        {earlier.length > 0 && (
          <div className="mt-1 truncate font-mono text-[10px] text-lead-ink2 opacity-75">
            <span className="mr-1 align-[1px] text-lead-dl">◍</span>
            collected {earlier.map((g) => g.name).join(" · ")}
            {earlier.some((g) => g.status === "exported") && " · exported"}
          </div>
        )}
        {/* Under the identity, not down in the contact strip. See VisitButton. */}
        <VisitButton row={row} />
      </div>

      {/* ── crucial tiles ── */}
      <div className="max-[620px]:hidden">
        <CrucialTiles view={view} ctx={ctx} />
      </div>

      <ContactRow row={row} />

      {/* ── ◎ downloaded ──
          READ-ONLY. Folded from the export log, not settable by hand: "a mark
          you can set yourself stops being evidence." It is the only defence
          against contacting the same church twice. `pointer-events-none` also
          keeps it out of the row's own click target. */}
      {downloaded && (
        <span
          title="already exported"
          className="pointer-events-none absolute top-2 right-2.5 z-[2] text-[17px] leading-none text-lead-dl"
        >
          ◎
        </span>
      )}
    </div>
  );
}

/** 60 rows re-render on every keystroke without this. */
export const LeadRow = memo(LeadRowInner);
