"use client";

import { useEffect, useRef, useState } from "react";
import { GENERIC_DEMO_URL } from "@/lib/config";
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
 */

const BATCH_SIZE = 3;

interface Progress {
  total: number;
  done: number;
  ok: number;
  skipped: { name: string; reason: string }[];
  failed: string[];
}

export interface ExportTarget {
  orgId: string;
  name: string;
}

export function ExportDialog({
  open,
  batchId,
  batchName,
  churches,
  onClose,
  onExported,
}: {
  open: boolean;
  batchId: string;
  batchName: string;
  /** Exactly the churches on the page — the reviewer's list, not the stored one. */
  churches: readonly ExportTarget[];
  onClose: () => void;
  onExported: (demoGroupId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(batchName);
  /**
   * `leaving` is the beat between the last write and the new page.
   *
   * `onExported` navigates to `/studio/g/<id>`, and a full navigation is not
   * instant — the dialog stays on screen for it. Without this it would stay on
   * screen still saying "Building the demos…" with the bar at 100%, which reads
   * as a hang at exactly the moment everything has in fact worked.
   */
  const [phase, setPhase] = useState<"confirm" | "running" | "leaving" | "error">("confirm");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress>({
    total: 0,
    done: 0,
    ok: 0,
    skipped: [],
    failed: [],
  });

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
      setProgress({ total: 0, done: 0, ok: 0, skipped: [], failed: [] });
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
   * The two phases with nothing in flight. Closing during `running` would not
   * stop the requests, only hide them; closing during `leaving` would drop the
   * reviewer back onto a page that is already navigating away.
   */
  const dismissible = phase === "confirm" || phase === "error";

  async function run() {
    setPhase("running");
    const rows: GroupRow[] = [];
    const skipped: { name: string; reason: string }[] = [];
    const failed: string[] = [];
    let done = 0;
    setProgress({ total: churches.length, done: 0, ok: 0, skipped: [], failed: [] });

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
        if (!res.ok) failed.push(church.name);
        else if (data.skipped) {
          skipped.push({ name: data.churchName ?? church.name, reason: data.reason ?? "" });
        } else if (data.row) rows.push(data.row);
      } catch {
        failed.push(church.name);
      } finally {
        done++;
        setProgress({
          total: churches.length,
          done,
          ok: rows.length,
          skipped: [...skipped],
          failed: [...failed],
        });
      }
    };

    for (let i = 0; i < churches.length; i += BATCH_SIZE) {
      await Promise.all(churches.slice(i, i + BATCH_SIZE).map(one));
    }

    if (!rows.length) {
      setPhase("error");
      setError(
        "No demos could be generated — every church was skipped or failed. The batch has not been marked sent.",
      );
      return;
    }

    try {
      const groupRes = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || batchName, genericLink: GENERIC_DEMO_URL, rows }),
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
              <p key={f} className="mt-1 font-mono text-[10px] text-lead-bad">
                failed {f}
              </p>
            ))}
          </div>
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
              {phase === "error" ? "Close" : "Cancel"}
            </button>
          )}
          {phase === "confirm" && (
            <button
              type="button"
              onClick={() => void run()}
              disabled={churches.length === 0}
              className="inline-flex h-9 items-center rounded-lg bg-lead-brand px-3.5 font-mono text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
            >
              Build {churches.length} demo{churches.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
