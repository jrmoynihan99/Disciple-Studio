"use client";

import { memo } from "react";
import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { EngineCtx, IndexRow } from "@/lib/leads/engine/types";
import { favFmt } from "@/lib/leads/engine/favor";
import { decodeEntities } from "@/lib/leads/engine/text";
import type { MarkKind, RowTint } from "@/lib/leads/client/state";
import { LogoTile } from "./LogoTile";
import { CrucialTiles } from "./CrucialTiles";
import { ContactRow } from "./ContactRow";
import { VisitButton } from "./VisitButton";

const TINT_CLASS: Record<RowTint, string> = {
  issue: "lead-tint-issue",
  goodlead: "lead-tint-goodlead",
  exported: "lead-tint-exported",
  star: "lead-tint-star",
};

interface Props {
  row: IndexRow;
  view: ChurchView;
  ctx: EngineCtx;
  score: number;
  base: number;
  tint: RowTint | null;
  marks: { star: boolean; issue: boolean; goodlead: boolean; downloaded: boolean };
  selected: boolean;
  onOpen: (id: string) => void;
  onToggleMark: (kind: MarkKind, id: string) => void;
  /** `shift` extends from the last click, the way a file list does. */
  onToggleSelect: (id: string, shift: boolean) => void;
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

  if (row.ss === "homepage_only") {
    return (
      <p
        title="Only the homepage was read for branding; inner pages such as /about were not fetched."
        className="mt-1.5 truncate text-[12.5px] leading-tight text-lead-ink2 opacity-60"
      >
        No slogan on the homepage{" "}
        <span className="rounded bg-lead-unk px-1.5 align-[1px] font-mono text-[9px] text-lead-bg not-italic">
          inner pages not read
        </span>
      </p>
    );
  }

  return (
    <p className="mt-1.5 truncate text-[12.5px] leading-tight text-lead-ink2 opacity-60">
      No slogan found
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
  marks,
  selected,
  onOpen,
  onToggleMark,
  onToggleSelect,
}: Props) {
  const sub = [row.rg, view.platformLine, row.ts && `scraped ${row.ts}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={() => onOpen(row.id)}
      // Selection shows as an outline, never as a background: the tints are the
      // only thing carrying mark state and a selection wash would erase them,
      // which is the same bug hover had.
      className={`${ROW_CLASS} ${tint ? TINT_CLASS[tint] : ""} ${
        selected ? "outline-2 outline-lead-brand" : ""
      }`}
    >
      {/* ── marks ──
          Star and issue in a boxed rail; the green telephone BELOW the box in
          its own control, deliberately separated because it is the one mark
          that DOES something — it is the export queue. Text glyphs, never
          emoji images: an emoji carries baked-in colour and can neither turn
          green when set nor grey out when unset. */}
      <div className="flex flex-col items-stretch gap-[7px]">
        {/* ── selection ──
            Selecting is not marking. A mark is a judgement about the church that
            outlives the session; this is "these ones, now", and it lives only in
            component state. It rides in the existing mark column rather than
            adding a grid track, so no row geometry changes. */}
        <label
          title="Select for a group"
          onClick={(e) => e.stopPropagation()}
          className="flex cursor-pointer items-center justify-center rounded-lg border border-lead-line bg-lead-panel py-1.5"
        >
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Select ${row.n || "this church"}`}
            onClick={(e) => {
              // The row itself is a click target; without this, selecting also
              // opens the dossier.
              e.stopPropagation();
              onToggleSelect(row.id, e.shiftKey);
            }}
            onChange={() => {}}
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--lead-brand)]"
          />
        </label>
        <div className="flex flex-col items-center gap-2.5 rounded-xl border border-lead-line bg-lead-panel px-[5px] py-2.5">
          <MarkButton
            glyph="★"
            on={marks.star}
            label={marks.star ? "Starred" : "Star this church"}
            onClick={() => onToggleMark("star", row.id)}
            activeClass="text-lead-warn"
            size="text-[22px]"
          />
          <MarkButton
            glyph="🐞"
            on={marks.issue}
            label={marks.issue ? "Issue flagged" : "Flag a data issue"}
            onClick={() => onToggleMark("issue", row.id)}
            // Muted by OPACITY, not by `grayscale`. Every other mark is muted by
            // ink colour, which a colour emoji cannot take — and greyscaling it
            // made the one red control on the row read as a dead grey blob. A
            // dimmed red bug still says "bug"; a grey one says "disabled".
            // Set state also takes a red wash, the way ✆ takes a green one.
            // Opacity alone is too weak a difference for the one mark whose
            // glyph cannot change colour.
            activeClass="bg-lead-bad/20"
            size="text-[19px] rounded-md px-1"
            // The ONE mark that must not use `lead-glyph`: that stack reaches
            // Segoe UI Symbol's monochrome U+1F41E and the bug came out white.
            font="lead-emoji"
          />
        </div>
        <button
          type="button"
          title={marks.goodlead ? "In the export queue" : "Mark as a good lead (export queue)"}
          aria-pressed={marks.goodlead}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMark("goodlead", row.id);
          }}
          className={`lead-glyph flex items-center justify-center rounded-xl border px-1 py-1.5 text-2xl leading-none transition-colors ${
            marks.goodlead
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
            THREE STATES, NOT TWO. "We looked at the homepage and found none"
            and "we never opened the inner pages" are different facts, and the
            second is not evidence of absence — /about is where a slogan usually
            lives. Collapsing them into one "no slogan found" would assert
            something we did not check.

            It renders even when empty, in muted ink, because a church with no
            slogan and a church we have not finished reading should both be
            visible while scanning rather than silently identical to each other. */}
        <Slogan row={row} />

        {sub && (
          <div className="mt-2 truncate font-mono text-[11px] text-lead-ink2">{sub}</div>
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
      {marks.downloaded && (
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
