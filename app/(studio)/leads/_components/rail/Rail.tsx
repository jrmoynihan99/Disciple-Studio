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
/**
 * ◎ IS EARNED, NOT SET.
 *
 * It used to say "dormant until the export ships" and the filter was disabled,
 * because `export.commit` had no dispatcher and the count could only ever be 0.
 * Exporting a batch now writes it — for the churches a demo was actually built
 * for, from the export result rather than from the list that was submitted.
 *
 * What has NOT changed is the half that matters: there is still no way to tick
 * this by hand. A mark you can set yourself stops being evidence of anything, and
 * `/leads/audit` asserts that no group operation can reach this store.
 */
const SENT_MARK =
  "Set when a demo is generated for this church. It cannot be ticked by hand — that is what makes it evidence.";

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

/**
 * A CHARACTER CAP, BECAUSE CSS CANNOT TOUCH THIS.
 *
 * `<option>` text is drawn by the operating system's native popup, so `truncate`,
 * `text-overflow` and `max-width` all do nothing inside a `<select>` — a JS cap
 * is the only thing available. It matters for exactly one facet: `network` has
 * 379 distinct values and the longest is 179 characters (a Methodist conference
 * partnership that names three organisations), which stretches the rail's popup
 * across the screen.
 *
 * THE DISPLAYED CHILD ONLY, NEVER THE VALUE. `filters.network` is compared by
 * equality in `filter.ts` and re-injected by identity in `withCurrent` below, so
 * a truncated `value` would silently stop matching the churches it names.
 */
const OPTION_MAX = 60;
const OPTION_KEEP = 57;

function optionText(o: string): string {
  return o.length > OPTION_MAX ? `${o.slice(0, OPTION_KEEP)}...` : o;
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
          // `title` carries the full string, so a truncated option is still
          // readable on hover rather than merely unreadable.
          <option key={o} value={o} title={o}>
            {optionText(o)}
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
  onSwitchBatch,
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
  /** Opens the picker. The dialog itself lives in `LeadConsole`, which owns the
   *  group list and the membership store it has to refresh. */
  onSwitchBatch: () => void;
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

          {/* ── the switcher ──
              Beside the count rather than under it, because it answers the
              question the count provokes: "…in WHICH batch?". It is shown even
              with nothing open — that is when you are most likely to want an
              earlier one back rather than a new one. */}
          <button
            type="button"
            onClick={onSwitchBatch}
            title="Choose which batch ✆ collects into, or start a new one"
            className="mb-0.5 ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-lead-line bg-lead-bg px-2 font-mono text-[10px] text-lead-ink2 transition-colors hover:border-lead-brand hover:text-lead-brand"
          >
            Switch
            <span aria-hidden className="text-[11px] leading-none">
              ⇅
            </span>
          </button>
        </div>

        {collecting > 0 && openBatch ? (
          <Link
            href={`/leads/groups/${openBatch.id}`}
            className="mt-2.5 block rounded-md bg-lead-brand px-2 py-2 text-center font-mono text-[11px] text-white transition-opacity hover:opacity-90"
          >
            Review these {collecting} →
          </Link>
        ) : (
          /**
           * SAY WHAT ✆ WILL ACTUALLY DO, which is not what this used to say.
           *
           * It read "Press ✆ on a church to start today's batch. Shift-click to
           * take a run of them at once." Both halves were wrong: batches are no
           * longer per-day, so "today's" named a thing that does not exist, and
           * shift-click has been removed — a range gesture on the one control
           * that writes to the server was a way to collect forty churches by
           * accident, with no undo but forty clicks.
           *
           * The two states say different things because they ARE different: with
           * a batch open, ✆ adds to a named place you can go and look at; with
           * none — which is what finishing or sending one leaves behind — the
           * next ✆ makes one, and saying so is the difference between an empty
           * tray reading as "not started" and reading as "broken".
           */
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-lead-ink2">
            {openBatch ? (
              <>
                Press ✆ on a church to add it to{" "}
                <span className="text-lead-ink">{openBatch.name}</span>.
              </>
            ) : (
              <>
                Press ✆ on a church to start collecting. A new batch is created
                for you automatically — you never have to make one.
              </>
            )}
          </p>
        )}

        <div className="mt-3 grid grid-cols-3 gap-x-2 border-t border-lead-line pt-2.5">
          <Counter n={countMarked(state, "star")} label="Starred" className="text-lead-brand" />
          <Counter n={countMarked(state, "issue")} label="Issue" className="text-lead-bad" />
          <div title={SENT_MARK}>
            <Counter
              n={Object.keys(state.lastExportedAt).length}
              label="Sent"
              className="text-lead-dl"
            />
          </div>
        </div>
        <div className="mb-1.5" />

        {MARK_FILTERS.map(([kind, label]) => (
          <label
            key={kind}
            title={kind === "exported" ? SENT_MARK : undefined}
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
      </div>

      {/* ── every batch ──
          THE RAIL HAD NO WAY TO REACH THE BATCH INDEX. It carried exactly two
          links, both deep into ONE batch: "Review these N" (today's, and only
          while it has churches in it) and the earlier-batches list below. So the
          page that lists all of them was reachable only from inside a batch you
          already knew the id of — a dead end at the top of the funnel.

          Outside the tray card rather than in it, so it does not read as another
          fact about today's collecting, and filled because getting to the work
          you have already collected is a primary action, not a footnote. */}
      <Link
        href="/leads/groups"
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-lead-brand px-4 text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        All batches
        <span aria-hidden="true">→</span>
      </Link>

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
