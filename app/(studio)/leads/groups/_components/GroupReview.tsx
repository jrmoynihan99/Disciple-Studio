"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { resolve, staleEntries, departedEntries } from "@/lib/leads/engine/group";
import type { GroupOp, ResolvedCard } from "@/lib/leads/engine/group-types";
import { useGroup } from "@/lib/leads/client/useGroups";
import { useDataset } from "@/lib/leads/client/useDataset";
import { ChurchCard } from "./church/parts";
import { SKIN } from "./church/skin";
import { PASSES, PASS_ORDER, type Pass } from "./church/passes";
import { EditableText } from "./EditableText";
import { ExportBar } from "./ExportBar";
// REVIEW-PASS-TEMP — three treatments of the evidence; see PassSwitch.tsx.
import { PassSwitch, useReviewPass } from "./PassSwitch";

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
  const { group, loading, error, save, pending, apply, reload } = useGroup(id);
  const { rows } = useDataset();
  // REVIEW-PASS-TEMP
  const [mode, chooseMode] = useReviewPass();

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

  const pass: Pass = mode === "compare" ? "a" : mode;

  if (loading) {
    return (
      <div className={SKIN.page}>
        <div className={`h-8 w-64 ${SKIN.skeleton}`} />
        <div className={`mt-6 h-72 ${SKIN.skeleton}`} />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className={`${SKIN.page} text-center`}>
        <p className="font-serif text-lg text-lead-ink">This group could not be loaded.</p>
        <p className={SKIN.meta}>{error || "Not found."}</p>
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
          {save === "error" && <span className="text-lead-bad">offline — {pending} held</span>}
          {save === "idle" && "saved"}
        </span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className={SKIN.h1}>
            <EditableText
              value={group.name}
              onCommit={(name) => onOp({ op: "group.rename", name })}
              ariaLabel="batch name"
              editingClassName={SKIN.editEditing}
              restingClassName={SKIN.editResting}
            />
          </h1>
          {status === "open" && <span className={SKIN.pillOpen}>collecting</span>}
          {status === "closed" && <span className={SKIN.pillClosed}>finished</span>}
          {status === "exported" && <span className={SKIN.pillSent}>sent</span>}
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
          {status === "open" && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => onOp({ op: "group.close" })}
                title="Stop collecting into this batch. Nothing is sent."
                className={SKIN.metaLink}
              >
                finish collecting
              </button>
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
        <p className={SKIN.warnBody}>
          Names, slogans, steps and contacts were extracted by a model that makes
          mistakes. <b>Click any line to fix it</b> before you send.
        </p>
      </section>

      {group.entries.length === 0 ? (
        <p className={SKIN.emptyBatch}>
          This batch is empty. Press ✆ on a church in the console to collect it.
        </p>
      ) : mode === "compare" ? (
        /* REVIEW-PASS-TEMP */
        <CompareStrip card={cards[0]} onOp={onOp} />
      ) : (
        cards.map((card, i) => (
          <ChurchCard
            key={card.orgId}
            card={card}
            index={i + 1}
            stale={stale.has(card.orgId)}
            departed={departed.has(card.orgId)}
            onOp={onOp}
            pass={pass}
          />
        ))
      )}

      <ExportBar
        count={group.entries.length}
        acknowledged={acknowledged}
        onAcknowledge={(on) => setAck({ id, on })}
        skin={SKIN.exportBar}
      />

      {/* REVIEW-PASS-TEMP */}
      <PassSwitch mode={mode} onChoose={chooseMode} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   REVIEW-PASS-TEMP — Compare
   ──────────────────────────────────────────────────────────────────────────
   ONE CHURCH, THREE TIMES. Switching between whole pages to compare treatments
   makes you compare a memory against a screen, and a memory of a layout is
   mostly a memory of how you felt about it. Three renderings of the same church
   in one scroll is the difference between "I think I prefer the second one" and
   "the second one, but with the first one's alignment".

   The first church in the batch, deliberately, rather than a fabricated one:
   what is being judged is how a treatment copes with the data you actually
   have, including its gaps.
   ══════════════════════════════════════════════════════════════════════════ */
function CompareStrip({ card, onOp }: { card: ResolvedCard; onOp: (op: GroupOp) => void }) {
  return (
    <div className="space-y-10">
      {PASS_ORDER.map((p) => (
        <section key={p}>
          <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-lead-brand pb-1.5 font-mono text-[11px]">
            <b className="text-lead-ink">
              {p.toUpperCase()} · {PASSES[p].title}
            </b>
            <span className="text-lead-ink2">{PASSES[p].hint}</span>
          </div>
          <ChurchCard card={card} index={1} stale={false} departed={false} onOp={onOp} pass={p} />
        </section>
      ))}
    </div>
  );
}
