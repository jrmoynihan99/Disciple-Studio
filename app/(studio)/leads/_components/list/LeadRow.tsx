"use client";

import { memo } from "react";
import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { EngineCtx, IndexRow } from "@/lib/leads/engine/types";
import { favFmt } from "@/lib/leads/engine/favor";
import type { MarkKind, RowTint } from "@/lib/leads/client/state";
import { LogoTile } from "./LogoTile";
import { CrucialTiles } from "./CrucialTiles";
import { ContactRow } from "./ContactRow";

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
  onOpen: (id: string) => void;
  onToggleMark: (kind: MarkKind, id: string) => void;
}

function MarkButton({
  glyph,
  on,
  label,
  onClick,
  activeClass,
  size,
}: {
  glyph: string;
  on: boolean;
  label: string;
  onClick: () => void;
  activeClass: string;
  size: string;
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
      className={`lead-glyph leading-none transition-opacity ${size} ${
        on ? `${activeClass} opacity-100` : "text-lead-ink2 opacity-45 hover:opacity-100"
      }`}
    >
      {glyph}
    </button>
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
  onOpen,
  onToggleMark,
}: Props) {
  const sub = [row.rg, view.platformLine, row.ts && `scraped ${row.ts}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={() => onOpen(row.id)}
      className={`relative grid cursor-pointer grid-cols-[44px_1fr_minmax(240px,380px)] items-center gap-4 rounded-lg border-b border-lead-line py-3 pr-[30px] pl-3.5 transition-colors hover:bg-lead-panel max-[620px]:grid-cols-[44px_1fr] ${
        tint ? TINT_CLASS[tint] : ""
      }`}
    >
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
            activeClass="grayscale-0"
            size={`text-[19px] ${marks.issue ? "" : "grayscale"}`}
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
        {sub && (
          <div className="mt-3.5 truncate font-mono text-[11px] text-lead-ink2">{sub}</div>
        )}
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
