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
   * TWO LISTS, because they are two different things.
   *
   * A collectable batch is work in progress: you add to it, correct it, send it.
   * A sent one is a RECORD of something that already happened — it cannot be
   * collected into, cannot be re-sent, and the only live thing about it is the
   * link to the demos it produced. Mixed into one list the second kind
   * accumulates forever and buries the first.
   */
  const [tab, setTab] = useState<"collecting" | "sent">("collecting");
  const collecting = groups.filter((g) => g.status !== "exported");
  const sent = groups.filter((g) => g.status === "exported");
  const shown = tab === "sent" ? sent : collecting;

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

      {/* The count rides on the tab, so an empty Sent tab is legible as "nothing
          has been sent yet" rather than as a list that failed to load. */}
      <div className="mt-6 flex items-center gap-1.5">
        {(["collecting", "sent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 font-mono text-[11px] transition-colors ${
              tab === t
                ? "border-lead-brand bg-lead-brand/[0.08] text-lead-brand"
                : "border-lead-line bg-lead-panel text-lead-ink2 hover:border-lead-ink2 hover:text-lead-ink"
            }`}
          >
            {t === "collecting" ? "Collecting" : "Sent"}
            <span className="tabular-nums opacity-70">
              {t === "collecting" ? collecting.length : sent.length}
            </span>
          </button>
        ))}
      </div>

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
        className="mt-4 flex gap-2"
        hidden={tab === "sent"}
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
        {!loading && shown.length === 0 && (
          <p className="py-12 text-center font-serif text-[17px] italic text-lead-ink2">
            {tab === "sent"
              ? "Nothing has been sent yet. Exporting a batch generates the demos and moves it here."
              : "No batches yet. Name one above, or press \u2706 on a church in the console."}
          </p>
        )}
        {shown.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-4 rounded-xl border border-lead-line bg-lead-panel px-5 py-4"
          >
            <Link href={`/leads/groups/${g.id}`} className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate font-serif text-[19px] font-semibold text-lead-ink">
                  {g.name}
                </span>
                {g.status === "exported" ? (
                  <span className="shrink-0 rounded-full bg-lead-dl/20 px-2 py-0.5 font-mono text-[9px] text-lead-dl">
                    sent
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-lead-good/20 px-2 py-0.5 font-mono text-[9px] text-lead-good">
                    collecting
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
            {/* A sent batch's primary action is its demos, not its cards — the
                cards are frozen and there is nothing left to review. */}
            {g.status === "exported" && g.demoGroupId ? (
              <Link
                href={`/studio/g/${g.demoGroupId}`}
                className="rounded-md border border-lead-line bg-lead-bg px-3 py-1.5 font-mono text-[11px] text-lead-ink"
              >
                Demos
              </Link>
            ) : null}
            <Link
              href={`/leads/groups/${g.id}`}
              className="rounded-md border border-lead-line bg-lead-bg px-3 py-1.5 font-mono text-[11px] text-lead-ink"
            >
              {g.status === "exported" ? "View" : "Review"}
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
            <br />
            <br />
            {/* SAID OUT LOUD, because the opposite is the reasonable guess. The
                demos are separate objects with their own delete in the studio, and
                their links may already have been sent to a church. */}
            <span className="text-lead-ink2">
              Any demo sites this batch produced are NOT deleted. Remove those from
              the studio if you want them gone.
            </span>
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
