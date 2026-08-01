"use client";

import { useState } from "react";
import { legacyGoodLeadIds } from "@/lib/leads/client/state";

/**
 * A one-time offer for churches carrying the retired ✆ mark.
 *
 * ✆ used to write a `goodlead` mark that called itself "the export queue" and
 * had nowhere to go. It now collects into a batch, so those old marks name real
 * work with no home. The loader stops re-persisting them, which means that
 * without this bar they would simply vanish on the next write.
 *
 * It ASKS. Silently inventing a group out of stale local data would be a worse
 * failure than losing it: you would find a batch you never made, dated today,
 * full of churches you flagged weeks ago and might already have contacted.
 */
export function LegacyMarks({ onMove }: { onMove: (ids: string[]) => Promise<void> }) {
  const [ids] = useState<string[]>(() => {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem("leads-state-v1");
      return raw ? legacyGoodLeadIds(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!ids.length || done) return null;

  const forget = () => {
    try {
      const raw = localStorage.getItem("leads-state-v1");
      if (raw) {
        const saved = JSON.parse(raw) as { mine?: Record<string, unknown> };
        if (saved.mine) delete saved.mine.goodlead;
        localStorage.setItem("leads-state-v1", JSON.stringify(saved));
      }
    } catch {
      /* the loader already ignores it; this only stops the bar coming back */
    }
    setDone(true);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-lead-line bg-lead-warn/10 px-4 py-2 font-mono text-xs text-lead-ink">
      <span>
        {ids.length} church{ids.length === 1 ? "" : "es"} still carry the old ✆ mark. ✆
        now collects into a batch.
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onMove(ids);
          forget();
          setBusy(false);
        }}
        className="rounded-md bg-lead-brand px-3 py-1 text-white disabled:opacity-45"
      >
        {busy ? "Moving…" : "Move them into a batch"}
      </button>
      <button type="button" onClick={forget} className="underline hover:text-lead-ink2">
        Discard
      </button>
    </div>
  );
}
