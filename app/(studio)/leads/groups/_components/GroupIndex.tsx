"use client";

import { useState } from "react";
import Link from "next/link";
import { useGroupList } from "@/lib/leads/client/useGroups";

/** The list of export groups. Same column and type scale as the review page. */
export function GroupIndex() {
  const { groups, loading, error, create, remove } = useGroupList();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-[880px] px-6 pt-6 pb-24">
      <nav className="mb-5 font-mono text-[11px] text-lead-ink2">
        <Link href="/leads" className="underline underline-offset-2 hover:text-lead-ink">
          ← Console
        </Link>
      </nav>

      <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight text-lead-ink">
        Batches
      </h1>
      <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-lead-ink2">
        A batch is the churches you collected with ✆, frozen as they were when you
        collected them, with your corrections on top. Editing a church here changes
        only this batch — the console and every other batch are untouched.
      </p>
      <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-lead-ink2">
        You do not need to make one: pressing ✆ starts today&rsquo;s. Naming one here
        starts a fresh batch and finishes whatever you were collecting into.
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n || busy) return;
          setBusy(true);
          await create(n);
          setBusy(false);
          setName("");
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name a new batch"
          aria-label="Name a new batch"
          className="w-[280px] rounded-lg border border-lead-line bg-lead-panel px-3 py-2 text-[13.5px] text-lead-ink"
        />
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="rounded-lg bg-lead-brand px-4 py-2 font-mono text-xs text-white disabled:opacity-45"
        >
          Start it
        </button>
      </form>

      {error && <p className="mt-4 font-mono text-[11px] text-lead-bad">{error}</p>}

      <div className="mt-8 space-y-2">
        {loading && <div className="h-16 animate-pulse rounded-xl bg-lead-panel" />}
        {!loading && groups.length === 0 && (
          <p className="py-12 text-center font-serif text-[17px] italic text-lead-ink2">
            No groups yet. Create one above, or tick churches in the console.
          </p>
        )}
        {groups.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-4 rounded-xl border border-lead-line bg-lead-panel px-5 py-4"
          >
            <Link href={`/leads/groups/${g.id}`} className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate font-serif text-[19px] font-semibold text-lead-ink">
                  {g.name}
                </span>
                {g.status === "open" && (
                  <span className="shrink-0 rounded-full bg-lead-good/20 px-2 py-0.5 font-mono text-[9px] text-lead-good">
                    collecting
                  </span>
                )}
                {g.status === "exported" && (
                  <span className="shrink-0 rounded-full bg-lead-dl/20 px-2 py-0.5 font-mono text-[9px] text-lead-dl">
                    sent
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-lead-ink2">
                {g.count} church{g.count === 1 ? "" : "es"} · updated{" "}
                {new Date(g.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </Link>
            <Link
              href={`/leads/groups/${g.id}`}
              className="rounded-md border border-lead-line bg-lead-bg px-3 py-1.5 font-mono text-[11px] text-lead-ink"
            >
              Review
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete "${g.name}" and every correction in it?`)) void remove(g.id);
              }}
              className="font-mono text-[11px] text-lead-ink2 hover:text-lead-bad"
            >
              delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
