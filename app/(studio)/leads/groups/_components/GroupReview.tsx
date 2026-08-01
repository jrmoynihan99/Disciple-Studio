"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { resolve, staleEntries, departedEntries } from "@/lib/leads/engine/group";
import type { GroupOp } from "@/lib/leads/engine/group-types";
import { useGroup } from "@/lib/leads/client/useGroups";
import { useDataset } from "@/lib/leads/client/useDataset";
import { ChurchCard } from "./ChurchCard";
import { ExportBar } from "./ExportBar";

/**
 * The review page.
 *
 * Its whole job is to make somebody read forty churches before writing to them.
 * So: one column, one card at a time, nothing collapsed by default, and a
 * warning that stays on screen rather than a dialog that gets clicked away
 * before it is read.
 */

const DISCLAIMER_TITLE = "Read this before you send it";

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
  const edits = cards.reduce((n, c) => n + c.editedCount, 0);
  const removals = cards.reduce((n, c) => n + c.suppressedCount, 0);

  const onOp = (op: GroupOp) => apply(op);

  if (loading) {
    return (
      <div className="mx-auto max-w-[880px] px-6 py-16">
        <div className="h-8 w-64 animate-pulse rounded bg-lead-panel" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-lead-panel" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="mx-auto max-w-[880px] px-6 py-20 text-center">
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
    <div className="mx-auto max-w-[880px] px-6 pt-6 pb-32">
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
        <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight text-lead-ink">
          {group.name}
        </h1>
        <p className="mt-1.5 font-mono text-[11px] text-lead-ink2">
          {group.entries.length} church{group.entries.length === 1 ? "" : "es"}
          {edits > 0 && ` · ${edits} edit${edits === 1 ? "" : "s"}`}
          {removals > 0 && ` · ${removals} struck out`}
        </p>
      </header>

      {/* ── the disclaimer ──
          A banner rather than a dialog. A dialog on every visit becomes a reflex
          click inside a day, and a thing you click without reading is worse than
          no warning at all, because it looks like consent. */}
      <section className="mb-8 rounded-xl border border-lead-warn/50 bg-lead-warn/[0.07] px-5 py-4">
        <h2 className="font-serif text-[17px] font-semibold text-lead-ink">{DISCLAIMER_TITLE}</h2>
        <div className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-lead-ink2">
          <p>
            Everything below was extracted by an AI model from each church&rsquo;s own
            website. It is wrong often enough to matter.
          </p>
          <p>
            A quotation being marked <em>exact</em> only proves the words are somewhere
            on the page — never that they mean what they appear to here. Page
            furniture, opening hours and navigation links have all been captured as
            discipleship steps before now.
          </p>
          <p>
            Read every card. Fix what is wrong, strike out what does not belong.
            Getting a church&rsquo;s own words wrong in a first approach costs more than
            not approaching them.
          </p>
        </div>
      </section>

      {group.entries.length === 0 ? (
        <p className="py-16 text-center font-serif text-[17px] italic text-lead-ink2">
          This group is empty. Select churches in the console and add them here.
        </p>
      ) : (
        cards.map((card) => (
          <ChurchCard
            key={card.orgId}
            card={card}
            stale={stale.has(card.orgId)}
            departed={departed.has(card.orgId)}
            onOp={onOp}
            onRemoveChurch={() => onOp({ op: "church.remove", orgId: card.orgId })}
          />
        ))
      )}

      <ExportBar
        count={group.entries.length}
        acknowledged={acknowledged}
        onAcknowledge={(on) => setAck({ id, on })}
      />
    </div>
  );
}
