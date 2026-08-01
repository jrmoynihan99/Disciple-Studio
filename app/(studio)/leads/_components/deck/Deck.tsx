"use client";

import type { VerdictState } from "@/lib/leads/engine/types";
import type { Summary, SortKey } from "@/lib/leads/engine/filter";
import { SORT_OPTS, VERDICT_WORD } from "@/lib/leads/engine/labels";
import { VALID_STATES } from "@/lib/leads/engine/types";
import { chipClass } from "../verdict";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * The sticky deck: the count you are steering by, the favor histogram, the sort,
 * and the legend.
 */
export function Deck({
  summary,
  sort,
  onSort,
  bucket,
  onBucket,
  newFirst,
  onNewFirst,
}: {
  summary: Summary;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  bucket: number | null;
  onBucket: (b: number | null) => void;
  newFirst: boolean;
  onNewFirst: (v: boolean) => void;
}) {
  // The axis comes from the FULL dataset, not the filtered rows, so the bars do
  // not rescale while the user is filtering. This matters more than it sounds:
  // a rescaling histogram makes filtering feel like the data is changing.
  const peak = Math.max(1, ...summary.dist);

  return (
    // Sticks below the header for the same reason the rail does — at `top-0` it
    // pinned into the header's band and was covered by it, so the count and the
    // histogram you steer by disappeared the moment you scrolled.
    <div className="sticky top-[var(--lead-header-h)] z-10 border-b border-lead-line bg-lead-bg pt-1.5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="font-serif">
          <b className="text-3xl font-semibold text-lead-ink">{fmt(summary.n)}</b>
          <span className="ml-1.5 font-mono text-xs text-lead-ink2">
            / {fmt(summary.total)} churches
          </span>
        </div>

        <span className="self-center font-mono text-[10px] text-lead-ink2">Favor →</span>

        <div className="my-4 flex h-11 items-end gap-[3px]">
          {summary.dist.map((n, i) => (
            <button
              key={i}
              type="button"
              // Click a bar to filter to it; click again to clear.
              onClick={() => onBucket(bucket === i ? null : i)}
              title={`${fmt(n)} ${n === 1 ? "church" : "churches"} at favor ${i}`}
              aria-pressed={bucket === i}
              style={{ height: `${Math.max(2, (n / peak) * 44)}px` }}
              className={`relative w-[22px] rounded-t-[3px] bg-lead-good transition-opacity ${
                bucket === i
                  ? "opacity-100 outline-2 outline-offset-1 outline-lead-ink"
                  : "opacity-85 hover:opacity-100"
              }`}
            >
              <span className="absolute -top-4 right-0 left-0 text-center font-mono text-[9px] text-lead-ink2">
                {n || ""}
              </span>
              <span className="absolute -bottom-4 right-0 left-0 text-center font-mono text-[9px] text-lead-ink2">
                {i}
              </span>
            </button>
          ))}
        </div>

        {/* ── new first ──
            The daily job is the next twenty NEW churches, so the ones already
            collected sort last. Never hidden, and the count is always on screen:
            a row you cannot find is worse than a row further down. */}
        <label
          title="Churches already collected in an earlier batch sort to the bottom. They are never hidden."
          className="ml-auto flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-lead-ink2"
        >
          <input
            type="checkbox"
            checked={newFirst}
            onChange={(e) => onNewFirst(e.target.checked)}
            className="accent-[var(--lead-brand)]"
          />
          New first
          {summary.collected > 0 && (
            <span className="text-lead-dl">· {fmt(summary.collected)} collected</span>
          )}
        </label>

        <div>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            aria-label="Sort"
            className="rounded-md border border-lead-line bg-lead-panel px-2 py-1.5 font-mono text-xs text-lead-ink"
          >
            {SORT_OPTS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* The legend's swatches use the CHIP fills, because those are the colours
          the chips actually are — otherwise the key lies about the table. */}
      <div className="my-1.5 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[10.5px] text-lead-ink2">
        {VALID_STATES.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <i className={`inline-block size-2.5 rounded-[3px] ${chipClass(s as VerdictState)}`} />
            {VERDICT_WORD[s as VerdictState]}
          </span>
        ))}
      </div>
    </div>
  );
}
