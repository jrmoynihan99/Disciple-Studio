"use client";

import Link from "next/link";
import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { ExportGroupSummary } from "@/lib/leads/engine/group-types";
import type { EngineCtx, VerdictState } from "@/lib/leads/engine/types";
import type { LeadFilters, MarkFilter } from "@/lib/leads/engine/filter";
import { countryValues, networkValues, subdivValues } from "@/lib/leads/engine/filter";
import { subdivLabel } from "@/lib/leads/engine/labels";
import type { LeadState } from "@/lib/leads/client/state";
import { countMarked } from "@/lib/leads/client/state";
import { FacetPanel } from "./FacetPanel";
import { buildFacets, groupOf, GROUP_LABEL, type FacetGroupKey } from "./facets";
import { FavorTuning } from "./FavorTuning";

const MARK_FILTERS: [MarkFilter, string][] = [
  ["star", "Starred only"],
  ["collected", "Collected only"],
  ["issue", "Has Issue only"],
  ["exported", "Sent only"],
];

/**
 * ◎ is folded from the export log — "a mark you can set yourself stops being
 * evidence" — and nothing writes that log yet. The control that used to write it
 * was a stub that produced no file, so it was claiming a download that never
 * happened; removing it is right, and saying so is the difference between
 * dormant and rotten.
 */
const DORMANT =
  "Dormant until the export ships. ◎ is folded from the export log, and nothing writes to it yet — it is never settable by hand.";

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
  narrowedFor,
  ctx,
  filters,
  setFilters,
  state,
  groups,
  openBatch,
  collecting,
  onResetFilters,
  onRecolour,
  onFavorChange,
}: {
  views: readonly ChurchView[];
  narrowed: readonly ChurchView[];
  /**
   * Per-facet count sets, for facets that have a selection: the corpus filtered
   * by every OTHER facet, with this one's own choices lifted. Options inside a
   * facet are OR'd, so a facet counting against its own selection would report 0
   * for every option the user did not pick.
   */
  narrowedFor: ReadonlyMap<string, readonly ChurchView[]>;
  ctx: EngineCtx;
  filters: LeadFilters;
  setFilters: (f: LeadFilters) => void;
  state: LeadState;
  groups: ExportGroupSummary[];
  /** The batch ✆ collects into, or null before the first church of the day. */
  openBatch: ExportGroupSummary | null;
  collecting: number;
  onResetFilters: () => void;
  /** A recolour is shared team config, not a filter — it goes to the state layer. */
  onRecolour: (q: string, answer: string, state: VerdictState | null) => void;
  onFavorChange: (favor: EngineCtx["favor"] | null) => void;
}) {
  const facets = buildFacets(views);

  /**
   * OFFER ONLY WHAT WOULD RETURN SOMETHING.
   *
   * These used to list every value in the corpus — 100+ countries, every network
   * name — so most of what the dropdown offered led to an empty list under any
   * real filter. Each is now derived from the set narrowed by every OTHER
   * filter, with its own field lifted (`narrowedFor`, `LeadConsole.tsx`), which
   * is the same rule the facet checkboxes follow.
   *
   * THE CURRENT VALUE IS ALWAYS PRESENT. A `<select>` whose selected option is
   * missing renders blank while still filtering, which reads as a bug and cannot
   * be undone from the control.
   */
  const withCurrent = (opts: string[], current: string) =>
    current && !opts.includes(current) ? [...opts, current].sort() : opts;

  const forCountry = narrowedFor.get("country") ?? narrowed;
  const forSubdiv = narrowedFor.get("subdiv") ?? narrowed;
  const forNetwork = narrowedFor.get("network") ?? narrowed;

  const countries = withCurrent(countryValues(forCountry), filters.country);
  const subdivs = withCurrent(subdivValues(forSubdiv, filters.country), filters.subdiv);
  const networks = withCurrent(networkValues(forNetwork), filters.network);

  // Exported last — finished work stays reachable without competing with the
  // batch being built.
  const earlier = groups
    .filter((g) => g.id !== openBatch?.id)
    .slice()
    .sort((a, b) => {
      const ax = a.status === "exported" ? 1 : 0;
      const bx = b.status === "exported" ? 1 : 0;
      return ax - bx || (a.updatedAt < b.updatedAt ? 1 : -1);
    });

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
      {/* ── the batch tray ──
          What you are collecting into, and one button to go and read it. This is
          the first thing in the rail because collecting is the job: the console
          exists to fill a batch, and everything below narrows what you are
          choosing from. */}
      <div className="rounded-xl border border-lead-line bg-lead-panel p-3">
        <div className="mb-2 flex items-baseline gap-2">
          <span className="font-mono text-[9px] font-bold tracking-widest text-lead-ink2 uppercase">
            Collecting
          </span>
          {openBatch && (
            <span className="ml-auto truncate font-serif text-[13px] text-lead-ink">
              {openBatch.name}
            </span>
          )}
        </div>

        <div className="flex items-end gap-2">
          <div className="font-serif text-[34px] leading-none font-semibold text-lead-good">
            {collecting}
          </div>
          <div className="pb-1 font-mono text-[10px] leading-tight text-lead-ink2">
            {collecting === 1 ? "church" : "churches"}
            <br />
            in this batch
          </div>
        </div>

        {collecting > 0 && openBatch ? (
          <Link
            href={`/leads/groups/${openBatch.id}`}
            className="mt-2.5 block rounded-md bg-lead-brand px-2 py-2 text-center font-mono text-[11px] text-white transition-opacity hover:opacity-90"
          >
            Review these {collecting} →
          </Link>
        ) : (
          // Say what the empty state is waiting for. A zero with no explanation
          // reads as something broken rather than something not started.
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-lead-ink2">
            Press ✆ on a church to start today&rsquo;s batch. Shift-click to take a
            run of them at once.
          </p>
        )}

        <div className="mt-3 grid grid-cols-3 gap-x-2 border-t border-lead-line pt-2.5">
          <Counter n={countMarked(state, "star")} label="Starred" className="text-lead-brand" />
          <Counter n={countMarked(state, "issue")} label="Issue" className="text-lead-bad" />
          <div title={DORMANT} className="opacity-45">
            <Counter
              n={Object.keys(state.lastExportedAt).length}
              label="Sent"
              className="text-lead-dl"
            />
          </div>
        </div>
        <div className="mb-1.5" />

        {MARK_FILTERS.map(([kind, label]) => {
          // ◎ is fed by the export log, and no export writes one yet. Rather than
          // leave a filter that silently matches nothing, say so: a dormant
          // subsystem that looks live is how one rots unnoticed.
          const dormant = kind === "exported";
          return (
            <label
              key={kind}
              title={dormant ? DORMANT : undefined}
              className={`flex items-center gap-2 py-0.5 text-xs text-lead-ink2 ${
                dormant ? "cursor-not-allowed opacity-45" : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                disabled={dormant}
                checked={filters.marks[kind]}
                onChange={(e) => set({ marks: { ...filters.marks, [kind]: e.target.checked } })}
              />
              {label}
              {dormant && <span className="font-mono text-[9px]">· dormant</span>}
            </label>
          );
        })}

      </div>

      {/* ── earlier batches ──
          Exported ones last: the daily job is finding the next twenty, so
          finished work should be reachable without being in the way. */}
      {earlier.length > 0 && (
        <section className="mt-4">
          <h4 className="mb-2 font-mono text-[10px] font-bold tracking-widest text-lead-ink2 uppercase">
            Earlier batches
          </h4>
          <div className="space-y-1">
            {earlier.map((g) => (
              <Link
                key={g.id}
                href={`/leads/groups/${g.id}`}
                className="flex items-baseline gap-2 rounded-md border border-lead-line bg-lead-panel px-2 py-1.5 text-[11px] text-lead-ink hover:border-lead-brand"
              >
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                {g.status === "exported" && (
                  <span className="shrink-0 font-mono text-[9px] text-lead-dl">sent</span>
                )}
                <span className="shrink-0 font-mono text-[10px] text-lead-ink2">{g.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
      {/* `stack` sits between the website/app questions and the lighter-touch
          ones: it is about the software a church already runs, which is the
          closest thing here to "what would we be replacing", so it belongs
          beside the app and website verdicts rather than down in "the rest". */}
      {(["core", "appweb", "stack", "rest"] as const).map((g) => (
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
              views={narrowedFor.get(f.key) ?? narrowed}
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
