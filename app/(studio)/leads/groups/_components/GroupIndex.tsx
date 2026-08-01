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
        Export groups
      </h1>
      <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-lead-ink2">
        A group is a batch of churches frozen at the moment you added them, with your
        corrections on top. Editing a church here changes only this group — the
        console and every other group are untouched.
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
          placeholder="New group name"
          aria-label="New group name"
          className="w-[280px] rounded-lg border border-lead-line bg-lead-panel px-3 py-2 text-[13.5px] text-lead-ink"
        />
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="rounded-lg bg-lead-brand px-4 py-2 font-mono text-xs text-white disabled:opacity-45"
        >
          Create
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
              <div className="truncate font-serif text-[19px] font-semibold text-lead-ink">
                {g.name}
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
