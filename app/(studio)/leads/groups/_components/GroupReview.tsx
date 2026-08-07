"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { resolve, staleEntries, departedEntries } from "@/lib/leads/engine/group";
import { useGroup } from "@/lib/leads/client/useGroups";
import { useDataset } from "@/lib/leads/client/useDataset";
import { ChurchCard } from "./church/parts";
import type { PaletteState } from "./church/Palette";
import type { LogoOption } from "@/lib/leads/engine/logo";
import { SKIN } from "./church/skin";
import { EditableText } from "./EditableText";
import { ReadOnlyProvider } from "./ReadOnly";
import { ExportBar } from "./ExportBar";
import { ExportDialog } from "./ExportDialog";

/**
 * The review page.
 *
 * Its whole job is to make somebody read twenty churches before writing to them,
 * and to make the wrong one easy to spot while they do. Nothing is collapsed by
 * default and the warning stays on screen rather than being a dialog that gets
 * clicked away before it is read.
 *
 * DOWN, NOT ACROSS. This used to be a four-column sheet — a church spread across
 * the page under a sticky strip naming the columns. The alignment argument for
 * it was sound (a bad quote looks wrong beside its neighbours) but the shape was
 * not: every value lived in a 230–300px track, so quotes wrapped at arbitrary
 * points, contacts shrank to glyphs, and reading a value meant first remembering
 * which column you were in. It read as a spreadsheet, and a spreadsheet is a
 * thing you scan for outliers rather than a thing you review.
 *
 * A church is now a header you land on — logo, name, slogan, the way out to
 * their site — and three labelled fields below it. `church/parts.tsx` holds the
 * rule that makes it skimmable: every church renders every field, in one order,
 * empty or not.
 */

const DISCLAIMER_TITLE = "WARNING: MANUALLY CHECK BEFORE SENDING";

export function GroupReview({ id }: { id: string }) {
  const { group, loading, loadError, saveError, save, pending, apply, flush, drain, reload } =
    useGroup(id);
  const { rows } = useDataset();

  /**
   * The acknowledgement is NOT persisted, on purpose.
   *
   * It acknowledges one specific export of one specific list. Stored, it would
   * arrive pre-ticked next time — which is the same error as a mark you can set
   * yourself: it would stop being evidence that anybody looked.
   *
   * The group id rides along with it so that navigating to a different group
   * carries no tick over, without an effect having to reset one.
   */
  const [ack, setAck] = useState<{ id: string; on: boolean }>({ id, on: false });
  const acknowledged = ack.id === id && ack.on;

  /**
   * REFETCH ON ARRIVAL. `storeFor(id)` loads once and then lives in module scope
   * for the rest of the tab, so returning to a batch renders the copy from the
   * first visit — including one edited in another tab, or one whose churches you
   * changed in the console since. Same reasoning as `GroupIndex`; the cached
   * snapshot still paints instantly, it is just no longer the last word.
   */
  useEffect(() => {
    reload();
  }, [id, reload]);

  /**
   * THE COLOURS EACH DEMO WILL BE BUILT WITH — one request for the whole batch.
   *
   * Fetched here rather than per card because twenty cards mounting twenty
   * fetches is twenty round trips to paint decoration, racing the review this
   * page exists for. `undefined` until it lands, so a card can draw a skeleton
   * instead of asserting "no palette" about a church it has not asked about yet.
   *
   * IT DOES NOT BLOCK ANYTHING. A failed request leaves every card in the loading
   * state, which is the honest outcome — the alternative is telling a reviewer
   * that twenty churches will ship the default theme because one fetch failed.
   */
  /**
   * THE BATCH ID RIDES ALONG WITH THE ANSWER, for the same reason it rides along
   * with the acknowledgement above: navigating to a different batch must not show
   * this one's colours for a frame, and the way to guarantee that without an
   * effect that resets state — the cascading-render mistake the lint rule
   * catches — is to make the stale value unreadable rather than to clear it.
   */
  const [preview, setPreview] = useState<{
    id: string;
    palettes: Record<string, PaletteState>;
    logoOptions: Record<string, LogoOption[]>;
  } | null>(null);
  const live = preview?.id === id ? preview : undefined;
  const paletteFor = live?.palettes;
  const logoOptionsFor = live?.logoOptions;

  /**
   * ONE REQUEST, TWO ANSWERS. The colours and the logo candidates both come from
   * the live record, so they ride together — see the route. Asking separately
   * would read every record in the batch twice to paint one card.
   */
  useEffect(() => {
    let alive = true;
    fetch(`/api/leads/groups/${id}/preview`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            palettes?: Record<string, PaletteState>;
            logoOptions?: Record<string, LogoOption[]>;
          } | null,
        ) => {
          if (alive && data?.palettes) {
            setPreview({ id, palettes: data.palettes, logoOptions: data.logoOptions ?? {} });
          }
        },
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);

  const recByOrg = useMemo(() => new Map(rows.map((r) => [r.id, r.rec ?? ""])), [rows]);

  const stale = useMemo(
    () => (group && rows.length ? staleEntries(group, recByOrg) : new Set<string>()),
    [group, rows.length, recByOrg],
  );
  const departed = useMemo(
    () => (group && rows.length ? departedEntries(group, recByOrg) : new Set<string>()),
    [group, rows.length, recByOrg],
  );

  const cards = useMemo(() => (group ? group.entries.map(resolve) : []), [group]);
  const status = group?.status ?? "open";
  const edits = cards.reduce((n, c) => n + c.editedCount, 0);
  const removals = cards.reduce((n, c) => n + c.suppressedCount, 0);

  // `apply` straight through, not wrapped in an arrow. A fresh closure every
  // render would change the prop identity on all twenty cards and make the
  // `memo()` on ChurchCard a no-op — which is exactly the kind of thing that
  // looks like it works and quietly costs nineteen re-renders per keystroke.
  const onOp = apply;

  const [exporting, setExporting] = useState(false);

  /**
   * The churches the export will build, taken from the RESOLVED cards rather than
   * from `group.entries`.
   *
   * Same list the page is rendering, in the same order — so "Build 20 demos"
   * cannot name a different twenty than the twenty someone just read. The names
   * are only for the progress list; the server resolves each card again from the
   * stored entry, because a client-supplied name is not evidence of anything.
   */
  const exportTargets = useMemo(
    () => cards.map((c) => ({ orgId: c.orgId, name: c.name.text || c.orgId })),
    [cards],
  );

  /**
   * Removing a church is the one op that redraws the whole page, so it lands on
   * the server before the page is redrawn.
   *
   * The card renumbers below the gap, the header count changes, and the export
   * bar is now about to send a different list. All of that follows from the store
   * on its own — but the flush is debounced by design, so between the click and
   * the save there is a window where the page shows N-1 churches beside a "3
   * changes pending". Awaiting the flush closes it, and `useCallback` keeps the
   * prop identity stable so twenty memoised cards do not re-render for it.
   *
   * The reload happens EVEN IF THE SAVE FAILED, deliberately: the reload then
   * shows the batch as the server actually holds it — with the church still in
   * it — which is the truth. Redrawing a removal we could not persist would be
   * the lie.
   */
  const onRemoveChurch = useCallback(
    async (orgId: string) => {
      apply({ op: "church.remove", orgId });
      await flush();
      window.location.reload();
    },
    [apply, flush],
  );

  if (loading) {
    return (
      <div className={SKIN.page}>
        <div className={`h-8 w-64 ${SKIN.skeleton}`} />
        <div className={`mt-6 h-72 ${SKIN.skeleton}`} />
      </div>
    );
  }

  /**
   * ONLY A FAILED READ IS FATAL.
   *
   * This used to test the store's single `error` field, which also carried save
   * failures — so the first PATCH the server refused replaced twenty reviewed
   * cards, the pending counter, the export bar and the frozen banner with "This
   * group could not be loaded", about a group that was loaded and on screen. A
   * refused write is reported in the save indicator above, beside the count of
   * what is still held; see `GroupSnapshot`.
   */
  if (loadError || !group) {
    return (
      <div className={`${SKIN.page} text-center`}>
        <p className="font-serif text-lg text-lead-ink">This group could not be loaded.</p>
        <p className={SKIN.meta}>{loadError || "Not found."}</p>
        <button type="button" onClick={reload} className={`mt-4 ${SKIN.btn}`}>
          retry
        </button>
      </div>
    );
  }

  return (
    <div className={SKIN.page}>
      <nav className={SKIN.nav}>
        <Link href="/leads" className={SKIN.navLink}>
          ← Console
        </Link>
        <Link href="/leads/groups" className={SKIN.navLink}>
          All groups
        </Link>
        <span className="ml-auto" data-save-state={save}>
          {save === "saving" && "saving…"}
          {save === "pending" && `${pending} change${pending === 1 ? "" : "s"} pending`}
          {/* THE ONLY PLACE A REFUSED WRITE IS REPORTED, now that it no longer
              blanks the page. `pending` distinguishes the two shapes: ops still
              held and waiting to go out, versus a write the server refused
              outright, which is dropped rather than resent forever. */}
          {save === "error" && (
            <span className="text-lead-bad">
              {pending > 0 ? `offline — ${pending} held` : saveError || "a change was not saved"}
            </span>
          )}
          {save === "idle" && "saved"}
        </span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className={SKIN.h1}>
            <EditableText
              value={group.name}
              /**
               * NEVER EMIT A NAME THE SERVER WILL ALWAYS REJECT.
               *
               * `sanitizeOp` drops `group.rename` with an empty or whitespace
               * name and answers 400 for the whole batch, so select-all, delete,
               * Enter used to put an op in the queue that could never succeed —
               * and it took every legitimate edit batched with it down too.
               * Refusing here restores the previous name on screen and costs
               * nothing, because there is no rename to make.
               */
              onCommit={(name) => {
                const next = name.trim();
                if (next) onOp({ op: "group.rename", name: next });
              }}
              /**
               * A SENT BATCH IS A RECORD, AND THE TITLE IS PART OF IT.
               *
               * `ReadOnlyProvider` wraps the card list below; this sits in the
               * header, outside it — so on an exported batch this was the only
               * live control on a page whose own banner says it can no longer be
               * edited. Renaming worked on screen while the PATCH 409'd forever,
               * leaving a renamed record of what was actually sent.
               */
              disabled={status === "exported"}
              ariaLabel="batch name"
              editingClassName={SKIN.editEditing}
              restingClassName={SKIN.editResting}
            />
          </h1>
          {/* TWO STATES. The middle one — "finished" — is gone along with the
              button that set it: it made a batch look done without anything
              having been done to it. See `GroupStatus`. */}
          {status === "exported" ? (
            <span className={SKIN.pillSent}>sent</span>
          ) : (
            <span className={SKIN.pillOpen}>collecting</span>
          )}
        </div>
        <p className={SKIN.meta}>
          {group.entries.length} church{group.entries.length === 1 ? "" : "es"}
          {edits > 0 && ` · ${edits} edit${edits === 1 ? "" : "s"}`}
          {removals > 0 && ` · ${removals} struck out`}
          {/* THE TWO COUNTERS HAVE TO ADD UP. The console's rail counts only
              churches the current publish still carries, so a batch holding two
              that have since left the dataset reads 0 there and N here. Without
              this line the difference looks like one of them is broken; with it,
              it is one fact stated twice. */}
          {departed.size > 0 &&
            ` · ${departed.size} no longer in the dataset (kept — this is the only copy)`}
          {/* WHERE `finish collecting` USED TO BE. Exporting is what finishes a
              batch now; there is no separate way to declare one over, because
              there was never anything a person could point at afterwards to say
              what finishing had accomplished. */}
          {group.demoGroupId && (
            <>
              {" · "}
              <Link href={`/studio/g/${group.demoGroupId}`} className={SKIN.metaLink}>
                open the demos this produced →
              </Link>
            </>
          )}
        </p>
      </header>

      {/* ── the disclaimer ──
          A banner rather than a dialog. A dialog on every visit becomes a reflex
          click inside a day, and a thing you click without reading is worse than
          no warning at all, because it looks like consent.

          THE COPY IS SHORT ON PURPOSE. A warning nobody finishes is a warning
          nobody read; three lines that get read beat six that do not. */}
      <section className={SKIN.warnBox}>
        <h2 className={SKIN.warnTitle}>{DISCLAIMER_TITLE}</h2>
        {/* SLOGANS ARE NO LONGER IN THIS LIST, because they are no longer
            extracted onto the card — every church now arrives with the slogan
            blank and somebody writes it. Leaving the word here would warn about
            a mistake this page can no longer make while saying nothing about the
            field that is now empty on purpose. See `resolveSlogan`. */}
        <p className={SKIN.warnBody}>
          <b>Names, steps and contacts were extracted by LLM models that can make
          mistakes.</b> This tool <b>does not</b> guarantee complete accuracy on data. Please review each church and <b>click any line to fix faulty details</b> before you send. <b>Slogans are blank on purpose</b> — write each one yourself.
        </p>
      </section>

      {/* ── the frozen banner ──
          A sent batch is a record, and the page has to say so where somebody is
          about to try to correct something. Without it, cards whose controls have
          all gone read as a page that failed to finish loading. */}
      {status === "exported" && (
        <section className={SKIN.frozenBox}>
          <p className={SKIN.frozenBody}>
            <b>This batch has been sent and can no longer be edited.</b> Its demo sites are
            built and their links may already be with the churches, so a change here would
            alter the record of what you approved without altering what they received. To
            change a demo, edit it in the studio; to work on a church again, collect it into
            a new batch.
          </p>
        </section>
      )}

      {group.entries.length === 0 ? (
        <p className={SKIN.emptyBatch}>
          This batch is empty. Press ✆ on a church in the console to collect it.
        </p>
      ) : (
        /**
         * ONE PROVIDER FOR THE WHOLE LIST — see `ReadOnly.tsx`. A card draws
         * around forty controls that have to go inert together, and a prop
         * threaded to forty places is thirty-nine chances to leave one live.
         */
        <ReadOnlyProvider value={status === "exported"}>
          {cards.map((card, i) => (
            <ChurchCard
              key={card.orgId}
              card={card}
              index={i + 1}
              stale={stale.has(card.orgId)}
              departed={departed.has(card.orgId)}
              palette={paletteFor?.[card.orgId]}
              logoOptions={logoOptionsFor?.[card.orgId]}
              onOp={onOp}
              onRemoveChurch={onRemoveChurch}
            />
          ))}
        </ReadOnlyProvider>
      )}

      <ExportBar
        count={group.entries.length}
        acknowledged={acknowledged}
        onAcknowledge={(on) => setAck({ id, on })}
        onExport={() => setExporting(true)}
        /**
         * THE SERVER HAS TO HAVE WHAT THE REVIEWER READ.
         *
         * The export builds from the stored batch, so an unsaved page and an
         * armed export button are a contradiction that used to sit on screen
         * side by side — the nav bar reading "offline — 3 held" above a live
         * `Export group`. The dialog refuses too, but a button that looks armed
         * and then refuses is a worse answer than one that says why up front.
         */
        blocked={
          save === "error"
            ? pending > 0
              ? `Your last ${pending} change${pending === 1 ? "" : "s"} could not be saved. Exporting now would build the demos without ${pending === 1 ? "it" : "them"}.`
              : `${saveError || "A change could not be saved."} The page has been re-read from the server, so check the card before you send.`
            : undefined
        }
        sent={status === "exported"}
        demoGroupId={group.demoGroupId}
        skin={SKIN.exportBar}
      />

      <ExportDialog
        open={exporting}
        batchId={id}
        batchName={group.name}
        churches={exportTargets}
        commitEdits={drain}
        onClose={() => setExporting(false)}
        onExported={(demoGroupId) => {
          /**
           * STRAIGHT TO THE DEMOS.
           *
           * This used to reload the review page and grow a link, on the reasoning
           * that everything on the page changes at once when a batch is sent and
           * re-reading it from the server was one source of truth for that. All of
           * that is still so — but it answered a question nobody was asking. The
           * batch is finished; the thing that was just made is somewhere else, and
           * leaving somebody on the page they have finished with, next to a link
           * they now have to notice, is a step the software can take for them.
           *
           * The reviewed batch is not lost: it is under Sent in `/leads/groups`,
           * and it carries this same id back the other way.
           *
           * A FULL NAVIGATION, not `router.push`. `/studio` is outside this route
           * group and holds none of the leads stores, and the console's rule since
           * the batch switcher landed is that arriving anywhere re-reads what it
           * shows rather than painting a cached copy.
           */
          window.location.href = `/studio/g/${demoGroupId}`;
        }}
      />
    </div>
  );
}
