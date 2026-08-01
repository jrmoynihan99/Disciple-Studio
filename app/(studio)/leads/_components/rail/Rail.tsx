"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { ExportGroupSummary } from "@/lib/leads/engine/group-types";
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

/**
 * ◎ is folded from the export log — "a mark you can set yourself stops being
 * evidence" — and nothing writes that log yet. The control that used to write it
 * was a stub that produced no file, so it was claiming a download that never
 * happened; removing it is right, and saying so is the difference between
 * dormant and rotten.
 */
const DORMANT =
  "Dormant until the export ships. ◎ is folded from the export log, and nothing writes to it yet — it is never settable by hand.";

/** The group menu, shared by the rail and (in spirit) the selection bar. */
function GroupPicker({
  label,
  groups,
  disabled,
  busy,
  onPick,
  onCreate,
}: {
  label: string;
  groups: ExportGroupSummary[];
  disabled: boolean;
  busy: boolean;
  onPick: (groupId: string) => void;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-md border border-lead-line bg-lead-bg px-2 py-1.5 font-mono text-[11px] text-lead-ink disabled:opacity-45"
      >
        {busy ? "Adding…" : `${label} ▾`}
      </button>

      {open && !disabled && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-lg border border-lead-line bg-lead-panel shadow-lg">
          <div className="max-h-[200px] overflow-y-auto">
            {groups.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-lead-ink2">No groups yet.</p>
            )}
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(g.id);
                }}
                className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-[11px] text-lead-ink hover:bg-lead-panel2"
              >
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-lead-ink2">{g.count}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-lead-line p-1.5">
            {naming ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = name.trim();
                  if (!n) return;
                  setOpen(false);
                  setNaming(false);
                  setName("");
                  onCreate(n);
                }}
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-md border border-lead-line bg-lead-bg px-2 py-1 text-[11px] text-lead-ink"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setNaming(true)}
                className="w-full rounded-md border border-dashed border-lead-line py-1 font-mono text-[10px] text-lead-ink2 hover:border-lead-brand hover:text-lead-brand"
              >
                + New group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  groups,
  adding,
  onAddGoodLeads,
  onCreateGroupWithGoodLeads,
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
  groups: ExportGroupSummary[];
  adding: boolean;
  onAddGoodLeads: (groupId: string) => void;
  onCreateGroupWithGoodLeads: (name: string) => void;
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
          <div title={DORMANT} className="opacity-45">
            <Counter
              n={Object.keys(state.lastExportedAt).length}
              label="Downloaded"
              className="text-lead-dl"
            />
          </div>
        </div>

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

        {/* ── good leads → a group ──
            This replaced "↓ Export good leads", which dispatched `export.commit`
            and produced no file — it marked churches as downloaded when nothing
            had been downloaded, which is exactly what ◎ is forbidden to do.
            A group is where a batch goes now; the export happens from there,
            after someone has read it. */}
        <div className="mt-2.5">
          <GroupPicker
            label={`Add good leads to group (${queue.length})`}
            groups={groups}
            disabled={queue.length === 0 || adding}
            busy={adding}
            onPick={onAddGoodLeads}
            onCreate={onCreateGroupWithGoodLeads}
          />
          <Link
            href="/leads/groups"
            className="mt-1.5 block rounded-md border border-lead-line bg-lead-bg px-2 py-1.5 text-center font-mono text-[11px] text-lead-ink"
          >
            Export groups ({groups.length})
          </Link>
        </div>

        {/* Say WHY the button is disabled, rather than leaving a dead control. */}
        {queue.length === 0 && (
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-lead-ink2">
            Mark churches with ✆ to build a batch, or tick rows and use the bar at
            the bottom. A group sends what you put in it, never the filtered view.
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
