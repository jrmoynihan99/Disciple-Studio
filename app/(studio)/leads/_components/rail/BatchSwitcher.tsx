"use client";

import { useEffect, useRef, useState } from "react";
import type { ExportGroupSummary } from "@/lib/leads/engine/group-types";

/**
 * Where ✆ puts churches — chosen, rather than inferred.
 *
 * WHAT THIS REPLACES. The tray said "pressing ✆ starts today's", and that was
 * true when there was one batch a day: the console found the open one or made it,
 * and there was nothing to choose. Batches are no longer per-day, so "today's" is
 * both wrong and unactionable — a person who wanted the churches to go somewhere
 * else had no control anywhere on the page to say so.
 *
 * SWITCHING IS NOT A CLIENT-SIDE SELECTION. It moves the one open batch on the
 * server; `reopenGroup` explains why a stored per-browser selection would be a
 * second source of truth that drifts. The consequence worth knowing here is that
 * picking a batch CLOSES whichever one was open — which is stated on screen,
 * because it happens to a thing the person cannot see from this list.
 *
 * A SENT BATCH IS SHOWN AND CANNOT BE PICKED. Hiding it would leave the reviewer
 * hunting for a batch they can see on `/leads/groups`; a disabled row with a
 * reason is the honest version.
 */
export function BatchSwitcher({
  open,
  groups,
  currentId,
  error,
  onPick,
  onCreate,
  onClose,
}: {
  open: boolean;
  groups: readonly ExportGroupSummary[];
  currentId: string | null;
  error: string;
  onPick: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Clear `busy` when the dialog closes — DURING RENDER, not in an effect.
   *
   * Switching is a round trip, and without a latch the list stays clickable while
   * it is in flight: two picks land, the second overwrites the first, and the
   * batch you end up collecting into is whichever request finished last. So the
   * latch is real, and it has to be released when the dialog reopens or the next
   * open would be frozen.
   *
   * Doing that in an effect is the documented cascading-render mistake and the
   * lint rule catches it. Comparing against the previous prop during render is
   * React's own answer: the extra pass happens before anything is committed.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setBusy(false);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const pick = (id: string) => {
    setBusy(true);
    onPick(id);
  };

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(460px,calc(100vw-2rem))] rounded-xl border border-lead-line bg-lead-panel p-0 text-lead-ink backdrop:bg-black/50"
    >
      <div className="p-5">
        <h2 className="font-serif text-[19px] leading-snug font-semibold">Collect into…</h2>
        <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-lead-ink2">
          ✆ adds churches to whichever batch is picked here. Picking one finishes
          whatever you were collecting into — nothing is sent and nothing is lost.
        </p>

        {error && (
          <p className="mt-3 rounded-md border border-lead-bad/50 bg-lead-bad/[0.08] px-2.5 py-1.5 font-mono text-[10.5px] text-lead-bad">
            {error}
          </p>
        )}

        <div className="mt-4 max-h-[46vh] space-y-1.5 overflow-y-auto">
          {groups.length === 0 && (
            <p className="py-6 text-center font-mono text-[11px] text-lead-ink2">
              No batches yet. Make one below, or just press ✆ on a church.
            </p>
          )}

          {groups.map((g) => {
            const sent = g.status === "exported";
            const current = g.id === currentId;
            return (
              <button
                key={g.id}
                type="button"
                disabled={sent || busy}
                onClick={() => pick(g.id)}
                title={
                  sent
                    ? "This batch has been sent. Nothing more can be collected into it."
                    : `Collect into ${g.name}`
                }
                className={`flex w-full items-baseline gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  current
                    ? "border-lead-brand bg-lead-brand/[0.08]"
                    : "border-lead-line bg-lead-bg/40 hover:border-lead-brand"
                } ${sent ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate font-serif text-[15px] text-lead-ink">
                  {g.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-lead-ink2 tabular-nums">
                  {g.count} church{g.count === 1 ? "" : "es"}
                </span>
                {/* The status word, not a colour alone — three near washes in a
                    460px dialog is not a distinction anybody makes at a glance. */}
                <span
                  className={`shrink-0 font-mono text-[10px] ${
                    current
                      ? "text-lead-brand"
                      : sent
                        ? "text-lead-dl"
                        : "text-lead-ink2"
                  }`}
                >
                  {current ? "collecting" : sent ? "sent" : "finished"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onCreate();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-lead-brand px-3.5 font-mono text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span aria-hidden className="text-[13px] leading-none">
              ＋
            </span>
            New batch
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-9 items-center rounded-lg border border-lead-line bg-lead-panel px-3.5 font-mono text-[11px] text-lead-ink2 transition-colors hover:border-lead-ink2 hover:text-lead-ink"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
