"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { churchFromIndex } from "@/lib/leads/engine/adapt";
import {
  computeView,
  defaultFilters,
  type LeadFilters,
  type MarkFilter,
} from "@/lib/leads/engine/filter";
import { defaultFavorModel, favorBase } from "@/lib/leads/engine/favor";
import type { EngineCtx, VerdictState } from "@/lib/leads/engine/types";
import { useDataset } from "@/lib/leads/client/useDataset";
import { useLeadState } from "@/lib/leads/client/useLeadState";
import { isDownloaded, isMarked, rowTint, type MarkKind } from "@/lib/leads/client/state";
import { useGroupList, useMembership } from "@/lib/leads/client/useGroups";
import { earlierBatches, isCollecting } from "@/lib/leads/engine/group-types";
import { Rail } from "./rail/Rail";
import { Deck } from "./deck/Deck";
import { LeadRow } from "./list/LeadRow";
import { LegacyMarks } from "./LegacyMarks";
import { Dossier } from "./dossier/Dossier";
import { SlideOver } from "./SlideOver";
import { useTheme } from "@/lib/leads/client/theme";

const PAGE = 60;

/**
 * Where you were, kept across a route change.
 *
 * `/leads` and `/leads/groups/[id]` are sibling routes, so opening a batch
 * unmounts this component entirely — and every filter, the paging cap and the
 * scroll position went with it. You would collect twenty churches from a
 * filtered view, go and review them, come back, and land on an unfiltered
 * sixty-row list at the top of the page.
 *
 * Same trick `useDataset` already uses for the index itself ("Survives a route
 * change within the session, so going back is instant") — module scope outlives
 * the unmount, and a fresh page load still starts clean.
 */
let sessionView: { filters: LeadFilters; limit: number } | null = null;

export function LeadConsole() {
  const { rows, loading, error, updateAvailable, reload } = useDataset();
  const { state, mutate } = useLeadState();
  const { theme, toggle } = useTheme();

  const [filters, setFiltersRaw] = useState<LeadFilters>(
    () => sessionView?.filters ?? defaultFilters(),
  );
  const [limit, setLimit] = useState(() => sessionView?.limit ?? PAGE);
  useEffect(() => {
    sessionView = { filters, limit };
  }, [filters, limit]);
  const [openId, setOpenId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const groupList = useGroupList();
  const { membership, collect, toggle: toggleCollect } = useMembership();
  /** The anchor for shift-click on ✆ — a range extends from the last one. */
  const anchorRef = useRef<string | null>(null);

  const openBatch = useMemo(
    () => groupList.groups.find((g) => g.id === membership.openGroupId) ?? null,
    [groupList.groups, membership.openGroupId],
  );
  /** Counted from membership, not the summary, so it moves the instant you click. */
  const collectingCount = useMemo(
    () => Object.keys(membership.byOrg).filter((id) => isCollecting(membership, id)).length,
    [membership],
  );

  /**
   * Publish the header's height as `--lead-header-h`.
   *
   * The rail and the deck both stick BELOW the header, and the rail sizes itself
   * `100dvh` minus this. Hard-coding the number would be wrong at the width
   * where the header wraps (measured: 63.25px normally, 113.25px under ~620px),
   * and hard-coding a breakpoint would re-break the moment the header's copy
   * changes. Measuring is the only version that stays true.
   */
  useEffect(() => {
    const el = headerRef.current;
    // Set on the console root, not on <html>: leads-theme.css declares the
    // fallback on `[data-lead-root]`, and a value inherited from an ancestor
    // loses to a declaration on the element itself. Inline style wins outright.
    const root = document.querySelector<HTMLElement>("[data-lead-root]");
    if (!el || !root) return;
    const ro = new ResizeObserver(() => {
      // borderBox, not contentRect — the header carries a 1px bottom border, and
      // one pixel of overlap is still overlap.
      root.style.setProperty("--lead-header-h", `${el.getBoundingClientRect().height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Every filter change resets paging.
   *
   * Done here rather than in an effect: "show 60 more" carrying a stale offset
   * into a completely different result set is a property of the ACTION, not
   * something to reconcile afterwards, and an effect would render the wrong
   * page once before correcting it.
   */
  const setFilters = useCallback(
    (next: LeadFilters | ((f: LeadFilters) => LeadFilters)) => {
      setFiltersRaw(next);
      setLimit(PAGE);
    },
    [],
  );

  // Typing stays responsive at 14k rows: the input updates immediately, the
  // expensive re-filter runs on the deferred value.
  const deferredQ = useDeferredValue(filters.q);

  const views = useMemo(() => rows.map(churchFromIndex), [rows]);
  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const ctx: EngineCtx = useMemo(
    () => ({
      overrides: state.config.colors,
      favor: state.config.favor ?? defaultFavorModel(),
      rows,
    }),
    [state.config.colors, state.config.favor, rows],
  );

  /** In a batch OTHER than the one being collected into — so it sinks. */
  const isEarlier = useCallback(
    (id: string) => earlierBatches(membership, id).length > 0,
    [membership],
  );

  const isMarkedFor = useCallback(
    (kind: MarkFilter, id: string) => {
      if (kind === "exported") return isDownloaded(state, id);
      // "Collected" is answered by batch membership, not by a mark — including
      // the open batch, so filtering to it shows today's work.
      if (kind === "collected") return (membership.byOrg[id]?.length ?? 0) > 0;
      return isMarked(state, kind, id);
    },
    [state, membership],
  );

  const { base, rows: visible, summary, scores } = useMemo(
    () => computeView(views, { ...filters, q: deferredQ }, ctx, isMarkedFor, isEarlier),
    [views, filters, deferredQ, ctx, isMarkedFor, isEarlier],
  );

  const baseDenom = favorBase(ctx.favor);

  const openIndex = openId ? visible.findIndex((v) => v.id === openId) : -1;

  const step = useCallback(
    (delta: number) => {
      if (openIndex < 0) return;
      const next = openIndex + delta;
      // Wrapping is disallowed at both ends.
      if (next < 0 || next >= visible.length) return;
      // Moving past the paging cap grows it, rather than dead-ending.
      if (next >= limit) setLimit((l) => l + PAGE);
      setOpenId(visible[next].id);
    },
    [openIndex, visible, limit],
  );

  /** `/` search · j/k/arrows move · Enter or o open · s star · Esc close. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      // All shortcuts stand down while typing.
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) {
        if (e.key === "Escape") (t as HTMLElement).blur();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape") return setOpenId(null);

      if (openId) {
        if (e.key === "j" || e.key === "ArrowDown") return step(1);
        if (e.key === "k" || e.key === "ArrowUp") return step(-1);
        if (e.key === "s") return mutate({ type: "mark.toggle", kind: "star", orgId: openId });
        // The same gesture the row's ✆ makes, without reaching for the mouse:
        // read the dossier, decide, collect, j to the next one.
        if (e.key === "c") return toggleCollect(openId);
      } else if ((e.key === "Enter" || e.key === "o") && visible.length) {
        setOpenId(visible[0].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, step, visible, mutate, toggleCollect]);

  const onRecolour = useCallback(
    (q: string, answer: string, st: VerdictState | null) =>
      mutate({ type: "config.color.set", q, answer, state: st }),
    [mutate],
  );

  /**
   * ✆ — collect, or collect a range.
   *
   * Shift extends from the last one over the CURRENTLY VISIBLE list, the way a
   * file manager does, so "filter to Charlotte, click the first, shift-click the
   * twentieth" collects exactly what is on screen and nothing filtered out. One
   * control, both gestures — which is why the checkbox is gone.
   */
  const onToggleCollect = useCallback(
    (id: string, shift: boolean) => {
      const anchor = anchorRef.current;
      if (shift && anchor && anchor !== id) {
        const shown = visible.slice(0, limit).map((v) => v.id);
        const a = shown.indexOf(anchor);
        const b = shown.indexOf(id);
        if (a >= 0 && b >= 0) {
          collect(shown.slice(Math.min(a, b), Math.max(a, b) + 1));
          anchorRef.current = id;
          return;
        }
      }
      toggleCollect(id);
      anchorRef.current = id;
    },
    [visible, limit, collect, toggleCollect],
  );

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="font-serif text-lg text-lead-ink">The dataset could not be loaded.</p>
        <p className="mt-2 font-mono text-xs text-lead-ink2">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-md border border-lead-line px-3 py-1.5 font-mono text-xs text-lead-ink"
        >
          retry
        </button>
      </div>
    );
  }

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-lead-line bg-lead-bg">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-5 py-3">
          <span className="font-serif text-xl font-semibold tracking-tight text-lead-ink">
            Lead <b className="text-lead-brand italic">Console</b>
          </span>
          <div className="relative ml-auto">
            <input
              ref={searchRef}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="search name…   /"
              aria-label="Search church name"
              autoComplete="off"
              className="w-[230px] rounded-lg border border-lead-line bg-lead-panel px-3 py-2 text-[13.5px] text-lead-ink"
            />
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="rounded-lg border border-lead-line bg-lead-panel px-3 py-2 font-mono text-xs text-lead-ink"
          >
            ◐ theme
          </button>
        </div>
      </header>

      <LegacyMarks onMove={async (ids) => collect(ids)} />

      {updateAvailable && (
        // Never hot-swap the dataset under someone mid-scroll, and never with a
        // dossier open. Offer it; let them choose the moment.
        <div className="flex items-center justify-center gap-3 border-b border-lead-line bg-lead-panel px-4 py-2 font-mono text-xs text-lead-ink">
          Updated data is available
          <button type="button" onClick={reload} className="underline">
            Reload
          </button>
        </div>
      )}

      {/* The rail WIDTH scales, its height does not.
          250px is the floor — the width the facet rows and the tier inputs were
          laid out against, below which they wrap — and on a wide monitor it
          grows to 330 so the facet labels stop truncating. Height stays
          `h-screen` with its own scroll: a rail that grew taller than the
          viewport would just move the scrollbar somewhere less useful. */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-[clamp(250px,19vw,330px)_1fr] max-[1000px]:grid-cols-1">
        <Rail
          views={views}
          narrowed={base}
          ctx={ctx}
          filters={filters}
          setFilters={setFilters}
          state={state}
          groups={groupList.groups}
          openBatch={openBatch}
          collecting={collectingCount}
          onResetFilters={() => setFilters(defaultFilters())}
          onRecolour={onRecolour}
          onFavorChange={(favor) => mutate({ type: "config.favor.set", favor })}
        />

        <main className="min-w-0 px-5 pt-4 pb-24">
          <Deck
            summary={summary}
            sort={filters.sort}
            onSort={(sort) => setFilters((f) => ({ ...f, sort }))}
            bucket={filters.favorBucket}
            onBucket={(favorBucket) => setFilters((f) => ({ ...f, favorBucket }))}
            newFirst={filters.newFirst}
            onNewFirst={(newFirst) => setFilters((f) => ({ ...f, newFirst }))}
          />

          {loading ? (
            // A skeleton, never a default-coloured answer. A colour that appears
            // before its data has arrived is a claim we did not verify.
            <div className="mt-2 space-y-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-lead-panel" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="px-5 py-16 text-center font-serif text-[17px] italic text-lead-ink2">
              No churches match these filters. Loosen one to see more.
            </p>
          ) : (
            <div className="mt-2">
              {visible.slice(0, limit).map((v) => {
                const row = rowById.get(v.id)!;
                return (
                  <LeadRow
                    key={v.id}
                    row={row}
                    view={v}
                    ctx={ctx}
                    score={scores.get(v.id) ?? 0}
                    base={baseDenom}
                    tint={rowTint(state, v.id, {
                      collecting: isCollecting(membership, v.id),
                      earlier: isEarlier(v.id),
                    })}
                    marks={{
                      star: isMarked(state, "star", v.id),
                      issue: isMarked(state, "issue", v.id),
                      downloaded: isDownloaded(state, v.id),
                    }}
                    collecting={isCollecting(membership, v.id)}
                    batchName={openBatch?.name ?? ""}
                    earlier={earlierBatches(membership, v.id)}
                    onOpen={setOpenId}
                    onToggleMark={(kind: MarkKind, id) =>
                      mutate({ type: "mark.toggle", kind, orgId: id })
                    }
                    onToggleCollect={onToggleCollect}
                  />
                );
              })}

              {visible.length > limit && (
                <div className="py-5 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE)}
                    className="rounded-lg border border-lead-line bg-lead-panel px-4 py-2 font-mono text-xs text-lead-ink"
                  >
                    show {Math.min(PAGE, visible.length - limit)} more ·{" "}
                    {(visible.length - limit).toLocaleString("en-US")} hidden
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {openId && (
        // SlideOver is deliberately UNKEYED and Dossier is keyed. React keeps
        // this element mounted for as long as anything is open, so the panel
        // slides in once; only the child inside is torn down when j/k steps to
        // another church. Keying the outer element would replay the entrance on
        // every keypress while walking a list.
        <SlideOver label="church dossier" onClose={() => setOpenId(null)}>
          <Dossier
            // Remount per church rather than resetting state inside the fetch
            // effect — otherwise the previous church's evidence paints for one
            // frame under the new church's name.
            key={openId}
            orgId={openId}
            ctx={ctx}
            position={openIndex + 1}
            total={visible.length}
            starred={isMarked(state, "star", openId)}
            note={state.notes[openId] ?? ""}
            onNote={(text) => mutate({ type: "note.set", orgId: openId, text })}
            onStar={() => mutate({ type: "mark.toggle", kind: "star", orgId: openId })}
            onStep={step}
            onClose={() => setOpenId(null)}
          />
        </SlideOver>
      )}
    </>
  );
}
