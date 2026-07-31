"use client";

import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { EngineCtx, VerdictState } from "@/lib/leads/engine/types";
import type { LeadFilters, MarkFilter } from "@/lib/leads/engine/filter";
import { countryValues, networkValues, subdivValues } from "@/lib/leads/engine/filter";
import { subdivLabel } from "@/lib/leads/engine/labels";
import type { LeadState } from "@/lib/leads/client/state";
import { countMarked, pendingIds } from "@/lib/leads/client/state";
import { FacetPanel } from "./FacetPanel";
import { buildFacets, groupOf, GROUP_LABEL, type FacetGroupKey } from "./facets";
import { FavorTuning } from "./FavorTuning";

const MARK_FILTERS: [MarkFilter, string][] = [
  ["star", "Starred only"],
  ["goodlead", "Good leads only"],
  ["issue", "Has Issue only"],
  ["exported", "Downloaded only"],
];

function Counter({ n, label, className }: { n: number; label: string; className: string }) {
  return (
    <div className="min-w-0">
      <div className={`font-serif text-xl leading-none font-semibold ${className}`}>{n}</div>
      <div className="mt-0.5 font-mono text-[9px] leading-tight tracking-wide text-lead-ink2 uppercase">
        {label}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="mb-1.5 w-full rounded-md border border-lead-line bg-lead-panel px-2 py-1.5 text-xs text-lead-ink"
      >
        <option value="">{label}: any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Rail({
  views,
  narrowed,
  ctx,
  filters,
  setFilters,
  state,
  onExport,
  onOpenHistory,
  onResetFilters,
  onRecolour,
  onFavorChange,
}: {
  views: readonly ChurchView[];
  narrowed: readonly ChurchView[];
  ctx: EngineCtx;
  filters: LeadFilters;
  setFilters: (f: LeadFilters) => void;
  state: LeadState;
  onExport: () => void;
  onOpenHistory: () => void;
  onResetFilters: () => void;
  /** A recolour is shared team config, not a filter — it goes to the state layer. */
  onRecolour: (q: string, answer: string, state: VerdictState | null) => void;
  onFavorChange: (favor: EngineCtx["favor"] | null) => void;
}) {
  const facets = buildFacets(views);
  const countries = countryValues(views);
  const subdivs = subdivValues(views, filters.country);
  const networks = networkValues(views);
  const queue = pendingIds(state);

  const set = (patch: Partial<LeadFilters>) => setFilters({ ...filters, ...patch });

  const toggleValue = (key: string, value: string) => {
    const cur = filters.qsel[key] ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    const qsel = { ...filters.qsel };
    if (next.length) qsel[key] = next;
    else delete qsel[key];
    set({ qsel });
  };

  const group = (g: FacetGroupKey) => facets.filter((f) => groupOf(f.key) === g);

  // Width comes from the grid column (a clamp on the parent), not from a fixed
  // w-* here — two sources for one width is how they drift apart.
  // `scrollbar-gutter: stable` keeps the facet list from shifting sideways when
  // the scrollbar appears and disappears as groups are expanded.
  //
  // It sticks BELOW the header and is exactly the height left over, so it can
  // never reach into the header's band. It used to be `top-0 h-screen z-40`,
  // which put a full-height rail over an opaque sticky header — so scrolling
  // slid the filters across the wordmark. Lowering z alone would have hidden the
  // rail's top 64px behind the header instead, which is the same bug wearing a
  // different hat.
  return (
    <aside className="sticky top-[var(--lead-header-h)] z-20 h-[calc(100dvh_-_var(--lead-header-h))] w-full overflow-y-auto border-r border-lead-line px-4 pt-4 pb-20 [scrollbar-gutter:stable] max-[1000px]:static max-[1000px]:h-auto max-[1000px]:border-r-0 max-[1000px]:border-b">
      {/* ── mark tray ── */}
      <div className="rounded-xl border border-lead-line bg-lead-panel p-3">
        <div className="mb-2.5 grid grid-cols-2 gap-x-2 gap-y-2">
          <Counter n={countMarked(state, "star")} label="Starred" className="text-lead-brand" />
          <Counter n={queue.length} label="Good leads" className="text-lead-good" />
          <Counter n={countMarked(state, "issue")} label="Issue" className="text-lead-bad" />
          <Counter
            n={Object.keys(state.lastExportedAt).length}
            label="Downloaded"
            className="text-lead-dl"
          />
        </div>

        {MARK_FILTERS.map(([kind, label]) => (
          <label
            key={kind}
            className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-lead-ink2"
          >
            <input
              type="checkbox"
              checked={filters.marks[kind]}
              onChange={(e) => set({ marks: { ...filters.marks, [kind]: e.target.checked } })}
            />
            {label}
          </label>
        ))}

        <div className="mt-2.5 flex gap-1.5">
          <button
            type="button"
            onClick={onExport}
            disabled={queue.length === 0}
            className="flex-1 rounded-md border border-lead-line bg-lead-bg px-2 py-1.5 font-mono text-[11px] text-lead-ink disabled:opacity-45"
          >
            ↓ Export good leads ({queue.length})
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-md border border-lead-line bg-lead-bg px-2 py-1.5 font-mono text-[11px] text-lead-ink"
          >
            History
          </button>
        </div>

        {/* Say WHY the button is disabled, rather than leaving a dead control. */}
        {queue.length === 0 && (
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-lead-ink2">
            Mark churches with ✆ to build an export batch. The export sends the
            good-lead set, never the filtered view.
          </p>
        )}
      </div>

      {/* ── region cascade ── */}
      <section className="mt-4">
        <h4 className="mb-2 font-mono text-[10px] font-bold tracking-widest text-lead-ink2 uppercase">
          Region
        </h4>
        <Select
          label="country"
          value={filters.country}
          options={countries}
          onChange={(country) => set({ country, subdiv: "" })}
        />
        {/* The middle select relabels itself per country — the dropdown must not
            offer Canadians a "state" — and HIDES ENTIRELY where the churches of
            a country carry no subdivision codes. */}
        {subdivs.length > 0 && (
          <Select
            label={subdivLabel(filters.country)}
            value={filters.subdiv}
            options={subdivs}
            onChange={(subdiv) => set({ subdiv })}
          />
        )}
        <Select
          label="network"
          value={filters.network}
          options={networks}
          onChange={(network) => set({ network })}
        />
      </section>

      <FavorTuning ctx={ctx} filters={filters} setFilters={set} onFavorChange={onFavorChange} />

      {/* ── facets ── */}
      {(["core", "appweb", "rest"] as const).map((g) => (
        <section key={g} className="mt-4">
          <h4 className="mb-2 border-b border-lead-line pb-1.5 font-mono text-[10px] font-bold tracking-widest text-lead-ink2 uppercase">
            {GROUP_LABEL[g]}
          </h4>

          {g === "core" && (
            <div className="mb-2 flex gap-1.5">
              <input
                type="number"
                placeholder="staff min"
                value={filters.pmin ?? ""}
                onChange={(e) => set({ pmin: e.target.value === "" ? null : +e.target.value })}
                className="w-full rounded-md border border-lead-line bg-lead-panel px-2 py-1.5 text-xs text-lead-ink"
              />
              <input
                type="number"
                placeholder="staff max"
                value={filters.pmax ?? ""}
                onChange={(e) => set({ pmax: e.target.value === "" ? null : +e.target.value })}
                className="w-full rounded-md border border-lead-line bg-lead-panel px-2 py-1.5 text-xs text-lead-ink"
              />
            </div>
          )}

          {group(g).map((f) => (
            <FacetPanel
              key={f.key}
              facet={f}
              views={narrowed}
              allViews={views}
              ctx={ctx}
              selected={filters.qsel[f.key] ?? []}
              onToggleValue={(v) => toggleValue(f.key, v)}
              onRecolour={(answer, st) => onRecolour(f.key, answer, st)}
            />
          ))}
        </section>
      ))}

      <button
        type="button"
        onClick={onResetFilters}
        className="mt-3 w-full rounded-md border border-lead-line py-1.5 font-mono text-xs text-lead-ink2 hover:text-lead-ink"
      >
        reset all filters
      </button>
    </aside>
  );
}
