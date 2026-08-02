"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroupList } from "@/lib/leads/client/useGroups";
import { SKIN } from "./church/skin";
import { ConfirmDialog } from "../../_components/ConfirmDialog";

/**
 * The list of export groups.
 *
 * Its chrome comes from `SKIN` rather than from hand-copied class strings. It
 * used to duplicate the review page's nav, heading and shell by hand, which is
 * how the two ended up with the same nav rendered two different ways — one an
 * underline, one a button — after only one of them was restyled.
 */
export function GroupIndex() {
  const { groups, loading, error, create, remove, reload } = useGroupList();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  /**
   * REFETCH ON ARRIVAL, because the store only fetches once per tab.
   *
   * `/leads` and `/leads/groups` are sibling client routes, so moving between
   * them unmounts the component but NOT the module-scope store — deliberately,
   * since that is what makes going back instant. The cost is that the second
   * visit renders whatever was true on the first: collect three churches, come
   * here, and the batch you just filled still reads 0.
   *
   * A mount-time reload keeps the instant paint (the cached snapshot renders
   * immediately) and corrects it a moment later, which is the behaviour a person
   * expects from following a link.
   */
  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-[880px] px-6 pt-6 pb-24">
      <nav className={SKIN.nav}>
        <Link href="/leads" className={SKIN.navLink}>
          ← Console
        </Link>
      </nav>

      <h1 className={SKIN.h1}>Batches</h1>
      <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-lead-ink2">
        A batch is the churches you collected with ✆, frozen as they were when you
        collected them, with your corrections on top. Editing a church here changes
        only this batch — the console and every other batch are untouched.
      </p>
      {/* MATCHES WHAT ✆ ACTUALLY DOES NOW. This said "pressing ✆ starts
          today's", which was true while there was one batch a day and became
          false the moment finishing one and collecting again made another the
          same afternoon. The console's rail says the same thing in the same
          words — two descriptions of one rule is how they drift apart. */}
      <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-lead-ink2">
        You never have to make one. ✆ adds churches to whichever batch is being
        collected into, and creates one if none is — which is what finishing or
        sending a batch leaves behind. Use <b>Switch</b> in the console to collect
        into a different one, or name a fresh batch here.
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
              onClick={() => setPendingDelete({ id: g.id, name: g.name })}
              // Red at rest. Deleting a batch destroys every frozen snapshot and
              // every correction in it, and it sat here in the same muted ink as
              // the neutral controls beside it.
              className="rounded-md border border-lead-bad/60 bg-lead-bad/[0.07] px-2.5 py-1.5 font-mono text-[11px] text-lead-bad transition-colors hover:border-lead-bad hover:bg-lead-bad/[0.15]"
            >
              delete
            </button>
          </div>
        ))}
      </div>

      {/* `window.confirm()` used to do this job. It is blocking, unstyleable, and
          on some browsers carries a "prevent this page from creating more
          dialogs" checkbox that silently disables every later confirmation —
          which would turn the one guard on an irreversible action into nothing at
          all, without telling anybody. */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this batch?"
        body={
          <>
            <strong className="text-lead-ink">{pendingDelete?.name}</strong> and every
            correction in it will be destroyed. The frozen snapshots go with it, and
            for any church that has since left the dataset this is the only copy we
            hold. This cannot be undone.
          </>
        }
        confirmLabel="Delete batch"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void remove(target.id);
        }}
      />
    </div>
  );
}
