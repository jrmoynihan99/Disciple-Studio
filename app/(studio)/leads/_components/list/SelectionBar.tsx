"use client";

import { useEffect, useRef, useState } from "react";
import type { ExportGroupSummary } from "@/lib/leads/engine/group-types";

/**
 * The bulk-add bar. Appears only when something is selected.
 *
 * It reports what was SKIPPED as loudly as what was added. A church that quietly
 * fails to arrive in a group is the same class of error as asserting absence —
 * you would build a batch of forty, get thirty-seven, and have no way to know.
 */

interface Props {
  count: number;
  groups: ExportGroupSummary[];
  busy: boolean;
  result: { added: number; skipped: { id: string; reason: string }[] } | null;
  onAdd: (groupId: string) => void;
  onCreate: (name: string) => void;
  onClear: () => void;
  onDismissResult: () => void;
}

export function SelectionBar({
  count,
  groups,
  busy,
  result,
  onAdd,
  onCreate,
  onClear,
  onDismissResult,
}: Props) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) {
        setOpen(false);
        setNaming(false);
      }
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  if (!count && !result) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5">
      <div className="pointer-events-auto w-full max-w-[720px] rounded-xl border border-lead-line bg-lead-panel shadow-[0_8px_30px_rgba(0,0,0,0.28)]">
        {result && (
          <div className="flex items-start gap-3 border-b border-lead-line px-4 py-2.5 text-xs">
            <span className="mt-px font-mono text-lead-good">
              {result.added} added
            </span>
            {result.skipped.length > 0 && (
              <span className="min-w-0 flex-1 text-lead-ink2">
                <span className="font-mono text-lead-warn">{result.skipped.length} skipped</span>
                {" — "}
                {result.skipped
                  .slice(0, 3)
                  .map((s) => `${s.id} (${s.reason})`)
                  .join(", ")}
                {result.skipped.length > 3 && ` +${result.skipped.length - 3} more`}
              </span>
            )}
            <button
              type="button"
              onClick={onDismissResult}
              className="ml-auto shrink-0 text-lead-ink2 hover:text-lead-ink"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {count > 0 && (
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="font-mono text-xs text-lead-ink">
              {count} selected
            </span>

            <div className="relative ml-auto" ref={box}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen((v) => !v)}
                className="rounded-md bg-lead-brand px-3 py-1.5 font-mono text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-45"
              >
                {busy ? "Adding…" : "Add to group ▾"}
              </button>

              {open && (
                <div className="absolute right-0 bottom-full mb-2 w-[260px] overflow-hidden rounded-lg border border-lead-line bg-lead-panel shadow-lg">
                  <div className="max-h-[220px] overflow-y-auto">
                    {groups.length === 0 && (
                      <p className="px-3 py-2.5 text-xs text-lead-ink2">No groups yet.</p>
                    )}
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onAdd(g.id);
                        }}
                        className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-xs text-lead-ink hover:bg-lead-panel2"
                      >
                        <span className="min-w-0 flex-1 truncate">{g.name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-lead-ink2">
                          {g.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-lead-line p-2">
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
                          className="w-full rounded-md border border-lead-line bg-lead-bg px-2 py-1.5 text-xs text-lead-ink"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNaming(true)}
                        className="w-full rounded-md border border-dashed border-lead-line py-1.5 font-mono text-[11px] text-lead-ink2 hover:border-lead-brand hover:text-lead-brand"
                      >
                        + New group
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-lead-line bg-lead-bg px-3 py-1.5 font-mono text-xs text-lead-ink2 hover:text-lead-ink"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
