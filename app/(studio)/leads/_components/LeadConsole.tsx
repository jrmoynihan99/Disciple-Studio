"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { churchFromIndex, type ChurchView } from "@/lib/leads/engine/adapt";
import {
  baseFiltered,
  computeView,
  defaultFilters,
  type LeadFilters,
  type MarkFilter,
} from "@/lib/leads/engine/filter";
import { defaultFavorModel, favorBase } from "@/lib/leads/engine/favor";
import type { EngineCtx, VerdictState } from "@/lib/leads/engine/types";
import { useDataset } from "@/lib/leads/client/useDataset";
import { useLeadState } from "@/lib/leads/client/useLeadState";
import { isMarked, rowTints, type MarkKind } from "@/lib/leads/client/state";
import { useGroupList, useMembership } from "@/lib/leads/client/useGroups";
import {
  collectingCount as countCollecting,
  earlierBatches,
  editsInOpenBatch,
  isCollecting,
  sentCount as countSent,
  wasSent,
  type MembershipRef,
} from "@/lib/leads/engine/group-types";
import { ConfirmDialog } from "./ConfirmDialog";
import { Rail } from "./rail/Rail";
import { BatchSwitcher } from "./rail/BatchSwitcher";
import { Deck } from "./deck/Deck";
import { LeadRow } from "./list/LeadRow";
import { LegacyMarks } from "./LegacyMarks";
import { Dossier } from "./dossier/Dossier";
import { SlideOver } from "./SlideOver";
import { useTheme } from "@/lib/leads/client/theme";

const PAGE = 60;

/**
 * ONE frozen empty array for every row that is in no earlier batch — which is
 * almost all of them.
 *
 * `[]` written inline is a new array each render, and `memo(LeadRow)` compares by
 * identity: a fresh empty array is enough on its own to re-render every visible
 * row on every keystroke.
 */
const NO_BATCHES: readonly MembershipRef[] = [];

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
  const {
    membership,
    error: membershipError,
    collect,
    toggle: toggleCollect,
    reload: reloadMembership,
  } = useMembership();

  const openBatch = useMemo(
    () => groupList.groups.find((g) => g.id === membership.openGroupId) ?? null,
    [groupList.groups, membership.openGroupId],
  );

  /**
   * REFETCH THE BATCH STATE ON ARRIVAL.
   *
   * Both stores fetch once per tab and then live in module scope, which is what
   * makes coming back from a batch instant — and also what made the rail wrong
   * after it: rename a batch, finish it, or remove a church on the review page,
   * come back here, and the tray still showed the state from the first load. The
   * cached snapshot paints immediately and this corrects it.
   *
   * The corpus is NOT refetched with them. It is 2.6 MB and immutable under its
   * publish id — `useDataset` polls for a new publish separately and offers a
   * reload rather than pulling it behind your back mid-scroll.
   */
  useEffect(() => {
    void groupList.reload();
    reloadMembership();
    // Mount only. `groupList` is a fresh object each render, so a dependency on it
    // would refetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  /**
   * Counted from membership, not the summary, so it moves the instant you click
   * — and INTERSECTED WITH THE CURRENT PUBLISH, so it counts only churches this
   * console can actually show.
   *
   * Without the intersection the rail counted stored batch entries outright, so
   * churches collected against an earlier corpus kept being counted after their
   * `org_id` left it: the rail said "2 churches in this batch" while not one row
   * rendered as collecting and the deck's own "already collected" said 0. Both
   * numbers were honest about different sets, which is the worst kind of
   * disagreement — neither looks wrong on its own.
   *
   * NOTHING IS DELETED HERE. A batch entry holds a frozen snapshot the review
   * page calls "the only copy we hold" for a church that has left the dataset,
   * and it still shows them, still flagged. This is a counter agreeing with the
   * list beside it, not a prune.
   */
  const collectingCount = useMemo(
    () => countCollecting(membership, (id) => rowById.has(id)),
    [membership, rowById],
  );

  /**
   * How many churches have been sent a demo, from the batches that still exist.
   *
   * NOT FILTERED TO THE CURRENT PUBLISH, unlike the counter above — see
   * `sentCount`. That one exists to agree with the rows on screen; this one is
   * about who has been contacted, and a church that has since left the dataset
   * was still contacted.
   */
  const sentCount = useMemo(() => countSent(membership), [membership]);

  const ctx: EngineCtx = useMemo(
    () => ({
      overrides: state.config.colors,
      favor: state.config.favor ?? defaultFavorModel(),
      rows,
    }),
    [state.config.colors, state.config.favor, rows],
  );

  /**
   * The earlier-batch refs per church, computed ONCE per membership change.
   *
   * `earlierBatches()` builds a fresh array on every call, and it was being called
   * inline in the row loop — so all ~120 visible rows got a new `earlier` prop on
   * every render and `memo(LeadRow)` never hit. Starring one church re-rendered
   * every logo tile, verdict grid and contact row on screen, which is the clunk.
   *
   * Keyed off `membership`, which only changes when something is actually
   * collected, and iterating `byOrg` — the churches in a batch, not the corpus.
   */
  const earlierByOrg = useMemo(() => {
    const out = new Map<string, MembershipRef[]>();
    for (const id of Object.keys(membership.byOrg)) {
      const refs = earlierBatches(membership, id);
      if (refs.length) out.set(id, refs);
    }
    return out;
  }, [membership]);

  /** In a batch OTHER than the one being collected into — so it sinks. */
  const isEarlier = useCallback((id: string) => earlierByOrg.has(id), [earlierByOrg]);

  /**
   * Stable, for the same `memo()` reason as `earlierByOrg` — an inline arrow in
   * the row loop is a new function on every render, and one new prop is enough.
   */
  const onToggleMark = useCallback(
    (kind: MarkKind, id: string) => mutate({ type: "mark.toggle", kind, orgId: id }),
    [mutate],
  );

  const isMarkedFor = useCallback(
    (kind: MarkFilter, id: string) => {
      // "Sent" is answered by the batches that still exist, not by the export
      // log — delete a sent batch and this filter stops matching those churches,
      // which is the whole point of `wasSent`.
      if (kind === "exported") return wasSent(membership, id);
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

  /**
   * WHAT EACH FACET COUNTS AGAINST — not the same set the list is showing.
   *
   * Option counts were read off `base`, the fully-filtered set, so ticking one
   * option sent every SIBLING option in the same facet to 0: pick "Not checked"
   * and "Has a pathway" reads 0, which says there are none, when what it should
   * say is "627 more if you also tick this". Options within a facet are OR'd, so
   * a facet's own selection must not narrow its own counts.
   *
   * So each ACTIVE facet counts against the set filtered by every OTHER facet
   * with its own selection lifted. Only active facets need this — with nothing
   * ticked there is nothing to lift, and `base` is already right — which keeps
   * this to a handful of passes rather than one per facet on screen.
   */
  const narrowedFor = useMemo(() => {
    const out = new Map<string, ChurchView[]>();
    for (const key of Object.keys(filters.qsel)) {
      if (!filters.qsel[key]?.length) continue;
      const without = { ...filters.qsel };
      delete without[key];
      out.set(
        key,
        baseFiltered(views, { ...filters, q: deferredQ, qsel: without }, ctx, isMarkedFor),
      );
    }

    /**
     * The region cascade needs the same treatment, for the same reason.
     *
     * Now that an option offering nothing is hidden, a `<select>` counted
     * against its own choice would collapse to the one country already picked —
     * every other country reads 0 by construction. So each of the three gets the
     * corpus with ITS OWN field lifted and every other filter still applied.
     *
     * `subdiv` rides along with `country`: it is scoped to the chosen country,
     * so lifting the country as well would offer subdivisions from everywhere.
     */
    for (const key of ["country", "subdiv", "network"] as const) {
      if (!filters[key]) continue;
      const without = { ...filters, q: deferredQ, [key]: "" };
      // Choosing a country resets the subdivision anyway; lifting the country
      // without lifting the subdivision would filter to a subdivision that
      // belongs to a country nobody selected.
      if (key === "country") without.subdiv = "";
      out.set(key, baseFiltered(views, without, ctx, isMarkedFor));
    }
    return out;
  }, [views, filters, deferredQ, ctx, isMarkedFor]);

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

  /**
   * ✆ — collect one church, or put it back.
   *
   * SHIFT-CLICK IS GONE, by owner's decision, and the reasoning is worth keeping.
   * It extended from an anchor over the visible list, the way a file manager
   * does, and it was the fastest way to fill a batch. It was also the fastest way
   * to fill the WRONG batch: one modifier key on the only control that writes to
   * the server collected up to sixty churches in a gesture whose undo is sixty
   * more clicks — and the rail's own copy had to teach it, which is a gesture
   * nobody discovers and everybody triggers by accident.
   *
   * `collect(ids[])` — the bulk path — stays on the store. It is what the legacy
   * ✆ migration bar uses, and it is a deliberate action with a count in front of
   * it rather than a modifier on a click.
   *
   * UN-COLLECTING A CHURCH SOMEBODY HAS CORRECTED STOPS TO ASK.
   *
   * The review page has always confirmed this — it names the loss, "along with
   * the N changes you made to it" — because `church.remove` drops the entry
   * outright: the frozen snapshot, every typed correction, every struck-out
   * line. There is no undo, and re-collecting re-snapshots from the live record,
   * so the corrections do not come back.
   *
   * The console fired the identical operation straight off this button and off
   * the dossier's `c` key, which sits one key from `s` and two from `j`/`k`, with
   * no dialog and nothing on screen hinting the church carried any work at all.
   * That made it the likeliest way real work disappeared.
   *
   * ONLY WHEN THERE IS SOMETHING TO LOSE. A church collected a minute ago and
   * never touched still toggles off instantly — a confirm on every ✆ would be a
   * reflex click within a day, which is worse than no confirm at all. It is
   * declared ABOVE the keyboard handler because that handler depends on it.
   */
  const [confirmUncollect, setConfirmUncollect] = useState<string | null>(null);

  const onToggleCollect = useCallback(
    (id: string) => {
      if (isCollecting(membership, id) && editsInOpenBatch(membership, id) > 0) {
        setConfirmUncollect(id);
        return;
      }
      toggleCollect(id);
    },
    [membership, toggleCollect],
  );

  /** `/` search · j/k/arrows move · Enter or o open · s star · c collect · Esc close. */
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
        // read the dossier, decide, collect, j to the next one. THROUGH THE SAME
        // GATE as the button — this key is one away from `s` and two from
        // `j`/`k`, so it is the accidental-fire path, not the safe one.
        if (e.key === "c") return onToggleCollect(openId);
      } else if ((e.key === "Enter" || e.key === "o") && visible.length) {
        setOpenId(visible[0].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, step, visible, mutate, onToggleCollect]);

  const onRecolour = useCallback(
    (q: string, answer: string, st: VerdictState | null) =>
      mutate({ type: "config.color.set", q, answer, state: st }),
    [mutate],
  );

  /* ── the batch picker ── */
  const [switching, setSwitching] = useState(false);
  const { switchTo, create: createBatch, reload: reloadGroups } = groupList;

  const onPickBatch = useCallback(
    async (id: string) => {
      if (await switchTo(id)) setSwitching(false);
      // Left OPEN on failure, deliberately: the dialog is where the reason is
      // shown, and closing it would take the explanation with it.
    },
    [switchTo],
  );

  /**
   * A new batch from the picker.
   *
   * `create("")` rather than prompting for a name — the server names it, using
   * the same `nextBatchName` rule ✆ uses, so a batch made here and one made by
   * collecting are indistinguishable afterwards. Naming is a rename on the review
   * page, where there is room for it and something to look at while you decide.
   */
  const onCreateBatch = useCallback(async () => {
    const id = await createBatch("");
    if (!id) return;
    await switchTo(id);
    await reloadGroups();
    reloadMembership();
    setSwitching(false);
  }, [createBatch, switchTo, reloadGroups, reloadMembership]);

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
              placeholder="search"
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

      {/* THE ONE CONTROL ON THIS PAGE THAT WRITES TO THE SERVER, AND ITS FAILURES
          WERE SILENT.

          `MembershipStore` sets a real message on every failure path — "Could
          not add to the batch", "Offline — that church was not collected",
          "Could not remove that church" — and rolls the optimistic change back.
          Nothing read it. The row went green, then grey, and no reason appeared
          anywhere: indistinguishable from a misclick. Now that un-collecting
          opens a dialog promising the church will be removed, a rollback nobody
          is told about is worse still. */}
      {membershipError && (
        <div
          role="status"
          className="flex items-center justify-center gap-3 border-b border-lead-bad/40 bg-lead-bad/[0.08] px-4 py-2 font-mono text-xs text-lead-bad"
        >
          {membershipError}
          <button type="button" onClick={reloadMembership} className="underline">
            retry
          </button>
        </div>
      )}

      <LegacyMarks onMove={collect} />

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
          narrowedFor={narrowedFor}
          ctx={ctx}
          filters={filters}
          setFilters={setFilters}
          state={state}
          openBatch={openBatch}
          collecting={collectingCount}
          sent={sentCount}
          onSwitchBatch={() => setSwitching(true)}
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
                // One call, two consumers: the wash takes the winner and the edge
                // rail takes the whole set, so they can never disagree about which
                // state is dominant.
                const tints = rowTints(state, v.id, {
                  collecting: isCollecting(membership, v.id),
                  earlier: isEarlier(v.id),
                  sent: wasSent(membership, v.id),
                });
                return (
                  <LeadRow
                    key={v.id}
                    row={row}
                    view={v}
                    ctx={ctx}
                    score={scores.get(v.id) ?? 0}
                    base={baseDenom}
                    tint={tints[0] ?? null}
                    tintKey={tints.join(" ")}
                    star={isMarked(state, "star", v.id)}
                    issue={isMarked(state, "issue", v.id)}
                    downloaded={wasSent(membership, v.id)}
                    collecting={isCollecting(membership, v.id)}
                    batchName={openBatch?.name ?? ""}
                    earlier={earlierByOrg.get(v.id) ?? NO_BATCHES}
                    onOpen={setOpenId}
                    onToggleMark={onToggleMark}
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

      {/* Mounted here rather than inside the rail: it changes which batch the
          WHOLE console collects into, and it has to refresh both the group list
          and membership — the two stores this component already owns. */}
      <BatchSwitcher
        open={switching}
        groups={groupList.groups}
        currentId={membership.openGroupId}
        error={groupList.error}
        onPick={onPickBatch}
        onCreate={onCreateBatch}
        onClose={() => setSwitching(false)}
      />

      {/* THE SAME STOP THE REVIEW PAGE MAKES, on the same operation. See
          `onToggleCollect`. It names the church and the count, because "are you
          sure?" over an unnamed thing is a question nobody can answer. */}
      <ConfirmDialog
        open={confirmUncollect !== null}
        title="Take this church out of the batch?"
        body={
          confirmUncollect && (
            <>
              <b>{rowById.get(confirmUncollect)?.n || confirmUncollect}</b> will be removed from{" "}
              {openBatch?.name ?? "this batch"}, along with the{" "}
              {editsInOpenBatch(membership, confirmUncollect)} change
              {editsInOpenBatch(membership, confirmUncollect) === 1 ? "" : "s"} made to it. Collecting
              it again starts from the pipeline&rsquo;s version — the corrections do not come back.
            </>
          )
        }
        confirmLabel="Remove it"
        cancelLabel="Keep it"
        onConfirm={() => {
          if (confirmUncollect) toggleCollect(confirmUncollect);
          setConfirmUncollect(null);
        }}
        onCancel={() => setConfirmUncollect(null)}
      />

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
