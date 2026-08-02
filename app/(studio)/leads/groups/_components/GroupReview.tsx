"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { resolve, staleEntries, departedEntries } from "@/lib/leads/engine/group";
import { useGroup } from "@/lib/leads/client/useGroups";
import { useDataset } from "@/lib/leads/client/useDataset";
import { ChurchCard, SHEET_COLS } from "./ChurchCard";
import { EditableText } from "./EditableText";
import { ExportBar } from "./ExportBar";

/**
 * The review page.
 *
 * Its whole job is to make somebody read twenty churches before writing to them,
 * and to make the wrong one easy to spot while they do. Nothing is collapsed by
 * default and the warning stays on screen rather than being a dialog that gets
 * clicked away before it is read.
 *
 * A SHEET, NOT A STACK OF CARDS. It used to be an 880px column of full-height
 * cards — one church was a screen and a half, so twenty was thirty screens, and
 * on a wide monitor every pixel past 880 was blank. Worse than the scrolling:
 * with each card a different height, the slogan was somewhere new every time, so
 * the eye had to re-find each field before it could judge it. Four aligned
 * columns put every slogan in one strip and every quote block in another, and a
 * bad one stops being something you read for and starts being something that
 * looks wrong next to its neighbours.
 */

const DISCLAIMER_TITLE = "WARNING: M";

const COLUMNS = ["Church", "Next steps", "Discipleship", "Contacts"];

/**
 * Names the four columns ONCE, pinned under the console header, instead of
 * repeating three labels in all twenty rows. Built from `SHEET_COLS` so it
 * cannot drift from the columns it is labelling — a header that has drifted is
 * worse than none, because it mislabels instead of failing.
 */
function ColumnHeads() {
  return (
    <div
      // Hidden below 720px, where the tracks stack one per row and a position in
      // this strip no longer points at anything. Each column grows its own
      // heading there instead.
      className={`${SHEET_COLS} sticky top-[var(--lead-header-h)] z-[3] mb-2 overflow-hidden rounded-lg border border-lead-line max-[720px]:hidden`}
    >
      {COLUMNS.map((c, i) => (
        <div
          key={c}
          className={`bg-lead-panel2 px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-lead-ink2 uppercase ${
            i === 0 ? "pl-5" : ""
          }`}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

export function GroupReview({ id }: { id: string }) {
  const { group, loading, error, save, pending, apply, reload } = useGroup(id);
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

  const recByOrg = useMemo(
    () => new Map(rows.map((r) => [r.id, r.rec ?? ""])),
    [rows],
  );

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

  if (loading) {
    return (
      <div className="mx-auto max-w-[1760px] px-6 py-16">
        <div className="h-8 w-64 animate-pulse rounded bg-lead-panel" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-lead-panel" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="mx-auto max-w-[1760px] px-6 py-20 text-center">
        <p className="font-serif text-lg text-lead-ink">This group could not be loaded.</p>
        <p className="mt-2 font-mono text-xs text-lead-ink2">{error || "Not found."}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-md border border-lead-line px-3 py-1.5 font-mono text-xs text-lead-ink"
        >
          retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1760px] px-6 pt-6 pb-32">
      <nav className="mb-5 flex items-center gap-3 font-mono text-[11px] text-lead-ink2">
        <Link href="/leads" className="underline underline-offset-2 hover:text-lead-ink">
          ← Console
        </Link>
        <Link href="/leads/groups" className="underline underline-offset-2 hover:text-lead-ink">
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
          <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight text-lead-ink">
            <EditableText
              value={group.name}
              onCommit={(name) => onOp({ op: "group.rename", name })}
              ariaLabel="batch name"
            />
          </h1>
          {status === "open" && (
            <span className="rounded-full bg-lead-good/20 px-2 py-0.5 font-mono text-[10px] text-lead-good">
              collecting
            </span>
          )}
          {status === "closed" && (
            <span className="rounded-full border border-lead-line px-2 py-0.5 font-mono text-[10px] text-lead-ink2">
              finished
            </span>
          )}
          {status === "exported" && (
            <span className="rounded-full bg-lead-dl/20 px-2 py-0.5 font-mono text-[10px] text-lead-dl">
              sent
            </span>
          )}
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-lead-ink2">
          {group.entries.length} church{group.entries.length === 1 ? "" : "es"}
          {edits > 0 && ` · ${edits} edit${edits === 1 ? "" : "s"}`}
          {removals > 0 && ` · ${removals} struck out`}
          {status === "open" && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => onOp({ op: "group.close" })}
                title="Stop collecting into this batch. Nothing is sent."
                className="underline underline-offset-2 hover:text-lead-ink"
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
          no warning at all, because it looks like consent. */}
      {/* `max-w-[78ch]` INSIDE a 1760px page. The sheet wants every pixel it can
          get; prose does not — a paragraph run to 1760px is close to unreadable,
          and this is the one block on the page whose whole purpose is to be
          read. */}
      <section className="mb-6 max-w-[78ch] rounded-xl border border-lead-warn/50 bg-lead-warn/[0.07] px-5 py-4">
        <h2 className="font-serif text-[17px] font-semibold text-lead-ink">{DISCLAIMER_TITLE}</h2>
        <div className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-lead-ink2">
          <p>
            A lot of the information here was extracted by LLM models that are <b>prone to making mistakes.</b> Please <b>manually review critical information</b> such as each church&rsquo;s name, slogan, steps, descriptions, contact names, etc and <b>click on them to make changes</b> if necessary.
          </p>
        </div>
      </section>

      {group.entries.length === 0 ? (
        <p className="py-16 text-center font-serif text-[17px] italic text-lead-ink2">
          This batch is empty. Press ✆ on a church in the console to collect it.
        </p>
      ) : (
        <>
          <ColumnHeads />
          {cards.map((card, i) => (
            <ChurchCard
              key={card.orgId}
              card={card}
              index={i + 1}
              stale={stale.has(card.orgId)}
              departed={departed.has(card.orgId)}
              onOp={onOp}
            />
          ))}
        </>
      )}

      <ExportBar
        count={group.entries.length}
        acknowledged={acknowledged}
        onAcknowledge={(on) => setAck({ id, on })}
      />
    </div>
  );
}
