"use client";

import { useEffect, useRef, useState } from "react";
import { GENERIC_DEMO_URL } from "@/lib/config";
import { useLeadState } from "@/lib/leads/client/useLeadState";
import type { GroupRow } from "@/lib/groups";

/**
 * Turn a reviewed batch into demo sites.
 *
 * ONE CHURCH PER REQUEST, COUNTED AS THEY LAND — the same shape the deleted
 * folder importer used, and for the same reason: exporting twenty churches takes
 * long enough that a spinner with nothing to say is indistinguishable from a
 * hang. Three in flight, because every one writes to the demo blob store.
 *
 * THE ORDER OF THE LAST THREE STEPS IS LOAD-BEARING.
 *
 *   1. generate every demo        (per-church, retryable, writes nothing shared)
 *   2. create the demo GROUP      (mints the id the batch will point at)
 *   3. mark the batch exported    (the irreversible one, done last)
 *
 * Reversed, a crash between 2 and 3 would leave a batch marked sent with no demo
 * group to point at — history that has lost the thing it is a record of. In this
 * order the same crash leaves a batch you can simply export again, and the demo
 * slugs are deterministic so the retry overwrites rather than duplicates.
 *
 * A CHURCH THAT FAILED STOPS THE WHOLE THING. Step 3 used to run whenever ONE
 * demo had been built, so three timeouts out of twenty still marked the batch
 * sent — and a sent batch refuses every further export (409) and renders no
 * export control at all. The only way back to those three was to collect them
 * into a fresh batch, which re-snapshots from the live record and therefore
 * discards every correction that had been typed into them. A transient 500 must
 * not be able to destroy a reviewer's work, so nothing irreversible happens until
 * every church has either succeeded or been deliberately skipped.
 *
 * SKIPPED IS NOT FAILED, and only one of them blocks. A skip is an answer —
 * "no church name", "every step was struck out" — and retrying produces it again;
 * a failure is the network, and retrying is exactly the right response.
 */

const BATCH_SIZE = 3;

interface Progress {
  total: number;
  done: number;
  ok: number;
  skipped: { name: string; reason: string }[];
  failed: ExportTarget[];
}

const EMPTY_PROGRESS: Progress = { total: 0, done: 0, ok: 0, skipped: [], failed: [] };

export interface ExportTarget {
  orgId: string;
  name: string;
}

export function ExportDialog({
  open,
  batchId,
  batchName,
  churches,
  commitEdits,
  onClose,
  onExported,
}: {
  open: boolean;
  batchId: string;
  batchName: string;
  /** Exactly the churches on the page — the reviewer's list, not the stored one. */
  churches: readonly ExportTarget[];
  /**
   * Send every queued edit, and report whether it landed.
   *
   * NOT A BELT-AND-BRACES — it closes a race the reviewer always loses the same
   * way. Saves are debounced 1.5s and the export reads the batch from the SERVER.
   * Clicking `Export group` is itself what blurs an open field and queues that
   * edit, so the PATCH is typically still in flight while this dialog is being
   * read; anything still queued when the first demo is built simply is not in it,
   * while the copy below promises "exactly what you see on this page".
   *
   * It has to return a verdict rather than just resolve. A save that failed and
   * held its ops resolves exactly like one that succeeded, and building twenty
   * demos on that basis is the one outcome this page exists to prevent.
   */
  commitEdits: () => Promise<boolean>;
  onClose: () => void;
  onExported: (demoGroupId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(batchName);
  /**
   * The console's mark store, for the ONE mark a person may not set by hand.
   *
   * `◎ Sent` is folded from the export log, and until now nothing wrote to it —
   * `export.commit` had a reducer case and no dispatcher, so the counter read 0
   * for ever and the rail drew its filter as `· dormant`. That was honest while
   * there was no export. There is one now, and this is it.
   */
  const { mutate } = useLeadState();
  /**
   * `leaving` is the beat between the last write and the new page.
   *
   * `onExported` navigates to `/studio/g/<id>`, and a full navigation is not
   * instant — the dialog stays on screen for it. Without this it would stay on
   * screen still saying "Building the demos…" with the bar at 100%, which reads
   * as a hang at exactly the moment everything has in fact worked.
   */
  const [phase, setPhase] = useState<"confirm" | "running" | "partial" | "leaving" | "error">(
    "confirm",
  );
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);

  /**
   * The demos built so far, ACROSS ATTEMPTS, keyed by church.
   *
   * A ref rather than state because nothing renders from it directly and a retry
   * must not lose the nineteen that already worked — re-exporting them would be
   * correct (the slugs are deterministic) but would spend nineteen writes against
   * the blob store's operation allowance to fix one timeout. Keyed so a church
   * that succeeds on the second attempt replaces rather than duplicates its row.
   */
  const built = useRef(new Map<string, GroupRow>());

  // Adjusting to a prop change during render rather than in an effect — the
  // cascading-render mistake the lint rule catches, and the same pattern
  // `BatchSwitcher` uses. Reopening the dialog re-seeds the name from the batch.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName(batchName);
      setPhase("confirm");
      setError("");
      setProgress(EMPTY_PROGRESS);
      // `built` is NOT cleared here — a ref may not be written during render, and
      // `run` clears it on a fresh attempt anyway, which is the moment that
      // actually matters.
    }
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  /**
   * The phases with nothing in flight. Closing during `running` would not stop
   * the requests, only hide them; closing during `leaving` would drop the
   * reviewer back onto a page that is already navigating away.
   *
   * `partial` IS dismissible: nothing was sent, the batch is untouched, and
   * whoever hit three timeouts may reasonably want to come back to it later
   * rather than be held in a modal until the network recovers.
   */
  const dismissible = phase === "confirm" || phase === "error" || phase === "partial";

  /**
   * @param targets the churches to build this pass — everything on the first
   *        attempt, only the ones that failed on a retry.
   * @param fresh  start the tally over. True for a first attempt (including one
   *        after the dialog was closed and reopened), false for a retry, which
   *        must keep the demos the earlier passes already built.
   */
  async function run(targets: readonly ExportTarget[], fresh: boolean) {
    setPhase("running");
    if (fresh) built.current = new Map();

    /**
     * THE CORRECTIONS LAND BEFORE THE FIRST DEMO IS BUILT.
     *
     * A failure here stops the export outright rather than falling through. The
     * whole claim this dialog makes is that the demos are built from what the
     * reviewer read; if the server could not be given that, there is nothing
     * honest to build, and the batch is left exactly as it was so they can try
     * again once they are back online.
     */
    if (!(await commitEdits().catch(() => false))) {
      setPhase("error");
      setError(
        "Your latest changes could not be saved, so the demos would be built without them. Nothing was exported — check your connection and try again.",
      );
      return;
    }

    // Carried across a retry: a church skipped on the first pass is not in
    // `targets` any more, and dropping its line would quietly turn "18 built, 2
    // skipped" into "18 built" — the exact silent loss this list exists for.
    const skipped = [...progress.skipped];
    const failed: ExportTarget[] = [];
    /**
     * A 409 IS A VERDICT, NOT A DROPPED CONNECTION.
     *
     * Export in one tab, then press Export in a stale second tab: every church
     * 409s with "this batch has already been sent", `failed.length` fires before
     * the `!built.size` check, and the dialog rendered the "partial" copy —
     * "Nothing has been sent. The batch is untouched and still collectable…
     * This is usually a dropped connection" — over a Retry button that
     * reproduces the identical 409 forever. Every clause of that is false.
     */
    let alreadySent = false;
    let done = 0;
    setProgress({ ...EMPTY_PROGRESS, total: targets.length, ok: built.current.size, skipped });

    const one = async (church: ExportTarget) => {
      try {
        const res = await fetch(
          `/api/leads/groups/${batchId}/export/${encodeURIComponent(church.orgId)}`,
          { method: "POST" },
        );
        const data = (await res.json()) as {
          row?: GroupRow;
          skipped?: boolean;
          reason?: string;
          churchName?: string;
        };
        if (res.status === 409) alreadySent = true;
        if (!res.ok) failed.push(church);
        else if (data.skipped) {
          skipped.push({ name: data.churchName ?? church.name, reason: data.reason ?? "" });
        } else if (data.row) built.current.set(church.orgId, data.row);
        else failed.push(church);
      } catch {
        failed.push(church);
      } finally {
        done++;
        setProgress({
          total: targets.length,
          done,
          ok: built.current.size,
          skipped: [...skipped],
          failed: [...failed],
        });
      }
    };

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      await Promise.all(targets.slice(i, i + BATCH_SIZE).map(one));
    }

    /**
     * NOTHING IRREVERSIBLE WHILE A CHURCH IS STILL RECOVERABLE.
     *
     * A failure is the network, not a verdict, so the batch stays open and
     * exportable and the reviewer is offered the obvious next move. The demos
     * that DID build are already written and are simply picked up by the retry —
     * `built` keeps them, and the slugs are deterministic either way.
     */
    /**
     * The permanent refusal is checked FIRST, because it is the one failure a
     * retry cannot help with — see `alreadySent`. Terminal state, no Retry.
     */
    if (alreadySent) {
      setPhase("error");
      setError(
        "This batch has already been sent, so its demos already exist — most likely from another tab or an earlier attempt. Nothing was changed. Close this and reload the page to see the link to them.",
      );
      return;
    }

    if (failed.length) {
      setPhase("partial");
      return;
    }

    if (!built.current.size) {
      setPhase("error");
      setError(
        "No demos could be generated — every church was skipped. The batch has not been marked sent.",
      );
      return;
    }

    try {
      const groupRes = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || batchName,
          genericLink: GENERIC_DEMO_URL,
          // Insertion order — the order the reviewer read them in, since the
          // first pass walks `churches` and a retry only refills gaps.
          rows: [...built.current.values()],
        }),
      });
      const group = (await groupRes.json()) as { id?: string; error?: string };
      if (!groupRes.ok || !group.id) throw new Error(group.error ?? "Could not save the demo group");

      const finish = await fetch(`/api/leads/groups/${batchId}/export/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoGroupId: group.id }),
      });
      // The demos EXIST at this point. A failure here is a bookkeeping failure, so
      // it says so and still hands back the link rather than losing it.
      if (!finish.ok) {
        setPhase("error");
        setError(
          `The demos were created, but the batch could not be marked sent. They are at /studio/g/${group.id}.`,
        );
        return;
      }
      /**
       * ◎ IS WRITTEN FROM THE RESULT, NOT FROM THE INTENT.
       *
       * The churches marked are the ones a demo was actually BUILT for — the keys
       * of `built`, not `churches` — so a batch where two were skipped marks
       * eighteen. That is the whole value of this mark: it answers "have we
       * already sent this church something", and it may only ever be as true as
       * what happened.
       *
       * After `finish`, deliberately. Before it, a bookkeeping failure would leave
       * churches marked sent inside a batch that is still collectable.
       */
      mutate({ type: "export.commit", ids: [...built.current.keys()], at: Date.now() });

      setPhase("leaving");
      onExported(group.id);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Could not save the demo group.");
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
      className="m-auto w-[min(520px,calc(100vw-2rem))] rounded-xl border border-lead-line bg-lead-panel p-0 text-lead-ink backdrop:bg-black/50"
    >
      <div className="p-5">
        <h2 className="font-serif text-[20px] leading-snug font-semibold">
          {phase === "running"
            ? "Building the demos…"
            : phase === "leaving"
              ? `${progress.ok} demo${progress.ok === 1 ? "" : "s"} built — opening them…`
              : phase === "partial"
                ? `${progress.failed.length} church${progress.failed.length === 1 ? "" : "es"} could not be built`
                : "Send this batch"}
        </h2>

        {phase === "confirm" && (
          <>
            <p className="mt-2 text-[13.5px] leading-relaxed text-lead-ink2">
              A demo site is generated for each of the{" "}
              <strong className="text-lead-ink">{churches.length}</strong> church
              {churches.length === 1 ? "" : "es"} below, from exactly what you see on this page —
              your corrections included, struck-out items left out. They are grouped under one
              name in the studio.
            </p>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-lead-ink2 uppercase">
                Group name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="demo group name"
                className="mt-1.5 w-full rounded-lg border border-lead-line bg-lead-bg px-3 py-2 text-[14px] text-lead-ink"
              />
            </label>

            {/* THE PART THAT CANNOT BE UNDONE, said plainly. */}
            <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-lead-ink2">
              This batch becomes history when it finishes: it moves to Sent, and nothing more can
              be collected into it.
            </p>
          </>
        )}

        {phase !== "confirm" && progress.total > 0 && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between font-mono text-[11px]">
              <span className="text-lead-ink">
                {progress.done} / {progress.total} processed
              </span>
              <span className="text-lead-ink2">{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-lead-bg">
              <div
                className="h-full bg-lead-brand transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[10.5px] text-lead-ink2">
              <span className="text-lead-good">{progress.ok} created</span>
              {progress.skipped.length > 0 && ` · ${progress.skipped.length} skipped`}
              {progress.failed.length > 0 && (
                <span className="text-lead-bad"> · {progress.failed.length} failed</span>
              )}
            </p>

            {/* A skipped church is named WITH ITS REASON. "18 of 20 created" with
                no account of the other two is the kind of quiet loss this page
                exists to prevent. */}
            {progress.skipped.map((s) => (
              <p key={s.name} className="mt-1 font-mono text-[10px] text-lead-warn-ink">
                skipped {s.name}
                {s.reason ? ` — ${s.reason}` : ""}
              </p>
            ))}
            {progress.failed.map((f) => (
              <p key={f.orgId} className="mt-1 font-mono text-[10px] text-lead-bad">
                failed {f.name}
              </p>
            ))}
          </div>
        )}

        {/* THE STATE THAT USED TO NOT EXIST. A partly-failed export marked the
            batch sent anyway, which locked the failures out permanently — a sent
            batch 409s every export and shows no export control. It now stops
            here, changes nothing, and offers the move that fixes it. */}
        {phase === "partial" && (
          <p className="mt-3 rounded-md border border-lead-warn/50 bg-lead-warn/[0.08] px-2.5 py-2 text-[13px] leading-relaxed text-lead-warn-ink">
            <strong>Nothing has been sent.</strong> The batch is untouched and still
            collectable, and the {progress.ok} demo{progress.ok === 1 ? "" : "s"} already built
            {progress.ok === 1 ? " is" : " are"} kept — retrying only re-runs the ones that
            failed. This is usually a dropped connection rather than anything wrong with the
            churches themselves.
          </p>
        )}

        {phase === "error" && error && (
          <p className="mt-3 rounded-md border border-lead-bad/50 bg-lead-bad/[0.08] px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-lead-bad">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-lead-line bg-lead-panel px-3.5 font-mono text-[11px] text-lead-ink2 transition-colors hover:border-lead-ink2 hover:text-lead-ink"
            >
              {phase === "confirm" ? "Cancel" : "Close"}
            </button>
          )}
          {phase === "confirm" && (
            <button
              type="button"
              onClick={() => void run(churches, true)}
              disabled={churches.length === 0}
              className="inline-flex h-9 items-center rounded-lg bg-lead-brand px-3.5 font-mono text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
            >
              Build {churches.length} demo{churches.length === 1 ? "" : "s"}
            </button>
          )}
          {phase === "partial" && (
            <button
              type="button"
              // The failed list is captured in progress, so the retry runs
              // exactly those — not the whole batch again.
              onClick={() => void run(progress.failed, false)}
              className="inline-flex h-9 items-center rounded-lg bg-lead-brand px-3.5 font-mono text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Retry {progress.failed.length}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
